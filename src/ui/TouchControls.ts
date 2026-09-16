import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../utils/Constants';

const KEY_CODE: Record<string, number> = { W: 87, A: 65, S: 83, D: 68, SHIFT: 16, E: 69, Q: 81, F: 70, TAB: 9 };
const STICK_RADIUS = 58;
const STICK_MAX = 40;
const DEADZONE = 14;

export function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
}

/** Drives real keyboard events on `window` — every keyboard-driven system (movement, interact, EMP, sprint, flashlight) needs zero changes to also respond to touch. */
function dispatchKey(key: string, down: boolean): void {
  const code = KEY_CODE[key];
  if (code === undefined) return;
  const event = new KeyboardEvent(down ? 'keydown' : 'keyup', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'keyCode', { get: () => code });
  Object.defineProperty(event, 'which', { get: () => code });
  window.dispatchEvent(event);
}

interface ActionButtonDef {
  label: string;
  key: string;
  x: number;
  y: number;
  radius: number;
  color: number;
  hold: boolean;
}

/** On-screen virtual joystick (movement) + action buttons (sprint/interact/EMP/flashlight) for touch devices. */
export class TouchControls {
  private readonly stickKnob: Phaser.GameObjects.Arc;
  private readonly baseX: number;
  private readonly baseY: number;
  private dragging = false;
  private activeKeys = new Set<string>();
  private readonly onMove: (pointer: Phaser.Input.Pointer) => void;
  private readonly onUp: () => void;

  constructor(private readonly scene: Phaser.Scene) {
    this.baseX = 120;
    this.baseY = GAME_HEIGHT - 140;

    scene.add.circle(this.baseX, this.baseY, STICK_RADIUS, 0x0a141a, 0.5).setStrokeStyle(2, COLORS.cyan, 0.5).setDepth(950);
    this.stickKnob = scene.add.circle(this.baseX, this.baseY, 26, COLORS.cyan, 0.35).setStrokeStyle(1.5, COLORS.cyan, 0.9).setDepth(951);

    const zone = scene.add.zone(this.baseX, this.baseY, STICK_RADIUS * 2.6, STICK_RADIUS * 2.6).setDepth(952).setInteractive();
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => this.startDrag(p));

    this.onMove = (p: Phaser.Input.Pointer): void => {
      if (this.dragging) this.moveDrag(p);
    };
    this.onUp = (): void => this.endDrag();
    scene.input.on('pointermove', this.onMove);
    scene.input.on('pointerup', this.onUp);
    scene.input.on('pointerupoutside', this.onUp);

    const actions: ActionButtonDef[] = [
      { label: 'E', key: 'E', x: GAME_WIDTH - 100, y: GAME_HEIGHT - 150, radius: 36, color: COLORS.cyan, hold: false },
      { label: 'EMP', key: 'Q', x: GAME_WIDTH - 190, y: GAME_HEIGHT - 92, radius: 28, color: COLORS.magenta, hold: false },
      { label: 'LGT', key: 'F', x: GAME_WIDTH - 100, y: GAME_HEIGHT - 240, radius: 26, color: COLORS.yellow, hold: false },
      { label: 'RUN', key: 'SHIFT', x: GAME_WIDTH - 36, y: GAME_HEIGHT - 92, radius: 30, color: COLORS.green, hold: true },
      { label: 'DECK', key: 'TAB', x: GAME_WIDTH - 190, y: GAME_HEIGHT - 200, radius: 26, color: COLORS.purple, hold: false },
    ];
    for (const def of actions) this.buildActionButton(def);
  }

  private buildActionButton(def: ActionButtonDef): void {
    const circle = this.scene.add
      .circle(def.x, def.y, def.radius, def.color, 0.22)
      .setStrokeStyle(2, def.color, 0.85)
      .setDepth(950)
      .setInteractive({ useHandCursor: true });
    this.scene.add
      .text(def.x, def.y, def.label, { fontSize: '12px', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(951);

    const press = (): void => {
      circle.setFillStyle(def.color, 0.55);
      dispatchKey(def.key, true);
      if (!def.hold) this.scene.time.delayedCall(70, () => dispatchKey(def.key, false));
    };
    const release = (): void => {
      circle.setFillStyle(def.color, 0.22);
      if (def.hold) dispatchKey(def.key, false);
    };
    circle.on('pointerdown', press);
    circle.on('pointerup', release);
    circle.on('pointerupoutside', release);
  }

  private startDrag(pointer: Phaser.Input.Pointer): void {
    this.dragging = true;
    this.moveDrag(pointer);
  }

  private moveDrag(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - this.baseX;
    const dy = pointer.y - this.baseY;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const clamped = Math.min(dist, STICK_MAX);
    this.stickKnob.setPosition(this.baseX + Math.cos(angle) * clamped, this.baseY + Math.sin(angle) * clamped);

    const next = new Set<string>();
    if (dist > DEADZONE) {
      const deg = Phaser.Math.RadToDeg(angle);
      if (deg > -157.5 && deg < -22.5) next.add('W');
      if (deg > 22.5 && deg < 157.5) next.add('S');
      if (deg > -67.5 && deg < 67.5) next.add('D');
      if (deg > 112.5 || deg < -112.5) next.add('A');
    }
    for (const key of this.activeKeys) if (!next.has(key)) dispatchKey(key, false);
    for (const key of next) if (!this.activeKeys.has(key)) dispatchKey(key, true);
    this.activeKeys = next;
  }

  private endDrag(): void {
    if (!this.dragging) return;
    this.dragging = false;
    this.stickKnob.setPosition(this.baseX, this.baseY);
    for (const key of this.activeKeys) dispatchKey(key, false);
    this.activeKeys.clear();
  }

  destroy(): void {
    this.scene.input.off('pointermove', this.onMove);
    this.scene.input.off('pointerup', this.onUp);
    this.scene.input.off('pointerupoutside', this.onUp);
    for (const key of this.activeKeys) dispatchKey(key, false);
  }
}
