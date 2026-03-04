/**
 * Poke history stored in localStorage. Keeps only last 24 hours.
 */

const STORAGE_KEY = 'qbit_poke_history';
const TTL_MS = 24 * 60 * 60 * 1000;

export interface PokeHistoryEntry {
  at: number;
  fromUserId: string;
  fromName: string;
  direction: 'sent' | 'received';
  text?: string;
}

function prune(entries: PokeHistoryEntry[]): PokeHistoryEntry[] {
  const cutoff = Date.now() - TTL_MS;
  return entries.filter((e) => e.at >= cutoff);
}

export function getPokeHistory(): PokeHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PokeHistoryEntry[];
    const pruned = prune(Array.isArray(parsed) ? parsed : []);
    if (pruned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
    }
    return pruned.sort((a, b) => b.at - a.at);
  } catch {
    return [];
  }
}

export function addPokeHistory(entry: Omit<PokeHistoryEntry, 'at'>): void {
  const full: PokeHistoryEntry = { ...entry, at: Date.now() };
  const list = prune([...getPokeHistory(), full]);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // quota or disabled
  }
}

export function clearPokeHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
