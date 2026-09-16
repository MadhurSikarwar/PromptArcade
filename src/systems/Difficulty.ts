export type Difficulty = 'easy' | 'normal' | 'hard' | 'nightmare';

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
  /** Multiplies A-3's attack damage on top of the growth curve driven by mission progress. */
  damageMult: number;
  /** Multiplies how large A-3 visually grows as the run progresses. */
  growthMult: number;
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
    damageMult: 0.78,
    growthMult: 0.8,
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
    damageMult: 1,
    growthMult: 1,
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
    damageMult: 1.25,
    growthMult: 1.2,
  },
  nightmare: {
    id: 'nightmare',
    label: 'NIGHTMARE',
    tagline: 'It grows fast, hits hard, and never fully calms down.',
    awarenessMult: 1.7,
    hearingMult: 1.55,
    speedMult: 1.3,
    alertGainMult: 1.7,
    alertDecayMult: 0.5,
    hackForgivenessMult: 0.55,
    startEmpCharges: 1,
    empCooldownMult: 1.6,
    stunDurationMult: 0.5,
    lockdownMsMult: 1.6,
    damageMult: 1.6,
    growthMult: 1.5,
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
