import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORS, MOOD } from '../lib/config';
import { NEBULA_FRAGMENT, NEBULA_VERTEX } from '../lib/shaders';

/** Sits outside the starfield's outer radius so stars read in front of it. */
const SHELL_RADIUS = 500;

interface NebulaBackdropProps {
  reducedMotion: boolean;
}

/**
 * A very dark procedural nebula standing in for the flat black background.
 *
 * Kept deliberately faint: it exists to give the void some structure and depth, not
 * to be looked at. If it ever reads as visible haze, lower `MOOD.nebula.intensity`.
 */
export function NebulaBackdrop({ reducedMotion }: NebulaBackdropProps) {
  const elapsed = useRef(0);

  const { geometry, material } = useMemo(() => {
    const geo = new THREE.SphereGeometry(SHELL_RADIUS, 32, 24);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: MOOD.nebula.intensity },
        uColorNebula: { value: new THREE.Color(COLORS.nebula) },
        uColorOuter: { value: new THREE.Color(COLORS.outer) },
      },
      vertexShader: NEBULA_VERTEX,
      fragmentShader: NEBULA_FRAGMENT,
      side: THREE.BackSide,
      depthWrite: false,
    });

    return { geometry: geo, material: mat };
  }, []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  useFrame((_, delta) => {
    if (reducedMotion) return;
    elapsed.current += Math.min(delta, 0.05) * MOOD.nebula.speed;
    material.uniforms.uTime.value = elapsed.current;
  });

  return <mesh geometry={geometry} material={material} renderOrder={-1} frustumCulled={false} />;
}
