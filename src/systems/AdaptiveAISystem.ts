import { audio } from './AudioManager';
import type { GameState } from './GameState';

export type AdaptationId = 'footsteps' | 'darkness' | 'vents' | 'emp' | 'route' | 'doors';

const TEXT: Record<AdaptationId, string> = {
  footsteps: 'IT IS LISTENING FOR FOOTSTEPS',
  darkness: 'IT WILL OVERRIDE THE LIGHTS WHEN YOU HIDE IN THE DARK',
  vents: 'SCRAPING INSIDE THE VENTS — IT CHECKS THEM NOW',
  emp: 'IT IS ADAPTING TO ELECTRICAL ATTACKS',
  route: 'IT IS LEARNING YOUR ROUTE',
  doors: 'IT HAS LEARNED YOUR DOOR SEALS',
};

/** Deterministic behaviour tracking. The player should FEEL A-3 learning — no machine learning involved. */
export class AdaptiveAISystem {
  constructor(private readonly state: GameState) {}

  has(id: AdaptationId): boolean {
    return this.state.adaptation.learned.has(id);
  }

  record(kind: 'vent' | 'emp' | 'seal' | 'lights'): void {
    const a = this.state.adaptation;
    if (kind === 'vent') a.ventUses++;
    if (kind === 'emp') a.empUses++;
    if (kind === 'seal') a.doorSeals++;
    if (kind === 'lights') a.lightToggles++;
    this.evaluate();
  }

  update(dt: number, sprinting: boolean, inDark: boolean): void {
    const a = this.state.adaptation;
    if (sprinting) a.sprintSeconds += dt;
    if (inDark) a.darkSeconds += dt;
    this.evaluate();
  }

  /** The room the player keeps coming back to, if any. */
  favouriteRoom(): string | null {
    let best: string | null = null;
    let count = 4;
    for (const [room, visits] of Object.entries(this.state.adaptation.roomVisits)) {
      if (visits > count) {
        best = room;
        count = visits;
      }
    }
    return best;
  }

  private evaluate(): void {
    if (!this.state.hasFlag('a3Active')) return;
    const a = this.state.adaptation;
    if (a.sprintSeconds > 22) this.learn('footsteps');
    if (a.darkSeconds > 18 || a.lightToggles >= 2) this.learn('darkness');
    if (a.ventUses >= 2) this.learn('vents');
    if (a.empUses >= 2) this.learn('emp');
    if (a.doorSeals >= 2) this.learn('doors');
    if (this.favouriteRoom()) this.learn('route');
  }

  private learn(id: AdaptationId): void {
    if (this.has(id)) return;
    this.state.adaptation.learned.add(id);
    audio.play('glitch', 0.7);
    this.state.notify(`A-3 ADAPTATION // ${TEXT[id]}`, 'a3');
  }
}
