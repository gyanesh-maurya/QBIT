// ---------------------------------------------------------------------------
//  Report service -- user reports for admin review
// ---------------------------------------------------------------------------

import db from '../db';

const stmtInsert = db.prepare(
  'INSERT INTO reports (reporterUserId, reporterName, reportedUserId, reportedUserName, description, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
);
const stmtAll = db.prepare('SELECT * FROM reports ORDER BY createdAt DESC');
const stmtGetById = db.prepare('SELECT * FROM reports WHERE id = ?');
const stmtDelete = db.prepare('DELETE FROM reports WHERE id = ?');

export interface ReportRow {
  id: number;
  reporterUserId: string;
  reporterName: string | null;
  reportedUserId: string;
  reportedUserName: string | null;
  description: string;
  createdAt: string;
}

export function addReport(
  reporterUserId: string,
  reporterName: string | null,
  reportedUserId: string,
  reportedUserName: string | null,
  description: string
): ReportRow {
  const createdAt = new Date().toISOString();
  const result = stmtInsert.run(
    reporterUserId,
    reporterName ?? null,
    reportedUserId,
    reportedUserName ?? null,
    description,
    createdAt
  );
  const row = stmtGetById.get(result.lastInsertRowid) as ReportRow;
  return row;
}

export function getAllReports(): ReportRow[] {
  return stmtAll.all() as ReportRow[];
}

export function deleteReport(id: number): boolean {
  const result = stmtDelete.run(id);
  return result.changes > 0;
}
