import { useNeuralAnimation } from '../hooks/useNeuralAnimation';
import { useNeuralGeometry } from '../hooks/useNeuralGeometry';
import { NeuralConnections } from './NeuralConnections';
import { NeuralPoints } from './NeuralPoints';

interface NeuralSceneProps {
  reducedMotion: boolean;
}

/**
 * The living structure: nodes, edges, and the clock that drives them.
 *
 * Geometry is built once and never touched again; everything that moves is a
 * uniform. The two meshes below are purely declarative — they own a material and
 * nothing else.
 */
export function NeuralScene({ reducedMotion }: NeuralSceneProps) {
  const { pointsGeometry, linesGeometry, adjacency, hops, syncHops } = useNeuralGeometry();
  const uniforms = useNeuralAnimation({ adjacency, hops, syncHops, reducedMotion });

  return (
    <group>
      <NeuralConnections geometry={linesGeometry} uniforms={uniforms} />
      <NeuralPoints geometry={pointsGeometry} uniforms={uniforms} />
    </group>
  );
}
