import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Effects } from '@react-three/drei';
import * as THREE from 'three';
import { UnrealBloomPass } from 'three-stdlib';
import { DataNode, Edge } from '../types';

const nodes: DataNode[] = [
  { id: 'Total', value: 92.7, position: [0, 0, 0], color: '#FFE70D' },
  { id: 'Aviation', value: 60, position: [-3, 2, 0], color: '#00BFB2' },
  { id: 'B&I Aviation', value: 2, position: [3, 2, 0], color: '#97C212' },
  { id: 'Defense', value: 8, position: [-3, -2, 0], color: '#4DF0FF' },
  { id: 'Government', value: 0.2, position: [3, -2, 0], color: '#67e8f9' },
  { id: 'Healthcare', value: 7, position: [0, 3, 0], color: '#497BFB' },
  { id: 'Venue & Events', value: 15, position: [-2, 0, 2], color: '#A82112' },
  { id: 'Retail', value: 0.5, position: [2, 0, 2], color: '#ffc75f' }
];

const edges: Edge[] = nodes.slice(1).map(node => ({
  source: node.id,
  target: 'Total',
}));

function NodeObject({ node }: { node: DataNode }) {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const glowRef = useRef<THREE.Mesh | null>(null);
  const [hovered, setHovered] = useState(false);
  const scale = Math.max(0.2, Math.min(0.5, node.value / 100));

  useFrame((state) => {
    if (meshRef.current && glowRef.current) {
      const time = state.clock.elapsedTime;
      const pulseScale = scale * (1 + Math.sin(time * 1.2) * 0.08);
      const hoverScale = hovered ? 1.2 : 1;
      meshRef.current.scale.set(pulseScale * hoverScale, pulseScale * hoverScale, pulseScale * hoverScale);
      meshRef.current.rotation.x = Math.sin(time * 0.5) * 0.1;
      meshRef.current.rotation.y = Math.cos(time * 0.4) * 0.1;
      if (hovered) {
        (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.4 + Math.sin(time * 2) * 0.1;
        glowRef.current.scale.set(pulseScale * 1.2, pulseScale * 1.2, pulseScale * 1.2);
      } else {
        (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.3;
        glowRef.current.scale.set(pulseScale * 1.2, pulseScale * 1.2, pulseScale * 1.2);
      }
    }
  });

  return (
    <group position={new THREE.Vector3(...node.position)}>
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 64, 64]} /> {/* Increased segments for smoother appearance */}
        <meshBasicMaterial 
          color={node.color} 
          transparent 
          depthWrite={false}
          opacity={0.4}
        />
      </mesh>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[1, 128, 128]} /> {/* Increased segments for smoother appearance */}
        <meshPhysicalMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={hovered ? 2.5 : 1}
          roughness={0}  // Reduced roughness
          metalness={0.2}  // Reduced metalness
          transparent
          opacity={1}
          clearcoat={0.1}  // Reduced clearcoat
          clearcoatRoughness={0}
          envMapIntensity={1.5}
        />
      </mesh>
    </group>
  );
}

function EdgeConnection({ edge }: { edge: Edge }) {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const source = nodes.find(n => n.id === edge.source);
  const target = nodes.find(n => n.id === edge.target);

  useFrame((state) => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.MeshStandardMaterial).opacity = 0.2 + Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
    }
  });

  if (!source || !target) return null;

  const points = [new THREE.Vector3(...source.position), new THREE.Vector3(...target.position)];
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, 20, 0.015, 8, false);

  return (
    <mesh ref={meshRef} key={edge.source + edge.target}>
      <primitive object={geometry} />
      <meshStandardMaterial
        color="#9f7aea"
        transparent
        emissive="#9f7aea"
        emissiveIntensity={0.3}
      />
    </mesh>
  );
}

function Starfield() {
  const count = 2500;
  const points = useMemo(() => {
    const points = new Float32Array(count * 3);
    const radius = 35;
    for (let i = 0; i < count; i++) {
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * Math.cbrt(Math.random());
      points[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      points[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      points[i * 3 + 2] = r * Math.cos(phi);
    }
    return points;
  }, []);

  const starRef = useRef<THREE.Points | null>(null);

  useFrame((state) => {
    if (starRef.current) {
      starRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  useEffect(() => {
    const starGeometry = starRef.current?.geometry;
    return () => {
      if (starGeometry) {
        starGeometry.dispose();
      }
    };
  }, []);

  return (
    <points ref={starRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={points}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.015}
        color="#ffffff"
        transparent
        sizeAttenuation
      />
    </points>
  );
}

export default function DataVisualization() {
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.6,
    0.2,
    0.3
  );

  return (
    <div className="w-full h-screen bg-gradient-to-b from-[#0a0a1f] via-[#1a1a3a] to-[#0a0a1f]">
      <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
        <Effects>
          <primitive object={bloomPass} />
        </Effects>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1.2} />
        <fog attach="fog" args={['#0a0a1f', 15, 35]} />
        <Starfield />
        {nodes.map((node) => (
          <NodeObject key={node.id} node={node} />
        ))}
        {edges.map((edge, i) => (
          <EdgeConnection key={i} edge={edge} />
        ))}
        <OrbitControls
          enableZoom
          enablePan
          enableRotate
          zoomSpeed={0.6}
          panSpeed={0.6}
          rotateSpeed={0.6}
          minDistance={8}
          maxDistance={25}
        />
      </Canvas>
    </div>
  );
}