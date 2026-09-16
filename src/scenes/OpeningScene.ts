import Phaser from 'phaser';
import { OpeningExperience } from '../3d/OpeningExperience';
import { ThreeStage } from '../3d/ThreeStage';
import { audio } from '../systems/AudioManager';
import { FONT_MONO, SCENES } from '../utils/Constants';
import { requireKeyboard } from '../utils/Helpers';

/**
 * The 3D cold open: island → dive → facility lights reveal, per the PRD's opening structure.
 * Runs a Three.js scene on its own stacked canvas, driven frame-by-frame from this Phaser
 * scene's update() — no separate render loop, no gameplay logic, just a scripted camera.
 * Skippable at any time; always hands off into GameScene, same as the normal DIVE IN flow.
 */
export class OpeningScene extends Phaser.Scene {
  private stage: ThreeStage | null = null;
  private experience: OpeningExperience | null = null;
  private elapsed = 0;
  private leaving = false;
  private hintEl: HTMLDivElement | null = null;
  private titleEl: HTMLDivElement | null = null;
  private audioArmed = false;

  constructor() {
    super(SCENES.opening);
  }

  create(): void {
    this.leaving = false;
    this.elapsed = 0;
    this.audioArmed = false;

    this.stage = new ThreeStage(10);
    this.experience = new OpeningExperience(this.stage.aspect);
    this.experience.setOnFacilityLight(() => {
      audio.play('click', 0.5);
      audio.play('power-up', 0.25);
    });

    this.hintEl = this.makeOverlayText('PRESS  ENTER  TO  SKIP', 'bottom');
    this.titleEl = this.makeOverlayText('KRAKEN — DEAD SIGNAL', 'top', true);
    this.titleEl.style.opacity = '0';
    window.setTimeout(() => {
      if (this.titleEl) this.titleEl.style.opacity = '1';
    }, 400);

    audio.unlock();
    const armAudio = (): void => {
      if (this.audioArmed) return;
      this.audioArmed = true;
      audio.unlock();
      audio.setAmbience('ocean');
    };
    const keyboard = requireKeyboard(this);
    keyboard.on('keydown-ENTER', () => {
      armAudio();
      this.finish();
    });
    keyboard.on('keydown-SPACE', () => {
      armAudio();
      this.finish();
    });
    keyboard.on('keydown-ESC', () => {
      armAudio();
      this.finish();
    });
    this.input.once('pointerdown', armAudio);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  override update(_time: number, delta: number): void {
    if (this.leaving || !this.stage || !this.experience) return;
    this.elapsed += Math.min(delta, 50) / 1000;
    this.experience.update(this.elapsed);
    this.stage.render(this.experience.scene, this.experience.camera);
    if (this.experience.isComplete(this.elapsed)) this.finish();
  }

  private finish(): void {
    if (this.leaving) return;
    this.leaving = true;
    audio.setAmbienceVolume(0, 0.5);
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      audio.stopAmbience();
      this.scene.start(SCENES.game);
    });
  }

  private cleanup(): void {
    this.stage?.dispose();
    this.stage = null;
    this.experience = null;
    this.hintEl?.remove();
    this.hintEl = null;
    this.titleEl?.remove();
    this.titleEl = null;
  }

  /** A plain fixed-position DOM overlay — needed because it must render ABOVE the stacked Three.js canvas. */
  private makeOverlayText(text: string, anchor: 'top' | 'bottom', big = false): HTMLDivElement {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.position = 'fixed';
    el.style.left = '0';
    el.style.right = '0';
    el.style[anchor] = big ? '6vh' : '5vh';
    el.style.textAlign = 'center';
    el.style.zIndex = '11';
    el.style.pointerEvents = 'none';
    el.style.fontFamily = FONT_MONO;
    el.style.letterSpacing = big ? '0.35em' : '0.2em';
    el.style.fontSize = big ? 'clamp(20px, 4vw, 40px)' : '13px';
    el.style.fontWeight = big ? '700' : '400';
    el.style.color = big ? '#19e6ff' : '#c8e8f0';
    el.style.textShadow = big ? '0 0 18px rgba(25,230,255,0.65)' : '0 0 6px rgba(0,0,0,0.8)';
    el.style.opacity = big ? '1' : '0.6';
    el.style.transition = 'opacity 0.6s ease';
    document.body.appendChild(el);
    return el;
  }
}
