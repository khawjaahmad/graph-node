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
      {/* UI Overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-lg p-4 shadow-2xl">
            <h1 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              3D Network Visualization
            </h1>
            <p className="text-gray-300 text-sm">
              Interactive graph with enhanced WebGL effects • Hover over nodes for details
            </p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-6 left-6 z-10">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-lg p-4 shadow-2xl">
          <div className="text-white text-sm space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
              <span>Drag to rotate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
              <span>Scroll to zoom</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-pink-400 animate-pulse"></div>
              <span>Right-click to pan</span>
            </div>
          </div>
        </div>
      </div>

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
