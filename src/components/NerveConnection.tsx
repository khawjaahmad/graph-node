import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface NerveConnectionProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color: string;
}

export function NerveConnection({ start, end, color }: NerveConnectionProps) {
  const lineRef = useRef<THREE.Line>(null);
  const pulseRef = useRef(0);

  useFrame((state) => {
    if (lineRef.current) {
      pulseRef.current = state.clock.elapsedTime;
      const mat = lineRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.3 + Math.sin(pulseRef.current * 3) * 0.2;
    }
  });

  const points = [];
  const segments = 20;
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = new THREE.Vector3().lerpVectors(start, end, t);
    
    // Add organic wave to make it look like nerves
    const offset = Math.sin(t * Math.PI * 3) * 0.1;
    const perpendicular = new THREE.Vector3()
      .subVectors(end, start)
      .cross(new THREE.Vector3(0, 1, 0))
      .normalize()
      .multiplyScalar(offset);
    
    point.add(perpendicular);
    points.push(point);
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <line ref={lineRef} geometry={geometry}>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={0.3}
        linewidth={2}
      />
    </line>
  );
}
