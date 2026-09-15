export type PromptTone = 'normal' | 'locked' | 'warning';

/**
 * Anything the player can use with [E]: doors, terminals, keycard readers, switches, airlocks...
 * The InteractionSystem only ever talks to this interface.
 */
export interface Interactable {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly interactRadius: number;
  getPromptLabel(): string;
  getPromptTone(): PromptTone;
  /** False hides the prompt entirely (e.g. an item already picked up). */
  canInteract(): boolean;
  interact(): void;
}
