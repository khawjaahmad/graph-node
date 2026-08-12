import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { COLORS, RENDER_CONFIG } from '../lib/config';
import { POINTS_FRAGMENT, POINTS_VERTEX } from '../lib/shaders';
import type { SharedUniforms } from '../lib/uniforms';

interface NeuralPointsProps {
  geometry: THREE.BufferGeometry;
  uniforms: SharedUniforms;
}

/**
 * Every node in a single draw call.
 *
 * At the default camera distance these render close to one pixel each, so size is
 * not the channel that carries activation — brightness is, and bloom turns a bright
 * single pixel into a real glow. Size still matters when the camera moves in close.
 */
export function NeuralPoints({ geometry, uniforms }: NeuralPointsProps) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          ...uniforms,
          // Nodes start at the bright core cyan; lines start dimmer. See gradeByDepth.
          uBaseTint: { value: new THREE.Color(COLORS.core) },
          uPointSizeMul: { value: RENDER_CONFIG.pointSizeMultiplier },
          uPointSizeMin: { value: RENDER_CONFIG.pointSizeClamp.min },
          uPointSizeMax: { value: RENDER_CONFIG.pointSizeClamp.max },
        },
        vertexShader: POINTS_VERTEX,
        fragmentShader: POINTS_FRAGMENT,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [uniforms]
  );

  useEffect(() => () => material.dispose(), [material]);

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
