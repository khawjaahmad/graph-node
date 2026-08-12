import * as THREE from 'three';
import { COLORS, MOOD, RENDER_CONFIG } from './config';

/**
 * Uniforms shared by the point and line materials.
 *
 * Three.js uniforms are plain mutable objects, so handing the *same* instances to
 * both materials means one write per frame updates both meshes. That is what keeps
 * the two draw calls in lockstep without any per-component frame logic.
 */
export interface SharedUniforms {
  uTime: { value: number };
  uCascadeTime: { value: number };
  uPointer: { value: THREE.Vector2 };
  uAspect: { value: number };

  uDriftScale: { value: number };
  uDriftAmp: { value: number };
  uDriftSpeed: { value: number };

  uPointerRadius: { value: number };
  uPointerBrightness: { value: number };
  uPointerAttraction: { value: number };

  uCascadeStep: { value: number };
  uCascadeWidth: { value: number };
  uCascadeBrightness: { value: number };

  uFogNear: { value: number };
  uFogFar: { value: number };

  uColorOuter: { value: THREE.Color };
  uColorAccent: { value: THREE.Color };
}

export function createSharedUniforms(): SharedUniforms {
  return {
    uTime: { value: 0 },
    uCascadeTime: { value: 0 },
    // Parked far outside clip space so nothing is highlighted before the pointer
    // has ever entered the canvas.
    uPointer: { value: new THREE.Vector2(999, 999) },
    uAspect: { value: 1 },

    uDriftScale: { value: MOOD.drift.scale },
    uDriftAmp: { value: MOOD.drift.amplitude },
    uDriftSpeed: { value: MOOD.drift.speed },

    uPointerRadius: { value: MOOD.pointer.radius },
    uPointerBrightness: { value: MOOD.pointer.brightness },
    uPointerAttraction: { value: MOOD.pointer.attraction },

    uCascadeStep: { value: MOOD.cascade.step },
    uCascadeWidth: { value: MOOD.cascade.width },
    uCascadeBrightness: { value: MOOD.cascade.brightness },

    uFogNear: { value: RENDER_CONFIG.fogNear },
    uFogFar: { value: RENDER_CONFIG.fogFar },

    // core and mid are not here: each mesh supplies its own starting colour as
    // uBaseTint, since points and lines must not start at the same brightness.
    uColorOuter: { value: new THREE.Color(COLORS.outer) },
    uColorAccent: { value: new THREE.Color(COLORS.accent) },
  };
}
