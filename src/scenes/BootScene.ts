import Phaser from 'phaser';
import { SCENES } from '../utils/Constants';
import { requireKeyboard } from '../utils/Helpers';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  create(): void {
    // Stop the browser from reacting to game keys (TAB focus change, F5 reload, arrow scrolling...).
    requireKeyboard(this).addCapture('TAB,SPACE,UP,DOWN,LEFT,RIGHT,F1,F2,F3,F4,F5,F6,F7,F8,F9');
    this.scene.start(SCENES.preload);
  }
}
