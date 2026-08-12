/**
 * Deterministic pseudo-random number generation.
 *
 * The visualization is generative art, so every reload previously produced a
 * different structure. Seeding it makes a given look reproducible — which matters
 * for tuning, for screenshots, and for being able to say "that one, keep it".
 *
 * It also keeps cloud generation a pure function of its seed, which is what lets
 * it live inside `useMemo` without tripping React's purity rules.
 */

export type Rng = () => number;

/**
 * mulberry32 — small, fast, and statistically good enough for scattering points.
 * Returns a function producing floats in [0, 1).
 */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform float in [min, max). */
export function range(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Uniform integer in [min, max). */
export function rangeInt(rng: Rng, min: number, max: number): number {
  return Math.floor(range(rng, min, max));
}

/** Uniform float in [-extent/2, extent/2) — a coordinate centred on the origin. */
export function centered(rng: Rng, extent: number): number {
  return (rng() - 0.5) * extent;
}

/** Uniform index into an array of the given length. */
export function pickIndex(rng: Rng, length: number): number {
  return Math.floor(rng() * length);
}
