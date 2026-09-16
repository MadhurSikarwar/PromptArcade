import * as THREE from 'three';
import { createBubbles, createOcean, type OceanHandle } from './OceanMaterial';
import { easeInOutCubic, easeOutCubic, lerp, windowProgress } from './Easing';

// Mirrors OpeningExperience in reverse: dark depths -> ascent -> surface -> island in the distance.
const T_DEPTHS_END = 3.5;
const T_ASCENT_END = 9.5;
const T_SURFACE_END = 12.5;
const T_TOTAL = 13.5;

const DEEP_COLOR = new THREE.Color(0x010306);
const DAWN_COLOR = new THREE.Color(0x24313c);

/** The 2D->3D escape mirror: facility lights recede below, a dark rise, then breaking the surface into calm dawn light. */
export class EndingExperience {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;

  private readonly ocean: OceanHandle;
  private readonly bubbles: ReturnType<typeof createBubbles>;
  private readonly ambient: THREE.AmbientLight;
  private readonly sun: THREE.DirectionalLight;
  private readonly facilityLights: THREE.PointLight[] = [];
  private readonly island: THREE.Group;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(58, aspect, 0.1, 3000);
    this.scene.background = DEEP_COLOR.clone();
    this.scene.fog = new THREE.FogExp2(DEEP_COLOR.getHex(), 0.011);

    this.ambient = new THREE.AmbientLight(0x2a3a4a, 0.1);
    this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight(0xbfe0ff, 0);
    this.sun.position.set(40, 90, 20);
    this.scene.add(this.sun);

    const lightColors = [0x2fd8ff, 0xff2bd6, 0x2fd8ff];
    for (let i = 0; i < 3; i++) {
      const light = new THREE.PointLight(lightColors[i], 2.2, 140, 2);
      light.position.set(-8 + i * 10, -140, -40 - i * 8);
      this.scene.add(light);
      this.facilityLights.push(light);
    }

    this.ocean = createOcean(1400, 90, 0x2fc8dc, 0x02121a, 1);
    this.scene.add(this.ocean.mesh);

    this.bubbles = createBubbles(120, 26, -420, 30, 0x9fe8ff);
    this.bubbles.points.position.set(-4, 0, -30);
    this.scene.add(this.bubbles.points);

    this.island = this.buildIsland();
    this.scene.add(this.island);

    this.camera.position.set(-4, -160, -30);
    this.camera.lookAt(-4, 0, -60);
  }

  get totalDuration(): number {
    return T_TOTAL;
  }

  isComplete(elapsed: number): boolean {
    return elapsed >= T_TOTAL;
  }

  update(elapsed: number): void {
    this.ocean.material.uniforms.uTime.value = elapsed;
    this.bubbles.update(elapsed);

    if (elapsed < T_DEPTHS_END) this.runDepths(elapsed);
    else if (elapsed < T_ASCENT_END) this.runAscent(elapsed);
    else this.runSurface(elapsed);
  }

  private runDepths(elapsed: number): void {
    const t = windowProgress(elapsed, 0, T_DEPTHS_END, easeInOutCubic);
    for (const light of this.facilityLights) light.intensity = lerp(2.2, 0.3, t);
    this.camera.position.set(-4, lerp(-160, -168, t), lerp(-30, -22, t));
    this.camera.lookAt(-4, this.camera.position.y + 20, -50);
  }

  private runAscent(elapsed: number): void {
    const t = windowProgress(elapsed, T_DEPTHS_END, T_ASCENT_END, easeInOutCubic);
    const y = lerp(-168, -4, t);
    this.camera.position.set(lerp(-4, 2, t), y, lerp(-22, 8, t));
    this.camera.lookAt(2, y + 24, -10);

    const underwaterT = 1 - t;
    const bg = this.scene.background as THREE.Color;
    bg.lerpColors(DAWN_COLOR, DEEP_COLOR, underwaterT);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(bg);
      this.scene.fog.density = lerp(0.0028, 0.011, underwaterT);
    }
    this.ambient.intensity = lerp(0.85, 0.1, underwaterT);
    this.sun.intensity = lerp(0.9, 0, underwaterT);
    for (const light of this.facilityLights) light.intensity = Math.max(0, light.intensity - 0.02);
  }

  private runSurface(elapsed: number): void {
    const t = windowProgress(elapsed, T_ASCENT_END, T_SURFACE_END, easeOutCubic);
    this.camera.position.set(lerp(2, 8, t), lerp(-4, 22, t), lerp(8, 60, t));
    this.camera.lookAt(0, 8, -20);
    this.ambient.intensity = lerp(0.1, 0.9, t);
    this.sun.intensity = lerp(0, 0.9, t);

    const holdT = windowProgress(elapsed, T_SURFACE_END, T_TOTAL, easeOutCubic);
    this.camera.position.y = lerp(this.camera.position.y, 30, holdT * 0.3);
  }

  private buildIsland(): THREE.Group {
    const group = new THREE.Group();
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 1, metalness: 0.05 });
    const rng = mulberry32(11);
    for (let i = 0; i < 6; i++) {
      const geo = new THREE.IcosahedronGeometry(4 + rng() * 5, 0);
      const mesh = new THREE.Mesh(geo, rockMat);
      const angle = rng() * Math.PI * 2;
      const dist = rng() * 16;
      mesh.position.set(Math.cos(angle) * dist, 2 + rng() * 3, -50 + Math.sin(angle) * dist);
      mesh.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      group.add(mesh);
    }
    return group;
  }
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
