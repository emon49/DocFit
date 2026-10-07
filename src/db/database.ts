import Database from 'better-sqlite3';
import path from 'path';

export function createDatabase(dbPath: string = ':memory:') {
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      gender TEXT NOT NULL,
      email TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS otp_sessions (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      attempts_count INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT NOT NULL,
      locked_until TEXT,
      is_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS patient_sessions (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
    CREATE INDEX IF NOT EXISTS idx_otp_sessions_phone ON otp_sessions(phone);
    CREATE INDEX IF NOT EXISTS idx_patient_sessions_token ON patient_sessions(token);
  `);

  return db;
}
