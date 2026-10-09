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

class Database {
  private users: Map<string, User> = new Map();
  private emailToId: Map<string, string> = new Map();

  constructor() {
    this.seedDefaultUsers();
  }

  public async seedDefaultUsers() {
    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('SecurePassword2026!', salt);

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
    this.seedDefaultUsers();
  }
}

export const db = new Database();
