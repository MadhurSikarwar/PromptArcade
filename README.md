# NEON DIVER

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
(Note: Only skeletal structure is currently provided, not a runnable game yet)
