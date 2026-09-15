import Phaser from 'phaser';
import { SCENES } from '../utils/Constants';
import { generateTextures } from '../utils/TextureFactory';

/** No external assets yet: all Phase 1 art is generated procedurally and can be swapped for real files here. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENES.preload);
  }

  create(): void {
    generateTextures(this);
    this.scene.start(SCENES.menu);
  }
}
