# Neural Cloud

An interactive 3D neural-network visualization built with React Three Fiber. A procedurally
generated web of nodes and filaments drifts in deep space while activation cascades propagate
through its topology and signals travel along its connections.

![React](https://img.shields.io/badge/React-19.2-blue) ![Three.js](https://img.shields.io/badge/Three.js-0.185-green) ![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue) ![Vite](https://img.shields.io/badge/Vite-8.2-purple)

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Drag to rotate, scroll to zoom, move the cursor to disturb the
cloud. The camera also orbits on its own.

## What it renders

There is no input data. The entire structure is generated at load from a single seed:

- **150 cluster centres** scattered through a 160×120×100 volume, each seeded with 10–18 nodes
- **600 scattered nodes** filling the gaps
- **300 filaments** of 15–25 nodes each, interpolated between pairs of cluster centres

That comes to roughly 8,700 nodes. Edges are drawn twice: a proximity pass connecting nearby
nodes through a spatial hash, and 2,000 long-range attempts that produce the long strands
crossing the frame.

Everything renders in **two draw calls** — one `THREE.Points` for every node, one `LineSegments`
for every edge — both driven by custom GLSL with additive blending.

## What moves

**Drift.** The whole structure flows organically. Node positions are never recomputed on the
CPU; both shaders displace vertices by an identical noise function of the original position, so
edges stay welded to their endpoints while everything moves.

**Signals.** Pulses travel along a fraction of the edges, source to target, rendered as a moving
gaussian head with an exponential comet tail so direction of travel is readable.

**Cascades.** Every few seconds the piece picks new origin nodes and runs a breadth-first search
across the adjacency list. Each node's hop distance goes into a vertex attribute, and the shader
renders the wavefront from a single time uniform. Because the wave follows the graph rather than
space, it reads as inference propagating rather than as a ripple.

**Cursor.** Nodes near the pointer brighten and lean toward it, measured in aspect-corrected
screen space — no raycasting.

## Tuning

Everything lives in `src/lib/config.ts`.

Structural constants (cluster counts, spreads, connection rules) sit at the top. Expressive
constants live in `MOODS`, and the piece ships with two:

| Mood | Character |
| --- | --- |
| `evolve` | Restrained and cold. Motion is felt more than seen. **Active by default.** |
| `showpiece` | The same piece at demo-reel loudness — heavier bloom, dense signal traffic, shallow depth of field. |

Switch with the single line at the bottom of the file:

```ts
export const MOOD: Mood = MOODS.showpiece;
```

Change `CLOUD_SEED` for a different cloud. Generation is deterministic, so a given seed always
produces the same art.

## Project structure

```
src/
├── components/
│   ├── Visualization.tsx       # Canvas, controls, render-loop gating
│   ├── NeuralScene.tsx         # Composes the structure and its clock
│   ├── NeuralPoints.tsx        # All nodes, one draw call
│   ├── NeuralConnections.tsx   # All edges, one draw call
│   ├── DeepStarfield.tsx       # Distant star shell
│   ├── NebulaBackdrop.tsx      # Procedural fbm backdrop
│   └── PostProcessing.tsx      # Bloom, grain, vignette
├── hooks/
│   ├── useNeuralGeometry.ts    # Builds geometry, owns cascade hop buffers
│   ├── useNeuralAnimation.ts   # Shared uniforms and the frame loop
│   └── useMotionPreferences.ts # Reduced motion and visibility
└── lib/
    ├── config.ts               # Every tunable value
    ├── neuralCloud.ts          # Generation, spatial hash, BFS
    ├── shaders.ts              # All GLSL
    ├── uniforms.ts             # Shared uniform definitions
    └── random.ts               # Seeded RNG
```

## Notes for editing the shaders

**The coherence invariant.** `NeuralPoints` and `NeuralConnections` must apply the *identical*
`neuralDrift()` displacement to the *original* vertex position. If the two shaders ever diverge,
edges will visibly detach from their nodes. It is the single most important thing to preserve.

**Additive blending punishes brightness.** Thousands of strands overlap, so anything that
brightens an individual element multiplies across every crossing. Colours grade *down* from each
mesh's base tint rather than up toward a shared bright one, and the accent is a saturated cyan
rather than a near-white — a neutral accent pumps red into dense regions until the core
desaturates to white.

**Some effects fight the medium.** Depth of field and chromatic aberration are set to zero in
`evolve` deliberately, not for performance: bokeh smears a cloud of single-pixel points into
haze, and channel-splitting points that small yields magenta and green speckle. Bloom is what
makes activation legible at default zoom, since nodes render at roughly a pixel each.

## Accessibility and performance

The render loop stops entirely when the canvas scrolls off screen or the tab loses focus. Under
`prefers-reduced-motion: reduce` the animation drivers are zeroed and the loop switches to
on-demand, leaving a still image that remains fully explorable.

Geometry and materials are disposed on unmount.

## Scripts

```bash
npm run dev       # development server
npm run build     # production build to dist/
npm run preview   # serve the production build
npm run lint      # eslint
```

## Technical stack

React 19 with TypeScript, Three.js via React Three Fiber 9, `@react-three/drei`,
`@react-three/postprocessing`, Tailwind CSS 4, and Vite 8.

TypeScript is held at 6.0 rather than 7.0 on purpose. TypeScript 7 is the Go-native compiler
rewrite and ships without the stable programmatic API typescript-eslint needs; its peer range is
`>=4.8.4 <6.1.0`, so npm refuses the install outright. Revisit when 7.1 lands.

## Browser support

Requires WebGL 2.0. Tested on current Chrome, Firefox, Safari, and Edge.

## License

MIT
