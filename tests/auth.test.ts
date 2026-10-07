import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createDatabase } from '../src/db/database';
import { createApp } from '../src/app';
import { MockSmsAdapter } from '../src/services/smsAdapter';

describe('Patient Auth Capability (F-01)', () => {
  let db: Database.Database;
  let smsAdapter: MockSmsAdapter;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    db = createDatabase(':memory:');
    smsAdapter = new MockSmsAdapter();
    app = createApp(db, smsAdapter);
  });

  it('Scenario: First-time registration flow', async () => {
    const phone = '+8801711111111';

    // 1. Request OTP
    const reqRes = await request(app)
      .post('/api/auth/otp/request')
      .send({ phone });

    expect(reqRes.status).toBe(200);
    expect(reqRes.body.success).toBe(true);
    expect(reqRes.body.isRegistered).toBe(false);

    // Get sent OTP from mock SMS adapter
    const sms = smsAdapter.getLastMessageForPhone(phone);
    expect(sms).toBeDefined();
    const otpMatch = sms.message.match(/\d{6}/);
    expect(otpMatch).not.toBeNull();
    const otp = otpMatch![0];

    // 2. Verify OTP
    const verifyRes = await request(app)
      .post('/api/auth/otp/verify')
      .send({ phone, otp });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.isNewUser).toBe(true);

    // 3. Register profile
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        phone,
        name: 'Rahim Uddin',
        dateOfBirth: '1990-01-01',
        gender: 'MALE',
        email: null,
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.patient.name).toBe('Rahim Uddin');
    expect(regRes.body.token).toBeDefined();
    expect(regRes.body.notice).toContain('Prescription PDFs cannot be emailed');

    // 4. Verify /api/auth/me session
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${regRes.body.token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.patient.phone).toBe(phone);
  });

  it('Scenario: Returning login', async () => {
    const phone = '+8801722222222';

    // Setup pre-existing registered patient
    db.prepare(
      `INSERT INTO patients (id, phone, name, date_of_birth, gender, email, created_at, updated_at)
       VALUES ('p1', ?, 'Karim Ahmed', '1985-05-05', 'MALE', 'karim@example.com', datetime('now'), datetime('now'))`
    ).run(phone);

    // 1. Request OTP
    const reqRes = await request(app)
      .post('/api/auth/otp/request')
      .send({ phone });

    expect(reqRes.status).toBe(200);
    expect(reqRes.body.isRegistered).toBe(true);

    const sms = smsAdapter.getLastMessageForPhone(phone);
    const otp = sms.message.match(/\d{6}/)![0];

    // 2. Verify OTP
    const verifyRes = await request(app)
      .post('/api/auth/otp/verify')
      .send({ phone, otp });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.isNewUser).toBe(false);
    expect(verifyRes.body.token).toBeDefined();
    expect(verifyRes.body.patient.name).toBe('Karim Ahmed');
    expect(verifyRes.body.patient.email).toBe('karim@example.com');
  });

  it('Scenario: OTP expiry (> 5 minutes)', async () => {
    const phone = '+8801733333333';

    await request(app).post('/api/auth/otp/request').send({ phone });
    const sms = smsAdapter.getLastMessageForPhone(phone);
    const otp = sms.message.match(/\d{6}/)![0];

    // Manually expire the OTP in DB
    const expiredTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    db.prepare(`UPDATE otp_sessions SET expires_at = ? WHERE phone = ?`).run(expiredTime, phone);

    const verifyRes = await request(app)
      .post('/api/auth/otp/verify')
      .send({ phone, otp });

    expect(verifyRes.status).toBe(400);
    expect(verifyRes.body.error).toBe('OTP_EXPIRED');
  });

  it('Scenario: Repeated wrong OTP (5 consecutive attempts trigger 15-min lock)', async () => {
    const phone = '+8801744444444';

    await request(app).post('/api/auth/otp/request').send({ phone });

    // Send wrong OTP 4 times
    for (let i = 1; i <= 4; i++) {
      const res = await request(app)
        .post('/api/auth/otp/verify')
        .send({ phone, otp: '000000' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('INVALID_OTP');
    }

    // 5th wrong attempt triggers lockout
    const fifthRes = await request(app)
      .post('/api/auth/otp/verify')
      .send({ phone, otp: '000000' });

    expect(fifthRes.status).toBe(429);
    expect(fifthRes.body.error).toBe('ACCOUNT_LOCKED');

    // Subsequent OTP request is blocked while phone is locked
    const blockedReq = await request(app)
      .post('/api/auth/otp/request')
      .send({ phone });

    expect(blockedReq.status).toBe(429);
    expect(blockedReq.body.error).toBe('ACCOUNT_LOCKED');
  });

  it('Scenario: Email omitted displays notice', async () => {
    const phone = '+8801755555555';

    await request(app).post('/api/auth/otp/request').send({ phone });
    const otp = smsAdapter.getLastMessageForPhone(phone).message.match(/\d{6}/)![0];
    await request(app).post('/api/auth/otp/verify').send({ phone, otp });

    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        phone,
        name: 'Nusrat Jahan',
        dateOfBirth: '1998-12-12',
        gender: 'FEMALE',
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.patient.email).toBeNull();
    expect(regRes.body.notice).toBe(
      'Prescription PDFs cannot be emailed until an email address is added to your profile.'
    );
  });
});
