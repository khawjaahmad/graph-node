import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function DynamicLighting() {
  const light1Ref = useRef<THREE.PointLight>(null);
  const light2Ref = useRef<THREE.PointLight>(null);
  const light3Ref = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (light1Ref.current) {
      light1Ref.current.position.x = Math.sin(time * 0.5) * 8;
      light1Ref.current.position.y = Math.cos(time * 0.3) * 6;
      light1Ref.current.position.z = Math.sin(time * 0.4) * 5;
      light1Ref.current.intensity = 1.5 + Math.sin(time * 2) * 0.3;
    }
    
    if (light2Ref.current) {
      light2Ref.current.position.x = Math.cos(time * 0.4) * 7;
      light2Ref.current.position.y = Math.sin(time * 0.5) * 5;
      light2Ref.current.position.z = Math.cos(time * 0.3) * 6;
      light2Ref.current.intensity = 1.2 + Math.cos(time * 1.5) * 0.2;
    }
    
    if (light3Ref.current) {
      light3Ref.current.position.x = Math.sin(time * 0.3) * 6;
      light3Ref.current.position.y = Math.cos(time * 0.4) * 7;
      light3Ref.current.position.z = Math.sin(time * 0.5) * 4;
      light3Ref.current.intensity = 1.0 + Math.sin(time * 1.8) * 0.25;
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} color="#4a5568" />
      
      <pointLight
        ref={light1Ref}
        color="#00d4ff"
        intensity={1.5}
        distance={20}
        decay={2}
      />
      
      <pointLight
        ref={light2Ref}
        color="#ff00ff"
        intensity={1.2}
        distance={18}
        decay={2}
      />
      
      <pointLight
        ref={light3Ref}
        color="#ffaa00"
        intensity={1.0}
        distance={16}
        decay={2}
      />
      
      <directionalLight
        position={[10, 10, 5]}
        intensity={0.5}
        color="#ffffff"
      />
    </>
  );
}
