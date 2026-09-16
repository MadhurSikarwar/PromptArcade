import Phaser from 'phaser';

export type DroneState = 'PATROL' | 'ALERT' | 'DISABLED';

export interface DroneWorld {
  los(x0: number, y0: number, x1: number, y1: number): boolean;
  playerHidden(): boolean;
  /** Fired once per alert trigger — the caller raises facility alert and pings A-3. */
  onSpotted(px: number, py: number, now: number): void;
  /** Fired on a cooldown while alert and in range — the caller deals light damage and shows a tracer. */
  onFire(fromX: number, fromY: number, toX: number, toY: number, now: number): void;
}

const SPEED = 46;
const VISION_RANGE = 190;
const VISION_FOV = Phaser.Math.DegToRad(64);
const FIRE_RANGE = 165;
const FIRE_COOLDOWN_S = 1.5;
const ALERT_HOLD_S = 3.2;
const RESPOT_COOLDOWN_MS = 6000;

/**
 * A patrol drone: vision cone, and — once alerted — periodic light-damage hitscan fire while it
 * keeps line of sight, on top of raising the facility alert and calling A-3's attention. It is
 * still meant to be a secondary pressure, not a second boss: A-3 hits far harder and adapts.
 */
export class DroneBrain {
  x: number;
  y: number;
  facing = 0;
  state: DroneState = 'PATROL';
  private routeIndex = 0;
  private alertTimer = 0;
  private disabledUntil = 0;
  private lastSpottedAt = -Infinity;
  private fireCooldown = 0.6;
  private bob = Math.random() * Math.PI * 2;
  private muzzleFlashUntil = 0;

  constructor(
    private readonly world: DroneWorld,
    private readonly route: readonly { x: number; y: number }[],
    startX: number,
    startY: number,
  ) {
    this.x = startX;
    this.y = startY;
  }

  get isDisabled(): boolean {
    return this.state === 'DISABLED';
  }

  get isFiring(): boolean {
    return this.muzzleFlashUntil > 0;
  }

  disable(now: number, ms: number): void {
    this.disabledUntil = Math.max(this.disabledUntil, now + ms);
    this.state = 'DISABLED';
  }

  update(dt: number, now: number, px: number, py: number): void {
    this.bob += dt * 2.4;
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (this.muzzleFlashUntil > 0 && now >= this.muzzleFlashUntil) this.muzzleFlashUntil = 0;

    if (this.state === 'DISABLED') {
      if (now >= this.disabledUntil) this.state = 'PATROL';
      return;
    }

    const canSee = this.canSee(px, py);
    if (canSee && !this.world.playerHidden()) {
      if (this.state !== 'ALERT') {
        this.state = 'ALERT';
        this.alertTimer = ALERT_HOLD_S;
      } else {
        this.alertTimer = ALERT_HOLD_S;
      }
      this.facing = Phaser.Math.Angle.RotateTo(this.facing, Math.atan2(py - this.y, px - this.x), 6 * dt);

      if (now - this.lastSpottedAt > RESPOT_COOLDOWN_MS) {
        this.lastSpottedAt = now;
        this.world.onSpotted(px, py, now);
      }

      const distance = Phaser.Math.Distance.Between(this.x, this.y, px, py);
      if (distance <= FIRE_RANGE && this.fireCooldown <= 0) {
        this.fireCooldown = FIRE_COOLDOWN_S;
        this.muzzleFlashUntil = now + 120;
        this.world.onFire(this.x, this.y, px, py, now);
      }
      return;
    }

    if (this.state === 'ALERT') {
      this.alertTimer -= dt;
      if (this.alertTimer <= 0) this.state = 'PATROL';
      return;
    }

    // PATROL: fly a straight line to the next waypoint, then advance the loop.
    if (this.route.length === 0) return;
    const target = this.route[this.routeIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) {
      this.routeIndex = (this.routeIndex + 1) % this.route.length;
    } else {
      const targetAngle = Math.atan2(dy, dx);
      this.facing = Phaser.Math.Angle.RotateTo(this.facing, targetAngle, 4 * dt);
      const step = Math.min(dist, SPEED * dt);
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }
  }

  /** Vertical hover offset for the visual layer — small, continuous, never affects logic/position. */
  get hoverOffset(): number {
    return Math.sin(this.bob) * 2.4;
  }

  private canSee(px: number, py: number): boolean {
    const d = Phaser.Math.Distance.Between(this.x, this.y, px, py);
    if (d > VISION_RANGE) return false;
    const diff = Phaser.Math.Angle.Wrap(Math.atan2(py - this.y, px - this.x) - this.facing);
    if (Math.abs(diff) > VISION_FOV / 2) return false;
    return this.world.los(this.x, this.y, px, py);
  }
}
