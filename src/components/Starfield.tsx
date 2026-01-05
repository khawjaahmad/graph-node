import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function Starfield() {
  const starLayers = [
    { count: 1500, radius: 40, speed: 0.01, size: 0.02, color: '#ffffff' },
    { count: 1000, radius: 50, speed: 0.005, size: 0.015, color: '#aaccff' },
    { count: 800, radius: 60, speed: 0.003, size: 0.01, color: '#ffccaa' },
  ];

  return (
    <>
      {starLayers.map((layer, index) => (
        <StarLayer key={index} {...layer} />
      ))}
    </>
  );
}

interface StarLayerProps {
  count: number;
  radius: number;
  speed: number;
  size: number;
  color: string;
}

function StarLayer({ count, radius, speed, size, color }: StarLayerProps) {
  const pointsRef = useRef<THREE.Points>(null);
  
  const [positions, twinklePhases] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const twinklePhases = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * (0.7 + Math.random() * 0.3);
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      
      twinklePhases[i] = Math.random() * Math.PI * 2;
    }
    
    return [positions, twinklePhases];
  }, [count, radius]);

  useFrame((state) => {
    if (pointsRef.current) {
      const time = state.clock.elapsedTime;
      pointsRef.current.rotation.y = time * speed;
      pointsRef.current.rotation.x = time * speed * 0.5;
      
      // Twinkling effect
      const mat = pointsRef.current.material as THREE.PointsMaterial;
      mat.opacity = 0.6 + Math.sin(time * 2) * 0.1;
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
        size={size}
        color={color}
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
