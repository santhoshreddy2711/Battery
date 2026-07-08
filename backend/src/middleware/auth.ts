import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_red_accent_battery_secret_key_2026';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'staff';
    permissions: string[];
  };
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token missing or invalid.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as AuthRequest).user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token is invalid or expired.' });
  }
}

export function requireRole(role: 'admin' | 'staff') {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthRequest).user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (user.role !== role && user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Insufficient privileges.' });
    }
    next();
  };
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthRequest).user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    // Admin has all permissions
    if (user.role === 'admin' || user.permissions.includes(permission)) {
      return next();
    }
    return res.status(403).json({ message: `Access denied: Missing '${permission}' permission.` });
  };
}
