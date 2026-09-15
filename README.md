# KRAKEN — Dead Signal

A 2D top-down cyberpunk survival/exploration horror game.

## Concept
Set in a futuristic underwater cyberpunk research facility during a catastrophic containment breach. The player is hunted by an escaped cybernetic octopus. Hacking facility systems allows progression but generates noise that attracts the threat.

## Tech Stack
- TypeScript
- Phaser 3
- Vite

## Folder Structure

```text
src/
├── main.ts
├── config/
│   └── GameConfig.ts
│
├── scenes/
│   ├── BootScene.ts
│   ├── PreloadScene.ts
│   ├── MainMenuScene.ts
│   ├── GameScene.ts
│   └── GameOverScene.ts
│
├── entities/
│   ├── Player.ts
│   └── Octopus.ts
│
├── systems/
│   ├── InteractionSystem.ts
│   ├── DoorSystem.ts
│   ├── HackingSystem.ts
│   ├── ThreatSystem.ts
│   ├── NoiseSystem.ts
│   └── GameState.ts
│
├── map/
│   ├── FacilityMap.ts
│   ├── Room.ts
│   └── MapData.ts
│
├── ui/
│   ├── HUD.ts
│   ├── InteractionPrompt.ts
│   ├── ThreatIndicator.ts
│   └── CyberdeckUI.ts
│
├── data/
│   ├── rooms.ts
│   ├── items.ts
│   └── objectives.ts
│
├── utils/
│   ├── Constants.ts
│   └── Helpers.ts
│
└── styles/
    └── main.css

public/
├── assets/
│   ├── sprites/
│   ├── environment/
│   ├── ui/
│   ├── audio/
│   └── maps/
└── fonts/
```

## Getting Started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # strict type-check + production bundle in dist/
```

### Controls
| Key | Action |
| --- | --- |
| WASD / Arrows | Move |
| Shift | Sprint (uses stamina) |
| E | Interact |
| Esc | Pause (R restarts the run while paused) |

### Debug (development only)
F1 toggles debug mode (overlay + collision view). While it is on: F2 Level 1 card, F3 all cards, F4 power 100%, F5 step alert, F8 lockdown. F6/F7/F9 are reserved for A-3 and the final chase (later phases).

## Build Status
Phase 1 (Foundation) complete: scenes, player movement/sprint/stamina, tile collision, camera, 13-room facility map, doors + generic interaction framework, HUD, central GameState, debug mode. All art is procedural placeholder.
