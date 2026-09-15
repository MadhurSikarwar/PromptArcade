import Phaser from 'phaser';
import type { Door } from '../entities/Door';
import { OCTOPUS_ATTACK_DAMAGE, OCTOPUS_ATTACK_DAMAGE_FINAL, TILE_SIZE } from '../utils/Constants';
import type { Pathfinder, TilePoint } from './Pathfinder';

export type OctoState = 'IDLE' | 'PATROL' | 'INVESTIGATE' | 'SEARCH' | 'HUNT' | 'ATTACK' | 'STUNNED' | 'RETURN' | 'FORCING' | 'GRAB';

export interface OctopusWorld {
  pathfinder: Pathfinder;
  doorAtTile(tx: number, ty: number): Door | undefined;
  los(x0: number, y0: number, x1: number, y1: number): boolean;
  walkLine(x0: number, y0: number, x1: number, y1: number): boolean;
  visibility(): number;
  playerHidden(): boolean;
  patrolPoint(fromX: number, fromY: number): { x: number; y: number };
  onAttack(damage: number, fromX: number, fromY: number): void;
  onStateChange(next: OctoState, prev: OctoState): void;
  onForceDoor(door: Door): void;
}

const SPEED: Record<OctoState, number> = {
  IDLE: 0,
  PATROL: 62,
  RETURN: 72,
  INVESTIGATE: 94,
  SEARCH: 80,
  HUNT: 140,
  ATTACK: 0,
  STUNNED: 0,
  FORCING: 0,
  GRAB: 0,
};

const center = (t: TilePoint): { x: number; y: number } => ({ x: t.x * TILE_SIZE + TILE_SIZE / 2, y: t.y * TILE_SIZE + TILE_SIZE / 2 });

/**
 * A-3's brain. Finite state machine driven by vision (range + FOV + line of sight), noise and
 * facility information (cameras). It never reads the player's position unless it can perceive it.
 */
export class OctopusBrain {
  x: number;
  y: number;
  facing = Math.PI / 2;
  state: OctoState = 'PATROL';
  awareness = 0;
  hearingMult = 1;
  forceDuration = 1.5;
  stunDuration = 5000;
  finalMode = false;
  speedBonus = 0;
  lastKnown = { x: 0, y: 0 };

  private path: TilePoint[] = [];
  private pathIndex = 0;
  private repathAt = 0;
  private stateTime = 0;
  private loseTimer = 0;
  private stunUntil = 0;
  private attackTimer = 0;
  private attackCooldown = 0;
  private forcing: Door | null = null;
  private forceTimer = 0;
  private resumeState: OctoState = 'PATROL';
  private calmUntil = 0;
  private waitTimer = 0;
  private searchPoints = 0;
  private pingTimer = 0;

  constructor(
    private readonly world: OctopusWorld,
    x: number,
    y: number,
  ) {
    this.x = x;
    this.y = y;
    this.lastKnown = { x, y };
  }

  get isAttacking(): boolean {
    return this.state === 'ATTACK';
  }

  get attackProgress(): number {
    return this.state === 'ATTACK' ? 1 - this.attackTimer / 0.55 : 0;
  }

  private setState(next: OctoState): void {
    if (next === this.state) return;
    const prev = this.state;
    this.state = next;
    this.stateTime = 0;
    this.waitTimer = 0;
    this.world.onStateChange(next, prev);
  }

  private goTo(x: number, y: number, now: number): void {
    const path = this.world.pathfinder.find(Math.floor(this.x / TILE_SIZE), Math.floor(this.y / TILE_SIZE), Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE));
    this.path = path ?? [];
    this.pathIndex = 0;
    this.repathAt = now + 450;
  }

  teleport(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.path = [];
  }

  hunt(px: number, py: number, now: number): void {
    this.awareness = 100;
    this.lastKnown = { x: px, y: py };
    this.loseTimer = 0;
    this.setState('HUNT');
    this.goTo(px, py, now);
  }

  grab(x: number, y: number): void {
    this.teleport(x, y);
    this.setState('GRAB');
  }

  hear(x: number, y: number, radius: number, now: number): void {
    if (this.state === 'HUNT' || this.state === 'ATTACK' || this.state === 'STUNNED' || this.state === 'FORCING' || this.state === 'GRAB') return;
    const d = Phaser.Math.Distance.Between(this.x, this.y, x, y);
    if (d > radius * this.hearingMult) return;
    if (now < this.calmUntil && radius < 600) return;
    const tx = x + (Math.random() - 0.5) * 110;
    const ty = y + (Math.random() - 0.5) * 110;
    this.awareness = Math.max(this.awareness, 30);
    this.setState('INVESTIGATE');
    this.goTo(tx, ty, now);
  }

  reportSighting(x: number, y: number, now: number): void {
    if (this.state === 'HUNT' || this.state === 'ATTACK' || this.state === 'STUNNED' || this.state === 'GRAB') return;
    this.awareness = Math.max(this.awareness, 65);
    this.calmUntil = 0;
    this.setState('INVESTIGATE');
    this.goTo(x + (Math.random() - 0.5) * 64, y + (Math.random() - 0.5) * 64, now);
  }

  stun(now: number): void {
    if (this.state === 'GRAB') return;
    this.stunUntil = now + this.stunDuration;
    this.forcing = null;
    this.setState('STUNNED');
  }

  update(dt: number, now: number, px: number, py: number): void {
    this.stateTime += dt;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    const d = Phaser.Math.Distance.Between(this.x, this.y, px, py);

    if (this.state === 'GRAB') return;
    if (this.state === 'STUNNED') {
      if (now >= this.stunUntil) {
        this.setState(this.awareness > 50 || this.finalMode ? 'HUNT' : 'SEARCH');
        this.goTo(this.lastKnown.x, this.lastKnown.y, now);
      }
      return;
    }
    if (this.state === 'FORCING') {
      this.forceTimer -= dt;
      if (this.forceTimer <= 0 && this.forcing) {
        this.forcing.forceOpen();
        this.forcing = null;
        this.setState(this.resumeState);
      }
      return;
    }

    const sees = !this.world.playerHidden() && this.canSee(px, py, d);
    if (sees) {
      const gain = d < 140 ? 260 : 110 + 160 * Math.max(0, 1 - d / 440);
      this.awareness = Math.min(100, this.awareness + gain * dt);
      this.lastKnown = { x: px, y: py };
    } else {
      this.awareness = Math.max(0, this.awareness - (this.state === 'HUNT' ? 8 : 20) * dt);
    }

    if (this.finalMode) {
      this.awareness = 100;
      this.pingTimer -= dt;
      if (this.pingTimer <= 0) {
        this.pingTimer = 1.1;
        this.lastKnown = { x: px, y: py };
      }
      if (this.state !== 'HUNT' && this.state !== 'ATTACK') this.hunt(px, py, now);
    }

    switch (this.state) {
      case 'IDLE':
      case 'PATROL':
      case 'RETURN': {
        if (this.awareness >= 100 || (sees && d < 110)) {
          this.hunt(px, py, now);
          break;
        }
        if (sees && this.awareness > 45) {
          this.setState('INVESTIGATE');
          this.goTo(px, py, now);
          break;
        }
        if (this.state === 'IDLE') {
          this.waitTimer += dt;
          this.facing += Math.sin(now * 0.001) * dt;
          if (this.waitTimer > 2.2) {
            const p = this.world.patrolPoint(this.x, this.y);
            this.setState('PATROL');
            this.goTo(p.x, p.y, now);
          }
        } else if (this.path.length === 0 || this.follow(dt, now)) {
          this.setState('IDLE');
        }
        break;
      }
      case 'INVESTIGATE': {
        if (this.awareness >= 100) {
          this.hunt(px, py, now);
          break;
        }
        if (this.path.length === 0 || this.follow(dt, now)) {
          this.waitTimer += dt;
          this.facing += dt * 1.6;
          if (this.waitTimer > 2.6) {
            this.setState('SEARCH');
            this.searchPoints = 2;
            this.nextSearchPoint(now);
          }
        }
        break;
      }
      case 'HUNT': {
        if (sees) this.loseTimer = 0;
        else this.loseTimer += dt;
        if (now >= this.repathAt || this.path.length === 0) this.goTo(this.lastKnown.x, this.lastKnown.y, now);
        if (d < 54 && sees && this.attackCooldown <= 0) {
          this.attackTimer = 0.55;
          this.facing = Math.atan2(py - this.y, px - this.x);
          this.setState('ATTACK');
          break;
        }
        const arrived = this.follow(dt, now);
        if (arrived && !sees) this.loseTimer += dt * 2;
        if (!this.finalMode && this.loseTimer > 3.4) {
          this.setState('SEARCH');
          this.searchPoints = 4;
          this.nextSearchPoint(now);
        }
        break;
      }
      case 'ATTACK': {
        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
          if (d < 76 && !this.world.playerHidden()) this.world.onAttack(this.finalMode ? OCTOPUS_ATTACK_DAMAGE_FINAL : OCTOPUS_ATTACK_DAMAGE, this.x, this.y);
          this.attackCooldown = 1.25;
          this.setState('HUNT');
        }
        break;
      }
      case 'SEARCH': {
        if (this.awareness >= 100) {
          this.hunt(px, py, now);
          break;
        }
        if (this.path.length === 0 || this.follow(dt, now)) {
          this.waitTimer += dt;
          this.facing += dt * 2.2;
          if (this.waitTimer > 0.9) {
            this.waitTimer = 0;
            if (this.searchPoints-- <= 0) {
              this.calmUntil = now + 30000;
              const p = this.world.patrolPoint(this.x, this.y);
              this.setState('RETURN');
              this.goTo(p.x, p.y, now);
            } else {
              this.nextSearchPoint(now);
            }
          }
        }
        break;
      }
    }
  }

  private nextSearchPoint(now: number): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 170;
    this.goTo(this.lastKnown.x + Math.cos(angle) * dist, this.lastKnown.y + Math.sin(angle) * dist, now);
  }

  private canSee(px: number, py: number, d: number): boolean {
    const hunting = this.state === 'HUNT' || this.state === 'ATTACK';
    const range = (hunting ? 450 : 320) * this.world.visibility();
    if (d > range) return false;
    if (d > 96) {
      const diff = Phaser.Math.Angle.Wrap(Math.atan2(py - this.y, px - this.x) - this.facing);
      if (Math.abs(diff) > (hunting ? Math.PI : 1.1)) return false;
    }
    return this.world.los(this.x, this.y, px, py);
  }

  /** Moves along the path. Returns true when the destination is reached. */
  private follow(dt: number, now: number): boolean {
    if (this.pathIndex >= this.path.length) return true;
    const node = this.path[this.pathIndex];
    const door = this.world.doorAtTile(node.x, node.y);
    const nodeCenter = center(node);
    if (door && door.doorState !== 'OPEN') {
      if (door.isProgressionLocked) {
        this.path = [];
        return true;
      }
      if (Phaser.Math.Distance.Between(this.x, this.y, nodeCenter.x, nodeCenter.y) < 46) {
        this.forcing = door;
        this.forceTimer = this.forceDuration + (door.isSealed ? 1.2 : 0);
        this.resumeState = this.state;
        this.world.onForceDoor(door);
        this.setState('FORCING');
        return false;
      }
    }

    let pulls = 0;
    while (pulls < 3 && this.pathIndex + 1 < this.path.length) {
      const next = this.path[this.pathIndex + 1];
      const nc = center(next);
      const nextDoor = this.world.doorAtTile(next.x, next.y);
      if ((nextDoor && nextDoor.doorState !== 'OPEN') || !this.world.walkLine(this.x, this.y, nc.x, nc.y)) break;
      this.pathIndex++;
      pulls++;
    }

    const goal = center(this.path[this.pathIndex]);
    const dx = goal.x - this.x;
    const dy = goal.y - this.y;
    const dist = Math.hypot(dx, dy);
    const speed = (SPEED[this.state] + this.speedBonus) * (this.finalMode && this.state === 'HUNT' ? 1.24 : 1);
    const step = speed * dt;
    if (dist > 0.01) {
      const targetAngle = Math.atan2(dy, dx);
      this.facing = Phaser.Math.Angle.RotateTo(this.facing, targetAngle, 5 * dt);
    }
    if (dist <= step) {
      this.x = goal.x;
      this.y = goal.y;
      this.pathIndex++;
      if (now >= this.repathAt && this.state === 'HUNT') this.repathAt = now;
    } else {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }
    return this.pathIndex >= this.path.length;
  }
}
