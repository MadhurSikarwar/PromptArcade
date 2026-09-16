import * as THREE from 'three';
import { createBubbles, createOcean, type OceanHandle } from './OceanMaterial';
import { easeInOutCubic, easeOutCubic, easeOutSine, lerp, windowProgress } from './Easing';

// Scripted timeline, in seconds. Tuned for a tight ~19s beat rather than padded runtime.
const T_ISLAND_END = 4.5;
const T_ENTER_WATER_END = 6.8;
const T_DESCEND_END = 12.6;
const T_REVEAL_START = 12.6;
const T_REVEAL_END = 17.2;
const T_TOTAL = 19;

const SKY_COLOR = new THREE.Color(0x0c1420);
const STORM_COLOR = new THREE.Color(0x1a2430);
const DEEP_COLOR = new THREE.Color(0x010306);

interface FacilityLight {
  light: THREE.PointLight;
  onAt: number;
  targetIntensity: number;
}

/**
 * The 3D opening: a storm-lit island, a diver entering the water, a dark descent, and a facility
 * waking up one light at a time. Fully scripted — the player only ever watches or skips it.
 */
export class OpeningExperience {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;

  private readonly ocean: OceanHandle;
  private readonly bubbles: ReturnType<typeof createBubbles>;
  private readonly ambient: THREE.AmbientLight;
  private readonly moon: THREE.DirectionalLight;
  private readonly diveLight: THREE.PointLight;
  private readonly diver: THREE.Group;
  private readonly facilityLights: FacilityLight[] = [];
  private nextFlashAt = 1.4;
  private lastFacilityAudioAt = -1;
  private onFacilityLight: (() => void) | null = null;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(58, aspect, 0.1, 3000);
    this.scene.background = SKY_COLOR.clone();
    this.scene.fog = new THREE.FogExp2(SKY_COLOR.getHex(), 0.0026);

    this.ambient = new THREE.AmbientLight(0x2a3a4a, 0.9);
    this.scene.add(this.ambient);
    this.moon = new THREE.DirectionalLight(0x7fb0d0, 0.7);
    this.moon.position.set(-60, 90, -40);
    this.scene.add(this.moon);

    this.buildIsland();
    this.diver = this.buildDiver();
    this.diveLight = new THREE.PointLight(0x8fe8ff, 0, 220, 2);
    this.diver.add(this.diveLight);
    this.scene.add(this.diver);

    this.ocean = createOcean(1400, 90, 0x1fb8d8, 0x02121a, 1);
    this.scene.add(this.ocean.mesh);

    this.bubbles = createBubbles(140, 30, -420, 40, 0x9fe8ff);
    this.bubbles.points.position.set(6, 0, -20);
    this.scene.add(this.bubbles.points);

    this.buildFacility();

    this.camera.position.set(0, 46, 120);
    this.camera.lookAt(0, 8, 0);
  }

  /** Fires once per facility light coming online, for an SFX hook from the Phaser side. */
  setOnFacilityLight(cb: () => void): void {
    this.onFacilityLight = cb;
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
    this.diver.position.y = 3.2 + Math.sin(elapsed * 1.4) * 0.15;

    if (elapsed < T_ISLAND_END) this.runIsland(elapsed);
    else if (elapsed < T_ENTER_WATER_END) this.runEnterWater(elapsed);
    else if (elapsed < T_DESCEND_END) this.runDescend(elapsed);
    else this.runReveal(elapsed);

    this.updateAtmosphere(elapsed);
  }

  // ------------------------------------------------------------------ phases

  private runIsland(elapsed: number): void {
    const t = windowProgress(elapsed, 0, T_ISLAND_END, easeInOutCubic);
    const camX = lerp(20, 6, t);
    const camY = lerp(46, 14, t);
    const camZ = lerp(120, 34, t);
    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(0, 3 + lerp(2, 0, t), -6);

    if (elapsed >= this.nextFlashAt) {
      this.nextFlashAt = elapsed + 2.2 + Math.random() * 2.4;
      this.moon.intensity = 2.4;
    } else {
      this.moon.intensity = Math.max(0.7, this.moon.intensity - 0.06);
    }
  }

  private runEnterWater(elapsed: number): void {
    const t = windowProgress(elapsed, T_ISLAND_END, T_ENTER_WATER_END, easeInOutCubic);
    this.camera.position.set(lerp(6, 1, t), lerp(14, 4, t), lerp(34, 10, t));
    this.camera.lookAt(0, lerp(1, -1, t), -14);
    this.moon.intensity = lerp(this.moon.intensity, 0.6, t);
  }

  private runDescend(elapsed: number): void {
    const t = windowProgress(elapsed, T_ENTER_WATER_END, T_DESCEND_END, easeInOutCubic);
    this.camera.position.set(lerp(1, -3, t), lerp(4, -170, easeInCubicLocal(t)), lerp(10, -18, t));
    this.camera.lookAt(-3, this.camera.position.y - 30, -60);
    this.diveLight.intensity = lerp(0.4, 3.6, t);
  }

  private runReveal(elapsed: number): void {
    const t = windowProgress(elapsed, T_REVEAL_START, T_REVEAL_END, easeOutSine);
    this.camera.position.set(lerp(-3, -8, t), lerp(-170, -210, t), lerp(-18, -70, t));
    this.camera.lookAt(-10, this.camera.position.y - 6, -220);
    this.diveLight.intensity = 3.6;

    for (const fl of this.facilityLights) {
      if (elapsed >= fl.onAt) {
        fl.light.intensity = Math.min(fl.targetIntensity, fl.light.intensity + fl.targetIntensity * 0.05);
        if (fl.light.intensity > 0.05 && fl.onAt > this.lastFacilityAudioAt) {
          this.lastFacilityAudioAt = fl.onAt;
          this.onFacilityLight?.();
        }
      }
    }

    const holdT = windowProgress(elapsed, T_REVEAL_END, T_TOTAL, easeOutCubic);
    this.camera.position.z = lerp(this.camera.position.z, -110, holdT * 0.4);
  }

  private updateAtmosphere(elapsed: number): void {
    const underwaterT = windowProgress(elapsed, T_ENTER_WATER_END, T_DESCEND_END + 1.5, easeInOutCubic);
    const bg = this.scene.background as THREE.Color;
    bg.lerpColors(STORM_COLOR, DEEP_COLOR, underwaterT);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(bg);
      this.scene.fog.density = lerp(0.0026, 0.011, underwaterT);
    }
    this.ambient.intensity = lerp(0.9, 0.05, underwaterT);
  }

  // ------------------------------------------------------------------ geometry

  private buildIsland(): void {
    const group = new THREE.Group();
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 1, metalness: 0.05 });
    const rng = mulberry32(7);
    for (let i = 0; i < 9; i++) {
      const geo = new THREE.IcosahedronGeometry(3 + rng() * 6, 0);
      const mesh = new THREE.Mesh(geo, rockMat);
      const angle = rng() * Math.PI * 2;
      const dist = rng() * 22;
      mesh.position.set(Math.cos(angle) * dist, -2 + rng() * 3, -18 + Math.sin(angle) * dist - 8);
      mesh.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      mesh.scale.set(1, 0.6 + rng() * 0.6, 1);
      group.add(mesh);
    }
    const base = new THREE.Mesh(new THREE.CylinderGeometry(26, 32, 6, 8), rockMat);
    base.position.set(0, -6, -20);
    group.add(base);
    this.scene.add(group);
  }

  private buildDiver(): THREE.Group {
    const group = new THREE.Group();
    const suitMat = new THREE.MeshStandardMaterial({ color: 0x141b22, roughness: 0.7, metalness: 0.15 });
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x33404a, roughness: 0.5, metalness: 0.4 });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.1, 4, 8), suitMat);
    body.position.y = 0.9;
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), suitMat);
    head.position.y = 1.75;
    group.add(head);

    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.0, 8), tankMat);
    tank.position.set(0, 0.95, -0.4);
    group.add(tank);

    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshStandardMaterial({ color: 0x8fe8ff, emissive: 0x2fb8d8, emissiveIntensity: 1.4 }));
    lens.position.set(0, 1.75, 0.3);
    group.add(lens);

    group.position.set(3, 3.2, -4);
    return group;
  }

  private buildFacility(): void {
    const structures: { pos: [number, number, number]; size: [number, number, number] }[] = [
      { pos: [-14, -212, -230], size: [16, 20, 16] },
      { pos: [8, -218, -250], size: [10, 30, 10] },
      { pos: [-30, -206, -260], size: [12, 14, 22] },
      { pos: [-4, -224, -280], size: [26, 8, 14] },
    ];
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.9, metalness: 0.3 });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x2fd8ff, transparent: true, opacity: 0.85 });
    const lightColors = [0x2fd8ff, 0xff2bd6, 0x2fd8ff, 0xffc23a];

    structures.forEach((s, i) => {
      const geo = new THREE.BoxGeometry(...s.size);
      const mesh = new THREE.Mesh(geo, bodyMat);
      mesh.position.set(...s.pos);
      this.scene.add(mesh);

      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
      edges.position.copy(mesh.position);
      this.scene.add(edges);

      const light = new THREE.PointLight(lightColors[i % lightColors.length], 0, 140, 2);
      light.position.set(s.pos[0], s.pos[1] + s.size[1] / 2 + 4, s.pos[2]);
      this.scene.add(light);
      this.facilityLights.push({ light, onAt: T_REVEAL_START + 0.6 + i * 1.3, targetIntensity: 2.6 });
    });
  }
}

function easeInCubicLocal(t: number): number {
  return t * t * t;
}

/** Deterministic PRNG so the island's rock scatter is identical every time the scene loads. */
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
