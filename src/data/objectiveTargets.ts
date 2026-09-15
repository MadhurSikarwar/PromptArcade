import { ANCHORS, DOORS, ROOM_LAYOUTS } from '../map/MapData';
import type { RoomId } from './rooms';
import { TILE_SIZE } from '../utils/Constants';

export interface WorldPoint {
  x: number;
  y: number;
}

const W = (t: { x: number; y: number }): WorldPoint => ({ x: t.x * TILE_SIZE + TILE_SIZE / 2, y: t.y * TILE_SIZE + TILE_SIZE / 2 });

function doorCenter(id: string): WorldPoint {
  const d = DOORS.find((door) => door.id === id);
  if (!d) return { x: 0, y: 0 };
  const length = d.span * TILE_SIZE;
  const half = length / 2;
  const horizontal = d.orientation === 'horizontal';
  return {
    x: horizontal ? d.tileX * TILE_SIZE + half : d.tileX * TILE_SIZE + TILE_SIZE / 2,
    y: horizontal ? d.tileY * TILE_SIZE + TILE_SIZE / 2 : d.tileY * TILE_SIZE + half,
  };
}

function roomCenter(id: RoomId): WorldPoint {
  const r = ROOM_LAYOUTS.find((room) => room.id === id);
  if (!r) return { x: 0, y: 0 };
  return { x: (r.rect.x + r.rect.w / 2) * TILE_SIZE, y: (r.rect.y + r.rect.h / 2) * TILE_SIZE };
}

/** World-space destination for every mission objective, so the HUD compass can point the player there. */
export const OBJECTIVE_TARGETS: Record<string, WorldPoint> = {
  'm1-exit': doorCenter('door-main-access'),

  'm2-cell': W(ANCHORS.powerCell),
  'm2-medbay': W(ANCHORS.medbayTerminal),
  'm2-generator': W(ANCHORS.generator),
  'm2-breaker': W(ANCHORS.breaker),
  'm2-cooling': W(ANCHORS.cooling),
  'm2-reactor': W(ANCHORS.reactor),

  'm3-card': W(ANCHORS.medbayTerminal),
  'm3-enter': doorCenter('door-security-west'),
  'm3-terminal': W(ANCHORS.securityTerminal),

  'm4-server': doorCenter('door-server'),
  'm4-data': W(ANCHORS.serverTerminal),
  'm4-lab': W(ANCHORS.labTerminal),

  'm5-aquarium': doorCenter('door-aquarium'),
  'm5-breach': W(ANCHORS.tankA03),
  'm5-wing': doorCenter('door-wing'),
  'm5-card': W(ANCHORS.wingTerminal),

  'm6-hub': W(ANCHORS.hubCenter),
  'm6-card': W(ANCHORS.hubCenter),
  'm6-entrance': doorCenter('door-upper-access'),
  'm6-door': doorCenter('door-upper-access'),

  'm7-upper': W(ANCHORS.upperEntry),
  'm7-chase': W(ANCHORS.evacTerminal),
  'm7-airlock': doorCenter('door-final-airlock'),
  'm7-escape': W(ANCHORS.airlockRelease),
};

export function roomTarget(id: RoomId): WorldPoint {
  return roomCenter(id);
}
