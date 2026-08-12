import {
  Bloom,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  Noise,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { MOOD } from '../lib/config';

/**
 * The cinematic grade.
 *
 * Bloom does the real work here: at default zoom the nodes render around a pixel
 * each, so it is bloom that turns a bright pixel into a glow and makes activation
 * legible at all. Everything after it is framing.
 *
 * Depth of field is by far the most expensive pass, so a `bokehScale` of 0 in the
 * active mood drops it from the chain entirely rather than running it at zero.
 */
export function PostProcessing() {
  const { post } = MOOD;

  return (
    <EffectComposer>
      {post.bokehScale > 0 ? (
        <DepthOfField
          focusDistance={post.focusDistance}
          focalLength={post.focalLength}
          bokehScale={post.bokehScale}
        />
      ) : (
        <></>
      )}

      <Bloom
        intensity={post.bloomIntensity}
        luminanceThreshold={post.bloomThreshold}
        luminanceSmoothing={0.9}
        radius={post.bloomRadius}
        mipmapBlur
      />

      {post.chromaticAberration > 0 ? (
        <ChromaticAberration offset={[post.chromaticAberration, post.chromaticAberration]} />
      ) : (
        <></>
      )}

      {/* Film grain — keeps large flat areas of black from banding. */}
      <Noise opacity={post.grain} premultiply />

      <Vignette
        offset={0.3}
        darkness={post.vignetteDarkness}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}
