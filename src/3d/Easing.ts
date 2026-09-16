export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function easeInCubic(t: number): number {
  return t * t * t;
}

export function easeOutSine(t: number): number {
  return Math.sin((t * Math.PI) / 2);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Maps a running clock value into a 0..1, eased progress for the [start, end] window —
 * the building block every scripted camera/light beat in the 3D scenes is written against.
 */
export function windowProgress(time: number, start: number, end: number, ease: (t: number) => number = (t) => t): number {
  if (end <= start) return time >= start ? 1 : 0;
  return ease(clamp01((time - start) / (end - start)));
}
