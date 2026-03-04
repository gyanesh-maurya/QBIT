import { useState, useCallback } from 'react';
import type { OnlineUser } from '../types';

interface Props {
  onlineUsers: OnlineUser[];
  apiUrl: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function ReportDialog({ onlineUsers, apiUrl, onClose, onSubmitted }: Props) {
  const [reportedUserId, setReportedUserId] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const uid = reportedUserId.trim();
      const desc = description.trim();
      if (!uid || !desc) {
        setError('Please select a user and enter a short description.');
        return;
      }
      if (desc.length > 500) {
        setError('Description must be 500 characters or less.');
        return;
      }
      setError(null);
      setSubmitting(true);
      try {
        const res = await fetch(`${apiUrl}/api/report`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportedUserId: uid, description: desc }),
        });
        if (res.ok) {
          onSubmitted();
          onClose();
          return;
        }
        const data = await res.json();
        setError(data.error || 'Failed to submit report');
      } catch {
        setError('Network error');
      } finally {
        setSubmitting(false);
      }
    },
    [reportedUserId, description, apiUrl, onClose, onSubmitted]
  );

  return (
    <div className="poke-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="poke-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="poke-header">
          <span className="poke-title">Report user</span>
          <button className="poke-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <p className="report-dialog-desc">
          Report a user for harassment or abuse. Reports are reviewed by admins.
        </p>
        <form onSubmit={handleSubmit} className="report-form">
          <label className="report-label">
            User to report
            <select
              value={reportedUserId}
              onChange={(e) => setReportedUserId(e.target.value)}
              className="poke-input"
              required
            >
              <option value="">Select online user...</option>
              {onlineUsers.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.displayName} ({u.userId})
                </option>
              ))}
            </select>
          </label>
          <label className="report-label">
            Brief description of the issue
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="poke-input report-textarea"
              placeholder="What happened?"
              maxLength={500}
              rows={4}
              required
            />
            <span className="poke-char-count">{description.length}/500</span>
          </label>
          {error && <p className="report-error" role="alert">{error}</p>}
          <div className="report-actions">
            <button type="button" className="btn report-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn report-submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
