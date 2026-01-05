import { useState, useMemo, useRef, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { PostProcessing } from './PostProcessing';

// =============================================================================
// CONFIGURATION CONSTANTS
// =============================================================================

// Color palette - NASA-style monochromatic, cold, scientific
const COLORS = {
  core: '#4fc3f7',
  mid: '#29b6f6',
  outer: '#0288d1',
  accent: '#e1f5fe',
  background: '#000002',
  fog: '#000003',
  stars: '#556688',
} as const;

// Neural cloud generation parameters
const CLOUD_CONFIG = {
  clusterCount: 50,
  clusterSpread: { x: 80, y: 55, z: 45 },
  pointsPerCluster: { min: 30, max: 55 },
  clusterPointSpread: { min: 2, max: 6 },
  scatteredPoints: 300,
  scatteredSpread: { x: 90, y: 60, z: 50 },
  filamentCount: 40,
  filamentPoints: { min: 20, max: 45 },
  filamentNoise: 1.5,
} as const;

// Node size parameters
const NODE_SIZE = {
  cluster: { min: 0.008, max: 0.02 },
  scattered: { min: 0.005, max: 0.015 },
  filament: { min: 0.006, max: 0.014 },
} as const;

// Connection parameters
const CONNECTION_CONFIG = {
  maxPerNode: 5,
  proximityThreshold: 8,
  proximityProbability: 0.6,
  longRangeCount: 800,
  longRangeDistance: { min: 5, max: 35 },
} as const;

// Animation & rendering parameters
const RENDER_CONFIG = {
  particleCount: 2000,
  starCount: 4000,
  starDistance: { min: 120, max: 320 },
  pointSizeMultiplier: 300,
  particleSpeed: { min: 0.3, max: 0.7 },
} as const;

// Camera configuration
const CAMERA_CONFIG = {
  initialPosition: [0, 0, 60] as [number, number, number],
  fov: 85,
  minDistance: 0.5,
  maxDistance: 80,
  autoRotateSpeed: 0.08,
  rotateSpeed: 0.6,
  dampingFactor: 0.05,
} as const;

// Layer alpha values
const LAYER_ALPHAS = [1.0, 0.7, 0.4] as const;

interface NeuralNode {
  position: THREE.Vector3;
  layer: number;
  phase: number;
  size: number;
}

// Generate organic web structure - NOT a ball
function generateNeuralCloud(): { nodes: NeuralNode[], connections: [number, number][] } {
  const nodes: NeuralNode[] = [];
  const connections: [number, number][] = [];
  const { clusterSpread, pointsPerCluster, clusterPointSpread, scatteredSpread } = CLOUD_CONFIG;

  // Create cluster centers spread across space for web structure
  const clusterCenters: THREE.Vector3[] = [];
  for (let i = 0; i < CLOUD_CONFIG.clusterCount; i++) {
    clusterCenters.push(new THREE.Vector3(
      (Math.random() - 0.5) * clusterSpread.x,
      (Math.random() - 0.5) * clusterSpread.y,
      (Math.random() - 0.5) * clusterSpread.z
    ));
  }

  // Generate points around clusters - these form the web nodes
  clusterCenters.forEach((center, clusterIdx) => {
    const pointsInCluster = pointsPerCluster.min +
      Math.floor(Math.random() * (pointsPerCluster.max - pointsPerCluster.min));

    for (let i = 0; i < pointsInCluster; i++) {
      const spread = clusterPointSpread.min +
        Math.random() * (clusterPointSpread.max - clusterPointSpread.min);
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * spread * 2,
        (Math.random() - 0.5) * spread * 2,
        (Math.random() - 0.5) * spread * 2
      );

      nodes.push({
        position: center.clone().add(offset),
        layer: clusterIdx % 3,
        phase: Math.random() * Math.PI * 2,
        size: NODE_SIZE.cluster.min + Math.random() * (NODE_SIZE.cluster.max - NODE_SIZE.cluster.min),
      });
    }
  });

  // Scattered points to fill gaps
  for (let i = 0; i < CLOUD_CONFIG.scatteredPoints; i++) {
    nodes.push({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * scatteredSpread.x,
        (Math.random() - 0.5) * scatteredSpread.y,
        (Math.random() - 0.5) * scatteredSpread.z
      ),
      layer: Math.floor(Math.random() * 3),
      phase: Math.random() * Math.PI * 2,
      size: NODE_SIZE.scattered.min + Math.random() * (NODE_SIZE.scattered.max - NODE_SIZE.scattered.min),
    });
  }

  // Filaments connecting clusters - the nerve-like structures
  for (let f = 0; f < CLOUD_CONFIG.filamentCount; f++) {
    const start = clusterCenters[Math.floor(Math.random() * clusterCenters.length)];
    const end = clusterCenters[Math.floor(Math.random() * clusterCenters.length)];
    const pointsOnFilament = CLOUD_CONFIG.filamentPoints.min +
      Math.floor(Math.random() * (CLOUD_CONFIG.filamentPoints.max - CLOUD_CONFIG.filamentPoints.min));

    for (let i = 0; i < pointsOnFilament; i++) {
      const t = i / pointsOnFilament;
      const pos = new THREE.Vector3().lerpVectors(start, end, t);
      const noise = CLOUD_CONFIG.filamentNoise;
      pos.x += (Math.random() - 0.5) * noise;
      pos.y += (Math.random() - 0.5) * noise;
      pos.z += (Math.random() - 0.5) * noise;

      nodes.push({
        position: pos,
        layer: 1,
        phase: Math.random() * Math.PI * 2,
        size: NODE_SIZE.filament.min + Math.random() * (NODE_SIZE.filament.max - NODE_SIZE.filament.min),
      });
    }
  }

  // Dense connections - proximity based
  const { maxPerNode, proximityThreshold, proximityProbability } = CONNECTION_CONFIG;
  for (let i = 0; i < nodes.length; i++) {
    let connectionCount = 0;

    for (let j = i + 1; j < nodes.length && connectionCount < maxPerNode; j++) {
      const distance = nodes[i].position.distanceTo(nodes[j].position);
      if (distance < proximityThreshold && Math.random() < proximityProbability) {
        connections.push([i, j]);
        connectionCount++;
      }
    }
  }

  // Long-range connections for the web effect
  const { longRangeCount, longRangeDistance } = CONNECTION_CONFIG;
  for (let i = 0; i < longRangeCount; i++) {
    const a = Math.floor(Math.random() * nodes.length);
    const b = Math.floor(Math.random() * nodes.length);
    const dist = nodes[a].position.distanceTo(nodes[b].position);
    if (a !== b && dist > longRangeDistance.min && dist < longRangeDistance.max) {
      connections.push([a, b]);
    }
  }

  return { nodes, connections };
}

// Instanced points for performance
function NeuralPoints({ nodes }: { nodes: NeuralNode[] }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(nodes.length * 3);
    const sizes = new Float32Array(nodes.length);
    const alphas = new Float32Array(nodes.length);

    nodes.forEach((node, i) => {
      positions[i * 3] = node.position.x;
      positions[i * 3 + 1] = node.position.y;
      positions[i * 3 + 2] = node.position.z;
      sizes[i] = node.size;
      alphas[i] = LAYER_ALPHAS[node.layer] ?? LAYER_ALPHAS[2];
    });

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    return geo;
  }, [nodes]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(COLORS.core) },
      },
      vertexShader: `
        attribute float size;
        attribute float alpha;
        varying float vAlpha;
        uniform float time;

        void main() {
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float pulse = 1.0 + sin(time * 2.0 + position.x * 0.5) * 0.2;
          gl_PointSize = size * pulse * (${RENDER_CONFIG.pointSizeMultiplier}.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float intensity = 1.0 - smoothstep(0.0, 0.5, dist);
          intensity = pow(intensity, 1.5);
          gl_FragColor = vec4(color, intensity * vAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return <points geometry={geometry} material={material} ref={(mesh) => {
    if (mesh) materialRef.current = mesh.material as THREE.ShaderMaterial;
  }} />;
}

// Hair-thin connections using LineSegments for performance
function NeuralConnections({ nodes, connections }: { nodes: NeuralNode[], connections: [number, number][] }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(connections.length * 6);
    const alphas = new Float32Array(connections.length * 2);

    connections.forEach(([a, b], i) => {
      const nodeA = nodes[a];
      const nodeB = nodes[b];

      positions[i * 6] = nodeA.position.x;
      positions[i * 6 + 1] = nodeA.position.y;
      positions[i * 6 + 2] = nodeA.position.z;
      positions[i * 6 + 3] = nodeB.position.x;
      positions[i * 6 + 4] = nodeB.position.y;
      positions[i * 6 + 5] = nodeB.position.z;

      const dist = nodeA.position.distanceTo(nodeB.position);
      const alpha = Math.max(0.05, 0.3 - dist * 0.03);
      alphas[i * 2] = alpha;
      alphas[i * 2 + 1] = alpha;
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    return geo;
  }, [nodes, connections]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(COLORS.mid) },
      },
      vertexShader: `
        attribute float alpha;
        varying float vAlpha;
        uniform float time;

        void main() {
          vAlpha = alpha * (0.8 + sin(time + position.x) * 0.2);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vAlpha;

        void main() {
          gl_FragColor = vec4(color, vAlpha * 0.4);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return <lineSegments geometry={geometry} material={material} ref={(mesh) => {
    if (mesh) materialRef.current = mesh.material as THREE.ShaderMaterial;
  }} />;
}

// Curve endpoint data stored as plain arrays to avoid object allocation
interface CurveData {
  startX: Float32Array;
  startY: Float32Array;
  startZ: Float32Array;
  endX: Float32Array;
  endY: Float32Array;
  endZ: Float32Array;
}

// Flowing energy particles along connections
function EnergyParticles({ nodes, connections }: { nodes: NeuralNode[], connections: [number, number][] }) {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = Math.min(connections.length * 2, RENDER_CONFIG.particleCount);

  const { geometry, curveData, speeds } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const speedsArray = new Float32Array(particleCount);

    // Store curve endpoints as typed arrays instead of THREE.LineCurve3 objects
    const curveData: CurveData = {
      startX: new Float32Array(particleCount),
      startY: new Float32Array(particleCount),
      startZ: new Float32Array(particleCount),
      endX: new Float32Array(particleCount),
      endY: new Float32Array(particleCount),
      endZ: new Float32Array(particleCount),
    };

    const { particleSpeed } = RENDER_CONFIG;

    for (let i = 0; i < particleCount; i++) {
      const connIdx = i % connections.length;
      const [a, b] = connections[connIdx];
      const nodeA = nodes[a];
      const nodeB = nodes[b];

      // Store endpoints
      curveData.startX[i] = nodeA.position.x;
      curveData.startY[i] = nodeA.position.y;
      curveData.startZ[i] = nodeA.position.z;
      curveData.endX[i] = nodeB.position.x;
      curveData.endY[i] = nodeB.position.y;
      curveData.endZ[i] = nodeB.position.z;

      speedsArray[i] = particleSpeed.min + Math.random() * (particleSpeed.max - particleSpeed.min);

      // Initial position via lerp
      const t = Math.random();
      positions[i * 3] = nodeA.position.x + (nodeB.position.x - nodeA.position.x) * t;
      positions[i * 3 + 1] = nodeA.position.y + (nodeB.position.y - nodeA.position.y) * t;
      positions[i * 3 + 2] = nodeA.position.z + (nodeB.position.z - nodeA.position.z) * t;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    return { geometry: geo, curveData, speeds: speedsArray };
  }, [nodes, connections, particleCount]);

  useFrame((state) => {
    if (!particlesRef.current) return;
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.elapsedTime;

    // Manual lerp without allocating Vector3 objects
    for (let i = 0; i < particleCount; i++) {
      const t = (time * speeds[i] + i * 0.1) % 1;

      // Lerp: start + (end - start) * t
      positions[i * 3] = curveData.startX[i] + (curveData.endX[i] - curveData.startX[i]) * t;
      positions[i * 3 + 1] = curveData.startY[i] + (curveData.endY[i] - curveData.startY[i]) * t;
      positions[i * 3 + 2] = curveData.startZ[i] + (curveData.endZ[i] - curveData.startZ[i]) * t;
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef} geometry={geometry}>
      <pointsMaterial
        size={0.03}
        color={COLORS.accent}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// Distant star field - surrounds everything
function DeepStarfield() {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const { starCount, starDistance } = RENDER_CONFIG;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = starDistance.min + Math.random() * (starDistance.max - starDistance.min);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={0.04}
        color={COLORS.stars}
        transparent
        opacity={0.15}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// Main scene - static, camera moves around it
function NeuralNetworkScene() {
  const { nodes, connections } = useMemo(() => generateNeuralCloud(), []);

  return (
    <group>
      <NeuralConnections nodes={nodes} connections={connections} />
      <NeuralPoints nodes={nodes} />
      <EnergyParticles nodes={nodes} connections={connections} />
    </group>
  );
}

export default function Visualization() {
  const [isLoaded, setIsLoaded] = useState(false);

  // Use Canvas onCreated callback instead of arbitrary setTimeout
  const handleCanvasCreated = useCallback(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      <Canvas
        camera={{
          position: CAMERA_CONFIG.initialPosition,
          fov: CAMERA_CONFIG.fov,
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        onCreated={handleCanvasCreated}
        className={`transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      >
        <PostProcessing />
        <color attach="background" args={[COLORS.background]} />
        <fog attach="fog" args={[COLORS.fog, 50, 150]} />

        <DeepStarfield />
        <NeuralNetworkScene />

        <OrbitControls
          enableZoom
          enablePan={false}
          enableRotate
          zoomSpeed={1}
          rotateSpeed={CAMERA_CONFIG.rotateSpeed}
          minDistance={CAMERA_CONFIG.minDistance}
          maxDistance={CAMERA_CONFIG.maxDistance}
          enableDamping
          dampingFactor={CAMERA_CONFIG.dampingFactor}
          autoRotate
          autoRotateSpeed={CAMERA_CONFIG.autoRotateSpeed}
          minPolarAngle={0}
          maxPolarAngle={Math.PI}
        />
      </Canvas>
    </div>
  );
}
