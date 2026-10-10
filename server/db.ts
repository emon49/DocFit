import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'patient' | 'doctor' | 'admin';
  country_code: string;
  timezone: string;
  email_verified_at: string | null;
  verification_token: string | null;
  verification_token_expires_at: number | null; // timestamp in ms
  mfa_enrolled: boolean;
  mfa_secret: string | null;
  created_at: string;
  status: 'pending_verification' | 'active';
}

export interface AvailabilityRule {
  id: string;
  doctor_id: string;
  day_of_week: string; // 'monday', 'tuesday', etc. or 0-6
  start_local_time: string; // '09:00'
  end_local_time: string; // '12:00'
  timezone: string;
}

export interface AvailabilityException {
  id: string;
  doctor_id: string;
  date: string; // '2026-10-19'
  type: 'leave' | 'extra';
  start_local_time?: string;
  end_local_time?: string;
  note?: string;
}

export interface Slot {
  id: string;
  doctor_id: string;
  date: string; // '2026-10-12'
  starts_at_utc: string;
  ends_at_utc: string;
  time_str: string; // '09:00'
  status: 'open' | 'booked' | 'blocked';
  booking_id?: string | null;
}

export interface ConsultationFees {
  initial: number;
  follow_up: number;
  extended: number;
  prescription_review: number;
}

export interface DoctorChecklist {
  gmc_confirmed: boolean;
  name_matches: boolean;
  expiry_confirmed: boolean;
  license_type_verified: boolean;
  documents_checked: boolean;
  id_validated: boolean;
}

export interface Doctor {
  id: string;
  user_id: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  postcode: string;
  country: string;
  profile_photo?: string;
  profile_photo_size?: string;
  license_number: string;
  issuing_authority: string;
  country_of_licensure: string;
  license_issue_date: string;
  license_expiry: string;
  license_type: string;
  primary_specialty: string;
  specialties: string[];
  consultation_fees: ConsultationFees;
  document_url: string;
  document_size: string;
  id_document_url: string;
  id_document_size: string;
  status: 'pending' | 'action_required' | 'approved' | 'rejected' | 'suspended';
  checklist: DoctorChecklist;
  submitted_at: string;
  approved_at?: string;
  rejection_reason?: string | null;
  rejection_message?: string | null;
  action_required_message?: string | null;
  action_required_at?: string | null;
  internal_notes?: string | null;
  allow_reapply?: boolean;
  affected_bookings_count?: number;
  suspended_at?: string | null;
  slot_length_minutes?: number; // 15, 20, 30
  created_at: string;
  updated_at: string;
}

class Database {
  private users: Map<string, User> = new Map();
  private emailToId: Map<string, string> = new Map();
  private doctors: Map<string, Doctor> = new Map();
  private userToDoctorId: Map<string, string> = new Map();
  private availabilityRules: Map<string, AvailabilityRule[]> = new Map();
  private availabilityExceptions: Map<string, AvailabilityException[]> = new Map();
  private slots: Map<string, Slot[]> = new Map();

  constructor() {
    this.seedDefaultUsers();
  }

  public seedDefaultAvailability(doctorId: string) {
    const defaultRules: AvailabilityRule[] = [
      { id: 'rule_1', doctor_id: doctorId, day_of_week: 'monday', start_local_time: '09:00', end_local_time: '12:00', timezone: 'Europe/London' },
      { id: 'rule_2', doctor_id: doctorId, day_of_week: 'monday', start_local_time: '14:00', end_local_time: '17:00', timezone: 'Europe/London' },
      { id: 'rule_3', doctor_id: doctorId, day_of_week: 'tuesday', start_local_time: '09:00', end_local_time: '13:00', timezone: 'Europe/London' },
      { id: 'rule_4', doctor_id: doctorId, day_of_week: 'thursday', start_local_time: '08:30', end_local_time: '12:30', timezone: 'Europe/London' },
      { id: 'rule_5', doctor_id: doctorId, day_of_week: 'thursday', start_local_time: '14:00', end_local_time: '16:00', timezone: 'Europe/London' },
      { id: 'rule_6', doctor_id: doctorId, day_of_week: 'friday', start_local_time: '09:00', end_local_time: '12:00', timezone: 'Europe/London' },
    ];
    this.availabilityRules.set(doctorId, defaultRules);

    const defaultExceptions: AvailabilityException[] = [
      { id: 'exc_1', doctor_id: doctorId, date: '2026-10-19', type: 'leave', note: 'Annual leave' }
    ];
    this.availabilityExceptions.set(doctorId, defaultExceptions);

    const doc = this.doctors.get(doctorId);
    if (doc) {
      doc.slot_length_minutes = doc.slot_length_minutes || 20;
    }

    this.generateSlots(doctorId);
  }

  public validateRulesOverlap(rules: AvailabilityRule[]): { hasOverlap: boolean; overlappingDay?: string } {
    const byDay: Record<string, AvailabilityRule[]> = {};
    for (const r of rules) {
      const day = r.day_of_week.toLowerCase();
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(r);
    }

    for (const [day, dayRules] of Object.entries(byDay)) {
      // sort by start time
      const sorted = [...dayRules].sort((a, b) => a.start_local_time.localeCompare(b.start_local_time));
      for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i];
        const next = sorted[i + 1];
        if (current.end_local_time > next.start_local_time) {
          return { hasOverlap: true, overlappingDay: day };
        }
      }
    }
    return { hasOverlap: false };
  }

  public getAvailabilityRules(doctorId: string): AvailabilityRule[] {
    return this.availabilityRules.get(doctorId) || [];
  }

  public setAvailabilityRules(doctorId: string, rules: AvailabilityRule[]): { success: boolean; error?: string } {
    const validation = this.validateRulesOverlap(rules);
    if (validation.hasOverlap) {
      return { success: false, error: `Overlapping hours on ${validation.overlappingDay}` };
    }
    this.availabilityRules.set(doctorId, rules);
    this.generateSlots(doctorId);
    return { success: true };
  }

  public getAvailabilityExceptions(doctorId: string): AvailabilityException[] {
    return this.availabilityExceptions.get(doctorId) || [];
  }

  public addAvailabilityException(doctorId: string, exception: AvailabilityException): void {
    const exs = this.availabilityExceptions.get(doctorId) || [];
    exs.push(exception);
    this.availabilityExceptions.set(doctorId, exs);
    this.generateSlots(doctorId);
  }

  public removeAvailabilityException(doctorId: string, exceptionId: string): void {
    let exs = this.availabilityExceptions.get(doctorId) || [];
    exs = exs.filter(e => e.id !== exceptionId);
    this.availabilityExceptions.set(doctorId, exs);
    this.generateSlots(doctorId);
  }

  public updateSlotLength(doctorId: string, minutes: number): void {
    const doc = this.doctors.get(doctorId);
    if (doc) {
      doc.slot_length_minutes = minutes;
    }
    this.generateSlots(doctorId);
  }

  public generateSlots(doctorId: string): void {
    const doc = this.doctors.get(doctorId);
    const slotLength = doc?.slot_length_minutes || 20;
    const rules = this.getAvailabilityRules(doctorId);
    const exceptions = this.getAvailabilityExceptions(doctorId);

    const generatedSlots: Slot[] = [];
    const startDate = new Date('2026-10-10T00:00:00Z'); // start from Sat 10 Oct 2026 matching designs

    for (let i = 0; i < 14; i++) {
      const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0]; // '2026-10-12'
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[d.getUTCDay()];

      // Check exceptions for this date
      const dateException = exceptions.find(e => e.date === dateStr);
      if (dateException && dateException.type === 'leave' && !dateException.start_local_time) {
        // Full day leave
        continue;
      }

      const dayRules = rules.filter(r => r.day_of_week.toLowerCase() === dayName);
      for (const rule of dayRules) {
        let [startH, startM] = rule.start_local_time.split(':').map(Number);
        const [endH, endM] = rule.end_local_time.split(':').map(Number);

        let currentMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        while (currentMinutes + slotLength <= endMinutes) {
          const h = Math.floor(currentMinutes / 60);
          const m = currentMinutes % 60;
          const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          
          const nextMinutes = currentMinutes + slotLength;
          const nh = Math.floor(nextMinutes / 60);
          const nm = nextMinutes % 60;
          const endTimeStr = `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;

          const slotId = `slot_${doctorId}_${dateStr}_${timeStr.replace(':', '')}`;
          // check if already booked or existing
          const existing = (this.slots.get(doctorId) || []).find(s => s.id === slotId);

          generatedSlots.push({
            id: slotId,
            doctor_id: doctorId,
            date: dateStr,
            time_str: timeStr,
            starts_at_utc: `${dateStr}T${timeStr}:00Z`,
            ends_at_utc: `${dateStr}T${endTimeStr}:00Z`,
            status: existing ? existing.status : 'open',
            booking_id: existing ? existing.booking_id : null
          });

          currentMinutes = nextMinutes;
        }
      }
    }

    this.slots.set(doctorId, generatedSlots);
  }

  public getSlots(doctorId: string, from?: string, to?: string): Slot[] {
    const list = this.slots.get(doctorId) || [];
    if (!from && !to) return list;
    return list.filter(s => {
      if (from && s.date < from) return false;
      if (to && s.date > to) return false;
      return true;
    });
  }

  public seedDefaultUsers() {
    const defaultPasswordHash = bcrypt.hashSync('SecurePassword2026!', 10);

    // Seeded verified patient
    const patientUser: User = {
      id: 'usr_patient_001',
      name: 'James Hartwell',
      email: 'j.hartwell@nhs.net',
      password_hash: defaultPasswordHash,
      role: 'patient',
      country_code: 'GB',
      timezone: 'Europe/London',
      email_verified_at: new Date('2026-10-01T10:00:00Z').toISOString(),
      verification_token: null,
      verification_token_expires_at: null,
      mfa_enrolled: false,
      mfa_secret: null,
      created_at: new Date('2026-10-01T10:00:00Z').toISOString(),
      status: 'active',
    };
    this.addUser(patientUser);

    // Seeded doctor (without MFA enrolled yet to demonstrate TC-04)
    const doctorUser: User = {
      id: 'usr_doctor_001',
      name: 'Dr. Priya Kapoor',
      email: 'p.kapoor@hospital.org',
      password_hash: defaultPasswordHash,
      role: 'doctor',
      country_code: 'GB',
      timezone: 'Europe/London',
      email_verified_at: new Date('2026-10-01T10:00:00Z').toISOString(),
      verification_token: null,
      verification_token_expires_at: null,
      mfa_enrolled: false, // forces MFA enrollment upon login (TC-04)
      mfa_secret: 'JBSWY3DPEHPK3PXPQUYTEMLS',
      created_at: new Date('2026-10-01T10:00:00Z').toISOString(),
      status: 'active',
    };
    this.addUser(doctorUser);

    // Seeded doctor with MFA enrolled
    const doctorMfaUser: User = {
      id: 'usr_doctor_002',
      name: 'Dr. Marcus Vance',
      email: 'm.vance@clinic.org',
      password_hash: defaultPasswordHash,
      role: 'doctor',
      country_code: 'US',
      timezone: 'America/New_York',
      email_verified_at: new Date('2026-10-01T10:00:00Z').toISOString(),
      verification_token: null,
      verification_token_expires_at: null,
      mfa_enrolled: true,
      mfa_secret: 'JBSWY3DPEHPK3PXPQUYTEMLS',
      created_at: new Date('2026-10-01T10:00:00Z').toISOString(),
      status: 'active',
    };
    this.addUser(doctorMfaUser);

    // Seeded Admin user Sarah Chen
    const adminUser: User = {
      id: 'usr_admin_001',
      name: 'Sarah Chen',
      email: 's.chen@docfit.health',
      password_hash: defaultPasswordHash,
      role: 'admin',
      country_code: 'GB',
      timezone: 'Europe/London',
      email_verified_at: new Date('2026-09-01T08:00:00Z').toISOString(),
      verification_token: null,
      verification_token_expires_at: null,
      mfa_enrolled: true,
      mfa_secret: 'JBSWY3DPEHPK3PXPQUYTEMLS',
      created_at: new Date('2026-09-01T08:00:00Z').toISOString(),
      status: 'active',
    };
    this.addUser(adminUser);

    // Seed doctor user Dr. Amara Osei-Bonsu
    const doctorAmara: User = {
      id: 'usr_doctor_amara',
      name: 'Dr. Amara Osei-Bonsu',
      email: 'a.osei-bonsu@nhs.net',
      password_hash: defaultPasswordHash,
      role: 'doctor',
      country_code: 'GB',
      timezone: 'Europe/London',
      email_verified_at: new Date('2026-10-09T14:30:00Z').toISOString(),
      verification_token: null,
      verification_token_expires_at: null,
      mfa_enrolled: true,
      mfa_secret: 'JBSWY3DPEHPK3PXPQUYTEMLS',
      created_at: new Date('2026-10-09T14:30:00Z').toISOString(),
      status: 'active',
    };
    this.addUser(doctorAmara);

    // Seed doctor user Dr. Maya Patel (suspended for expired license)
    const doctorMaya: User = {
      id: 'usr_doctor_maya',
      name: 'Dr. Maya Patel',
      email: 'm.patel@hospital.org',
      password_hash: defaultPasswordHash,
      role: 'doctor',
      country_code: 'GB',
      timezone: 'Europe/London',
      email_verified_at: new Date('2024-03-01T10:00:00Z').toISOString(),
      verification_token: null,
      verification_token_expires_at: null,
      mfa_enrolled: true,
      mfa_secret: 'JBSWY3DPEHPK3PXPQUYTEMLS',
      created_at: new Date('2024-03-01T10:00:00Z').toISOString(),
      status: 'active',
    };
    this.addUser(doctorMaya);

    // Seed Doctor applications
    this.seedDoctorApplications();
  }

  private seedDoctorApplications() {
    const amaraDoc: Doctor = {
      id: 'doc_amara_001',
      user_id: 'usr_doctor_amara',
      full_name: 'Dr. Amara Osei-Bonsu',
      date_of_birth: '1985-04-12',
      gender: 'female',
      nationality: 'Ghanaian',
      phone: '+44 7700 904 312',
      email: 'a.osei-bonsu@nhs.net',
      address_line1: '47 Elmwood Avenue',
      city: 'Birmingham',
      postcode: 'B15 2TT',
      country: 'gb',
      profile_photo: 'headshot_amara.jpg',
      profile_photo_size: '1.4 MB',
      license_number: 'GMC-7842913',
      issuing_authority: 'General Medical Council (GMC)',
      country_of_licensure: 'gb',
      license_issue_date: '2012-09-01',
      license_expiry: '2027-08-31',
      license_type: 'full',
      primary_specialty: 'Cardiology',
      specialties: ['Cardiology', 'General Medicine', 'Internal Medicine'],
      consultation_fees: {
        initial: 85,
        follow_up: 55,
        extended: 130,
        prescription_review: 40
      },
      document_url: 'GMC_Certificate_Osei-Bonsu.pdf',
      document_size: '2.3 MB',
      id_document_url: 'Passport_Osei-Bonsu.pdf',
      id_document_size: '1.8 MB',
      status: 'pending',
      checklist: {
        gmc_confirmed: true,
        name_matches: true,
        expiry_confirmed: true,
        license_type_verified: false,
        documents_checked: false,
        id_validated: false
      },
      submitted_at: '2026-10-09T14:32:00Z',
      created_at: '2026-10-09T14:32:00Z',
      updated_at: '2026-10-09T14:32:00Z'
    };
    this.addDoctor(amaraDoc);
    this.seedDefaultAvailability('doc_amara_001');

    const rajeshDoc: Doctor = {
      id: 'doc_rajesh_002',
      user_id: 'usr_doc_rajesh',
      full_name: 'Dr. Rajesh Iyer',
      date_of_birth: '1980-06-20',
      gender: 'male',
      nationality: 'Indian',
      phone: '+91 98200 12345',
      email: 'r.iyer@health.in',
      address_line1: '14 MG Road',
      city: 'Mumbai',
      postcode: '400001',
      country: 'in',
      license_number: 'MCI-330492',
      issuing_authority: 'Medical Council of India',
      country_of_licensure: 'in',
      license_issue_date: '2008-01-15',
      license_expiry: '2026-12-31',
      license_type: 'full',
      primary_specialty: 'Cardiology',
      specialties: ['Cardiology'],
      consultation_fees: { initial: 75, follow_up: 45, extended: 110, prescription_review: 35 },
      document_url: 'MCI_Cert_Iyer.pdf',
      document_size: '1.9 MB',
      id_document_url: 'Passport_Iyer.pdf',
      id_document_size: '2.1 MB',
      status: 'pending',
      checklist: {
        gmc_confirmed: false,
        name_matches: false,
        expiry_confirmed: false,
        license_type_verified: false,
        documents_checked: false,
        id_validated: false
      },
      submitted_at: '2026-10-07T11:00:00Z',
      created_at: '2026-10-07T11:00:00Z',
      updated_at: '2026-10-07T11:00:00Z'
    };
    this.addDoctor(rajeshDoc);

    const priyaDoc: Doctor = {
      id: 'doc_priya_003',
      user_id: 'usr_doc_priya',
      full_name: 'Dr. Priya Sharma',
      date_of_birth: '1988-11-05',
      gender: 'female',
      nationality: 'Indian',
      phone: '+91 98111 22334',
      email: 'p.sharma@delhi-med.org',
      address_line1: '88 Ring Road',
      city: 'New Delhi',
      postcode: '110001',
      country: 'in',
      license_number: 'GMC-6641220',
      issuing_authority: 'General Medical Council (GMC)',
      country_of_licensure: 'gb',
      license_issue_date: '2015-08-01',
      license_expiry: '2025-07-31',
      license_type: 'provisional',
      primary_specialty: 'Paediatrics',
      specialties: ['Paediatrics'],
      consultation_fees: { initial: 90, follow_up: 60, extended: 140, prescription_review: 45 },
      document_url: 'GMC_Provisional_Sharma.pdf',
      document_size: '3.1 MB',
      id_document_url: 'Passport_Sharma.pdf',
      id_document_size: '1.5 MB',
      status: 'action_required',
      action_required_message: 'Your GMC provisional registration (GMC-6641220) appears to have expired on 31 July 2025. Please upload your renewed license certificate showing your current registration status.',
      action_required_at: '2026-10-03T09:14:00Z',
      checklist: {
        gmc_confirmed: true,
        name_matches: true,
        expiry_confirmed: false,
        license_type_verified: false,
        documents_checked: false,
        id_validated: false
      },
      submitted_at: '2026-10-03T09:14:00Z',
      created_at: '2026-10-03T09:14:00Z',
      updated_at: '2026-10-03T09:14:00Z'
    };
    this.addDoctor(priyaDoc);

    const mayaDoc: Doctor = {
      id: 'doc_maya_004',
      user_id: 'usr_doctor_maya',
      full_name: 'Dr. Maya Patel',
      date_of_birth: '1979-03-14',
      gender: 'female',
      nationality: 'British',
      phone: '+44 7700 900 111',
      email: 'm.patel@hospital.org',
      address_line1: '12 Oxford Crescent',
      city: 'London',
      postcode: 'W1D 1AA',
      country: 'gb',
      license_number: 'MCI-442817',
      issuing_authority: 'Medical Council of India',
      country_of_licensure: 'in',
      license_issue_date: '2004-03-02',
      license_expiry: '2026-09-30', // expired license!
      license_type: 'full',
      primary_specialty: 'Dermatology',
      specialties: ['Dermatology'],
      consultation_fees: { initial: 100, follow_up: 65, extended: 150, prescription_review: 50 },
      document_url: 'MCI_Cert_Patel.pdf',
      document_size: '2.5 MB',
      id_document_url: 'Passport_Patel.pdf',
      id_document_size: '1.9 MB',
      status: 'approved',
      checklist: {
        gmc_confirmed: true,
        name_matches: true,
        expiry_confirmed: false,
        license_type_verified: true,
        documents_checked: true,
        id_validated: true
      },
      affected_bookings_count: 4,
      suspended_at: '2026-10-01T00:00:00Z',
      submitted_at: '2024-03-02T10:00:00Z',
      approved_at: '2024-03-02T10:00:00Z',
      created_at: '2024-03-02T10:00:00Z',
      updated_at: '2026-10-01T00:00:00Z'
    };
    this.addDoctor(mayaDoc);

    // Additional queue doctors to match design queue
    const queueDoctors = [
      { id: 'doc_q_01', name: 'Dr. Chisom Adeyemi', status: 'pending', days: '4 days', country: 'Nigeria', spec: 'General Medicine' },
      { id: 'doc_q_02', name: 'Dr. Sophie Laurent', status: 'pending', days: '5 days', country: 'France', spec: 'Paediatrics' },
      { id: 'doc_q_03', name: 'Dr. James Okafor', status: 'pending', days: '6 days', country: 'Nigeria', spec: 'Internal Medicine' },
      { id: 'doc_q_04', name: 'Dr. Ahmed Al-Rashid', status: 'action_required', days: '8 days', country: 'UAE', spec: 'Cardiology' },
      { id: 'doc_q_05', name: 'Dr. Mei-Lin Zhang', status: 'action_required', days: '11 days', country: 'Canada', spec: 'Dermatology' },
      { id: 'doc_q_06', name: 'Dr. Kofi Mensah', status: 'pending', days: '12 days', country: 'Ghana', spec: 'General Medicine' },
      { id: 'doc_q_07', name: 'Dr. Fatimah Bello', status: 'pending', days: '13 days', country: 'Nigeria', spec: 'Psychiatry' },
    ];

    for (const q of queueDoctors) {
      const doc: Doctor = {
        id: q.id,
        user_id: `usr_${q.id}`,
        full_name: q.name,
        date_of_birth: '1984-01-01',
        gender: 'female',
        nationality: q.country,
        phone: '+44 7700 000 000',
        email: `${q.name.toLowerCase().replace(/[^a-z]/g, '.')}@example.com`,
        address_line1: '100 Medical Way',
        city: 'City',
        postcode: 'PC123',
        country: q.country.toLowerCase().substring(0, 2),
        license_number: `REG-${Math.floor(1000000 + Math.random() * 9000000)}`,
        issuing_authority: 'Medical Authority',
        country_of_licensure: q.country.toLowerCase().substring(0, 2),
        license_issue_date: '2015-01-01',
        license_expiry: '2028-01-01',
        license_type: 'full',
        primary_specialty: q.spec,
        specialties: [q.spec],
        consultation_fees: { initial: 80, follow_up: 50, extended: 120, prescription_review: 40 },
        document_url: 'license_cert.pdf',
        document_size: '2.0 MB',
        id_document_url: 'id_doc.pdf',
        id_document_size: '1.5 MB',
        status: q.status as any,
        checklist: {
          gmc_confirmed: false,
          name_matches: false,
          expiry_confirmed: false,
          license_type_verified: false,
          documents_checked: false,
          id_validated: false
        },
        submitted_at: new Date(Date.now() - parseInt(q.days) * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - parseInt(q.days) * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - parseInt(q.days) * 24 * 60 * 60 * 1000).toISOString(),
      };
      this.addDoctor(doc);
    }
  }

  public addDoctor(doctor: Doctor): void {
    this.doctors.set(doctor.id, { ...doctor });
    this.userToDoctorId.set(doctor.user_id, doctor.id);
  }

  public updateDoctor(doctor: Doctor): void {
    this.doctors.set(doctor.id, { ...doctor, updated_at: new Date().toISOString() });
    this.userToDoctorId.set(doctor.user_id, doctor.id);
  }

  public getDoctorById(id: string): Doctor | undefined {
    const doc = this.doctors.get(id);
    return doc ? { ...doc } : undefined;
  }

  public getDoctorByUserId(userId: string): Doctor | undefined {
    const docId = this.userToDoctorId.get(userId);
    if (!docId) return undefined;
    return this.getDoctorById(docId);
  }

  public getDoctorByEmail(email: string): Doctor | undefined {
    for (const doc of this.doctors.values()) {
      if (doc.email.toLowerCase().trim() === email.toLowerCase().trim()) {
        return { ...doc };
      }
    }
    return undefined;
  }

  public getAllDoctors(): Doctor[] {
    return Array.from(this.doctors.values()).map(d => ({ ...d }));
  }

  public checkExpiredLicenses(): number {
    let suspendedCount = 0;
    const now = new Date();
    for (const doc of this.doctors.values()) {
      if (['approved', 'pending'].includes(doc.status)) {
        const expiryDate = new Date(doc.license_expiry);
        if (expiryDate < now) {
          doc.status = 'suspended';
          doc.suspended_at = doc.suspended_at || now.toISOString();
          doc.affected_bookings_count = doc.affected_bookings_count || 4;
          this.updateDoctor(doc);
          suspendedCount++;
        }
      }
    }
    return suspendedCount;
  }

  public addUser(user: User): void {
    this.users.set(user.id, { ...user });
    this.emailToId.set(user.email.toLowerCase(), user.id);
  }

  public updateUser(user: User): void {
    this.users.set(user.id, { ...user });
    this.emailToId.set(user.email.toLowerCase(), user.id);
  }

  public findByEmail(email: string): User | undefined {
    const id = this.emailToId.get(email.toLowerCase().trim());
    if (!id) return undefined;
    const user = this.users.get(id);
    return user ? { ...user } : undefined;
  }

  public findById(id: string): User | undefined {
    const user = this.users.get(id);
    return user ? { ...user } : undefined;
  }

  public findByVerificationToken(token: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.verification_token === token) {
        return { ...user };
      }
    }
    return undefined;
  }

  public resetAll(): void {
    this.users.clear();
    this.emailToId.clear();
    this.doctors.clear();
    this.userToDoctorId.clear();
    this.seedDefaultUsers();
  }
}

export const db = new Database();
