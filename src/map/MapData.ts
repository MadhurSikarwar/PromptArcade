import type { RoomId } from '../data/rooms';
import type { DoorState } from '../systems/GameState';
import { COLORS } from '../utils/Constants';

/** All geometry is in tile units. Rects are inclusive of x..x+w-1 and y..y+h-1. */
export interface TileRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type FloorStyle = 'plate' | 'tile' | 'grate';

export interface RoomLayout {
  id: RoomId;
  rect: TileRect;
  floor: FloorStyle;
}

export type PropKind =
  | 'bed'
  | 'console'
  | 'crate'
  | 'rack'
  | 'tank'
  | 'reactor'
  | 'generator'
  | 'table'
  | 'holo'
  | 'locker'
  | 'pod'
  | 'bench'
  | 'machine';

export interface PropLayout {
  kind: PropKind;
  rect: TileRect;
}

export type DoorOrientation = 'horizontal' | 'vertical';

export interface DoorLayout {
  id: string;
  label: string;
  /** Top-left tile of the door. Horizontal doors extend along x, vertical doors along y. */
  tileX: number;
  tileY: number;
  span: number;
  orientation: DoorOrientation;
  initial: DoorState;
  lockedReason?: string;
  lockedLine?: string;
  accent: number;
}

export const MAP_WIDTH = 100;
export const MAP_HEIGHT = 52;

export const PLAYER_SPAWN_TILE = { x: 19, y: 29 } as const;

export const ROOM_LAYOUTS: readonly RoomLayout[] = [
  { id: 'entrance', rect: { x: 3, y: 21, w: 12, h: 11 }, floor: 'grate' },
  { id: 'medbay', rect: { x: 19, y: 6, w: 14, h: 9 }, floor: 'tile' },
  { id: 'crew', rect: { x: 19, y: 17, w: 12, h: 9 }, floor: 'plate' },
  { id: 'storage', rect: { x: 33, y: 16, w: 8, h: 10 }, floor: 'plate' },
  { id: 'security', rect: { x: 43, y: 3, w: 11, h: 12 }, floor: 'plate' },
  { id: 'hub', rect: { x: 42, y: 19, w: 13, h: 13 }, floor: 'tile' },
  { id: 'power', rect: { x: 24, y: 35, w: 14, h: 14 }, floor: 'grate' },
  { id: 'maintenance', rect: { x: 43, y: 37, w: 17, h: 10 }, floor: 'grate' },
  { id: 'server', rect: { x: 58, y: 3, w: 11, h: 12 }, floor: 'plate' },
  { id: 'lab', rect: { x: 60, y: 20, w: 14, h: 12 }, floor: 'tile' },
  { id: 'aquarium', rect: { x: 74, y: 3, w: 16, h: 12 }, floor: 'tile' },
  { id: 'wing', rect: { x: 78, y: 20, w: 19, h: 12 }, floor: 'tile' },
  { id: 'observation', rect: { x: 82, y: 37, w: 10, h: 6 }, floor: 'plate' },
];

export const CORRIDORS: readonly TileRect[] = [
  { x: 15, y: 28, w: 27, h: 3 }, // entrance -> west main corridor -> hub
  { x: 1, y: 25, w: 2, h: 3 }, // outer airlock stub
  { x: 6, y: 32, w: 3, h: 4 }, // upper facility access stub (behind locked door)
  { x: 24, y: 15, w: 2, h: 2 }, // medbay <-> crew quarters
  { x: 22, y: 26, w: 2, h: 2 }, // crew quarters <-> main corridor
  { x: 31, y: 20, w: 2, h: 2 }, // crew quarters <-> storage
  { x: 33, y: 11, w: 10, h: 3 }, // medbay -> security corridor
  { x: 36, y: 14, w: 2, h: 2 }, // security corridor <-> storage
  { x: 38, y: 26, w: 2, h: 2 }, // storage <-> main corridor
  { x: 47, y: 15, w: 3, h: 4 }, // security <-> hub
  { x: 47, y: 32, w: 3, h: 5 }, // hub <-> maintenance
  { x: 33, y: 31, w: 3, h: 4 }, // main corridor <-> power core
  { x: 38, y: 41, w: 5, h: 3 }, // power core <-> maintenance
  { x: 54, y: 7, w: 4, h: 3 }, // security <-> server
  { x: 55, y: 24, w: 5, h: 3 }, // hub <-> research lab
  { x: 62, y: 15, w: 3, h: 5 }, // server <-> research lab
  { x: 69, y: 7, w: 5, h: 3 }, // server <-> aquarium
  { x: 74, y: 24, w: 4, h: 3 }, // research lab <-> experiment wing
  { x: 84, y: 15, w: 3, h: 5 }, // aquarium <-> experiment wing
  { x: 60, y: 39, w: 22, h: 3 }, // maintenance -> east service corridor -> observation
  { x: 66, y: 32, w: 3, h: 7 }, // research lab <-> service corridor
  { x: 86, y: 32, w: 3, h: 5 }, // experiment wing <-> observation
];

export const PROPS: readonly PropLayout[] = [
  // entrance chamber
  { kind: 'locker', rect: { x: 4, y: 22, w: 3, h: 1 } },
  { kind: 'bench', rect: { x: 11, y: 22, w: 3, h: 1 } },
  // medbay
  { kind: 'bed', rect: { x: 20, y: 7, w: 1, h: 2 } },
  { kind: 'bed', rect: { x: 23, y: 7, w: 1, h: 2 } },
  { kind: 'bed', rect: { x: 26, y: 7, w: 1, h: 2 } },
  { kind: 'console', rect: { x: 29, y: 7, w: 2, h: 1 } },
  { kind: 'table', rect: { x: 28, y: 10, w: 2, h: 1 } },
  // crew quarters
  { kind: 'bed', rect: { x: 20, y: 18, w: 2, h: 1 } },
  { kind: 'bed', rect: { x: 20, y: 21, w: 2, h: 1 } },
  { kind: 'bed', rect: { x: 27, y: 18, w: 2, h: 1 } },
  { kind: 'locker', rect: { x: 30, y: 23, w: 1, h: 2 } },
  // storage
  { kind: 'crate', rect: { x: 34, y: 18, w: 2, h: 2 } },
  { kind: 'crate', rect: { x: 38, y: 20, w: 2, h: 1 } },
  { kind: 'crate', rect: { x: 34, y: 22, w: 1, h: 2 } },
  // security
  { kind: 'console', rect: { x: 45, y: 4, w: 7, h: 1 } },
  { kind: 'table', rect: { x: 47, y: 8, w: 3, h: 1 } },
  { kind: 'locker', rect: { x: 53, y: 11, w: 1, h: 3 } },
  // central hub
  { kind: 'holo', rect: { x: 47, y: 24, w: 3, h: 3 } },
  // power core
  { kind: 'reactor', rect: { x: 29, y: 40, w: 4, h: 4 } },
  { kind: 'generator', rect: { x: 25, y: 36, w: 2, h: 2 } },
  { kind: 'generator', rect: { x: 25, y: 46, w: 2, h: 2 } },
  // maintenance
  { kind: 'machine', rect: { x: 50, y: 43, w: 4, h: 2 } },
  { kind: 'generator', rect: { x: 55, y: 38, w: 2, h: 2 } },
  { kind: 'machine', rect: { x: 44, y: 45, w: 3, h: 1 } },
  // server room
  { kind: 'rack', rect: { x: 60, y: 4, w: 1, h: 3 } },
  { kind: 'rack', rect: { x: 63, y: 4, w: 1, h: 3 } },
  { kind: 'rack', rect: { x: 66, y: 4, w: 1, h: 3 } },
  { kind: 'rack', rect: { x: 60, y: 10, w: 1, h: 3 } },
  { kind: 'rack', rect: { x: 66, y: 10, w: 1, h: 3 } },
  // research lab
  { kind: 'table', rect: { x: 66, y: 22, w: 3, h: 1 } },
  { kind: 'console', rect: { x: 70, y: 22, w: 2, h: 1 } },
  { kind: 'bench', rect: { x: 62, y: 28, w: 3, h: 1 } },
  { kind: 'pod', rect: { x: 71, y: 28, w: 2, h: 2 } },
  // aquarium
  { kind: 'tank', rect: { x: 78, y: 4, w: 10, h: 4 } },
  { kind: 'tank', rect: { x: 75, y: 12, w: 2, h: 2 } },
  // experiment wing
  { kind: 'pod', rect: { x: 80, y: 21, w: 2, h: 2 } },
  { kind: 'pod', rect: { x: 89, y: 21, w: 2, h: 2 } },
  { kind: 'pod', rect: { x: 93, y: 21, w: 2, h: 2 } },
  { kind: 'machine', rect: { x: 87, y: 26, w: 3, h: 2 } },
  // observation deck
  { kind: 'bench', rect: { x: 85, y: 41, w: 4, h: 1 } },
];

export const DOORS: readonly DoorLayout[] = [
  {
    id: 'door-outer-airlock',
    label: 'OUTER AIRLOCK',
    tileX: 2,
    tileY: 25,
    span: 3,
    orientation: 'vertical',
    initial: 'LOCKED',
    lockedReason: 'PRESSURE SEALED',
    lockedLine: 'Sealed tight. The ocean is on the other side of that.',
    accent: COLORS.cyan,
  },
  {
    id: 'door-upper-access',
    label: 'UPPER FACILITY ACCESS',
    tileX: 6,
    tileY: 32,
    span: 3,
    orientation: 'horizontal',
    initial: 'LOCKED',
    lockedReason: 'LOCKED',
    lockedLine: "Guess that's not the way in.",
    accent: COLORS.red,
  },
  { id: 'door-main-access', label: 'MAIN ACCESS', tileX: 15, tileY: 28, span: 3, orientation: 'vertical', initial: 'CLOSED', accent: COLORS.cyan },
  { id: 'door-medbay', label: 'MEDBAY', tileX: 24, tileY: 15, span: 2, orientation: 'horizontal', initial: 'CLOSED', accent: 0x22e0d0 },
  { id: 'door-security-west', label: 'SECURITY', tileX: 42, tileY: 11, span: 3, orientation: 'vertical', initial: 'CLOSED', accent: COLORS.red },
  { id: 'door-security-south', label: 'SECURITY', tileX: 47, tileY: 15, span: 3, orientation: 'horizontal', initial: 'CLOSED', accent: COLORS.red },
  { id: 'door-power', label: 'POWER CORE', tileX: 33, tileY: 34, span: 3, orientation: 'horizontal', initial: 'CLOSED', accent: 0xff2a5a },
  { id: 'door-maintenance', label: 'MAINTENANCE', tileX: 47, tileY: 36, span: 3, orientation: 'horizontal', initial: 'CLOSED', accent: COLORS.yellow },
  { id: 'door-server', label: 'SERVER ROOM', tileX: 57, tileY: 7, span: 3, orientation: 'vertical', initial: 'CLOSED', accent: COLORS.cyan },
  { id: 'door-lab', label: 'RESEARCH LAB', tileX: 59, tileY: 24, span: 3, orientation: 'vertical', initial: 'CLOSED', accent: COLORS.green },
  { id: 'door-aquarium', label: 'AQUARIUM', tileX: 73, tileY: 7, span: 3, orientation: 'vertical', initial: 'CLOSED', accent: COLORS.blue },
  { id: 'door-wing', label: 'EXPERIMENT WING', tileX: 77, tileY: 24, span: 3, orientation: 'vertical', initial: 'CLOSED', accent: COLORS.purple },
];
