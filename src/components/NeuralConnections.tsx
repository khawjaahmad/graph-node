import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { COLORS, MOOD } from '../lib/config';
import { CONNECTIONS_FRAGMENT, CONNECTIONS_VERTEX } from '../lib/shaders';
import type { SharedUniforms } from '../lib/uniforms';

interface NeuralConnectionsProps {
  geometry: THREE.BufferGeometry;
  uniforms: SharedUniforms;
}

/**
 * Every edge in a single draw call, with signals travelling along them.
 *
 * The vertex shader applies exactly the same `neuralDrift` displacement as
 * NeuralPoints, which is what keeps each strand welded to its two endpoints while
 * the whole structure flows.
 */
export function NeuralConnections({ geometry, uniforms }: NeuralConnectionsProps) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          ...uniforms,
          // Dimmer than the nodes: thousands of these overlap additively.
          uBaseTint: { value: new THREE.Color(COLORS.mid) },
          uSignalSpeed: { value: MOOD.signal.speed },
          uSignalSharpness: { value: MOOD.signal.sharpness },
          uSignalTail: { value: MOOD.signal.tailFalloff },
          uSignalDensity: { value: MOOD.signal.density },
          uSignalBrightness: { value: MOOD.signal.brightness },
        },
        vertexShader: CONNECTIONS_VERTEX,
        fragmentShader: CONNECTIONS_FRAGMENT,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [uniforms]
  );

  useEffect(() => () => material.dispose(), [material]);

  return <lineSegments geometry={geometry} material={material} frustumCulled={false} />;
}
