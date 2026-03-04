// ---------------------------------------------------------------------------
//  Friends and user settings (onlyFriendsCanPoke)
// ---------------------------------------------------------------------------

import db from '../db';

const stmtGetFriends = db.prepare('SELECT friendId FROM friends WHERE userId = ?');
const stmtAddFriend = db.prepare('INSERT OR IGNORE INTO friends (userId, friendId) VALUES (?, ?)');
const stmtRemoveFriend = db.prepare('DELETE FROM friends WHERE userId = ? AND friendId = ?');
const stmtAreFriends = db.prepare(
  'SELECT 1 FROM friends WHERE (userId = ? AND friendId = ?) OR (userId = ? AND friendId = ?) LIMIT 1'
);

const stmtGetSettings = db.prepare('SELECT onlyFriendsCanPoke FROM user_settings WHERE userId = ?');
const stmtSetSettings = db.prepare(
  'INSERT INTO user_settings (userId, onlyFriendsCanPoke) VALUES (?, ?) ON CONFLICT(userId) DO UPDATE SET onlyFriendsCanPoke = excluded.onlyFriendsCanPoke'
);

export function getFriendIds(userId: string): string[] {
  const rows = stmtGetFriends.all(userId) as { friendId: string }[];
  return rows.map((r) => r.friendId);
}

export function addFriend(userIdA: string, userIdB: string): void {
  if (userIdA === userIdB) return;
  stmtAddFriend.run(userIdA, userIdB);
  stmtAddFriend.run(userIdB, userIdA);
}

export function removeFriend(userIdA: string, userIdB: string): void {
  stmtRemoveFriend.run(userIdA, userIdB);
  stmtRemoveFriend.run(userIdB, userIdA);
}

export function areFriends(userIdA: string, userIdB: string): boolean {
  if (userIdA === userIdB) return true;
  const row = stmtAreFriends.get(userIdA, userIdB, userIdB, userIdA);
  return !!row;
}

export function getOnlyFriendsCanPoke(userId: string): boolean {
  const row = stmtGetSettings.get(userId) as { onlyFriendsCanPoke: number } | undefined;
  return row ? row.onlyFriendsCanPoke !== 0 : false;
}

export function setOnlyFriendsCanPoke(userId: string, value: boolean): void {
  stmtSetSettings.run(userId, value ? 1 : 0);
}
