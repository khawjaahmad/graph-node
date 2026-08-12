import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { CLOUD_SEED, LAYER_ALPHAS } from '../lib/config';
import {
  generateNeuralCloud,
  UNREACHABLE,
  type Adjacency,
  type Connection,
} from '../lib/neuralCloud';
import { makeRng } from '../lib/random';

export interface NeuralGeometry {
  pointsGeometry: THREE.BufferGeometry;
  linesGeometry: THREE.BufferGeometry;
  adjacency: Adjacency;
  connections: Connection[];
  nodeCount: number;
  /** Per-node BFS hop distance from the current cascade seeds. */
  hops: Float32Array;
  /** Push the current `hops` into both geometries and flag them for upload. */
  syncHops: () => void;
}

/**
 * Build both meshes' geometry once, and own the cascade hop buffers they share.
 *
 * Points and lines index the same nodes, so hop distances are computed once here
 * and fanned out to both attributes. Keeping that in a single place is what lets
 * the scene re-seed a cascade with one call.
 */
export function useNeuralGeometry(): NeuralGeometry {
  const geometry = useMemo<NeuralGeometry>(() => {
    const { nodes, connections, adjacency } = generateNeuralCloud(CLOUD_SEED);
    const rng = makeRng(CLOUD_SEED ^ 0x9e3779b9);

    // --- Points -------------------------------------------------------------
    const positions = new Float32Array(nodes.length * 3);
    const sizes = new Float32Array(nodes.length);
    const alphas = new Float32Array(nodes.length);
    const phases = new Float32Array(nodes.length);
    const hops = new Float32Array(nodes.length).fill(UNREACHABLE);

    nodes.forEach((node, i) => {
      positions[i * 3] = node.position.x;
      positions[i * 3 + 1] = node.position.y;
      positions[i * 3 + 2] = node.position.z;
      sizes[i] = node.size;
      alphas[i] = LAYER_ALPHAS[node.layer] ?? LAYER_ALPHAS[2];
      phases[i] = node.phase;
    });

    const pointHopAttr = new THREE.BufferAttribute(hops, 1);
    pointHopAttr.setUsage(THREE.DynamicDrawUsage);

    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    pointsGeometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    pointsGeometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
    pointsGeometry.setAttribute('hop', pointHopAttr);

    // --- Lines --------------------------------------------------------------
    const linePositions = new Float32Array(connections.length * 6);
    const lineAlphas = new Float32Array(connections.length * 2);
    const lineT = new Float32Array(connections.length * 2);
    const lineSeeds = new Float32Array(connections.length * 2);
    const lineHops = new Float32Array(connections.length * 2).fill(UNREACHABLE);

    connections.forEach(([a, b], i) => {
      const from = nodes[a].position;
      const to = nodes[b].position;

      linePositions[i * 6] = from.x;
      linePositions[i * 6 + 1] = from.y;
      linePositions[i * 6 + 2] = from.z;
      linePositions[i * 6 + 3] = to.x;
      linePositions[i * 6 + 4] = to.y;
      linePositions[i * 6 + 5] = to.z;

      // Longer strands sit further back visually, so fade them harder.
      const alpha = Math.max(0.05, 0.3 - from.distanceTo(to) * 0.03);
      lineAlphas[i * 2] = alpha;
      lineAlphas[i * 2 + 1] = alpha;

      // Travel coordinate: 0 at the source, 1 at the target.
      lineT[i * 2] = 0;
      lineT[i * 2 + 1] = 1;

      // One seed per edge, identical at both ends so it stays constant along it.
      const seed = rng();
      lineSeeds[i * 2] = seed;
      lineSeeds[i * 2 + 1] = seed;
    });

    const lineHopAttr = new THREE.BufferAttribute(lineHops, 1);
    lineHopAttr.setUsage(THREE.DynamicDrawUsage);

    const linesGeometry = new THREE.BufferGeometry();
    linesGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    linesGeometry.setAttribute('alpha', new THREE.BufferAttribute(lineAlphas, 1));
    linesGeometry.setAttribute('edgeT', new THREE.BufferAttribute(lineT, 1));
    linesGeometry.setAttribute('edgeSeed', new THREE.BufferAttribute(lineSeeds, 1));
    linesGeometry.setAttribute('hop', lineHopAttr);

    const syncHops = () => {
      connections.forEach(([a, b], i) => {
        const hopA = hops[a];
        const hopB = hops[b];

        // If either end is unreachable, mark both. Interpolating between a real
        // hop count and the sentinel would otherwise paint a false gradient
        // along the edge.
        const unreachable = hopA >= UNREACHABLE || hopB >= UNREACHABLE;
        lineHops[i * 2] = unreachable ? UNREACHABLE : hopA;
        lineHops[i * 2 + 1] = unreachable ? UNREACHABLE : hopB;
      });

      pointHopAttr.needsUpdate = true;
      lineHopAttr.needsUpdate = true;
    };

    return {
      pointsGeometry,
      linesGeometry,
      adjacency,
      connections,
      nodeCount: nodes.length,
      hops,
      syncHops,
    };
  }, []);

  // Release GPU buffers on unmount.
  useEffect(() => {
    const { pointsGeometry, linesGeometry } = geometry;
    return () => {
      pointsGeometry.dispose();
      linesGeometry.dispose();
    };
  }, [geometry]);

  return geometry;
}
