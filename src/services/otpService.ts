import Database from 'better-sqlite3';
import crypto from 'crypto';
import { SmsAdapter } from './smsAdapter';

export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(`docfit_salt_${otp}`).digest('hex');
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export interface OtpRequestResult {
  success: boolean;
  message: string;
  isRegistered: boolean;
  otpForTesting?: string;
}

export interface OtpVerifyResult {
  isNewUser: boolean;
  phone: string;
  token?: string;
  patient?: {
    id: string;
    phone: string;
    name: string;
    dateOfBirth: string;
    gender: string;
    email: string | null;
  };
}

export async function requestOtp(
  db: Database.Database,
  phone: string,
  smsAdapter: SmsAdapter
): Promise<OtpRequestResult> {
  const now = new Date();

  // Check if active lockout exists for this phone number
  const lockedSession = db
    .prepare(
      `SELECT locked_until FROM otp_sessions
       WHERE phone = ? AND locked_until IS NOT NULL AND locked_until > ?
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(phone, now.toISOString()) as { locked_until: string } | undefined;

  if (lockedSession) {
    const lockEndTime = new Date(lockedSession.locked_until);
    const remainingMinutes = Math.ceil((lockEndTime.getTime() - now.getTime()) / 60000);
    throw new Error(`ACCOUNT_LOCKED:${remainingMinutes}`);
  }

  // Generate 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = hashOtp(otpCode);
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  const sessionId = crypto.randomUUID();

  // Save OTP session
  db.prepare(
    `INSERT INTO otp_sessions (id, phone, otp_hash, attempts_count, expires_at, is_verified, created_at)
     VALUES (?, ?, ?, 0, ?, 0, ?)`
  ).run(sessionId, phone, otpHash, expiresAt, now.toISOString());

  // Send SMS
  await smsAdapter.sendSms(phone, `Your DocFit verification code is ${otpCode}. Valid for 5 minutes.`);

  // Check if patient is already registered
  const existingPatient = db
    .prepare(`SELECT id FROM patients WHERE phone = ?`)
    .get(phone);

  return {
    success: true,
    message: 'OTP sent successfully',
    isRegistered: !!existingPatient,
    otpForTesting: process.env.NODE_ENV === 'test' ? otpCode : undefined,
  };
}

export function verifyOtp(
  db: Database.Database,
  phone: string,
  otpCode: string
): OtpVerifyResult {
  const now = new Date();

  // Get most recent OTP session
  const session = db
    .prepare(
      `SELECT * FROM otp_sessions WHERE phone = ? ORDER BY created_at DESC LIMIT 1`
    )
    .get(phone) as {
    id: string;
    phone: string;
    otp_hash: string;
    attempts_count: number;
    expires_at: string;
    locked_until: string | null;
    is_verified: number;
  } | undefined;

  if (!session) {
    throw new Error('NO_OTP_REQUESTED');
  }

  // Check if locked
  if (session.locked_until && new Date(session.locked_until) > now) {
    const remainingMinutes = Math.ceil(
      (new Date(session.locked_until).getTime() - now.getTime()) / 60000
    );
    throw new Error(`ACCOUNT_LOCKED:${remainingMinutes}`);
  }

  // Check if expired
  if (new Date(session.expires_at) < now) {
    throw new Error('OTP_EXPIRED');
  }

  const providedHash = hashOtp(otpCode);

  if (providedHash !== session.otp_hash) {
    const newAttempts = session.attempts_count + 1;
    if (newAttempts >= 5) {
      const lockedUntil = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
      db.prepare(
        `UPDATE otp_sessions SET attempts_count = ?, locked_until = ? WHERE id = ?`
      ).run(newAttempts, lockedUntil, session.id);
      throw new Error('ACCOUNT_LOCKED:15');
    } else {
      db.prepare(`UPDATE otp_sessions SET attempts_count = ? WHERE id = ?`).run(
        newAttempts,
        session.id
      );
      throw new Error(`INVALID_OTP:${5 - newAttempts}`);
    }
  }

  // OTP is correct
  db.prepare(`UPDATE otp_sessions SET is_verified = 1 WHERE id = ?`).run(
    session.id
  );

  // Check if registered patient
  const patient = db
    .prepare(`SELECT * FROM patients WHERE phone = ?`)
    .get(phone) as {
    id: string;
    phone: string;
    name: string;
    date_of_birth: string;
    gender: string;
    email: string | null;
  } | undefined;

  if (patient) {
    // Restore session for returning user
    const token = generateToken();
    const sessionExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const patientSessionId = crypto.randomUUID();

    db.prepare(
      `INSERT INTO patient_sessions (id, patient_id, token, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(patientSessionId, patient.id, token, sessionExpiresAt, now.toISOString());

    return {
      isNewUser: false,
      phone,
      token,
      patient: {
        id: patient.id,
        phone: patient.phone,
        name: patient.name,
        dateOfBirth: patient.date_of_birth,
        gender: patient.gender,
        email: patient.email,
      },
    };
  } else {
    return {
      isNewUser: true,
      phone,
    };
  }
}
