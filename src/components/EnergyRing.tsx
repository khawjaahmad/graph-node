import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface EnergyRingProps {
  color: string;
  radius: number;
  speed: number;
  delay?: number;
}

export function EnergyRing({ color, radius, speed, delay = 0 }: EnergyRingProps) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      const time = state.clock.elapsedTime + delay;
      
      // Rotate the ring
      ringRef.current.rotation.x = Math.PI / 2 + Math.sin(time * 0.5) * 0.2;
      ringRef.current.rotation.z = time * speed;
      
      // Pulsing opacity
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.3 + Math.sin(time * 2) * 0.15;
      
      // Slight scale pulsing
      const scale = 1 + Math.sin(time * 1.5) * 0.05;
      ringRef.current.scale.set(scale, scale, 1);
    }
  });

  return (
    <mesh ref={ringRef}>
      <torusGeometry args={[radius, 0.02, 16, 64]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.3}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
