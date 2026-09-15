import Phaser from 'phaser';
import type { Interactable } from '../entities/Interactable';
import type { InteractionPrompt } from '../ui/InteractionPrompt';
import type { GameState } from './GameState';

const DEBUG_SCAN_RADIUS = 200;

/** Chooses the single nearest valid interactable, shows one prompt for it, and fires it on [E]. */
export class InteractionSystem {
  private readonly items: Interactable[] = [];
  private focused: Interactable | null = null;
  private enabled = true;

  constructor(
    private readonly state: GameState,
    private readonly prompt: InteractionPrompt,
    private readonly interactKey: Phaser.Input.Keyboard.Key,
  ) {}

  get current(): Interactable | null {
    return this.focused;
  }

  register(item: Interactable): void {
    if (!this.items.includes(item)) this.items.push(item);
  }

  unregister(id: string): void {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) this.items.splice(index, 1);
    if (this.focused?.id === id) this.focused = null;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.focused = null;
      this.prompt.hide();
    }
  }

  update(playerX: number, playerY: number): void {
    // Always consume the key edge so a press made away from anything never fires later.
    const pressed = Phaser.Input.Keyboard.JustDown(this.interactKey);
    if (!this.enabled) return;

    let best: Interactable | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    const nearby: string[] = [];

    for (const item of this.items) {
      const distance = Phaser.Math.Distance.Between(playerX, playerY, item.x, item.y);
      if (this.state.debugEnabled && distance <= DEBUG_SCAN_RADIUS) {
        nearby.push(`${item.id} ${Math.round(distance)}px`);
      }
      if (distance > item.interactRadius || !item.canInteract()) continue;
      if (distance < bestDistance) {
        best = item;
        bestDistance = distance;
      }
    }

    this.focused = best;
    if (this.state.debugEnabled) this.state.nearbyInteractables = nearby;

    if (!best) {
      this.prompt.hide();
      return;
    }

    if (pressed) best.interact();
    this.prompt.show(best.x, best.y, playerX, playerY, best.getPromptLabel(), best.getPromptTone());
  }
}
