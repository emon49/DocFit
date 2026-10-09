import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'docfit-secure-jwt-secret-key-2026';
const TOKEN_EXPIRY = '15m'; // 15-minute short-lived access token as per architectural spec

export interface TokenPayload {
  id: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    return;
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired access token' });
    return;
  }

  req.user = payload;
  next();
}

export function requireRole(...allowedRoles: Array<'patient' | 'doctor' | 'admin'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Return 403 Forbidden with no data as required by TC-03
      res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}`
      });
      return;
    }

    next();
  };
}

export function validatePassword(password: string): { valid: boolean; reason?: string } {
  if (!password || password.length < 12) {
    return { valid: false, reason: 'Password must be at least 12 characters long.' };
  }
  return { valid: true };
}
