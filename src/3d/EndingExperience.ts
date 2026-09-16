import * as THREE from 'three';
import { createMoon, createStarfield } from './Atmosphere';
import { createBubbles, createOcean, type OceanHandle } from './OceanMaterial';
import { easeInOutCubic, easeOutCubic, lerp, windowProgress } from './Easing';

// Mirrors OpeningExperience in reverse: dark depths -> ascent -> surface -> island in the distance.
const T_DEPTHS_END = 3.5;
const T_ASCENT_END = 9.5;
const T_SURFACE_END = 12.5;
const T_TOTAL = 13.5;

const DEEP_COLOR = new THREE.Color(0x010306);
const DAWN_COLOR = new THREE.Color(0x243444);

/** The 2D->3D escape mirror: facility lights recede below, a dark rise, then breaking the surface into calm dawn light. */
export class EndingExperience {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;

  private readonly ocean: OceanHandle;
  private readonly bubbles: ReturnType<typeof createBubbles>;
  private readonly stars: THREE.Points;
  private readonly ambient: THREE.AmbientLight;
  private readonly sun: THREE.DirectionalLight;
  private readonly facilityLights: { light: THREE.PointLight; lampMat: THREE.MeshBasicMaterial }[] = [];
  private readonly island: THREE.Group;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(54, aspect, 0.1, 4000);
    this.scene.background = DEEP_COLOR.clone();
    this.scene.fog = new THREE.FogExp2(DEEP_COLOR.getHex(), 0.0045);

    this.ambient = new THREE.AmbientLight(0x2a3a4a, 0.1);
    this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight(0xbfe0ff, 0);
    this.sun.position.set(60, 120, 40);
    this.scene.add(this.sun);

    this.stars = createStarfield(700, 1400);
    (this.stars.material as THREE.PointsMaterial).opacity = 0;
    this.scene.add(this.stars);
    const moonDisc = createMoon(44, 0xbfe0f0);
    moonDisc.position.set(220, 220, -460);
    this.scene.add(moonDisc);

    const lightColors = [0x2fd8ff, 0xff2bd6, 0x2fd8ff];
    for (let i = 0; i < 3; i++) {
      const light = new THREE.PointLight(lightColors[i], 2.2, 220, 2);
      light.position.set(-8 + i * 10, -140, -40 - i * 8);
      this.scene.add(light);

      // A bare PointLight is invisible on its own — give it an actual glowing mesh to look at.
      const lampMat = new THREE.MeshBasicMaterial({ color: lightColors[i], transparent: true, opacity: 1, toneMapped: false });
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 12), lampMat);
      lamp.position.copy(light.position);
      this.scene.add(lamp);

      this.facilityLights.push({ light, lampMat });
    }

    this.ocean = createOcean(2200, 110, 0x1c5262, 0x02121a, 1, DAWN_COLOR.getHex());
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
    this.ocean.setCameraPosition(this.camera.position);
    const bubbleOpacity = 1 - windowProgress(elapsed, T_ASCENT_END - 1, T_SURFACE_END, easeInOutCubic);
    this.bubbles.update(elapsed, bubbleOpacity);

    if (elapsed < T_DEPTHS_END) this.runDepths(elapsed);
    else if (elapsed < T_ASCENT_END) this.runAscent(elapsed);
    else this.runSurface(elapsed);
  }

  private runDepths(elapsed: number): void {
    const t = windowProgress(elapsed, 0, T_DEPTHS_END, easeInOutCubic);
    for (const fl of this.facilityLights) {
      fl.light.intensity = lerp(2.2, 0.3, t);
      fl.lampMat.opacity = lerp(1, 0.14, t);
    }
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
      this.scene.fog.density = lerp(0.0022, 0.0045, underwaterT);
    }
    this.ambient.intensity = lerp(0.85, 0.1, underwaterT);
    this.sun.intensity = lerp(0.9, 0, underwaterT);
    (this.stars.material as THREE.PointsMaterial).opacity = 0.8 * (1 - underwaterT);
    for (const fl of this.facilityLights) {
      fl.light.intensity = Math.max(0, fl.light.intensity - 0.02);
      fl.lampMat.opacity = Math.max(0, fl.lampMat.opacity - 0.01);
    }
  }

  private runSurface(elapsed: number): void {
    const t = windowProgress(elapsed, T_ASCENT_END, T_SURFACE_END, easeOutCubic);
    this.camera.position.set(lerp(2, 10, t), lerp(-4, 26, t), lerp(8, 70, t));
    this.camera.lookAt(0, 8, -30);
    this.ambient.intensity = lerp(0.1, 0.9, t);
    this.sun.intensity = lerp(0, 0.9, t);
    (this.stars.material as THREE.PointsMaterial).opacity = lerp(0.8, 0.15, t);

    const holdT = windowProgress(elapsed, T_SURFACE_END, T_TOTAL, easeOutCubic);
    this.camera.position.y = lerp(this.camera.position.y, 34, holdT * 0.3);
  }

  private buildIsland(): THREE.Group {
    const group = new THREE.Group();
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x30373f, roughness: 0.95, metalness: 0.08 });
    const rng = mulberry32(11);
    for (let i = 0; i < 4; i++) {
      const geo = new THREE.IcosahedronGeometry(6 + rng() * 6, 1);
      const mesh = new THREE.Mesh(geo, rockMat);
      const angle = rng() * Math.PI * 2;
      const dist = rng() * 14;
      mesh.position.set(Math.cos(angle) * dist, 3 + rng() * 3, -60 + Math.sin(angle) * dist);
      mesh.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      mesh.scale.set(1, 1.1, 1);
      group.add(mesh);
    }
    for (let i = 0; i < 6; i++) {
      const geo = new THREE.IcosahedronGeometry(2 + rng() * 3, 1);
      const mesh = new THREE.Mesh(geo, rockMat);
      const angle = rng() * Math.PI * 2;
      const dist = 12 + rng() * 14;
      mesh.position.set(Math.cos(angle) * dist, 1 + rng() * 2, -60 + Math.sin(angle) * dist);
      mesh.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      mesh.scale.set(1, 0.6, 1);
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
