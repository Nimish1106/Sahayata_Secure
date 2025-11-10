import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserRequest } from '../types';

export const authenticateToken = (
  req: UserRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    // We expect tokens to contain a `userId` property used across the app.
    const decoded = jwt.verify(token, secret) as { userId?: string; id?: string; email?: string; name?: string; role?: string };
    // Normalize to both `userId` and `id` keys so handlers can read either one
    req.user = {
      userId: decoded.userId ?? (decoded as any).id,
      id: (decoded as any).id ?? decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    };
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};