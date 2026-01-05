# 3D Network Visualization

An interactive 3D network visualization built with React Three Fiber featuring stunning WebGL effects, dynamic animations, and professional UI design.

![3D Network Visualization](https://img.shields.io/badge/React-18.3.1-blue) ![Three.js](https://img.shields.io/badge/Three.js-0.161.0-green) ![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue)

## Features

This visualization transforms network data into an immersive 3D experience with advanced visual effects including multi-layer holographic nodes with particle halos and energy rings, animated particle flow along edges showing data movement, multi-layer starfield with thousands of twinkling stars, custom GLSL shader nebula background, dynamic colored lighting system, and cinematic post-processing effects like bloom, chromatic aberration, vignette, and depth of field.

The interface provides professional glass-morphism UI overlays, interactive tooltips on hover, node focus system with detailed statistics, and smooth animations throughout. Users can rotate the view by dragging, zoom with scroll wheel, and pan with right-click drag.

## Quick Start

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Build for Production

```bash
npm run build
npm run preview
```

The production build will be in the `dist/` folder, ready for deployment to any static hosting service.

## Technical Stack

**Frontend Framework**: React 18.3.1 with TypeScript  
**3D Rendering**: Three.js with React Three Fiber  
**Styling**: Tailwind CSS  
**Build Tool**: Vite  
**Additional Libraries**: @react-three/drei, @react-three/postprocessing, @react-spring/three

## Project Structure

```
src/
├── components/
│   ├── EnhancedDataVisualization.tsx  # Main scene composition
│   ├── EnhancedNode.tsx               # Multi-layer node rendering
│   ├── ParticleHalo.tsx               # Particle system around nodes
│   ├── EnergyRing.tsx                 # Rotating energy rings
│   ├── FlowingEdge.tsx                # Animated edge connections
│   ├── EnhancedStarfield.tsx          # Multi-layer star system
│   ├── NebulaBackground.tsx           # GLSL shader background
│   ├── DynamicLighting.tsx            # Animated lighting system
│   ├── EnhancedPostProcessing.tsx     # Post-processing effects
│   ├── CameraController.tsx           # Camera animation controller
│   └── DataVisualization.tsx          # Original component (preserved)
├── App.tsx
├── main.tsx
└── types.ts
```

## Component Architecture

The visualization is built with modular React components that handle specific aspects of the 3D scene. **EnhancedNode** creates multi-layer spheres with PBR materials, particle halos, and energy rings. **FlowingEdge** generates curved paths with animated particles flowing along connections. **EnhancedStarfield** renders three depth layers of stars with independent rotation speeds. **NebulaBackground** uses custom GLSL shaders for procedural nebula generation. **DynamicLighting** manages three colored point lights that orbit the scene. **EnhancedPostProcessing** applies bloom, chromatic aberration, vignette, and depth of field effects.

## Visual Effects

Nodes feature triple-layer glow systems with outer glow, inner glow, and glass-like core using meshPhysicalMaterial with clearcoat, transmission, and IOR properties. Each node has 50 orbiting particles and two counter-rotating energy rings. Hover interactions scale nodes by 30% and intensify emissive properties, while click interactions enable focus mode with detailed statistics.

Edges use Catmull-Rom spline curves with 30 animated particles per connection flowing from source to target. Colors blend between source and target nodes with pulsing opacity and emissive intensity.

The background consists of 3,300 stars across three layers with different colors (white, cool blue, warm orange) and rotation speeds, plus an animated nebula created with fractal Brownian motion noise in GLSL shaders.

Post-processing includes UnrealBloom with mipmapping for glowing elements, chromatic aberration for depth perception, vignette for cinematic framing, and depth of field with bokeh blur.

## Performance

The visualization is optimized for smooth 60 FPS performance with high-DPI support, antialiasing enabled, GPU preference set to high-performance, efficient geometry with optimized sphere segments, additive blending for glow effects, and depth write control for transparent objects.

## Data Structure

Nodes are defined with id, value, 3D position coordinates, and color. Edges connect source and target nodes. The current implementation visualizes business sectors with a central "Total" node connected to Aviation, B&I Aviation, Defense, Government, Healthcare, Venue & Events, and Retail nodes.

## Customization

To modify the graph data, edit the `nodes` and `edges` arrays in `src/components/EnhancedDataVisualization.tsx`. Adjust visual effects by modifying component parameters like particle counts, animation speeds, and material properties. Configure post-processing intensity in `EnhancedPostProcessing.tsx`. Customize colors by updating node colors, lighting colors, and UI theme colors.

## Browser Compatibility

Requires a modern browser with WebGL 2.0 support. Tested on Chrome 90+, Firefox 88+, Safari 14+, and Edge 90+.

## License

MIT

## Development

This project uses Vite for fast development with hot module replacement, TypeScript for type safety, ESLint for code quality, and Tailwind CSS for styling.

Run `npm run lint` to check code quality.

## Deployment

The project can be deployed to Vercel, Netlify, GitHub Pages, or any static hosting service. Simply build the project and upload the `dist/` folder.
