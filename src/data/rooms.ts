export type RoomId =
  | 'entrance'
  | 'medbay'
  | 'crew'
  | 'storage'
  | 'security'
  | 'hub'
  | 'power'
  | 'maintenance'
  | 'server'
  | 'lab'
  | 'aquarium'
  | 'wing'
  | 'observation';

export type ZoneId = 1 | 2 | 3 | 4;

export interface RoomInfo {
  id: RoomId;
  name: string;
  zone: ZoneId;
  accent: number;
  purpose: string;
}

export const ZONE_NAMES: Record<ZoneId, string> = {
  1: 'ZONE 1 // LOWER FACILITY',
  2: 'ZONE 2 // CENTRAL FACILITY',
  3: 'ZONE 3 // RESEARCH FACILITY',
  4: 'ZONE 4 // UPPER FACILITY',
};

export const ROOMS: Record<RoomId, RoomInfo> = {
  entrance: { id: 'entrance', name: 'ENTRANCE CHAMBER', zone: 1, accent: 0x3fb8ff, purpose: 'Airlock entry and the locked Upper Facility Access door.' },
  medbay: { id: 'medbay', name: 'MEDBAY', zone: 1, accent: 0x22e0d0, purpose: 'First puzzle, first story log, power cell.' },
  crew: { id: 'crew', name: 'CREW QUARTERS', zone: 1, accent: 0x5fb3a8, purpose: 'Environmental storytelling.' },
  storage: { id: 'storage', name: 'STORAGE', zone: 1, accent: 0xe0a040, purpose: 'Supplies and alternate route.' },
  security: { id: 'security', name: 'SECURITY', zone: 1, accent: 0xff3b4e, purpose: 'Camera control, door control, facility map.' },
  hub: { id: 'hub', name: 'CENTRAL HUB', zone: 2, accent: 0x3d8bff, purpose: 'Navigation and progression hub.' },
  power: { id: 'power', name: 'POWER CORE', zone: 2, accent: 0xff2a5a, purpose: 'Major facility power restoration.' },
  maintenance: { id: 'maintenance', name: 'MAINTENANCE', zone: 2, accent: 0xffb020, purpose: 'Power routing and electrical hazards.' },
  server: { id: 'server', name: 'SERVER ROOM', zone: 2, accent: 0x19c8ff, purpose: 'Research data and A-3 discovery.' },
  lab: { id: 'lab', name: 'RESEARCH LAB', zone: 3, accent: 0x20e8a0, purpose: 'Project NEON story.' },
  aquarium: { id: 'aquarium', name: 'AQUARIUM', zone: 3, accent: 0x1f7bff, purpose: 'Specimen tanks and mystery.' },
  wing: { id: 'wing', name: 'EXPERIMENT WING', zone: 3, accent: 0xd94dff, purpose: 'Upper Facility Access Key.' },
  observation: { id: 'observation', name: 'OBSERVATION DECK', zone: 3, accent: 0x4fd8ff, purpose: 'Ocean view and route to the east wing.' },
};
