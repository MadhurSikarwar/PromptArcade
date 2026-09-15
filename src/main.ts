import Phaser from 'phaser';
import './styles/main.css';
import { createGameConfig } from './config/GameConfig';
import { getGameState } from './systems/GameState';

const game = new Phaser.Game(createGameConfig());

declare global {
  interface Window {
    __NEON_DIVER__?: { game: Phaser.Game; getState: typeof getGameState };
  }
}

// Dev-only handle for inspection/testing from the browser console. Stripped from production builds.
if (import.meta.env.DEV) {
  window.__NEON_DIVER__ = { game, getState: getGameState };
}
