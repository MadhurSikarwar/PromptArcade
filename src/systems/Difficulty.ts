export type Difficulty = 'easy' | 'normal' | 'hard';

export interface DifficultyTuning {
  id: Difficulty;
  label: string;
  tagline: string;
  /** How fast A-3's awareness climbs while it can see the player. */
  awarenessMult: number;
  /** Multiplies the radius at which A-3 reacts to noise. */
  hearingMult: number;
  /** Multiplies A-3's movement speed in every state. */
  speedMult: number;
  /** Multiplies how fast the facility alert rises (cameras, sprinting). */
  alertGainMult: number;
  /** Multiplies how fast the facility alert cools back down. */
  alertDecayMult: number;
  /** Multiplies the time allowed in the hacking minigame before the trace completes. */
  hackForgivenessMult: number;
  startEmpCharges: number;
  empCooldownMult: number;
  stunDurationMult: number;
  lockdownMsMult: number;
}

export const DIFFICULTY_PRESETS: Record<Difficulty, DifficultyTuning> = {
  easy: {
    id: 'easy',
    label: 'EASY',
    tagline: 'See the story. A gentler Kraken.',
    awarenessMult: 0.68,
    hearingMult: 0.72,
    speedMult: 0.86,
    alertGainMult: 0.65,
    alertDecayMult: 1.5,
    hackForgivenessMult: 1.4,
    startEmpCharges: 3,
    empCooldownMult: 0.7,
    stunDurationMult: 1.35,
    lockdownMsMult: 0.7,
  },
  normal: {
    id: 'normal',
    label: 'NORMAL',
    tagline: 'The intended Kraken experience.',
    awarenessMult: 1,
    hearingMult: 1,
    speedMult: 1,
    alertGainMult: 1,
    alertDecayMult: 1,
    hackForgivenessMult: 1,
    startEmpCharges: 2,
    empCooldownMult: 1,
    stunDurationMult: 1,
    lockdownMsMult: 1,
  },
  hard: {
    id: 'hard',
    label: 'HARD',
    tagline: 'It hunts faster, hears more, forgives nothing.',
    awarenessMult: 1.38,
    hearingMult: 1.3,
    speedMult: 1.15,
    alertGainMult: 1.35,
    alertDecayMult: 0.68,
    hackForgivenessMult: 0.72,
    startEmpCharges: 1,
    empCooldownMult: 1.3,
    stunDurationMult: 0.68,
    lockdownMsMult: 1.3,
  },
};

let current: Difficulty = 'normal';

export function getDifficulty(): Difficulty {
  return current;
}

export function setDifficulty(next: Difficulty): void {
  current = next;
}

export function getDifficultyTuning(): DifficultyTuning {
  return DIFFICULTY_PRESETS[current];
}
