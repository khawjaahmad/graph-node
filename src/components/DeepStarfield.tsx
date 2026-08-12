import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { CLOUD_SEED, COLORS, RENDER_CONFIG } from '../lib/config';
import { makeRng, range } from '../lib/random';

/** A sparse shell of distant stars enclosing the whole scene. */
export function DeepStarfield() {
  const geometry = useMemo(() => {
    const rng = makeRng(CLOUD_SEED ^ 0x1f83d9ab);
    const { starCount, starDistance } = RENDER_CONFIG;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // Uniform over the sphere: acos of a uniform variate avoids the polar
      // clustering a naive latitude sweep produces.
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(2 * rng() - 1);
      const radius = range(rng, starDistance.min, starDistance.max);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={0.04}
        color={COLORS.stars}
        transparent
        opacity={0.15}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
