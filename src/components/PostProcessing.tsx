import { EffectComposer, Bloom, ChromaticAberration, Vignette, DepthOfField } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

export function PostProcessing() {
  return (
    <EffectComposer>
      {/* Bloom effect for glowing elements */}
      <Bloom
        intensity={1.2}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.9}
        mipmapBlur
        radius={0.8}
      />
      
      {/* Chromatic aberration for depth */}
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={new THREE.Vector2(0.0015, 0.0015)}
      />
      
      {/* Vignette for focus */}
      <Vignette
        offset={0.3}
        darkness={0.5}
        blendFunction={BlendFunction.NORMAL}
      />
      
      {/* Depth of field for cinematic look */}
      <DepthOfField
        focusDistance={0.02}
        focalLength={0.05}
        bokehScale={3}
        height={480}
      />
    </EffectComposer>
  );
}
