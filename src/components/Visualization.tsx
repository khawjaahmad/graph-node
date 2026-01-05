import { useState, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { PostProcessing } from './PostProcessing';

// NASA-style monochromatic palette - cold, scientific
const CORE_COLOR = '#4fc3f7';
const MID_COLOR = '#29b6f6';
const OUTER_COLOR = '#0288d1';
const ACCENT_COLOR = '#e1f5fe';

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

  // Create cluster centers spread across space for web structure
  const clusterCenters: THREE.Vector3[] = [];
  for (let i = 0; i < 50; i++) {
    clusterCenters.push(new THREE.Vector3(
      (Math.random() - 0.5) * 80,
      (Math.random() - 0.5) * 55,
      (Math.random() - 0.5) * 45
    ));
  }

  // Generate points around clusters - these form the web nodes
  clusterCenters.forEach((center, clusterIdx) => {
    const pointsInCluster = 30 + Math.floor(Math.random() * 25);

    for (let i = 0; i < pointsInCluster; i++) {
      const spread = 2 + Math.random() * 4;
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * spread * 2,
        (Math.random() - 0.5) * spread * 2,
        (Math.random() - 0.5) * spread * 2
      );

      nodes.push({
        position: center.clone().add(offset),
        layer: clusterIdx % 3,
        phase: Math.random() * Math.PI * 2,
        size: 0.008 + Math.random() * 0.012, // SMALL points
      });
    }
  });

  // Scattered points to fill gaps
  for (let i = 0; i < 300; i++) {
    nodes.push({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 90,
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 50
      ),
      layer: Math.floor(Math.random() * 3),
      phase: Math.random() * Math.PI * 2,
      size: 0.005 + Math.random() * 0.01, // TINY points
    });
  }

  // Filaments connecting clusters - the nerve-like structures
  for (let f = 0; f < 40; f++) {
    const start = clusterCenters[Math.floor(Math.random() * clusterCenters.length)];
    const end = clusterCenters[Math.floor(Math.random() * clusterCenters.length)];
    const pointsOnFilament = 20 + Math.floor(Math.random() * 25);

    for (let i = 0; i < pointsOnFilament; i++) {
      const t = i / pointsOnFilament;
      const pos = new THREE.Vector3().lerpVectors(start, end, t);
      pos.x += (Math.random() - 0.5) * 1.5;
      pos.y += (Math.random() - 0.5) * 1.5;
      pos.z += (Math.random() - 0.5) * 1.5;

      nodes.push({
        position: pos,
        layer: 1,
        phase: Math.random() * Math.PI * 2,
        size: 0.006 + Math.random() * 0.008, // SMALL
      });
    }
  }

  // DENSE connections - proximity based
  for (let i = 0; i < nodes.length; i++) {
    let connectionCount = 0;
    const maxConnections = 5;

    for (let j = i + 1; j < nodes.length && connectionCount < maxConnections; j++) {
      const distance = nodes[i].position.distanceTo(nodes[j].position);
      if (distance < 8 && Math.random() > 0.4) {
        connections.push([i, j]);
        connectionCount++;
      }
    }
  }

  // Long-range connections for the web effect
  for (let i = 0; i < 800; i++) {
    const a = Math.floor(Math.random() * nodes.length);
    const b = Math.floor(Math.random() * nodes.length);
    const dist = nodes[a].position.distanceTo(nodes[b].position);
    if (a !== b && dist > 5 && dist < 35) {
      connections.push([a, b]);
    }
  }

  return { nodes, connections };
}

// Instanced points for performance
function NeuralPoints({ nodes }: { nodes: NeuralNode[] }) {
  const pointsRef = useRef<THREE.Points>(null);

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
      alphas[i] = node.layer === 0 ? 1.0 : node.layer === 1 ? 0.7 : 0.4;
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
        color: { value: new THREE.Color(CORE_COLOR) },
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
          gl_PointSize = size * pulse * (300.0 / -mvPosition.z);
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
    material.uniforms.time.value = state.clock.elapsedTime;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

// Hair-thin connections using LineSegments for performance
function NeuralConnections({ nodes, connections }: { nodes: NeuralNode[], connections: [number, number][] }) {
  const linesRef = useRef<THREE.LineSegments>(null);

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
        color: { value: new THREE.Color(MID_COLOR) },
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
    material.uniforms.time.value = state.clock.elapsedTime;
  });

  return <lineSegments ref={linesRef} geometry={geometry} material={material} />;
}

// Flowing energy particles along connections
function EnergyParticles({ nodes, connections }: { nodes: NeuralNode[], connections: [number, number][] }) {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = Math.min(connections.length * 2, 2000);

  const { geometry, curves } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);
    const curveIndices = new Float32Array(particleCount);
    const curves: THREE.LineCurve3[] = [];

    for (let i = 0; i < particleCount; i++) {
      const connIdx = i % connections.length;
      const [a, b] = connections[connIdx];
      curves[i] = new THREE.LineCurve3(nodes[a].position, nodes[b].position);
      curveIndices[i] = connIdx;
      speeds[i] = 0.3 + Math.random() * 0.4;

      const t = Math.random();
      const point = curves[i].getPoint(t);
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));
    geo.setAttribute('curveIndex', new THREE.BufferAttribute(curveIndices, 1));

    return { geometry: geo, curves };
  }, [nodes, connections, particleCount]);

  useFrame((state) => {
    if (!particlesRef.current) return;
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const speeds = particlesRef.current.geometry.attributes.speed.array as Float32Array;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < particleCount; i++) {
      const t = (time * speeds[i] + i * 0.1) % 1;
      const curve = curves[i];
      if (curve) {
        const point = curve.getPoint(t);
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;
      }
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef} geometry={geometry}>
      <pointsMaterial
        size={0.03}
        color={ACCENT_COLOR}
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
    const positions = new Float32Array(4000 * 3);

    for (let i = 0; i < 4000; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 120 + Math.random() * 200;
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
        color="#556688"
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

  useEffect(() => {
    setTimeout(() => setIsLoaded(true), 100);
  }, []);

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 1], fov: 85 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        className={`transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      >
        <PostProcessing />
        <color attach="background" args={['#000002']} />
        <fog attach="fog" args={['#000003', 50, 150]} />

        <DeepStarfield />
        <NeuralNetworkScene />

        <OrbitControls
          enableZoom
          enablePan={false}
          enableRotate
          zoomSpeed={1}
          rotateSpeed={0.6}
          minDistance={0.5}
          maxDistance={80}
          enableDamping
          dampingFactor={0.05}
          autoRotate
          autoRotateSpeed={0.08}
          minPolarAngle={0}
          maxPolarAngle={Math.PI}
        />
      </Canvas>
    </div>
  );
}
