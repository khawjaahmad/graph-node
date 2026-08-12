import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CLOUD_SEED, MOOD } from '../lib/config';
import { computeHopDistances, pickCascadeSeeds, type Adjacency } from '../lib/neuralCloud';
import { makeRng } from '../lib/random';
import { createSharedUniforms, type SharedUniforms } from '../lib/uniforms';

/** Largest frame delta we will integrate, in seconds. */
const MAX_DELTA = 0.05;

interface AnimationOptions {
  adjacency: Adjacency;
  /** Per-node hop distance buffer, owned by the geometry hook. */
  hops: Float32Array;
  /** Publish the current hop distances to both geometries. */
  syncHops: () => void;
  reducedMotion: boolean;
}

/**
 * The clock behind the whole piece.
 *
 * This hook both constructs the shared uniforms and drives them, deliberately: the
 * uniforms are mutated every frame, and React's immutability rule — correctly —
 * objects to a caller mutating something a hook handed back. Owning construction
 * and mutation together keeps that contract intact while preserving the imperative
 * per-frame writes that Three.js expects.
 */
export function useNeuralAnimation({
  adjacency,
  hops,
  syncHops,
  reducedMotion,
}: AnimationOptions): SharedUniforms {
  const uniforms = useMemo(() => createSharedUniforms(), []);
  const cascadeRng = useMemo(() => makeRng(CLOUD_SEED ^ 0x5bf03635), []);

  const elapsed = useRef(0);
  const sinceCascade = useRef(0);

  /** Choose fresh origins and recompute every node's distance from them. */
  const reseedCascade = useCallback(() => {
    const seeds = pickCascadeSeeds(cascadeRng, adjacency, MOOD.cascade.seedCount);
    computeHopDistances(adjacency, seeds, hops);
    syncHops();
  }, [adjacency, cascadeRng, hops, syncHops]);

  // Start the first cascade immediately, so the piece is alive on first paint.
  useEffect(() => {
    reseedCascade();
  }, [reseedCascade]);

  useFrame((state, delta) => {
    // The first frame after an off-screen pause can carry a very large delta.
    const dt = Math.min(delta, MAX_DELTA);

    uniforms.uAspect.value = state.size.width / Math.max(state.size.height, 1);
    uniforms.uPointer.value.copy(state.pointer);

    // Reduced motion is honoured by zeroing the drivers rather than freezing the
    // clock, which leaves a composed still image the viewer can still orbit.
    uniforms.uDriftAmp.value = reducedMotion ? 0 : MOOD.drift.amplitude;
    uniforms.uCascadeBrightness.value = reducedMotion ? 0 : MOOD.cascade.brightness;
    uniforms.uPointerAttraction.value = reducedMotion ? 0 : MOOD.pointer.attraction;
    uniforms.uPointerBrightness.value = reducedMotion ? 0 : MOOD.pointer.brightness;

    if (reducedMotion) return;

    elapsed.current += dt;
    uniforms.uTime.value = elapsed.current;

    sinceCascade.current += dt;
    if (sinceCascade.current >= MOOD.cascade.interval) {
      reseedCascade();
      sinceCascade.current = 0;
    }
    uniforms.uCascadeTime.value = sinceCascade.current;
  });

  return uniforms;
}
