import Phaser from 'phaser';
import { DEPTH, INTERACTION_RADIUS, TEXTURES } from '../utils/Constants';
import type { Interactable, PromptTone } from './Interactable';

export type MarkerKind = 'terminal' | 'pickup' | 'switch' | 'vent' | 'tank' | 'emp' | 'console' | 'keycard';

export interface WorldInteractableConfig {
  id: string;
  x: number;
  y: number;
  kind: MarkerKind;
  color: number;
  label: () => string;
  tone?: () => PromptTone;
  enabled?: () => boolean;
  radius?: number;
  onInteract: () => void;
}

/** Generic, data-configured interactable: terminals, pickups, switches, vents, tanks, EMP stations. */
export class WorldInteractable implements Interactable {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly interactRadius: number;
  private readonly marker: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Image;
  private done = false;
  private removed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly cfg: WorldInteractableConfig,
  ) {
    this.id = cfg.id;
    this.x = cfg.x;
    this.y = cfg.y;
    this.interactRadius = cfg.radius ?? INTERACTION_RADIUS * 0.85;
    this.marker = scene.add.graphics().setDepth(DEPTH.pickups);
    this.glow = scene.add
      .image(cfg.x, cfg.y, TEXTURES.glow)
      .setTint(cfg.color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(cfg.kind === 'pickup' || cfg.kind === 'emp' || cfg.kind === 'keycard' ? 0.55 : 0.42)
      .setAlpha(0.75)
      .setDepth(DEPTH.aboveDark);
    this.drawMarker();
    if (cfg.kind === 'pickup' || cfg.kind === 'emp' || cfg.kind === 'keycard') {
      scene.tweens.add({ targets: this.glow, alpha: 0.35, scale: 0.4, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  private drawMarker(): void {
    const g = this.marker;
    const { x, y, color } = this.cfg;
    g.clear();
    const alpha = this.done ? 0.35 : 1;
    switch (this.cfg.kind) {
      case 'terminal':
      case 'console':
        g.fillStyle(0x111a22, 1).fillRect(x - 8, y - 6, 16, 11);
        g.fillStyle(color, 0.9 * alpha).fillRect(x - 6, y - 4, 12, 6);
        break;
      case 'pickup':
        g.fillStyle(color, alpha).fillTriangle(x, y - 7, x + 6, y, x, y + 7).fillTriangle(x, y - 7, x - 6, y, x, y + 7);
        g.lineStyle(1, 0xffffff, 0.7 * alpha).strokeTriangle(x, y - 7, x + 6, y, x - 6, y);
        break;
      case 'emp':
        g.fillStyle(0x0d151c, 1).fillRect(x - 6, y - 9, 12, 18);
        g.fillStyle(color, alpha).fillRect(x - 4, y - 3, 8, 10);
        g.fillStyle(color, alpha).fillRect(x - 2, y - 11, 4, 3);
        break;
      case 'switch':
        g.fillStyle(0x1a2229, 1).fillRect(x - 9, y - 9, 18, 18);
        g.lineStyle(1, color, 0.8 * alpha).strokeRect(x - 9, y - 9, 18, 18);
        g.fillStyle(this.done ? 0x39ff9c : color, 1).fillRect(x - 3, this.done ? y - 7 : y, 6, 7);
        break;
      case 'vent':
        g.fillStyle(0x06090c, 1).fillRect(x - 11, y - 11, 22, 22);
        g.lineStyle(1, 0x5a6b78, 1).strokeRect(x - 11, y - 11, 22, 22);
        for (let i = -7; i <= 7; i += 4) g.lineStyle(2, 0x2a353e, 1).lineBetween(x - 9, y + i, x + 9, y + i);
        break;
      case 'keycard':
        g.fillStyle(0x0d151c, 1).fillRoundedRect(x - 10, y - 7, 20, 14, 2);
        g.fillStyle(color, alpha).fillRect(x - 9, y - 6, 18, 4);
        g.fillStyle(0x02070b, alpha).fillRect(x - 6, y + 0, 10, 2);
        g.lineStyle(1, color, 0.9 * alpha).strokeRoundedRect(x - 10, y - 7, 20, 14, 2);
        break;
      case 'tank':
        break;
    }
  }

  getPromptLabel(): string {
    return this.cfg.label();
  }

  getPromptTone(): PromptTone {
    return this.cfg.tone ? this.cfg.tone() : 'normal';
  }

  canInteract(): boolean {
    if (this.removed) return false;
    return this.cfg.enabled ? this.cfg.enabled() : true;
  }

  interact(): void {
    this.cfg.onInteract();
  }

  setDone(done: boolean): void {
    this.done = done;
    this.glow.setAlpha(done ? 0.18 : 0.75);
    this.drawMarker();
  }

  remove(): void {
    this.removed = true;
    this.scene.tweens.killTweensOf(this.glow);
    this.marker.destroy();
    this.glow.destroy();
  }
}
