export interface MissionObjective {
  id: string;
  label: string;
}

export interface MissionDef {
  id: string;
  title: string;
  objectives: MissionObjective[];
}

/**
 * Mission 2's objectives reflect the facility's real emergency-power chain (generator → breaker →
 * cooling → reactor) rather than a single "Fuse" item, since that is the actual gameplay in place.
 */
export const MISSIONS: readonly MissionDef[] = [
  {
    id: 'm1',
    title: 'MISSION 1 — ESCAPE THE LOWER LEVEL',
    objectives: [{ id: 'm1-exit', label: 'Find a way out of the starting area' }],
  },
  {
    id: 'm2',
    title: 'MISSION 2 — RESTORE POWER',
    objectives: [
      { id: 'm2-cell', label: 'Find the Power Cell' },
      { id: 'm2-medbay', label: 'Restore the Medbay Emergency Terminal' },
      { id: 'm2-generator', label: 'Activate the Emergency Generator' },
      { id: 'm2-breaker', label: 'Route power at the Breaker Panel' },
      { id: 'm2-cooling', label: 'Restore Cooling' },
      { id: 'm2-reactor', label: 'Restart the Facility Reactor' },
    ],
  },
  {
    id: 'm3',
    title: 'MISSION 3 — ACCESS SECURITY',
    objectives: [
      { id: 'm3-card', label: 'Find the SECURITY KEYCARD' },
      { id: 'm3-enter', label: 'Use it to enter Security' },
      { id: 'm3-terminal', label: 'Activate the Security Terminal' },
    ],
  },
  {
    id: 'm4',
    title: 'MISSION 4 — INVESTIGATE THE FACILITY',
    objectives: [
      { id: 'm4-server', label: 'Access the Server Room' },
      { id: 'm4-data', label: 'Retrieve Project A-3 data' },
      { id: 'm4-lab', label: 'Investigate the Research Lab' },
    ],
  },
  {
    id: 'm5',
    title: 'MISSION 5 — INVESTIGATE A-3',
    objectives: [
      { id: 'm5-aquarium', label: 'Enter the Aquarium' },
      { id: 'm5-breach', label: 'Discover the containment breach' },
      { id: 'm5-wing', label: 'Enter the Experiment Wing' },
      { id: 'm5-card', label: 'Retrieve the EXPERIMENT KEYCARD' },
    ],
  },
  {
    id: 'm6',
    title: 'MISSION 6 — REACH THE UPPER FACILITY',
    objectives: [
      { id: 'm6-hub', label: 'Return to the Central Hub' },
      { id: 'm6-card', label: 'Obtain UPPER FACILITY ACCESS' },
      { id: 'm6-entrance', label: 'Return to the original entrance area' },
      { id: 'm6-door', label: 'Unlock the side door that was ignored at the beginning' },
    ],
  },
  {
    id: 'm7',
    title: 'MISSION 7 — ESCAPE',
    objectives: [
      { id: 'm7-upper', label: 'Enter the Upper Facility' },
      { id: 'm7-chase', label: 'Survive the octopus chase' },
      { id: 'm7-airlock', label: 'Reach the Escape Airlock' },
      { id: 'm7-escape', label: 'Escape the facility' },
    ],
  },
] as const;
