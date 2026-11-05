import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../prisma';

export interface AuthTokenPayload {
  userId: number;
  email: string;
  role: 'STUDENT' | 'INSTRUCTOR';
  jti: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        fullName: string;
        studentCode: string | null;
        role: 'STUDENT' | 'INSTRUCTOR';
      };
      tokenJti?: string;
      rawToken?: string;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-local-course-pms-jwt-secret-2026';

// In-memory revocation registry for logged-out tokens (AC-03)
const revokedJtis = new Set<string>();
const revokedRawTokens = new Set<string>();

export function signAuthToken(user: {
  id: number;
  email: string;
  role: 'STUDENT' | 'INSTRUCTOR';
}): string {
  const jti = crypto.randomUUID();
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      jti,
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

export function revokeAuthToken(jti?: string, rawToken?: string): void {
  if (jti) revokedJtis.add(jti);
  if (rawToken) revokedRawTokens.add(rawToken);
}

export function clearRevokedTokens(): void {
  revokedJtis.clear();
  revokedRawTokens.clear();
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Authentication required. Please provide a valid Bearer token.',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token || revokedRawTokens.has(token)) {
    res.status(401).json({
      error: 'Session token has been logged out or revoked.',
      code: 'TOKEN_REVOKED',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    if (decoded.jti && revokedJtis.has(decoded.jti)) {
      res.status(401).json({
        error: 'Session token has been logged out or revoked.',
        code: 'TOKEN_REVOKED',
      });
      return;
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        studentCode: true,
        role: true,
      },
    });

    if (!dbUser) {
      res.status(401).json({
        error: 'Authenticated user no longer exists.',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    req.user = dbUser;
    req.tokenJti = decoded.jti;
    req.rawToken = token;
    next();
  } catch {
    res.status(401).json({
      error: 'Invalid or expired authentication token.',
      code: 'UNAUTHORIZED',
    });
  }
}

export function requireRole(...allowedRoles: Array<'STUDENT' | 'INSTRUCTOR'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required.',
        code: 'UNAUTHORIZED',
      });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: operation requires role ${allowedRoles.join(' or ')}.`,
        code: 'BR06_FORBIDDEN_ROLE',
      });
      return;
    }
    next();
  };
}
