/**
 * GLSL shared between the point cloud and the connection lines.
 *
 * These two meshes must agree about where every node *is*. They are separate draw
 * calls with separate materials, so the only thing keeping an edge attached to its
 * endpoints is that both shaders run the identical displacement on the identical
 * input position. That invariant is the reason this file exists — see DRIFT below.
 */

// =============================================================================
// UNIFORMS
// =============================================================================

/** Declarations shared by both vertex shaders. */
export const COMMON_UNIFORMS = /* glsl */ `
  uniform float uTime;
  uniform float uCascadeTime;
  uniform vec2  uPointer;
  uniform float uAspect;

  uniform float uDriftScale;
  uniform float uDriftAmp;
  uniform float uDriftSpeed;

  uniform float uPointerRadius;
  uniform float uPointerBrightness;
  uniform float uPointerAttraction;

  uniform float uCascadeStep;
  uniform float uCascadeWidth;
  uniform float uCascadeBrightness;

  uniform float uFogNear;
  uniform float uFogFar;

  uniform vec3 uColorOuter;
  uniform vec3 uColorAccent;

  /**
   * Per-mesh base colour: the original core cyan for points, the dimmer mid blue
   * for lines. Set separately by each material rather than shared, because the two
   * meshes must not start from the same brightness — see gradeByDepth.
   */
  uniform vec3 uBaseTint;
`;

// =============================================================================
// DRIFT — THE COHERENCE INVARIANT
// =============================================================================

/**
 * Organic displacement of the whole structure.
 *
 * A true curl-noise field needs a noise texture and finite differences; at this
 * density a sum of offset sines reads the same and costs a fraction as much.
 *
 * IMPORTANT: this is a pure function of the node's *original* position, so CPU-side
 * geometry never changes and connectivity stays valid. Both the point shader and the
 * line shader must call it with the same argument. If they ever diverge, edges will
 * visibly detach from their nodes.
 */
export const DRIFT = /* glsl */ `
  vec3 neuralDrift(vec3 p) {
    float t = uTime * uDriftSpeed;
    vec3 q = p * uDriftScale;

    vec3 offset = vec3(
      sin(q.y       + t * 1.3) + sin(q.z * 1.7 - t * 0.9),
      sin(q.z * 1.1 + t * 1.1) + sin(q.x * 1.5 + t * 0.8),
      sin(q.x * 1.3 + t * 0.9) + sin(q.y * 1.9 - t * 1.2)
    );

    // Each component sums two sines, so halving maps uDriftAmp directly to the
    // maximum displacement in world units.
    return offset * 0.5 * uDriftAmp;
  }
`;

// =============================================================================
// ACTIVATION
// =============================================================================

/**
 * Cascade wavefront and cursor proximity.
 *
 * `hop` is the node's BFS distance from the current cascade seeds, so the wave
 * arrives at `hop * uCascadeStep` seconds and swells through a gaussian centred on
 * that moment. Rendering it from a single time uniform means the CPU recomputes
 * hop distances only when a new cascade starts, not every frame.
 */
export const ACTIVATION = /* glsl */ `
  float cascadeActivation(float hop) {
    if (hop > 9000.0) return 0.0;           // unreachable from any seed

    float arrival = hop * uCascadeStep;
    float dt = (uCascadeTime - arrival) / uCascadeWidth;
    return exp(-dt * dt) * uCascadeBrightness;
  }

  /** 0..1 falloff from the cursor, measured in aspect-corrected screen space. */
  float pointerProximity(vec4 clipPos) {
    if (clipPos.w <= 0.0) return 0.0;

    vec2 ndc = clipPos.xy / clipPos.w;
    vec2 delta = (ndc - uPointer) * vec2(uAspect, 1.0);
    return 1.0 - smoothstep(0.0, uPointerRadius, length(delta));
  }

  /**
   * Lean a vertex toward the cursor. Applied in view space, which avoids
   * unprojecting the pointer and keeps the nudge stable at every zoom level.
   */
  vec4 applyPointerPull(inout vec4 mvPosition, vec4 clipPos, float proximity) {
    if (proximity <= 0.0) return clipPos;

    vec2 ndc = clipPos.xy / clipPos.w;
    vec2 dir = uPointer - ndc;
    mvPosition.xy += (dir / (length(dir) + 1e-5)) * proximity * uPointerAttraction;
    return projectionMatrix * mvPosition;
  }
`;

// =============================================================================
// GRADING
// =============================================================================

/**
 * Depth-driven colour and fade.
 *
 * The piece used to be a single flat blue. Grading across the palette by distance
 * gives the cloud genuine volume: near nodes read as bright cyan, deep ones recede
 * into dark blue, and anything active pushes toward the near-white accent.
 */
export const GRADING = /* glsl */ `
  /**
   * Recede from the mesh's own base tint toward the deep outer blue with distance.
   *
   * Grading *down* from each mesh's original colour rather than up toward a shared
   * bright one matters more than it looks: thousands of these strands overlap under
   * additive blending, so anything that brightens a single line multiplies across
   * every crossing and the whole cloud washes out to white.
   */
  vec3 gradeByDepth(float depth) {
    float near = uFogNear * 0.25;
    float t = clamp((depth - near) / max(uFogFar - near, 0.001), 0.0, 1.0);

    return mix(uBaseTint, uColorOuter, smoothstep(0.0, 0.85, t));
  }

  float depthFade(float depth) {
    return 1.0 - smoothstep(uFogNear, uFogFar, depth);
  }

  /**
   * Capped well below a full swap to the accent. Pushed all the way, a knot of
   * overlapping active nodes accumulates past what ACES tone mapping holds as
   * blue and the flare turns warm — which is badly off-palette for this piece.
   */
  vec3 applyActivation(vec3 base, float activation) {
    return mix(base, uColorAccent, clamp(activation * 0.45, 0.0, 0.6));
  }
`;

/** Everything both vertex shaders need, in dependency order. */
const VERTEX_PRELUDE = `${COMMON_UNIFORMS}\n${DRIFT}\n${ACTIVATION}\n${GRADING}`;

// =============================================================================
// POINTS
// =============================================================================

export const POINTS_VERTEX = /* glsl */ `
  ${VERTEX_PRELUDE}

  uniform float uPointSizeMul;
  uniform float uPointSizeMin;
  uniform float uPointSizeMax;

  attribute float size;
  attribute float alpha;
  attribute float hop;
  attribute float phase;

  varying float vAlpha;
  varying float vActivation;
  varying vec3  vColor;

  void main() {
    vec3 drifted = position + neuralDrift(position);

    vec4 mvPosition = modelViewMatrix * vec4(drifted, 1.0);
    vec4 clipPos = projectionMatrix * mvPosition;

    float proximity = pointerProximity(clipPos);
    clipPos = applyPointerPull(mvPosition, clipPos, proximity);

    float depth = -mvPosition.z;
    float activation = cascadeActivation(hop) + proximity * uPointerBrightness;

    // Slow individual shimmer, decorrelated by each node's own phase.
    float shimmer = 1.0 + sin(uTime * 2.0 + phase) * 0.2;

    gl_PointSize = clamp(
      size * shimmer * (1.0 + activation * 1.6) * (uPointSizeMul / max(depth, 0.001)),
      uPointSizeMin,
      uPointSizeMax
    );
    gl_Position = clipPos;

    vColor = applyActivation(gradeByDepth(depth), activation);
    vAlpha = alpha * depthFade(depth);
    vActivation = activation;
  }
`;

export const POINTS_FRAGMENT = /* glsl */ `
  varying float vAlpha;
  varying float vActivation;
  varying vec3  vColor;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    float intensity = pow(1.0 - smoothstep(0.0, 0.5, dist), 1.5);
    gl_FragColor = vec4(vColor * (1.0 + vActivation * 0.6), intensity * vAlpha);
  }
`;

// =============================================================================
// CONNECTIONS
// =============================================================================

export const CONNECTIONS_VERTEX = /* glsl */ `
  ${VERTEX_PRELUDE}

  attribute float alpha;
  attribute float hop;
  attribute float edgeT;
  attribute float edgeSeed;

  varying float vAlpha;
  varying float vActivation;
  varying float vT;
  varying float vSeed;
  varying vec3  vColor;

  void main() {
    // Identical displacement to POINTS_VERTEX — see DRIFT. Do not let these drift
    // apart, or edges will detach from their endpoints.
    vec3 drifted = position + neuralDrift(position);

    vec4 mvPosition = modelViewMatrix * vec4(drifted, 1.0);
    vec4 clipPos = projectionMatrix * mvPosition;

    float proximity = pointerProximity(clipPos);
    clipPos = applyPointerPull(mvPosition, clipPos, proximity);

    float depth = -mvPosition.z;
    float activation = cascadeActivation(hop) + proximity * uPointerBrightness;

    gl_Position = clipPos;

    vColor = applyActivation(gradeByDepth(depth), activation);
    vAlpha = alpha * depthFade(depth);
    vActivation = activation;
    vT = edgeT;
    vSeed = edgeSeed;
  }
`;

/**
 * Signals travelling along each edge.
 *
 * `vT` runs 0 at the source to 1 at the target, so a moving gaussian in that
 * coordinate is a pulse crossing the connection. A one-sided exponential behind the
 * head gives it a comet tail, which is what makes direction of travel readable.
 */
export const CONNECTIONS_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uSignalSpeed;
  uniform float uSignalSharpness;
  uniform float uSignalTail;
  uniform float uSignalDensity;
  uniform float uSignalBrightness;
  uniform vec3  uColorAccent;

  varying float vAlpha;
  varying float vActivation;
  varying float vT;
  varying float vSeed;
  varying vec3  vColor;

  void main() {
    vec3 color = vColor;
    float alpha = vAlpha * 0.4;

    // Only a fraction of edges carry traffic; the rest stay quiet structure.
    if (vSeed < uSignalDensity) {
      float head = fract(uTime * uSignalSpeed + vSeed * 37.0);

      float dt = vT - head;
      dt -= floor(dt + 0.5);                       // wrap into [-0.5, 0.5]

      float core = exp(-dt * dt * uSignalSharpness);
      float tail = dt < 0.0 ? exp(dt * uSignalTail) * 0.45 : 0.0;
      float pulse = max(core, tail);

      color = mix(color, uColorAccent, clamp(pulse, 0.0, 1.0));
      alpha += pulse * uSignalBrightness * vAlpha;
    }

    // Nodes render at roughly a pixel at default zoom, so the edges are where a
    // cascade actually becomes legible — this alpha lift is most of what makes the
    // wavefront visible at all.
    alpha += vActivation * 0.45 * vAlpha;

    gl_FragColor = vec4(color, alpha);
  }
`;

// =============================================================================
// NEBULA BACKDROP
// =============================================================================

export const NEBULA_VERTEX = /* glsl */ `
  varying vec3 vWorldDirection;

  void main() {
    vWorldDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Fractal Brownian motion over a value-noise field, tinted cold.
 *
 * Replaces the flat black background with something that has depth without ever
 * competing with the cloud — hence the low intensity and the heavy darkening
 * toward the horizon.
 */
export const NEBULA_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3  uColorNebula;
  uniform vec3  uColorOuter;

  varying vec3 vWorldDirection;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(mix(hash(i + vec3(0, 0, 0)), hash(i + vec3(1, 0, 0)), f.x),
          mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
          mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z
    );
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;

    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p);
      p *= 2.03;
      amplitude *= 0.5;
    }

    return value;
  }

  void main() {
    vec3 dir = normalize(vWorldDirection);
    float clouds = fbm(dir * 2.6 + vec3(uTime, uTime * 0.7, -uTime * 0.4));

    // Bias hard toward the dark end so the backdrop never reads as haze.
    float mass = pow(smoothstep(0.35, 0.95, clouds), 2.2);

    vec3 color = mix(uColorNebula, uColorOuter, mass * 0.55) * mass * uIntensity;
    gl_FragColor = vec4(color, 1.0);
  }
`;
