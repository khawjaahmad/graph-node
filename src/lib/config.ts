/**
 * Every tunable value for the visualization.
 *
 * Structural constants (how the cloud is built) live at the top and are shared by
 * both intensity moods. Expressive constants (how loud the piece is) live in
 * `MOODS` and are switched with a single line at the bottom of this file.
 */

// =============================================================================
// SEED
// =============================================================================

/** Change this for a different cloud. The same seed always yields the same art. */
export const CLOUD_SEED = 20260812;

// =============================================================================
// PALETTE — cold, monochromatic, scientific
// =============================================================================

export const COLORS = {
  /** Nearest / most active nodes. */
  core: '#4fc3f7',
  /** Mid-depth body of the cloud. */
  mid: '#29b6f6',
  /** Deepest nodes, receding into the dark. */
  outer: '#0288d1',
  /**
   * Signal heads and cascade crests.
   *
   * Deliberately a bright *cyan* rather than the near-white this used to be. Accent
   * is mixed in wherever anything activates, and in the dense middle of the cloud
   * those contributions stack additively — a near-neutral accent pumps red into the
   * pile until the core desaturates to white and the palette falls apart.
   */
  accent: '#8fdfff',
  background: '#000002',
  fog: '#000003',
  stars: '#556688',
  /** Nebula backdrop tint. */
  nebula: '#071a2e',
} as const;

// =============================================================================
// STRUCTURE — the shape of the cloud itself
// =============================================================================

export const CLOUD_CONFIG = {
  clusterCount: 150,
  clusterSpread: { x: 160, y: 120, z: 100 },
  pointsPerCluster: { min: 10, max: 18 },
  clusterPointSpread: { min: 5, max: 10 },
  scatteredPoints: 600,
  scatteredSpread: { x: 180, y: 130, z: 110 },
  filamentCount: 300,
  filamentPoints: { min: 15, max: 25 },
  filamentNoise: 1.2,
  /**
   * Minimum distance between a filament's two endpoints. Guards against strands
   * that collapse into a single dense knot — see addFilamentNodes.
   */
  minFilamentSpan: 12,
} as const;

export const NODE_SIZE = {
  cluster: { min: 0.01, max: 0.025 },
  scattered: { min: 0.004, max: 0.01 },
  filament: { min: 0.005, max: 0.012 },
} as const;

export const CONNECTION_CONFIG = {
  maxPerNode: 4,
  proximityThreshold: 12,
  proximityProbability: 0.5,
  longRangeCount: 2000,
  longRangeDistance: { min: 10, max: 50 },
  /**
   * Cell size for the spatial hash used by the proximity pass. Matching the
   * proximity threshold means a node only ever inspects its own cell and the 26
   * neighbours around it, instead of the entire remaining array.
   */
  spatialCellSize: 12,
} as const;

export const RENDER_CONFIG = {
  starCount: 5000,
  starDistance: { min: 180, max: 400 },
  pointSizeMultiplier: 300,
  pointSizeClamp: { min: 1.0, max: 14.0 },
  fogNear: 80,
  fogFar: 220,
} as const;

export const CAMERA_CONFIG = {
  initialPosition: [0, 0, 90] as [number, number, number],
  fov: 85,
  minDistance: 0.5,
  maxDistance: 150,
  autoRotateSpeed: 0.08,
  rotateSpeed: 0.6,
  dampingFactor: 0.05,
} as const;

/** Per-layer base opacity. Three layers give the cloud its sense of depth. */
export const LAYER_ALPHAS = [1.0, 0.7, 0.4] as const;

// =============================================================================
// EXPRESSION — how loud the piece is
// =============================================================================

export interface Mood {
  /** Organic drift of the whole structure. */
  drift: {
    /** Spatial frequency of the noise field. Lower = broader, slower swells. */
    scale: number;
    /** Displacement in world units. */
    amplitude: number;
    /** Temporal rate. */
    speed: number;
  };
  /** Pulses travelling along edges. */
  signal: {
    /** Traversals per second along an edge. */
    speed: number;
    /** Gaussian tightness of the head. Higher = tighter dot. */
    sharpness: number;
    /** Exponential falloff of the trailing comet tail. */
    tailFalloff: number;
    /** Fraction of edges carrying a signal at all. */
    density: number;
    brightness: number;
  };
  /** Activation waves sweeping the graph by topology. */
  cascade: {
    /** Simultaneous origins per cascade. */
    seedCount: number;
    /** Seconds between re-seeds. */
    interval: number;
    /** Seconds of delay per graph hop — the wave's propagation speed. */
    step: number;
    /** Temporal width of the wavefront, in seconds. */
    width: number;
    brightness: number;
  };
  /** Cursor proximity response. */
  pointer: {
    /** Radius of influence in normalised device coordinates. */
    radius: number;
    brightness: number;
    /** How strongly nodes lean toward the cursor, in world units. */
    attraction: number;
  };
  /** Post-processing chain. */
  post: {
    bloomIntensity: number;
    bloomThreshold: number;
    bloomRadius: number;
    /** 0 disables the depth-of-field pass entirely — it is the expensive one. */
    bokehScale: number;
    focusDistance: number;
    focalLength: number;
    chromaticAberration: number;
    grain: number;
    vignetteDarkness: number;
  };
  /** Backdrop nebula. */
  nebula: {
    intensity: number;
    speed: number;
  };
}

const MOODS = {
  /**
   * Evolve — keeps the cold, narrow palette of the original, but the motion is meant
   * to be plainly visible: the structure flows, signals cross edges in under two
   * seconds, and a cascade sweeps the graph every five.
   *
   * These values were tuned down too far once already, to the point where the piece
   * looked unchanged. Judge any further reduction against a moving reference, not a
   * still — a still cannot distinguish "subtle" from "not happening".
   */
  evolve: {
    // Amplitude is what makes the structure *flow* rather than shimmer. Below about
    // 4 world units, against a cloud 160 across, hair-thin strands just jitter by a
    // pixel and the eye reads noise instead of movement.
    drift: { scale: 0.035, amplitude: 6.0, speed: 0.25 },
    // Speed is traversals per second, so 0.55 crosses an edge in under two seconds.
    // Much slower and a pulse cannot be followed; much dimmer and it cannot be seen
    // at all on a one-pixel line.
    signal: { speed: 0.55, sharpness: 700, tailFalloff: 18, density: 0.3, brightness: 2.0 },
    // A narrow front and a slow step keep the wave to a couple of hops at a time.
    // Widen either and the cascade lights most of the graph at once, which reads as
    // a flash rather than as propagation.
    cascade: { seedCount: 2, interval: 5.0, step: 0.18, width: 0.45, brightness: 1.2 },
    pointer: { radius: 0.28, brightness: 2.0, attraction: 2.5 },
    post: {
      bloomIntensity: 1.2,
      bloomThreshold: 0.25,
      bloomRadius: 0.7,
      // Depth of field is off deliberately, not just cheap. Bokeh on a cloud of
      // single-pixel points smears the dense middle into a warm haze that ACES
      // tone mapping then pushes further off-palette.
      bokehScale: 0,
      focusDistance: 0.08,
      focalLength: 0.06,
      // Likewise zero: splitting colour channels across points this small produces
      // magenta and green speckle rather than any sense of lens depth.
      chromaticAberration: 0,
      grain: 0.02,
      vignetteDarkness: 0.5,
    },
    nebula: { intensity: 0.22, speed: 0.012 },
  },

  /**
   * Showpiece — the same piece pushed to demo-reel loudness. Richer grading,
   * heavier bloom and bokeh, faster and denser signal traffic.
   */
  showpiece: {
    drift: { scale: 0.045, amplitude: 2.6, speed: 0.18 },
    signal: { speed: 0.3, sharpness: 900, tailFalloff: 18, density: 0.28, brightness: 2.2 },
    cascade: { seedCount: 4, interval: 4.5, step: 0.16, width: 0.42, brightness: 1.6 },
    pointer: { radius: 0.26, brightness: 1.8, attraction: 1.2 },
    post: {
      bloomIntensity: 1.6,
      bloomThreshold: 0.22,
      bloomRadius: 0.82,
      // focusDistance is normalised across the camera's near..far range, so 0.09
      // puts the focal plane at roughly the 90 units where the cloud's centre sits.
      // Focusing nearer than the subject was what turned the middle into haze.
      bokehScale: 1.2,
      focusDistance: 0.09,
      focalLength: 0.03,
      chromaticAberration: 0.0004,
      grain: 0.045,
      vignetteDarkness: 0.6,
    },
    nebula: { intensity: 0.45, speed: 0.02 },
  },
} as const satisfies Record<string, Mood>;

/**
 * The active mood.
 *
 * This is the one-line dial: switch to `MOODS.showpiece` to push the whole piece
 * toward demo-reel intensity without touching a shader.
 */
export const MOOD: Mood = MOODS.evolve;
