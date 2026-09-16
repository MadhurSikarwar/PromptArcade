import Phaser from 'phaser';
import { AuthScene } from '../scenes/AuthScene';
import { BootScene } from '../scenes/BootScene';
import { CustomizeScene } from '../scenes/CustomizeScene';
import { EndingScene } from '../scenes/EndingScene';
import { GameOverScene } from '../scenes/GameOverScene';
import { GameScene } from '../scenes/GameScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { PersonalLogScene } from '../scenes/PersonalLogScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { UIScene } from '../scenes/UIScene';
import { GAME_HEIGHT, GAME_WIDTH } from '../utils/Constants';

export function createGameConfig(): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#020406',
    antialias: true,
    roundPixels: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [BootScene, PreloadScene, AuthScene, MainMenuScene, PersonalLogScene, CustomizeScene, GameScene, UIScene, GameOverScene, EndingScene],
  };
}
