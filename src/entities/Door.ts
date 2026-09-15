import Phaser from 'phaser';
import type { DoorLayout } from '../map/MapData';
import { audio } from '../systems/AudioManager';
import { KEYCARD_LABELS, type DoorState, type GameState } from '../systems/GameState';
import { COLORS, DEPTH, INTERACTION_RADIUS, TEXTURES, TILE_SIZE } from '../utils/Constants';
import type { Interactable, PromptTone } from './Interactable';

const PANEL_THICKNESS = 10;
const OPEN_SCALE = 0.1;
const STATUS_COLORS: Record<DoorState, number> = { LOCKED: COLORS.red, CLOSED: COLORS.cyan, OPEN: COLORS.green, DISABLED: 0x3a4450 };

export type SealSource = 'A-3' | 'PLAYER' | 'LOCKDOWN';

export class Door implements Interactable {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly interactRadius = INTERACTION_RADIUS;
  readonly blocker: Phaser.GameObjects.Zone;
  readonly tiles: { x: number; y: number }[] = [];

  private current: DoorState;
  private cardAccepted = false;
  private saidLockedLine = false;
  private sealedUntil = 0;
  private sealSource: SealSource | null = null;
  private readonly body: Phaser.Physics.Arcade.StaticBody;
  private readonly horizontal: boolean;
  private readonly panels: [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Rectangle];
  private readonly seam: Phaser.GameObjects.Rectangle;
  private readonly statusLight: Phaser.GameObjects.Arc;
  private readonly statusGlow: Phaser.GameObjects.Image;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly layout: DoorLayout,
    private readonly state: GameState,
    private readonly isObstructed: (doorBounds: Phaser.Geom.Rectangle) => boolean,
  ) {
    this.id = layout.id;
    this.label = layout.label;
    this.horizontal = layout.orientation === 'horizontal';
    const length = layout.span * TILE_SIZE;
    const half = length / 2;
    for (let i = 0; i < layout.span; i++) {
      this.tiles.push(this.horizontal ? { x: layout.tileX + i, y: layout.tileY } : { x: layout.tileX, y: layout.tileY + i });
    }

    this.x = this.horizontal ? layout.tileX * TILE_SIZE + half : layout.tileX * TILE_SIZE + TILE_SIZE / 2;
    this.y = this.horizontal ? layout.tileY * TILE_SIZE + TILE_SIZE / 2 : layout.tileY * TILE_SIZE + half;

    this.blocker = scene.add.zone(this.x, this.y, this.horizontal ? length : TILE_SIZE, this.horizontal ? TILE_SIZE : length);
    scene.physics.add.existing(this.blocker, true);
    this.body = this.blocker.body as Phaser.Physics.Arcade.StaticBody;

    const frame = scene.add.graphics().setDepth(DEPTH.doors);
    frame.fillStyle(0x2a3540, 1);
    if (this.horizontal) {
      frame.fillRect(this.x - half - 5, this.y - 9, 6, 18);
      frame.fillRect(this.x + half - 1, this.y - 9, 6, 18);
    } else {
      frame.fillRect(this.x - 9, this.y - half - 5, 18, 6);
      frame.fillRect(this.x - 9, this.y + half - 1, 18, 6);
    }

    const panelColor = 0x27323d;
    const panelA = this.horizontal
      ? scene.add.rectangle(this.x - half, this.y, half, PANEL_THICKNESS, panelColor).setOrigin(0, 0.5)
      : scene.add.rectangle(this.x, this.y - half, PANEL_THICKNESS, half, panelColor).setOrigin(0.5, 0);
    const panelB = this.horizontal
      ? scene.add.rectangle(this.x + half, this.y, half, PANEL_THICKNESS, panelColor).setOrigin(1, 0.5)
      : scene.add.rectangle(this.x, this.y + half, PANEL_THICKNESS, half, panelColor).setOrigin(0.5, 1);
    for (const panel of [panelA, panelB]) panel.setStrokeStyle(1, layout.accent, 0.6).setDepth(DEPTH.doors);
    this.panels = [panelA, panelB];

    this.seam = scene.add
      .rectangle(this.x, this.y, this.horizontal ? 2 : PANEL_THICKNESS - 2, this.horizontal ? PANEL_THICKNESS - 2 : 2, layout.accent, 0.9)
      .setDepth(DEPTH.doors);

    const lightX = this.horizontal ? this.x + half + 11 : this.x + 11;
    const lightY = this.horizontal ? this.y - 11 : this.y - half - 11;
    this.statusGlow = scene.add.image(lightX, lightY, TEXTURES.glow).setScale(0.32).setAlpha(0.8).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.aboveDark);
    this.statusLight = scene.add.circle(lightX, lightY, 2.5, COLORS.white).setDepth(DEPTH.aboveDark);

    this.current = 'CLOSED';
    this.current = this.computeClosedState();
    this.applyState(true);
  }

  get doorState(): DoorState {
    return this.current;
  }

  get isSealed(): boolean {
    return this.sealSource !== null;
  }

  /** True when progression requirements are unmet — A-3 cannot force these. */
  get isProgressionLocked(): boolean {
    const req = this.layout.requires;
    if (this.layout.alwaysLocked) return true;
    if (!req) return false;
    if (req.power && !this.state.hasFlag('facilityPower')) return true;
    if (req.flag && !this.state.hasFlag(req.flag)) return true;
    if (req.keycard && !this.cardAccepted) return true;
    return false;
  }

  private computeClosedState(): DoorState {
    const req = this.layout.requires;
    if (this.layout.alwaysLocked) return 'LOCKED';
    if (this.sealSource) return 'LOCKED';
    if (req?.power && !this.state.hasFlag('facilityPower')) return 'DISABLED';
    if (req?.flag && !this.state.hasFlag(req.flag)) return 'LOCKED';
    if (req?.keycard && !this.cardAccepted) return 'LOCKED';
    return 'CLOSED';
  }

  getPromptLabel(): string {
    const req = this.layout.requires;
    switch (this.current) {
      case 'CLOSED':
        return `OPEN  ${this.label}`;
      case 'OPEN':
        return `CLOSE  ${this.label}`;
      case 'DISABLED':
        return `${this.label}  //  POWER REQUIRED`;
      case 'LOCKED':
        if (this.sealSource) return `${this.label}  //  ${this.sealSource === 'LOCKDOWN' ? 'LOCKDOWN' : 'NETWORK OVERRIDE'}`;
        if (this.layout.alwaysLocked) return `${this.label}  //  ${this.layout.lockedReason ?? 'LOCKED'}`;
        if (req?.flag && !this.state.hasFlag(req.flag)) return `${this.label}  //  LOCKED`;
        if (req?.keycard) {
          return this.state.hasKeycard(req.keycard) ? `USE ${KEYCARD_LABELS[req.keycard]} KEYCARD` : `${this.label}  //  ${KEYCARD_LABELS[req.keycard]} KEYCARD REQUIRED`;
        }
        return `${this.label}  //  LOCKED`;
    }
  }

  getPromptTone(): PromptTone {
    if (this.current === 'LOCKED') {
      const req = this.layout.requires;
      if (req?.keycard && !this.sealSource && this.state.hasKeycard(req.keycard)) return 'normal';
      return 'locked';
    }
    if (this.current === 'DISABLED') return 'warning';
    return 'normal';
  }

  canInteract(): boolean {
    return true;
  }

  interact(): void {
    const req = this.layout.requires;
    switch (this.current) {
      case 'CLOSED':
        this.open();
        break;
      case 'OPEN':
        this.close();
        break;
      case 'DISABLED':
        this.deny('POWER REQUIRED');
        break;
      case 'LOCKED':
        if (this.sealSource) {
          this.deny(this.sealSource === 'LOCKDOWN' ? 'LOCKDOWN IN EFFECT' : 'NETWORK OVERRIDE');
        } else if (this.layout.alwaysLocked) {
          this.deny(this.layout.lockedReason ?? 'ACCESS DENIED');
        } else if (req?.flag && !this.state.hasFlag(req.flag)) {
          this.deny(req.flagReason ?? 'ACCESS DENIED');
        } else if (req?.keycard) {
          if (this.state.hasKeycard(req.keycard)) {
            this.cardAccepted = true;
            audio.play('granted');
            this.state.notify(req.keycard === 'upper' ? `${this.label} — AUTHORIZATION ACCEPTED` : `ACCESS GRANTED — ${this.label}`, 'success');
            this.current = 'CLOSED';
            this.open();
          } else {
            if (!this.state.hasFlag('tutorialLockedDoor')) {
              this.state.setFlag('tutorialLockedDoor');
              this.state.notify('ACCESS REQUIRED — FIND THE CORRESPONDING KEYCARD.', 'info');
            }
            this.deny(`ACCESS DENIED — REQUIRED: ${KEYCARD_LABELS[req.keycard]} KEYCARD`);
          }
        }
        break;
    }
  }

  open(): void {
    if (this.current === 'OPEN') return;
    this.current = 'OPEN';
    audio.play('door', 0.8);
    this.state.noise(this.x, this.y, 150, 'door');
    this.applyState(false);
  }

  close(): boolean {
    if (this.current !== 'OPEN') return false;
    if (this.isObstructed(this.blocker.getBounds())) {
      this.state.notify('DOORWAY OBSTRUCTED', 'warning');
      return false;
    }
    this.current = this.computeClosedState();
    audio.play('door', 0.8);
    this.applyState(false);
    return true;
  }

  /** Re-evaluate requirements (power restored, flag set...). Open doors stay open. */
  refresh(): void {
    if (this.current === 'OPEN') return;
    const next = this.computeClosedState();
    if (next !== this.current) {
      this.current = next;
      this.applyState(false);
    }
  }

  seal(source: SealSource, now: number, duration: number): boolean {
    if (this.layout.alwaysLocked || this.isProgressionLocked) return false;
    if (source === 'LOCKDOWN' && this.layout.noLockdown) return false;
    if (this.current === 'OPEN' && this.isObstructed(this.blocker.getBounds())) return false;
    this.sealSource = source;
    this.sealedUntil = now + duration;
    this.current = 'LOCKED';
    this.applyState(false);
    audio.play('door', 0.9);
    return true;
  }

  /** A-3 overrides a door it wants to pass through. */
  forceOpen(): void {
    this.sealSource = null;
    this.current = 'OPEN';
    audio.play('impact', 0.5);
    this.applyState(false);
  }

  update(now: number): void {
    if (this.sealSource && now >= this.sealedUntil) {
      this.sealSource = null;
      if (this.current === 'LOCKED') {
        this.current = this.computeClosedState();
        this.applyState(false);
      }
    }
    if (this.sealSource) {
      this.statusGlow.setAlpha(0.5 + Math.sin(now * 0.02) * 0.4);
    }
  }

  private deny(reason: string): void {
    audio.play('denied');
    this.state.notify(`${this.label} — ${reason}`, 'danger');
    if (this.layout.lockedLine && !this.saidLockedLine) {
      this.saidLockedLine = true;
      this.state.say('DIVER', this.layout.lockedLine);
    }
    this.scene.tweens.add({ targets: this.statusGlow, scale: { from: 0.8, to: 0.32 }, alpha: { from: 1, to: 0.8 }, duration: 380, ease: 'Quad.easeOut' });
    this.scene.cameras.main.shake(90, 0.0018);
  }

  private applyState(instant: boolean): void {
    const open = this.current === 'OPEN';
    this.body.enable = !open;
    const scaleKey = this.horizontal ? 'scaleX' : 'scaleY';
    const target = open ? OPEN_SCALE : 1;
    if (instant) {
      for (const panel of this.panels) panel[scaleKey] = target;
      this.seam.setAlpha(open ? 0 : 0.9);
    } else {
      this.scene.tweens.add({ targets: this.panels, [scaleKey]: target, duration: open ? 260 : 200, ease: open ? 'Cubic.easeOut' : 'Cubic.easeIn' });
      this.scene.tweens.add({ targets: this.seam, alpha: open ? 0 : 0.9, duration: 160 });
    }
    const color = this.sealSource === 'A-3' ? COLORS.magenta : STATUS_COLORS[this.current];
    this.statusGlow.setTint(color).setAlpha(0.8);
    this.statusLight.setFillStyle(color);
    this.state.setDoorState(this.id, this.current);
  }
}
