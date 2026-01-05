import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { DataNode, Edge } from '../types';
import { Node } from './Node';
import { FlowingEdge } from './FlowingEdge';
import { Starfield } from './Starfield';
import { NebulaBackground } from './NebulaBackground';
import { DynamicLighting } from './DynamicLighting';
import { PostProcessing } from './PostProcessing';

const nodes: DataNode[] = [
  { id: 'Total', value: 92.7, position: [0, 0, 0], color: '#FFE70D' },
  { id: 'Aviation', value: 60, position: [-3, 2, 0], color: '#00BFB2' },
  { id: 'B&I Aviation', value: 2, position: [3, 2, 0], color: '#97C212' },
  { id: 'Defense', value: 8, position: [-3, -2, 0], color: '#4DF0FF' },
  { id: 'Government', value: 0.2, position: [3, -2, 0], color: '#67e8f9' },
  { id: 'Healthcare', value: 7, position: [0, 3, 0], color: '#497BFB' },
  { id: 'Venue & Events', value: 15, position: [-2, 0, 2], color: '#A82112' },
  { id: 'Retail', value: 0.5, position: [2, 0, 2], color: '#ffc75f' }
];

const edges: Edge[] = nodes.slice(1).map(node => ({
  source: node.id,
  target: 'Total',
}));

export default function Visualization() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Intro animation trigger
    setTimeout(() => setIsLoaded(true), 100);
  }, []);

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 15], fov: 60 }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        className={`transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Post-processing effects */}
        <PostProcessing />
        
        {/* Lighting */}
        <DynamicLighting />
        
        {/* Fog for depth */}
        <fog attach="fog" args={['#0a0a1f', 15, 40]} />
        
        {/* Background */}
        <NebulaBackground />
        <Starfield />
        
        {/* Graph elements */}
        {edges.map((edge, i) => (
          <FlowingEdge key={i} edge={edge} nodes={nodes} />
        ))}
        
        {nodes.map((node) => (
          <Node key={node.id} node={node} />
        ))}
        
        {/* Controls */}
        <OrbitControls
          enableZoom
          enablePan
          enableRotate
          zoomSpeed={0.6}
          panSpeed={0.6}
          rotateSpeed={0.6}
          minDistance={5}
          maxDistance={30}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
}
