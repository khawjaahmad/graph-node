# Neural Cloud — Agentic Art Enhancement

## Goal

Evolve the existing neural-cloud visualization so it reads as a *living, thinking*
system rather than a still photograph of one — matching the canvasui.dev aesthetic
(GPU-native, tasteful, responsive) while preserving the cold NASA-scientific
character the piece already has.

## Acceptance criteria

- [ ] The cloud drifts organically; edges stay welded to their nodes at all times.
- [ ] Signals visibly travel along edges (source → target).
- [ ] Activation cascades sweep the graph following its *topology*, not just space.
- [ ] The piece responds to the pointer.
- [ ] Colour is graded by depth and activation, not a single flat blue.
- [ ] One-line switch between `evolve` and `showpiece` intensity.
- [ ] `npm run lint` is green (currently 4 errors).
- [ ] `tsc -b --noEmit` and `npm run build` pass.
- [ ] Art is reproducible from a seed.
- [ ] `prefers-reduced-motion` respected; render loop pauses when hidden.

## Decisions (from user, 2026-08-12)

- **Platform:** stay WebGL/GLSL. No WebGPU/TSL migration for now.
- **Intensity:** evolve the current look; keep a dial to reach showpiece later.
- **Cleanup:** do all four items.

## Tasks

### Foundations
- [x] Update all dependencies to latest (TypeScript held at 6.0.3 — see Notes)
- [x] Seeded RNG (`lib/random.ts`) — makes art reproducible, fixes 3 lint errors
- [x] Central config with `evolve` / `showpiece` intensity dial (`lib/config.ts`)
- [x] Cloud generation + BFS cascade precompute (`lib/neuralCloud.ts`)
- [x] Shared GLSL chunks, incl. the shared displacement (`lib/shaders.ts`)
- [x] Motion-preference + visibility hook (`hooks/useMotionPreferences.ts`)

### Phase 1 — Make it breathe
- [x] Curl-ish drift in vertex shaders (shared fn — the coherence invariant)
- [x] Depth + layer colour grading across the full palette
- [x] Depth-based alpha falloff for real volumetric feel

### Phase 2 — Make it agentic
- [x] Signal pulses travelling along edges (comet head + tail)
- [x] Graph-topology activation cascades via multi-seed BFS
- [x] Pointer proximity field (screen-space, no raycasting)

### Phase 3 — Cinematic grade
- [x] Nebula backdrop shader (replaces flat black)
- [x] Extended post chain: bloom, DOF, chromatic aberration, grain, vignette

### Cleanup
- [x] Fix `set-state-in-effect` lint error (lazy useState initializer)
- [x] Remove 5 dead dependencies + stale vite.config entry
- [x] Reduced-motion + off-screen pause
- [x] Refresh the stale README

### Verify
- [x] `npm run lint` green
- [x] `tsc -b --noEmit` clean
- [x] `npm run build` passes
- [x] Dev server smoke test
- [x] Visual confirmation in a real browser

## Working notes

**The coherence invariant.** `NeuralPoints` and `NeuralConnections` must apply the
*identical* `neuralDrift()` displacement, as a function of the node's original
position. CPU positions never change, so connectivity stays valid while the whole
structure flows. If these two shaders ever diverge, edges detach from their nodes —
this is the single most important thing to preserve when editing shaders.

**Why BFS and not a spatial wave.** A cascade driven by distance-from-a-point is far
cheaper, but it sweeps *space*. Running BFS over the adjacency list makes the wave
follow *topology*, which is what makes it read as inference rather than decoration.
Re-seeding costs ~1 BFS over 8.7k nodes every 7.5s — negligible.

**Shared uniform objects.** Three.js uniforms are plain objects, so the scene creates
them once and hands the same instances to both materials. One `useFrame` in the
parent drives everything; the children stay declarative.

**Delta clamping.** With `frameloop="never"` for off-screen pause, the first frame
after resume can carry a huge delta. All time accumulators clamp delta to 50ms.

## Notes

TypeScript is pinned to 6.0.3, not 7.0.2. TS 7 is the Go-native rewrite and ships
without the stable programmatic API typescript-eslint needs; its peer range is
`>=4.8.4 <6.1.0`, so npm hard-fails the install. Revisit when TS 7.1 lands.

## Results

### Verification

| Check | Result |
| --- | --- |
| `npm run lint` | green (was 4 errors) |
| `npx tsc -b --noEmit` | clean |
| `npm run build` | passes, 1.21 MB / 331 kB gzipped |
| `npm audit` | 0 vulnerabilities (was 9) |
| Dev render (Playwright + swiftshader) | renders, no console errors |
| Production build render | renders, no console errors |
| Animation | frames at 6s and 11s differ |
| `prefers-reduced-motion: reduce` | frames byte-identical — fully static |

### What the visual tuning actually cost

Four rounds, each caught only by rendering and measuring pixels — none of it would
have surfaced from types, lint, or the build:

1. **Blown out to white.** Depth grading brightened lines toward core cyan; under
   additive blending that multiplied across every crossing. Fixed by grading *down*
   from a per-mesh `uBaseTint` (core for points, mid for lines).
2. **Cascade lit a third of the graph at once.** A 0.55s front over a 0.16s hop step
   spans ~3.4 hops, and in a small-world graph that is most of the nodes. Narrowed
   to 0.30s over 0.22s.
3. **Warm haze, then magenta speckle.** Depth of field smears single-pixel points
   into haze; chromatic aberration splits them into coloured speckle. Both zeroed
   for `evolve`. In `showpiece`, DOF was additionally focused at ~60 units while the
   cloud sits at ~90 — corrected to `focusDistance: 0.09`.
4. **Centre desaturating to white.** Measured rather than guessed: `warmPixels` was
   0 in every frame, so nothing was truly warm — but brightest-pixel red read 167
   against the baseline's 80. The near-white accent `#e1f5fe` was pumping red into
   dense regions. Cooled to `#8fdfff`; red fell to 113.

Baseline vs final, centre 60×60 mean RGB: `[4, 40, 58]` → `[16, 46, 62]`.

### Incidental bug found

`addFilamentNodes` drew both endpoints from the same list and could pick the same
centre twice, collapsing 15–25 nodes onto one point which the proximity pass then
wired densely to itself. Present in the original; guarded now by `minFilamentSpan`.

### Correction: the first tuning pass was invisible

User feedback after the first pass was "I haven't seen any visible change" — correct,
and the metrics had already said so if I had read them properly. `litPixels` went
614k (baseline) → 518k (mine): the enhanced version was *dimmer* than the original.

Chasing the blowout through four rounds drove every amplitude down until the effects
were technically present and perceptually absent. At those values drift displaced the
cloud 1.6 units against a 160-unit span (~1%), and a signal took 5.5 seconds to cross
a single one-pixel edge.

Diagnosed by measuring inter-frame change with the camera frozen, which isolates the
animation from the orbit. Before: ~38% of pixels changed per second, meanDelta 12.6 —
but as one-pixel jitter, which reads as shimmer, not motion. After: meanDelta 28–52,
peaking during cascades, and a filmstrip shows a wavefront visibly crossing the cloud.

| Value | Invisible pass | Shipped |
| --- | --- | --- |
| `drift.amplitude` | 1.6 | 6.0 |
| `drift.speed` | 0.12 | 0.25 |
| `signal.speed` | 0.18 | 0.55 |
| `signal.density` | 0.12 | 0.30 |
| `signal.brightness` | 1.1 | 2.0 |
| `cascade.brightness` | 0.7 | 1.2 |
| `pointer.attraction` | 0.5 | 2.5 |
| line activation alpha lift | 0.2 | 0.45 |

The headroom to push this hard existed only because the *cause* of the original
blowout was fixed at source (cold accent, grading downward) rather than papered over
by turning everything down.

**Lesson: a still frame cannot distinguish "subtle" from "not happening".** Verify
motion against a moving reference — inter-frame delta with the camera frozen.

### Deviations from plan

- **eslint config carries a scoped exception.** `react-hooks/immutability` and
  `react-hooks/refs` (new in eslint-plugin-react-hooks 7, from the React Compiler)
  cannot model r3f's `useFrame` mutation of Three.js objects. Tried memo, tried
  refs; both are rejected by design. Disabled for the two render-loop files only.
- **TypeScript held at 6.0.3.** See Notes.
- **Six dead dependencies removed, not five.** `autoprefixer` was also unused —
  Tailwind v4 prefixes internally and `postcss.config.js` never referenced it.
