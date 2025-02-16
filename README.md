

# 3D Network Visualization

## Overview
This is a React-based web application that creates an interactive 3D network visualization using React Three Fiber (R3F) and TypeScript. The project features a space-themed visualization with nodes, edges, and a dynamic starfield background.

## Technical Stack
- **Frontend Framework**: React 18.3.1
- **3D Rendering**: Three.js with React Three Fiber (@react-three/fiber)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Additional Libraries**:
  - @react-three/drei
  - @react-three/postprocessing
  - Lucide React (for icons)

## Key Components

### 1. App Component (`App.tsx`)
The root component that serves as the main container for the visualization, utilizing full viewport dimensions.

### 2. DataVisualization Component (`DataVisualization.tsx`)
The main visualization component that includes:
- 3D Canvas setup with camera configuration
- Lighting setup (ambient and point lights)
- Fog effects for depth
- Interactive controls (OrbitControls)
- Post-processing effects (Unreal Bloom)
- Node and edge rendering

### 3. Starfield Component
A background effect that creates an immersive space environment:
- Generates 2000 stars in a spherical distribution
- Implements slow rotation animation
- Features customizable appearance (size, color, opacity)

## Development Setup

### TypeScript Configuration
The project uses two TypeScript configurations:
- `tsconfig.app.json`: Main application configuration
- `tsconfig.node.json`: Node-specific configuration for build tools

### ESLint Configuration
Comprehensive linting setup with:
- TypeScript ESLint integration
- React Hooks linting
- React Refresh plugin support

## Available Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## Project Structure
```
src/
  ├── components/
  │   └── DataVisualization/
  │       └── DataVisualization.tsx
  ├── App.tsx
  └── ...
```

To get more complete information about this project, you would need to see:
1. The complete DataVisualization.tsx file
2. The Node and Edge component implementations
3. Any data fetching or state management logic
4. Any additional utility functions or hooks
5. The complete project directory structure