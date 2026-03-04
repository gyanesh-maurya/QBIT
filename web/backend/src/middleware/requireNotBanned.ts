// ---------------------------------------------------------------------------
//  Reject banned users on state-changing API (use after auth is established)
// ---------------------------------------------------------------------------

import type { Request, Response, NextFunction } from 'express';
import { isBanned } from '../services/ban.service';
import type { AppUser } from '../types';

export function requireNotBanned(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    next();
    return;
  }
  const user = req.user as AppUser;
  const clientIp = req.ip || req.socket?.remoteAddress || '';
  if (isBanned(user.id, clientIp)) {
    res.status(403).json({ error: 'Account or IP is banned' });
    return;
  }
  next();
}
