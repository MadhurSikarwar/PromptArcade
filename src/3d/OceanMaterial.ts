import * as THREE from 'three';

const vertexShader = `
  uniform float uTime;
  uniform float uAmplitude;
  varying float vHeight;
  varying vec3 vNormal;

  void main() {
    vec3 pos = position;
    float wave = sin(pos.x * 0.05 + uTime * 0.6) * cos(pos.y * 0.045 - uTime * 0.4);
    wave += sin(pos.x * 0.015 - uTime * 0.22) * 0.6;
    wave += sin((pos.x + pos.y) * 0.09 + uTime * 0.9) * 0.25;
    pos.z += wave * uAmplitude;
    vHeight = wave;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 uColorTop;
  uniform vec3 uColorDeep;
  uniform float uOpacity;
  varying float vHeight;
  varying vec3 vNormal;

  void main() {
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0), 2.0);
    vec3 color = mix(uColorDeep, uColorTop, clamp(vHeight * 0.5 + 0.5, 0.0, 1.0));
    color += fresnel * 0.3;
    gl_FragColor = vec4(color, uOpacity);
  }
`;

export interface OceanHandle {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
}

/**
 * A single animated ocean plane used by both the opening dive and the ending ascent — a vertex
 * shader ripples the surface with a few layered sine waves, the fragment shader shades it from a
 * lit "top" color into a dark "deep" color with a cheap fresnel rim, no textures required.
 */
export function createOcean(size = 1400, segments = 90, colorTop = 0x1fb8d8, colorDeep = 0x020a14, opacity = 1): OceanHandle {
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uAmplitude: { value: 3.4 },
      uColorTop: { value: new THREE.Color(colorTop) },
      uColorDeep: { value: new THREE.Color(colorDeep) },
      uOpacity: { value: opacity },
    },
    vertexShader,
    fragmentShader,
    transparent: opacity < 1,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  return { mesh, material };
}

/** A loop of small rising points used for bubbles — formula-driven so it never drifts or needs resetting. */
export function createBubbles(count: number, radius: number, minY: number, maxY: number, color = 0x9fe8ff): { points: THREE.Points; update: (elapsed: number) => void } {
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
  const material = new THREE.PointsMaterial({ color, size: 1.6, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const points = new THREE.Points(geometry, material);

  const range = maxY - minY;
  const update = (elapsed: number): void => {
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
