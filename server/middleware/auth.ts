import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 't_global_gold_loan_portal_dev_jwt_secret_2026';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

export function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized: Authentication token is required.',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
      name: string;
      role: string;
    };

    if (decoded.role !== 'admin') {
      res.status(403).json({
        error: 'Forbidden: Administrative privileges required.',
        code: 'FORBIDDEN',
      });
      return;
    }

    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({
      error: 'Unauthorized: Invalid or expired session token.',
      code: 'TOKEN_INVALID',
    });
  }
}
