import type { Difficulty } from '../systems/Difficulty';
import type { EndingKind } from '../systems/GameState';

export type RunOutcome = 'escaped' | 'died';

export interface RunResult {
  outcome: RunOutcome;
  endingKind?: EndingKind;
  cause?: string;
  difficulty: Difficulty;
  missionsCompleted: number;
  totalMissions: number;
  elapsedMs: number;
  timestamp: number;
}

const DIFFICULTY_MULT: Record<Difficulty, number> = { easy: 0.7, normal: 1, hard: 1.45, nightmare: 2 };
const ENDING_BONUS: Record<EndingKind, number> = { escape: 0, destroy: 300, free: 550 };

/**
 * Missions completed and difficulty dominate the score; time only lightly rewards speed (capped
 * penalty) so a careful, thorough run isn't automatically worse than a fast, lucky one.
 */
export function computeScore(result: RunResult): number {
  const base = result.missionsCompleted * 260;
  const completionBonus = result.outcome === 'escaped' ? 900 : 0;
  const endingBonus = result.endingKind ? ENDING_BONUS[result.endingKind] : 0;
  const minutes = result.elapsedMs / 60000;
  const timePenalty = Math.min(500, minutes * 14);
  const raw = (base + completionBonus + endingBonus - timePenalty) * DIFFICULTY_MULT[result.difficulty];
  return Math.max(0, Math.round(raw));
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
