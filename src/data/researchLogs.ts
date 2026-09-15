export const GLITCH = '▓▒░ GLITCH ░▒▓';

export const LOGS = {
  medbay: {
    title: 'MEDBAY // EMERGENCY RECORDING 0417',
    lines: ['"If you\'re hearing this..."', GLITCH, '"...A-3 isn\'t contained."', '"We sealed the lab. It opened it."', GLITCH, '"It learned the doors."'],
  },
  crew: {
    title: 'CREW QUARTERS // PERSONAL LOG — T. OKAFOR',
    lines: ['Day 41. The lights flicker when it moves.', 'Maintenance says it\'s the grid.', 'It isn\'t the grid.'],
  },
  security: {
    title: 'SECURITY // INCIDENT FEED',
    lines: ['UNAUTHORIZED MOVEMENT — ZONE 3', 'UNAUTHORIZED MOVEMENT — ZONE 2', 'CAMERA ACCESS: 2 USERS CONNECTED', '> USER 2 IDENTITY: UNKNOWN'],
  },
  server: {
    title: 'ARCHIVE // PROJECT NEON',
    lines: ['SUBJECT: A-3 (Enteroctopus / cybernetic graft)', 'DESIGN GOALS:', ' · Extreme pressure resistance', ' · Regeneration', ' · Enhanced intelligence', ' · Machine interaction', ' · Environmental adaptation', ' · Autonomous survival', 'STATUS: ██████ CONTAINMENT FAILURE'],
  },
  lab: {
    title: 'RESEARCH LAB // DR. VASQUEZ JOURNAL',
    lines: ['"We thought it was becoming intelligent."', '...', '"We were wrong."', '...', '"It was becoming aware."'],
  },
  wing: {
    title: 'EXPERIMENT WING // CONTAINMENT CONTROL',
    lines: ['Containment protocol failed.', 'Neural link active on all facility subsystems.', 'Doors. Cameras. Lighting. Power.', GLITCH, 'The building is no longer just a building.', 'It is an extension of A-3.'],
  },
} as const;

export const TANKS = {
  a01: { label: 'TANK A-01', status: 'STATUS: EMPTY' },
  a02: { label: 'TANK A-02', status: 'STATUS: DESTROYED' },
  a03: { label: 'TANK A-03', status: 'STATUS: BROKEN FROM INSIDE' },
  a04: { label: 'TANK A-04', status: 'STATUS: FUNCTIONING' },
} as const;
