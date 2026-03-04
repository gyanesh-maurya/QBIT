// ---------------------------------------------------------------------------
//  Opaque public user id (stable, not reversible to Google userId)
// ---------------------------------------------------------------------------

import crypto from 'crypto';
import db from '../db';

const stmtGet = db.prepare('SELECT publicId FROM user_public_ids WHERE userId = ?');
const stmtGetByPublic = db.prepare('SELECT userId FROM user_public_ids WHERE publicId = ?');
const stmtInsert = db.prepare('INSERT INTO user_public_ids (userId, publicId) VALUES (?, ?)');

function generatePublicId(): string {
  return crypto.randomBytes(12).toString('hex');
}

export function ensurePublicUserId(userId: string): string {
  const row = stmtGet.get(userId) as { publicId: string } | undefined;
  if (row) return row.publicId;
  let publicId = generatePublicId();
  for (let i = 0; i < 5; i++) {
    try {
      stmtInsert.run(userId, publicId);
      return publicId;
    } catch {
      // Race: another request may have inserted same userId; re-read and return if present
      const again = stmtGet.get(userId) as { publicId: string } | undefined;
      if (again) return again.publicId;
      publicId = generatePublicId();
    }
  }
  throw new Error('Failed to generate unique public user id');
}

export function getUserIdFromPublicId(publicId: string): string | null {
  const row = stmtGetByPublic.get(publicId) as { userId: string } | undefined;
  return row?.userId ?? null;
}
