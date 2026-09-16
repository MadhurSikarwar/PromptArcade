import * as THREE from 'three';

/**
 * A sphere of faint points scattered above the horizon — the single cheapest thing that makes a
 * night sky read as a sky instead of a flat wall of color. No texture needed.
 */
export function createStarfield(count = 900, radius = 1400): THREE.Points {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    // Bias toward the upper hemisphere (phi small) so stars sit in the sky, not underfoot.
    const phi = Math.acos(1 - Math.random() * 0.62);
    const r = radius * (0.85 + Math.random() * 0.15);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi) + 60;
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    sizes[i] = 0.6 + Math.random() * 1.8;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    color: 0xd8f0ff,
    size: 2.4,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  return new THREE.Points(geometry, material);
}

/** A soft, oversized emissive sphere used as a distant moon/glow anchor in an otherwise empty sky. */
export function createMoon(radius = 46, color = 0x8fc8e8): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(radius, 24, 24);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
  return new THREE.Mesh(geometry, material);
}
