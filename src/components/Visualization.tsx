import { useCallback, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { CAMERA_CONFIG, COLORS, RENDER_CONFIG } from '../lib/config';
import { useMotionPreferences } from '../hooks/useMotionPreferences';
import { DeepStarfield } from './DeepStarfield';
import { NebulaBackdrop } from './NebulaBackdrop';
import { NeuralScene } from './NeuralScene';
import { PostProcessing } from './PostProcessing';

function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export default function Visualization() {
  const container = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Read once during initialization. This is device capability, not state that
  // changes, so there is nothing to synchronize in an effect.
  const [isTouch] = useState(isTouchDevice);

  const { reducedMotion, visible } = useMotionPreferences(container);

  const handleCanvasCreated = useCallback(() => setIsLoaded(true), []);

  /**
   * Off screen, stop rendering outright. Under reduced motion, render only when
   * something actually changes — OrbitControls invalidates on interaction, so the
   * piece stays fully explorable while sitting still.
   */
  const frameloop = !visible ? 'never' : reducedMotion ? 'demand' : 'always';

  return (
    <div
      ref={container}
      className="w-full bg-black relative overflow-hidden"
      style={{ height: '100dvh' }}
    >
      <Canvas
        camera={{ position: CAMERA_CONFIG.initialPosition, fov: CAMERA_CONFIG.fov }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        frameloop={frameloop}
        onCreated={handleCanvasCreated}
        style={{ touchAction: 'none' }}
        className={`transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      >
        <color attach="background" args={[COLORS.background]} />
        <fog attach="fog" args={[COLORS.fog, RENDER_CONFIG.fogNear, RENDER_CONFIG.fogFar]} />

        <NebulaBackdrop reducedMotion={reducedMotion} />
        <DeepStarfield />
        <NeuralScene reducedMotion={reducedMotion} />

        <OrbitControls
          enableZoom
          enablePan={false}
          enableRotate
          zoomSpeed={isTouch ? 0.5 : 1}
          rotateSpeed={isTouch ? 0.4 : CAMERA_CONFIG.rotateSpeed}
          minDistance={CAMERA_CONFIG.minDistance}
          maxDistance={CAMERA_CONFIG.maxDistance}
          enableDamping
          dampingFactor={CAMERA_CONFIG.dampingFactor}
          autoRotate={!reducedMotion}
          autoRotateSpeed={CAMERA_CONFIG.autoRotateSpeed}
          minPolarAngle={0}
          maxPolarAngle={Math.PI}
          touches={{
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_ROTATE,
          }}
        />

        <PostProcessing />
      </Canvas>
    </div>
  );
}
