// ---------------------------------------------------------------------------
//  Report routes -- POST /api/report (user reports for admin)
// ---------------------------------------------------------------------------

import { Router } from 'express';
import { validate } from '../middleware/validate';
import { reportSchema } from '../schemas';
import * as reportService from '../services/report.service';
import * as userService from '../services/user.service';
import logger from '../logger';
import type { AppUser } from '../types';

const router = Router();

// POST /api/report -- submit a report (logged-in user reports another user)
router.post('/report', validate(reportSchema), (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Login required to report' });
  }
  const reporter = req.user as AppUser;
  const { reportedUserId, description } = req.body as { reportedUserId: string; description: string };
  if (reporter.id === reportedUserId) {
    return res.status(400).json({ error: 'Cannot report yourself' });
  }
  const reported = userService.getUserById(reportedUserId);
  if (!reported) {
    return res.status(400).json({ error: 'Reported user not found' });
  }
  const report = reportService.addReport(
    reporter.id,
    reporter.displayName ?? null,
    reportedUserId,
    reported.displayName ?? null,
    description
  );
  logger.info(
    { reporterUserId: reporter.id, reportedUserId, reportId: report.id },
    'User report submitted'
  );
  res.status(201).json({ ok: true, id: report.id });
});

export default router;
