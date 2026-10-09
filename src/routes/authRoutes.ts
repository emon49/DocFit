import { Router, Request, Response } from 'express';
import Database from 'better-sqlite3';
import { z } from 'zod';
import crypto from 'crypto';
import { SmsAdapter } from '../services/smsAdapter';
import { requestOtp, verifyOtp, generateToken } from '../services/otpService';

const requestOtpSchema = z.object({
  phone: z.string().min(10, 'Valid phone number is required'),
});

const verifyOtpSchema = z.object({
  phone: z.string().min(10, 'Valid phone number is required'),
  otp: z.string().length(6, '6-digit OTP code is required'),
});

const registerSchema = z.object({
  phone: z.string().min(10, 'Valid phone number is required'),
  name: z.string().min(1, 'Full name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  email: z.string().email('Invalid email address').nullable().optional(),
});

export function createAuthRouter(db: Database.Database, smsAdapter: SmsAdapter): Router {
  const router = Router();

  // 1. POST /api/auth/otp/request
  router.post('/otp/request', async (req: Request, res: Response): Promise<void> => {
    const parseResult = requestOtpSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'INVALID_INPUT', details: parseResult.error.format() });
      return;
    }

    const { phone } = parseResult.data;

    try {
      const result = await requestOtp(db, phone, smsAdapter);
      res.status(200).json(result);
    } catch (err: any) {
      if (err.message.startsWith('ACCOUNT_LOCKED:')) {
        const remainingMinutes = err.message.split(':')[1];
        res.status(429).json({
          error: 'ACCOUNT_LOCKED',
          message: `Too many wrong attempts. Phone number locked for ${remainingMinutes} minutes.`,
        });
        return;
      }
      res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  });

  // 2. POST /api/auth/otp/verify
  router.post('/otp/verify', (req: Request, res: Response): void => {
    const parseResult = verifyOtpSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'INVALID_INPUT', details: parseResult.error.format() });
      return;
    }

    const { phone, otp } = parseResult.data;

    try {
      const result = verifyOtp(db, phone, otp);
      res.status(200).json(result);
    } catch (err: any) {
      if (err.message.startsWith('ACCOUNT_LOCKED:')) {
        const remainingMinutes = err.message.split(':')[1];
        res.status(429).json({
          error: 'ACCOUNT_LOCKED',
          message: `5 consecutive wrong OTP attempts. Phone number locked for ${remainingMinutes} minutes.`,
        });
        return;
      }
      if (err.message === 'OTP_EXPIRED') {
        res.status(400).json({
          error: 'OTP_EXPIRED',
          message: 'The OTP code has expired. Please request a new one.',
        });
        return;
      }
      if (err.message.startsWith('INVALID_OTP:')) {
        const remainingAttempts = err.message.split(':')[1];
        res.status(400).json({
          error: 'INVALID_OTP',
          message: `Incorrect OTP. ${remainingAttempts} attempt(s) remaining.`,
        });
        return;
      }
      if (err.message === 'NO_OTP_REQUESTED') {
        res.status(400).json({
          error: 'NO_OTP_REQUESTED',
          message: 'No active OTP request found for this phone number.',
        });
        return;
      }
      res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  });

  // 3. POST /api/auth/register
  router.post('/register', (req: Request, res: Response): void => {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'INVALID_INPUT', details: parseResult.error.format() });
      return;
    }

    const { phone, name, dateOfBirth, gender, email } = parseResult.data;

    // Check that OTP has been verified
    const verifiedSession = db
      .prepare(
        `SELECT * FROM otp_sessions WHERE phone = ? AND is_verified = 1 ORDER BY created_at DESC LIMIT 1`
      )
      .get(phone);

    if (!verifiedSession) {
      res.status(400).json({
        error: 'OTP_NOT_VERIFIED',
        message: 'Phone number must be verified via OTP before registration.',
      });
      return;
    }

    // Check if phone already registered
    const existingPatient = db
      .prepare(`SELECT * FROM patients WHERE phone = ?`)
      .get(phone);

    if (existingPatient) {
      res.status(400).json({
        error: 'PHONE_ALREADY_REGISTERED',
        message: 'This phone number is already registered. Please log in.',
      });
      return;
    }

    const now = new Date();
    const patientId = crypto.randomUUID();
    const cleanEmail = email ? email.trim() : null;

    // Create Patient
    db.prepare(
      `INSERT INTO patients (id, phone, name, date_of_birth, gender, email, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(patientId, phone, name, dateOfBirth, gender, cleanEmail, now.toISOString(), now.toISOString());

    // Create Session
    const token = generateToken();
    const sessionExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const patientSessionId = crypto.randomUUID();

    db.prepare(
      `INSERT INTO patient_sessions (id, patient_id, token, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(patientSessionId, patientId, token, sessionExpiresAt, now.toISOString());

    const notice = !cleanEmail
      ? 'Prescription PDFs cannot be emailed until an email address is added to your profile.'
      : undefined;

    res.status(201).json({
      patient: {
        id: patientId,
        phone,
        name,
        dateOfBirth,
        gender,
        email: cleanEmail,
      },
      token,
      notice,
    });
  });

  // 4. GET /api/auth/me
  router.get('/me', (req: Request, res: Response): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Bearer token required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const session = db
      .prepare(
        `SELECT ps.*, p.phone, p.name, p.date_of_birth, p.gender, p.email
         FROM patient_sessions ps
         JOIN patients p ON ps.patient_id = p.id
         WHERE ps.token = ? AND ps.expires_at > ?`
      )
      .get(token, new Date().toISOString()) as {
      patient_id: string;
      phone: string;
      name: string;
      date_of_birth: string;
      gender: string;
      email: string | null;
    } | undefined;

    if (!session) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or expired session token' });
      return;
    }

    res.status(200).json({
      patient: {
        id: session.patient_id,
        phone: session.phone,
        name: session.name,
        dateOfBirth: session.date_of_birth,
        gender: session.gender,
        email: session.email,
      },
    });
  });

  // 5. POST /api/auth/logout
  router.post('/logout', (req: Request, res: Response): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Bearer token required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    db.prepare(`DELETE FROM patient_sessions WHERE token = ?`).run(token);

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  });

  return router;
}
