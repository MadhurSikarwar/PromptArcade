import Phaser from 'phaser';
import type { FacilityMap } from '../map/FacilityMap';
import { COLORS, DEPTH, FLOOD_RISE_MS, TEXTURES } from '../utils/Constants';
import { audio } from './AudioManager';
import type { GameState } from './GameState';

interface FloodRoom {
  id: string;
  bounds: Phaser.Geom.Rectangle;
}

/**
 * Facility-wide flood covering Zone 1 (the lower level) once the 4-minute timer expires.
 * Water rises uniformly across those rooms over FLOOD_RISE_MS and the player takes oxygen
 * loss only once actually standing in the submerged portion of a room.
 */
export class FloodSystem {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly rooms: FloodRoom[];
  private readonly zoneIds: Set<string>;
  private readonly emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private lastSplashStep = -1;
  private submerged = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly state: GameState,
    map: FacilityMap,
  ) {
    const zoneRooms = map.rooms.filter((r) => r.info.zone === 1);
    this.rooms = zoneRooms.map((r) => ({ id: r.info.id, bounds: r.bounds }));
    this.zoneIds = new Set(zoneRooms.map((r) => r.info.id));
    this.gfx = scene.add.graphics().setDepth(DEPTH.hazards);
    this.emitter = scene.add
      .particles(0, 0, TEXTURES.dot, {
        emitting: false,
        lifespan: 1400,
        speedY: { min: -26, max: -55 },
        speedX: { min: -10, max: 10 },
        scale: { start: 0.22, end: 0 },
        alpha: { start: 0.55, end: 0 },
        tint: COLORS.cyan,
        frequency: 70,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(DEPTH.aboveDark);
  }

  get level(): number {
    if (!this.state.flooding) return 0;
    return Phaser.Math.Clamp((this.scene.time.now - this.state.floodStartAt) / FLOOD_RISE_MS, 0, 1);
  }

  isRoomAffected(roomId: string | null): boolean {
    return this.state.flooding && roomId !== null && this.zoneIds.has(roomId);
  }

  isPlayerSubmerged(): boolean {
    return this.submerged;
  }

  trigger(now: number): void {
    if (this.state.flooding) return;
    this.state.flooding = true;
    this.state.floodStartAt = now;
    audio.play('alarm', 0.4);
    audio.play('thunder', 0.5);
    this.state.notify('FACILITY FLOODING — WATER IS RISING', 'danger');
    this.state.say('DIVER', 'The lower levels are flooding. I need to move.');
  }

  update(now: number, px: number, py: number): void {
    const g = this.gfx;
    g.clear();
    this.submerged = false;
    if (!this.state.flooding) {
      this.emitter.stop();
      return;
    }
    const level = this.level;
    if (level > 0.01) {
      for (const room of this.rooms) {
        const b = room.bounds;
        const waterTop = b.bottom - b.height * level;
        g.fillStyle(0x1a5f8f, 0.28);
        g.fillRect(b.x, waterTop, b.width, b.bottom - waterTop);
        g.lineStyle(2, COLORS.cyan, 0.4);
        g.beginPath();
        const steps = Math.max(2, Math.floor(b.width / 14));
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const x = b.x + t * b.width;
          const y = waterTop + Math.sin(now * 0.003 + x * 0.08) * 2.5;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.strokePath();
        if (px >= b.x && px <= b.right && py >= waterTop && py <= b.bottom) this.submerged = true;
      }
    }

    if (this.submerged) {
      this.emitter.setPosition(px, py);
      this.emitter.start();
    } else {
      this.emitter.stop();
    }

    const step = Math.floor(level * 4);
    if (step !== this.lastSplashStep && step > 0 && step < 4) {
      this.lastSplashStep = step;
      audio.play('splash', 0.5);
    }
  }
}
