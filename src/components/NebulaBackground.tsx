import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  
  varying vec2 vUv;
  
  // Noise function
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }
  
  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  
  float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 0.0;
    
    for (int i = 0; i < 6; i++) {
      value += amplitude * noise(st);
      st *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }
  
  void main() {
    vec2 st = vUv * 3.0;
    
    // Animated noise
    float n1 = fbm(st + uTime * 0.05);
    float n2 = fbm(st * 1.5 - uTime * 0.03);
    float n3 = fbm(st * 0.8 + uTime * 0.02);
    
    // Combine noise layers
    float noise = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
    
    // Create color gradient
    vec3 color = mix(uColor1, uColor2, noise);
    color = mix(color, uColor3, n2);
    
    // Add some brightness variation
    float brightness = 0.3 + noise * 0.4;
    color *= brightness;
    
    // Vignette effect
    float dist = length(vUv - 0.5);
    float vignette = smoothstep(0.8, 0.3, dist);
    color *= vignette;
    
    gl_FragColor = vec4(color, 0.6);
  }
`;

export function NebulaBackground() {
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color('#0a0a2e') },
      uColor2: { value: new THREE.Color('#16213e') },
      uColor3: { value: new THREE.Color('#1a1a3a') },
    }),
    []
  );

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -30]}>
      <planeGeometry args={[100, 100]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}
