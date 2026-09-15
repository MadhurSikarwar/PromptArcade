import Phaser from 'phaser';
import type { DoorLayout } from '../map/MapData';
import type { DoorState, GameState } from '../systems/GameState';
import { COLORS, DEPTH, INTERACTION_RADIUS, TEXTURES, TILE_SIZE } from '../utils/Constants';
import type { Interactable, PromptTone } from './Interactable';

const PANEL_THICKNESS = 10;
const OPEN_SCALE = 0.1;

const STATUS_COLORS: Record<DoorState, number> = {
  LOCKED: COLORS.red,
  CLOSED: COLORS.cyan,
  OPEN: COLORS.green,
  DISABLED: 0x3a4450,
};

export class Door implements Interactable {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly interactRadius = INTERACTION_RADIUS;
  readonly blocker: Phaser.GameObjects.Zone;

  private current: DoorState;
  private saidLockedLine = false;
  private readonly body: Phaser.Physics.Arcade.StaticBody;
  private readonly horizontal: boolean;
  private readonly panels: [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Rectangle];
  private readonly seam: Phaser.GameObjects.Rectangle;
  private readonly statusLight: Phaser.GameObjects.Arc;
  private readonly statusGlow: Phaser.GameObjects.Image;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layout: DoorLayout,
    private readonly state: GameState,
    private readonly isObstructed: (doorBounds: Phaser.Geom.Rectangle) => boolean,
  ) {
    this.id = layout.id;
    this.label = layout.label;
    this.horizontal = layout.orientation === 'horizontal';
    const length = layout.span * TILE_SIZE;
    const half = length / 2;

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
    for (const panel of [panelA, panelB]) {
      panel.setStrokeStyle(1, layout.accent, 0.6).setDepth(DEPTH.doors);
    }
    this.panels = [panelA, panelB];

    this.seam = scene.add
      .rectangle(this.x, this.y, this.horizontal ? 2 : PANEL_THICKNESS - 2, this.horizontal ? PANEL_THICKNESS - 2 : 2, layout.accent, 0.9)
      .setDepth(DEPTH.doors);

    const lightX = this.horizontal ? this.x + half + 11 : this.x + 11;
    const lightY = this.horizontal ? this.y - 11 : this.y - half - 11;
    this.statusGlow = scene.add
      .image(lightX, lightY, TEXTURES.glow)
      .setScale(0.32)
      .setAlpha(0.7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.doors);
    this.statusLight = scene.add.circle(lightX, lightY, 2.5, COLORS.white).setDepth(DEPTH.doors);

    this.current = layout.initial;
    this.applyState(true);
  }

  get doorState(): DoorState {
    return this.current;
  }

  getPromptLabel(): string {
    switch (this.current) {
      case 'CLOSED':
        return `OPEN  ${this.label}`;
      case 'OPEN':
        return `CLOSE  ${this.label}`;
      case 'LOCKED':
        return `${this.label}  //  ${this.layout.lockedReason ?? 'LOCKED'}`;
      case 'DISABLED':
        return `${this.label}  //  POWER REQUIRED`;
    }
  }

  getPromptTone(): PromptTone {
    if (this.current === 'LOCKED') return 'locked';
    if (this.current === 'DISABLED') return 'warning';
    return 'normal';
  }

  canInteract(): boolean {
    return true;
  }

  interact(): void {
    switch (this.current) {
      case 'CLOSED':
        this.open();
        break;
      case 'OPEN':
        this.close();
        break;
      case 'LOCKED':
        this.deny(this.layout.lockedReason ?? 'ACCESS DENIED');
        break;
      case 'DISABLED':
        this.deny('POWER REQUIRED');
        break;
    }
  }

  open(): void {
    if (this.current === 'OPEN') return;
    this.current = 'OPEN';
    this.applyState(false);
  }

  close(): boolean {
    if (this.current !== 'OPEN') return false;
    if (this.isObstructed(this.blocker.getBounds())) {
      this.state.notify('DOORWAY OBSTRUCTED', 'warning');
      return false;
    }
    this.current = 'CLOSED';
    this.applyState(false);
    return true;
  }

  /** Hook for Phase 2 access control (keycards, power, hacking). */
  setState(next: DoorState): void {
    if (next === this.current) return;
    if (next !== 'OPEN' && this.current === 'OPEN' && this.isObstructed(this.blocker.getBounds())) return;
    this.current = next;
    this.applyState(false);
  }

  private deny(reason: string): void {
    this.state.notify(`${this.label} — ${reason}`, 'danger');
    if (this.layout.lockedLine && !this.saidLockedLine) {
      this.saidLockedLine = true;
      this.state.say('DIVER', this.layout.lockedLine);
    }
    this.scene.tweens.add({
      targets: this.statusGlow,
      scale: { from: 0.8, to: 0.32 },
      alpha: { from: 1, to: 0.7 },
      duration: 380,
      ease: 'Quad.easeOut',
    });
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
      this.scene.tweens.add({
        targets: this.panels,
        [scaleKey]: target,
        duration: open ? 260 : 200,
        ease: open ? 'Cubic.easeOut' : 'Cubic.easeIn',
      });
      this.scene.tweens.add({ targets: this.seam, alpha: open ? 0 : 0.9, duration: 160 });
    }

    const color = STATUS_COLORS[this.current];
    this.statusGlow.setTint(color);
    this.statusLight.setFillStyle(color);
    this.state.setDoorState(this.id, this.current);
  }
}
