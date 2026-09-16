import * as THREE from 'three';
import { clamp01 } from './Easing';

const vertexShader = `
  uniform float uTime;
  uniform float uAmplitude;
  varying float vHeight;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  float waveHeight(vec2 p) {
    float w = sin(p.x * 0.045 + uTime * 0.55) * cos(p.y * 0.04 - uTime * 0.38);
    w += sin(p.x * 0.013 - uTime * 0.2) * 0.5;
    w += sin((p.x + p.y) * 0.07 + uTime * 0.8) * 0.2;
    return w;
  }

  void main() {
    vec3 pos = position;
    float h = waveHeight(pos.xy);
    pos.z += h * uAmplitude;
    vHeight = h;
    vUv = uv;

    // The vertex normal must follow the actual wave slope, not the flat plane's original normal —
    // sampled via finite differences of the same height field used for the displacement above.
    float eps = 3.0;
    float hx = waveHeight(pos.xy + vec2(eps, 0.0)) * uAmplitude;
    float hy = waveHeight(pos.xy + vec2(0.0, eps)) * uAmplitude;
    vec3 tangentX = vec3(eps, 0.0, hx - pos.z);
    vec3 tangentY = vec3(0.0, eps, hy - pos.z);
    vec3 localNormal = normalize(cross(tangentX, tangentY));
    vNormal = normalize(normalMatrix * localNormal);

    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 uColorTop;
  uniform vec3 uColorDeep;
  uniform vec3 uColorHorizon;
  uniform float uOpacity;
  uniform float uTime;
  uniform sampler2D uNormalMap;
  uniform float uHasNormalMap;
  uniform vec3 uCameraPos;
  varying float vHeight;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vec3 geoNormal = normalize(vNormal);

    // The normal map only tints subtle per-pixel ripple darkening/lightening here — no specular
    // punch, which proved impossible to keep small and controlled at this camera scale. This is
    // a deliberately conservative, safe look: readable dark water, not a glitter effect.
    float ripple = 0.0;
    if (uHasNormalMap > 0.5) {
      vec2 uv1 = vUv * 5.0 + vec2(uTime * 0.018, uTime * 0.012);
      vec2 uv2 = vUv * 8.5 + vec2(-uTime * 0.013, uTime * 0.021);
      vec3 n1 = texture2D(uNormalMap, uv1).rgb * 2.0 - 1.0;
      vec3 n2 = texture2D(uNormalMap, uv2).rgb * 2.0 - 1.0;
      ripple = (n1.x + n2.y) * 0.5;
    }

    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    float fresnel = pow(1.0 - max(dot(geoNormal, viewDir), 0.0), 3.0);

    // Distance-based horizon blend: far water lightens toward the sky color instead of reading
    // as one flat wall of color right up to the camera.
    float dist = length(vWorldPos.xz - uCameraPos.xz);
    float horizonT = smoothstep(150.0, 950.0, dist);

    vec3 base = mix(uColorDeep, uColorTop, clamp(vHeight * 0.5 + 0.5, 0.0, 1.0));
    vec3 color = mix(base, uColorHorizon, horizonT);
    color *= 1.0 + ripple * 0.05;
    color += fresnel * 0.05;

    gl_FragColor = vec4(color, uOpacity);
  }
`;

export interface OceanHandle {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  setCameraPosition: (pos: THREE.Vector3) => void;
}

interface NormalMapEntry {
  texture: THREE.Texture;
  ready: boolean;
  onReady: Set<() => void>;
}

const normalMapCache = new Map<string, NormalMapEntry>();

function loadNormalMap(url: string): NormalMapEntry {
  let entry = normalMapCache.get(url);
  if (entry) return entry;
  const onReady = new Set<() => void>();
  const loader = new THREE.TextureLoader();
  const texture = loader.load(url, () => {
    entry!.ready = true;
    for (const cb of onReady) cb();
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  entry = { texture, ready: false, onReady };
  normalMapCache.set(url, entry);
  return entry;
}

/**
 * A single animated ocean plane used by both the opening dive and the ending ascent. Vertex
 * waves give it large-scale swell, a scrolling normal map (the classic three.js waternormals.jpg)
 * adds fine ripple detail and real specular sparkle, and distance fog blends it into the sky at
 * the horizon instead of reading as one flat wall of color.
 */
export function createOcean(
  size = 1400,
  segments = 90,
  colorTop = 0x123642,
  colorDeep = 0x020a14,
  opacity = 1,
  colorHorizon = 0x1a2430,
): OceanHandle {
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  const normalMap = loadNormalMap('/assets/3d/waternormals.jpg');

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uAmplitude: { value: 1.7 },
      uColorTop: { value: new THREE.Color(colorTop) },
      uColorDeep: { value: new THREE.Color(colorDeep) },
      uColorHorizon: { value: new THREE.Color(colorHorizon) },
      uOpacity: { value: opacity },
      uNormalMap: { value: normalMap.texture },
      uHasNormalMap: { value: normalMap.ready ? 1 : 0 },
      uCameraPos: { value: new THREE.Vector3() },
    },
    vertexShader,
    fragmentShader,
    transparent: opacity < 1,
    side: THREE.DoubleSide,
  });

  if (!normalMap.ready) normalMap.onReady.add(() => (material.uniforms.uHasNormalMap.value = 1));

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;

  const setCameraPosition = (pos: THREE.Vector3): void => {
    material.uniforms.uCameraPos.value.copy(pos);
  };

  return { mesh, material, setCameraPosition };
}

/** A loop of small rising points used for bubbles — formula-driven so it never drifts or needs resetting. */
export function createBubbles(count: number, radius: number, minY: number, maxY: number, color = 0x9fe8ff): { points: THREE.Points; update: (elapsed: number, opacity: number) => void } {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 3); // baseX, baseZ, speed
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;
    seeds[i * 3] = Math.cos(angle) * r;
    seeds[i * 3 + 1] = Math.sin(angle) * r;
    seeds[i * 3 + 2] = 4 + Math.random() * 10;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color, size: 1.6, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const points = new THREE.Points(geometry, material);

  const range = maxY - minY;
  const baseOpacity = 0.55;
  const update = (elapsed: number, opacity: number): void => {
    material.opacity = baseOpacity * clamp01(opacity);
    if (material.opacity <= 0.001) return;
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      const bx = seeds[i * 3];
      const bz = seeds[i * 3 + 1];
      const speed = seeds[i * 3 + 2];
      const y = minY + ((elapsed * speed + i * 37) % range);
      attr.setXYZ(i, bx + Math.sin(elapsed * 0.6 + i) * 1.5, y, bz + Math.cos(elapsed * 0.5 + i) * 1.5);
    }
    attr.needsUpdate = true;
  };

  return { points, update };
}
