import type { FlagId, GameState } from './GameState';

export type PowerStage = 'emergency' | 'generator' | 'routed' | 'cooling' | 'online';

const STAGES: Record<PowerStage, { power: number; flag?: FlagId }> = {
  emergency: { power: 18 },
  generator: { power: 35, flag: 'generatorOn' },
  routed: { power: 55, flag: 'powerRouted' },
  cooling: { power: 72, flag: 'coolingOn' },
  online: { power: 100, flag: 'facilityPower' },
};

const ORDER: PowerStage[] = ['emergency', 'generator', 'routed', 'cooling', 'online'];

/** Emergency Generator -> Power Routing -> Cooling -> Main Facility Power. Lights, doors, cameras and hazards all read from this. */
export class PowerSystem {
  constructor(private readonly state: GameState) {}

  setStage(stage: PowerStage): void {
    const target = ORDER.indexOf(stage);
    for (let i = 0; i <= target; i++) {
      const flag = STAGES[ORDER[i]].flag;
      if (flag) this.state.setFlag(flag);
    }
    this.state.setPower(STAGES[stage].power);
  }
}
