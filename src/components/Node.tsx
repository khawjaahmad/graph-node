import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';

import * as THREE from 'three';
import { DataNode } from '../types';
import { ParticleHalo } from './ParticleHalo';
import { EnergyRing } from './EnergyRing';

interface NodeProps {
  node: DataNode;
  onNodeClick?: (node: DataNode) => void;
}

export function Node({ node, onNodeClick }: NodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const outerGlowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  
  const scale = Math.max(0.3, Math.min(0.6, node.value / 100));
  const baseColor = new THREE.Color(node.color);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (meshRef.current && glowRef.current && outerGlowRef.current) {
      // Pulsing animation
      const pulseScale = scale * (1 + Math.sin(time * 1.5 + node.value) * 0.1);
      const hoverScale = hovered ? 1.3 : 1;
      const clickScale = clicked ? 1.1 : 1;
      const finalScale = pulseScale * hoverScale * clickScale;
      
      meshRef.current.scale.setScalar(finalScale);
      
      // Subtle rotation
      meshRef.current.rotation.x = Math.sin(time * 0.3) * 0.15;
      meshRef.current.rotation.y = time * 0.2;
      meshRef.current.rotation.z = Math.cos(time * 0.25) * 0.1;
      
      // Inner glow
      glowRef.current.scale.setScalar(finalScale * 1.3);
      const glowMat = glowRef.current.material as THREE.MeshBasicMaterial;
      glowMat.opacity = hovered ? 0.5 + Math.sin(time * 3) * 0.15 : 0.35;
      
      // Outer glow
      outerGlowRef.current.scale.setScalar(finalScale * 1.6);
      const outerGlowMat = outerGlowRef.current.material as THREE.MeshBasicMaterial;
      outerGlowMat.opacity = hovered ? 0.3 : 0.15 + Math.sin(time * 2) * 0.05;
      
      // Update emissive intensity
      const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
      mat.emissiveIntensity = hovered ? 3 + Math.sin(time * 4) * 0.5 : 1.5;
      
      // Color shift on hover
      if (hovered) {
        const hoverColor = baseColor.clone().lerp(new THREE.Color('#ffffff'), 0.3);
        mat.emissive.copy(hoverColor);
      } else {
        mat.emissive.copy(baseColor);
      }
    }
  });

  const handleClick = () => {
    setClicked(true);
    setTimeout(() => setClicked(false), 300);
    onNodeClick?.(node);
  };

  return (
    <group position={new THREE.Vector3(...node.position)}>
      {/* Outer glow sphere */}
      <mesh ref={outerGlowRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial 
          color={node.color} 
          transparent 
          opacity={0.15}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Inner glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 128, 128]} />
        <meshBasicMaterial 
          color={node.color} 
          transparent 
          opacity={0.35}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Main node sphere with advanced material */}
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={handleClick}
      >
        <sphereGeometry args={[1, 256, 256]} />
        <meshPhysicalMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={1.5}
          roughness={0.1}
          metalness={0.8}
          transparent
          opacity={0.95}
          clearcoat={1}
          clearcoatRoughness={0}
          envMapIntensity={2}
          transmission={0.1}
          thickness={0.5}
          ior={1.5}
        />
      </mesh>
      
      {/* Particle halo effect */}
      <ParticleHalo color={node.color} radius={scale * 1.8} count={50} />
      
      {/* Energy rings */}
      <EnergyRing color={node.color} radius={scale * 1.5} speed={1} />
      <EnergyRing color={node.color} radius={scale * 1.7} speed={-0.8} delay={0.5} />
      

    </group>
  );
}
