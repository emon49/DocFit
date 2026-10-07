import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { createAuthRouter } from './routes/authRoutes';
import { SmsAdapter, MockSmsAdapter } from './services/smsAdapter';

export function createApp(db: Database.Database, smsAdapter: SmsAdapter = new MockSmsAdapter()) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api/auth', createAuthRouter(db, smsAdapter));

  return app;
}
