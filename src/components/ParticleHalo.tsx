import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleHaloProps {
  color: string;
  radius: number;
  count: number;
}

export function ParticleHalo({ color, radius, count }: ParticleHaloProps) {
  const pointsRef = useRef<THREE.Points>(null);
  
  const [positions, velocities] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * (0.8 + Math.random() * 0.4);
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      
      velocities[i * 3] = (Math.random() - 0.5) * 0.002;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.002;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
    }
    
    return [positions, velocities];
  }, [count, radius]);

  useFrame((state) => {
    if (pointsRef.current) {
      const time = state.clock.elapsedTime;
      const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < count; i++) {
        // Orbital motion
        posArray[i * 3] += velocities[i * 3];
        posArray[i * 3 + 1] += velocities[i * 3 + 1];
        posArray[i * 3 + 2] += velocities[i * 3 + 2];
        
        // Keep particles in spherical boundary
        const x = posArray[i * 3];
        const y = posArray[i * 3 + 1];
        const z = posArray[i * 3 + 2];
        const dist = Math.sqrt(x * x + y * y + z * z);
        
        if (dist > radius * 1.2 || dist < radius * 0.6) {
          const targetDist = radius;
          const scale = targetDist / dist;
          posArray[i * 3] *= scale;
          posArray[i * 3 + 1] *= scale;
          posArray[i * 3 + 2] *= scale;
        }
      }
      
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
      pointsRef.current.rotation.y = time * 0.1;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color={color}
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
