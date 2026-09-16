import * as THREE from 'three';

/**
 * A full-viewport Three.js canvas stacked above Phaser's own canvas. Render is driven manually
 * from a Phaser scene's update() (one renderer.render() call per Phaser frame) — there is no
 * independent requestAnimationFrame loop here, so the two engines never fight over timing.
 */
export class ThreeStage {
  readonly renderer: THREE.WebGLRenderer;
  readonly canvas: HTMLCanvasElement;
  private readonly onResize: () => void;

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
    this.resize();

    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
  }

  get aspect(): number {
    return window.innerWidth / Math.max(1, window.innerHeight);
  }

  private resize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight, true);
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.render(scene, camera);
  }

  /** Removes the canvas and frees the GL context — call once when leaving the 3D scene for good. */
  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    this.canvas.remove();
  }
}
