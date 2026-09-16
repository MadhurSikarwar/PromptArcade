import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/**
 * A full-viewport Three.js canvas stacked above Phaser's own canvas. Render is driven manually
 * from a Phaser scene's update() (one composer.render() call per Phaser frame) — there is no
 * independent requestAnimationFrame loop here, so the two engines never fight over timing.
 */
export class ThreeStage {
  readonly renderer: THREE.WebGLRenderer;
  readonly canvas: HTMLCanvasElement;
  private readonly onResize: () => void;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;

  constructor(zIndex = 10) {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = String(zIndex);
    canvas.style.pointerEvents = 'none';
    canvas.style.display = 'block';
    document.body.appendChild(canvas);
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.resize();

    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
  }

  get aspect(): number {
    return window.innerWidth / Math.max(1, window.innerHeight);
  }

  /** Cinematic glow on bright/emissive areas (facility lights, the diver's lamp, stars) — call once after building the scene. */
  usePostProcessing(scene: THREE.Scene, camera: THREE.Camera, strength = 0.5, radius = 0.4, threshold = 0.45): void {
    const size = new THREE.Vector2(window.innerWidth, window.innerHeight);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloomPass = new UnrealBloomPass(size, strength, radius, threshold);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, true);
    this.composer?.setSize(w, h);
    if (this.bloomPass) this.bloomPass.resolution.set(w, h);
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    if (this.composer) this.composer.render();
    else this.renderer.render(scene, camera);
  }

  /** Removes the canvas and frees the GL context — call once when leaving the 3D scene for good. */
  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.composer?.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }
}
