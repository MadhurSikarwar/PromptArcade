import type Phaser from 'phaser';
import { COLORS, DEPTH } from '../utils/Constants';
import type { GameState } from './GameState';

const VISIBLE_SOURCES = new Set(['sprint', 'emp', 'hack', 'hack-fail', 'door', 'decoy', 'hazard', 'lockdown']);

/**
 * Noise gives A-3 an approximate location only. Player-made noise is drawn as a faint ring so
 * the player can learn how loud their actions are.
 */
export class NoiseSystem {
  private readonly off: () => void;

  constructor(scene: Phaser.Scene, state: GameState) {
    this.off = state.events.on('noise', ({ x, y, radius, source }) => {
      if (!VISIBLE_SOURCES.has(source) || radius < 140) return;
      const ring = scene.add.circle(x, y, 10).setStrokeStyle(2, source === 'decoy' ? COLORS.magenta : COLORS.white, 0.35).setDepth(DEPTH.fx);
      ring.isFilled = false;
      scene.tweens.add({
        targets: ring,
        radius: Math.min(radius, 420),
        alpha: 0,
        duration: 700,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
      });
    });
  }

  destroy(): void {
    this.off();
  }
}
