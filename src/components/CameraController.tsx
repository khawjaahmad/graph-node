import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { DataNode } from '../types';

interface CameraControllerProps {
  focusedNode: DataNode | null;
  onAnimationComplete?: () => void;
}

export function CameraController({ focusedNode, onAnimationComplete }: CameraControllerProps) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const targetPosition = useRef(new THREE.Vector3(0, 0, 15));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const isAnimating = useRef(false);
  const animationProgress = useRef(0);

  useEffect(() => {
    if (focusedNode) {
      // Set target for camera animation
      const nodePos = new THREE.Vector3(...focusedNode.position);
      const offset = new THREE.Vector3(0, 0, 5);
      targetPosition.current = nodePos.clone().add(offset);
      targetLookAt.current = nodePos.clone();
      isAnimating.current = true;
      animationProgress.current = 0;
    } else {
      // Return to default view
      targetPosition.current = new THREE.Vector3(0, 0, 15);
      targetLookAt.current = new THREE.Vector3(0, 0, 0);
      isAnimating.current = true;
      animationProgress.current = 0;
    }
  }, [focusedNode]);

  useFrame((state, delta) => {
    if (isAnimating.current && controlsRef.current) {
      animationProgress.current += delta * 0.8;
      
      if (animationProgress.current >= 1) {
        animationProgress.current = 1;
        isAnimating.current = false;
        onAnimationComplete?.();
      }
      
      // Smooth easing function
      const t = easeInOutCubic(animationProgress.current);
      
      // Interpolate camera position
      camera.position.lerp(targetPosition.current, t);
      
      // Interpolate look-at target
      const currentTarget = controlsRef.current.target.clone();
      currentTarget.lerp(targetLookAt.current, t);
      controlsRef.current.target.copy(currentTarget);
      
      controlsRef.current.update();
    }
  });

  return null;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
