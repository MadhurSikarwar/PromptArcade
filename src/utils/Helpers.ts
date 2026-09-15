import type Phaser from 'phaser';

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Frame-rate independent exponential smoothing toward a target. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export function toCss(color: number, alpha = 1): string {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
}

export function toHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export function mixColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

/** Text meter such as "██████░░░░" used by HUD and debug readouts. */
export function segmentBar(ratio: number, segments: number): string {
  const filled = Math.round(clamp(ratio, 0, 1) * segments);
  return '█'.repeat(filled) + '░'.repeat(segments - filled);
}

/** Deterministic PRNG (mulberry32) so procedural map decoration is identical every run. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function requireKeyboard(scene: Phaser.Scene): Phaser.Input.Keyboard.KeyboardPlugin {
  const keyboard = scene.input.keyboard;
  if (!keyboard) {
    throw new Error(`Keyboard input unavailable in scene ${scene.scene.key}`);
  }
  return keyboard;
}
