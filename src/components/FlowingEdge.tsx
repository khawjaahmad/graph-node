import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DataNode, Edge } from '../types';

interface FlowingEdgeProps {
  edge: Edge;
  nodes: DataNode[];
}

export function FlowingEdge({ edge, nodes }: FlowingEdgeProps) {
  const tubeRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  
  const source = nodes.find(n => n.id === edge.source);
  const target = nodes.find(n => n.id === edge.target);

  const { curve, particlePositions, particleCount } = useMemo(() => {
    if (!source || !target) return { curve: null, particlePositions: new Float32Array(0), particleCount: 0 };
    
    const sourcePos = new THREE.Vector3(...source.position);
    const targetPos = new THREE.Vector3(...target.position);
    
    // Create a curved path with control points
    const midPoint = new THREE.Vector3()
      .addVectors(sourcePos, targetPos)
      .multiplyScalar(0.5);
    
    // Add some curve to the connection
    const direction = new THREE.Vector3().subVectors(targetPos, sourcePos);
    const perpendicular = new THREE.Vector3(-direction.y, direction.x, direction.z).normalize();
    const offset = perpendicular.multiplyScalar(0.5);
    midPoint.add(offset);
    
    const curve = new THREE.CatmullRomCurve3([sourcePos, midPoint, targetPos]);
    
    // Create particles along the curve
    const particleCount = 30;
    const particlePositions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount;
      const point = curve.getPoint(t);
      particlePositions[i * 3] = point.x;
      particlePositions[i * 3 + 1] = point.y;
      particlePositions[i * 3 + 2] = point.z;
    }
    
    return { curve, particlePositions, particleCount };
  }, [source, target]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (tubeRef.current) {
      const mat = tubeRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.25 + Math.sin(time * 1.5) * 0.1;
      mat.emissiveIntensity = 0.4 + Math.sin(time * 2) * 0.2;
    }
    
    if (particlesRef.current && curve) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particleCount; i++) {
        // Move particles along the curve
        const offset = (time * 0.15 + i / particleCount) % 1;
        const point = curve.getPoint(offset);
        
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  if (!source || !target || !curve) return null;

  const tubeGeometry = new THREE.TubeGeometry(curve, 64, 0.02, 8, false);
  
  // Create gradient color from source to target
  const sourceColor = new THREE.Color(source.color);
  const targetColor = new THREE.Color(target.color);
  const edgeColor = sourceColor.clone().lerp(targetColor, 0.5);

  return (
    <group>
      {/* Main tube */}
      <mesh ref={tubeRef} geometry={tubeGeometry}>
        <meshStandardMaterial
          color={edgeColor}
          transparent
          opacity={0.25}
          emissive={edgeColor}
          emissiveIntensity={0.4}
          depthWrite={false}
        />
      </mesh>
      
      {/* Flowing particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={particlePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          color={sourceColor}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  );
}
