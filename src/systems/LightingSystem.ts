import Phaser from 'phaser';
import type { FacilityMap } from '../map/FacilityMap';
import { CORRIDORS } from '../map/MapData';
import { CAMERA_ZOOM, DEPTH, GAME_HEIGHT, GAME_WIDTH, TEXTURES, TILE_SIZE } from '../utils/Constants';
import type { GameState, LightingMode } from './GameState';

const MARGIN = 96;

interface TempLight {
  x: number;
  y: number;
  scale: number;
  alpha: number;
  until: number;
}

/** Functional lighting: a darkness layer with light "holes" for rooms, corridors, the diver's lamp and temporary sources. */
export class LightingSystem {
  private readonly rt: Phaser.GameObjects.RenderTexture;
  private readonly roomOffUntil = new Map<string, number>();
  private readonly temp: TempLight[] = [];
  private blackoutUntil = 0;
  permanentBlackout = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly state: GameState,
    private readonly map: FacilityMap,
  ) {
    const w = Math.ceil(GAME_WIDTH / CAMERA_ZOOM) + MARGIN * 2;
    const h = Math.ceil(GAME_HEIGHT / CAMERA_ZOOM) + MARGIN * 2;
    this.rt = scene.add.renderTexture(0, 0, w, h).setOrigin(0, 0).setDepth(DEPTH.darkness);
  }

  get mode(): LightingMode {
    const power = this.state.facility.power;
    if (power >= 100) return 'NORMAL';
    if (power >= 35) return 'EMERGENCY';
    return 'POWER_OFF';
  }

  isBlackout(now: number): boolean {
    return this.permanentBlackout || now < this.blackoutUntil;
  }

  blackout(now: number, ms: number): void {
    this.blackoutUntil = Math.max(this.blackoutUntil, now + ms);
  }

  setRoomLights(roomId: string, on: boolean, now: number, ms = 60000): void {
    if (on) this.roomOffUntil.delete(roomId);
    else this.roomOffUntil.set(roomId, now + ms);
  }

  isRoomLit(roomId: string | null, now: number): boolean {
    if (this.isBlackout(now)) return false;
    if (!roomId) return true;
    const until = this.roomOffUntil.get(roomId);
    return until === undefined || now >= until;
  }

  addTempLight(x: number, y: number, scale: number, alpha: number, now: number, ms: number): void {
    this.temp.push({ x, y, scale, alpha, until: now + ms });
  }

  /** 0..1+ multiplier on how far A-3 can see the player. */
  visibilityFactor(roomId: string | null, now: number, sprinting: boolean): number {
    let f = 1;
    if (!this.isRoomLit(roomId, now)) f *= 0.5;
    if (this.mode === 'POWER_OFF') f *= 0.8;
    if (!this.state.player.flashlight) f *= 0.55;
    if (sprinting) f = Math.max(f, 0.85);
    return f;
  }

  isPlayerInDark(now: number): boolean {
    return !this.isRoomLit(this.state.currentRoomId, now) || !this.state.player.flashlight;
  }

  update(now: number, px: number, py: number, facing: number): void {
    this.state.facility.lighting = this.mode;
    const view = this.scene.cameras.main.worldView;
    const ox = Math.floor(view.x - MARGIN);
    const oy = Math.floor(view.y - MARGIN);
    const rt = this.rt;
    rt.setPosition(ox, oy);
    rt.clear();

    const blackout = this.isBlackout(now);
    const mode = this.mode;
    // Lights stay ON by default; a short blink flicker every ~9s, full blackout only for scripted moments.
    const blinkPhase = now % 9000;
    const blinking = blinkPhase < 220;
    let darkness = blinking ? 0.6 : 0.06;
    if (blackout) darkness = 0.97;
    rt.fill(0x000000, darkness);

    const viewRect = new Phaser.Geom.Rectangle(ox, oy, rt.width, rt.height);
    const roomStrength = blackout ? 0 : blinking ? 0.3 : 1;

    if (roomStrength > 0) {
      this.map.rooms.forEach((room, index) => {
        if (!Phaser.Geom.Intersects.RectangleToRectangle(room.bounds, viewRect)) return;
        if (!this.isRoomLit(room.info.id, now)) return;
        const flicker = mode === 'NORMAL' ? 1 : 0.82 + Math.sin(now * 0.004 + index * 1.7) * 0.1 + (Math.random() < 0.02 ? -0.3 : 0);
        const scale = (Math.max(room.bounds.width, room.bounds.height) * 0.78) / 64;
        rt.stamp(TEXTURES.glow, undefined, room.centerX - ox, room.centerY - oy, { scale, alpha: roomStrength * flicker, erase: true });
      });
      for (const c of CORRIDORS) {
        const cx = (c.x + c.w / 2) * TILE_SIZE;
        const cy = (c.y + c.h / 2) * TILE_SIZE;
        if (!viewRect.contains(cx, cy)) continue;
        const scale = (Math.max(c.w, c.h) * TILE_SIZE * 0.7) / 64;
        rt.stamp(TEXTURES.glow, undefined, cx - ox, cy - oy, { scale: Math.max(1.4, scale), alpha: roomStrength * 0.55, erase: true });
      }
    }

    for (let i = this.temp.length - 1; i >= 0; i--) {
      const light = this.temp[i];
      if (now >= light.until) {
        this.temp.splice(i, 1);
        continue;
      }
      rt.stamp(TEXTURES.glow, undefined, light.x - ox, light.y - oy, { scale: light.scale, alpha: light.alpha, erase: true });
    }

    const lamp = this.state.player.flashlight;
    rt.stamp(TEXTURES.glow, undefined, px - ox, py - oy, { scale: lamp ? 2.1 : 1.0, alpha: lamp ? 0.9 : 0.6, erase: true });
    if (lamp && this.state.player.alive) {
      rt.stamp(TEXTURES.cone, undefined, px - ox, py - oy, { rotation: facing, originX: 0, originY: 0.5, scale: 1.25, alpha: 0.95, erase: true });
    }
  }
}
