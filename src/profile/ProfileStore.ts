import { computeScore, type RunResult } from './Scoring';

const HISTORY_PREFIX = 'kraken.log.v1.';
const CUSTOMIZE_PREFIX = 'kraken.loadout.v1.';
const MAX_HISTORY = 50;

export interface LoggedRun extends RunResult {
  score: number;
}

export interface DiverLoadout {
  suitColor: number;
  accentColor: number;
}

export const DEFAULT_LOADOUT: DiverLoadout = { suitColor: 0x23303c, accentColor: 0x19e6ff };

function historyKey(profileId: string): string {
  return HISTORY_PREFIX + profileId;
}

/** The player's "personal log": every run this profile has finished, newest first, capped at 50. */
export function loadHistory(profileId: string): LoggedRun[] {
  try {
    const raw = localStorage.getItem(historyKey(profileId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as LoggedRun[]) : [];
  } catch {
    return [];
  }
}

export function recordRun(profileId: string, result: RunResult): LoggedRun {
  const score = computeScore(result);
  const entry: LoggedRun = { ...result, score };
  const history = loadHistory(profileId);
  history.unshift(entry);
  localStorage.setItem(historyKey(profileId), JSON.stringify(history.slice(0, MAX_HISTORY)));
  return entry;
}

export function bestScore(profileId: string): number {
  return loadHistory(profileId).reduce((best, run) => Math.max(best, run.score), 0);
}

export function topRuns(profileId: string, limit = 10): LoggedRun[] {
  return [...loadHistory(profileId)].sort((a, b) => b.score - a.score).slice(0, limit);
}

export function runCount(profileId: string): number {
  return loadHistory(profileId).length;
}

export function escapeCount(profileId: string): number {
  return loadHistory(profileId).filter((r) => r.outcome === 'escaped').length;
}

// ---------------------------------------------------------------- diver customization

function loadoutKey(profileId: string): string {
  return CUSTOMIZE_PREFIX + profileId;
}

export function loadLoadout(profileId: string): DiverLoadout {
  try {
    const raw = localStorage.getItem(loadoutKey(profileId));
    if (!raw) return { ...DEFAULT_LOADOUT };
    const parsed = JSON.parse(raw) as Partial<DiverLoadout>;
    return { suitColor: parsed.suitColor ?? DEFAULT_LOADOUT.suitColor, accentColor: parsed.accentColor ?? DEFAULT_LOADOUT.accentColor };
  } catch {
    return { ...DEFAULT_LOADOUT };
  }
}

export function saveLoadout(profileId: string, loadout: DiverLoadout): void {
  localStorage.setItem(loadoutKey(profileId), JSON.stringify(loadout));
}
