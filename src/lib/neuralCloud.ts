import * as THREE from 'three';
import { CLOUD_CONFIG, CONNECTION_CONFIG, NODE_SIZE } from './config';
import { centered, makeRng, pickIndex, range, rangeInt, type Rng } from './random';

export interface NeuralNode {
  position: THREE.Vector3;
  layer: number;
  phase: number;
  size: number;
}

export type Connection = [number, number];

/** Adjacency list, indexed by node. Used to propagate cascades along topology. */
export type Adjacency = number[][];

export interface NeuralCloud {
  nodes: NeuralNode[];
  connections: Connection[];
  adjacency: Adjacency;
}

/** Hop distance assigned to nodes no cascade seed can reach. */
export const UNREACHABLE = 9999;

// =============================================================================
// SPATIAL HASH
// =============================================================================

/**
 * A uniform grid over the cloud.
 *
 * The proximity pass used to compare every node against every later node, which is
 * quadratic — around 38 million distance checks at the current density, all on the
 * main thread at mount. Bucketing by cell means each node only inspects the 27
 * cells around it, which is near-linear and leaves headroom to raise the density.
 */
class SpatialHash {
  private readonly cells = new Map<number, number[]>();
  private readonly cellSize: number;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  /** Pack three cell coordinates into one integer key. */
  private static key(ix: number, iy: number, iz: number): number {
    // Offset keeps coordinates non-negative; 1024 is far beyond the cloud's extent.
    return ((ix + 512) << 20) | ((iy + 512) << 10) | (iz + 512);
  }

  private coord(value: number): number {
    return Math.floor(value / this.cellSize);
  }

  insert(index: number, position: THREE.Vector3): void {
    const key = SpatialHash.key(
      this.coord(position.x),
      this.coord(position.y),
      this.coord(position.z)
    );
    const bucket = this.cells.get(key);
    if (bucket) bucket.push(index);
    else this.cells.set(key, [index]);
  }

  /** Every index in the 27 cells surrounding (and including) this position. */
  neighbours(position: THREE.Vector3): number[] {
    const cx = this.coord(position.x);
    const cy = this.coord(position.y);
    const cz = this.coord(position.z);
    const found: number[] = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const bucket = this.cells.get(SpatialHash.key(cx + dx, cy + dy, cz + dz));
          if (bucket) found.push(...bucket);
        }
      }
    }

    return found;
  }
}

// =============================================================================
// GENERATION
// =============================================================================

function buildClusterCenters(rng: Rng): THREE.Vector3[] {
  const { clusterSpread } = CLOUD_CONFIG;
  const centers: THREE.Vector3[] = [];

  for (let i = 0; i < CLOUD_CONFIG.clusterCount; i++) {
    centers.push(
      new THREE.Vector3(
        centered(rng, clusterSpread.x),
        centered(rng, clusterSpread.y),
        centered(rng, clusterSpread.z)
      )
    );
  }

  return centers;
}

function addClusterNodes(rng: Rng, centers: THREE.Vector3[], nodes: NeuralNode[]): void {
  const { pointsPerCluster, clusterPointSpread } = CLOUD_CONFIG;

  centers.forEach((center, clusterIdx) => {
    const count = rangeInt(rng, pointsPerCluster.min, pointsPerCluster.max);

    for (let i = 0; i < count; i++) {
      const spread = range(rng, clusterPointSpread.min, clusterPointSpread.max);

      nodes.push({
        position: center
          .clone()
          .add(
            new THREE.Vector3(
              centered(rng, spread * 2),
              centered(rng, spread * 2),
              centered(rng, spread * 2)
            )
          ),
        layer: clusterIdx % 3,
        phase: rng() * Math.PI * 2,
        size: range(rng, NODE_SIZE.cluster.min, NODE_SIZE.cluster.max),
      });
    }
  });
}

function addScatteredNodes(rng: Rng, nodes: NeuralNode[]): void {
  const { scatteredSpread } = CLOUD_CONFIG;

  for (let i = 0; i < CLOUD_CONFIG.scatteredPoints; i++) {
    nodes.push({
      position: new THREE.Vector3(
        centered(rng, scatteredSpread.x),
        centered(rng, scatteredSpread.y),
        centered(rng, scatteredSpread.z)
      ),
      layer: rangeInt(rng, 0, 3),
      phase: rng() * Math.PI * 2,
      size: range(rng, NODE_SIZE.scattered.min, NODE_SIZE.scattered.max),
    });
  }
}

/** Nerve-like strands running between cluster centres. */
function addFilamentNodes(rng: Rng, centers: THREE.Vector3[], nodes: NeuralNode[]): void {
  const { filamentCount, filamentPoints, filamentNoise, minFilamentSpan } = CLOUD_CONFIG;

  for (let f = 0; f < filamentCount; f++) {
    const start = centers[pickIndex(rng, centers.length)];
    const end = centers[pickIndex(rng, centers.length)];

    // Two draws from the same list can land on the same centre, which collapses a
    // whole filament's worth of points onto one spot. The proximity pass then wires
    // that knot densely to itself, and additive blending turns it into a blown-out
    // white flare. Degenerate and near-degenerate spans are skipped outright.
    if (start.distanceTo(end) < minFilamentSpan) continue;

    const count = rangeInt(rng, filamentPoints.min, filamentPoints.max);

    for (let i = 0; i < count; i++) {
      const position = new THREE.Vector3().lerpVectors(start, end, i / count);
      position.x += centered(rng, filamentNoise);
      position.y += centered(rng, filamentNoise);
      position.z += centered(rng, filamentNoise);

      nodes.push({
        position,
        layer: 1,
        phase: rng() * Math.PI * 2,
        size: range(rng, NODE_SIZE.filament.min, NODE_SIZE.filament.max),
      });
    }
  }
}

function connectByProximity(rng: Rng, nodes: NeuralNode[], connections: Connection[]): void {
  const { maxPerNode, proximityThreshold, proximityProbability, spatialCellSize } =
    CONNECTION_CONFIG;

  const grid = new SpatialHash(spatialCellSize);
  nodes.forEach((node, i) => grid.insert(i, node.position));

  const degree = new Uint8Array(nodes.length);

  for (let i = 0; i < nodes.length; i++) {
    if (degree[i] >= maxPerNode) continue;

    const candidates = grid.neighbours(nodes[i].position);

    for (const j of candidates) {
      if (degree[i] >= maxPerNode) break;
      // Only look forward, so each pair is considered exactly once.
      if (j <= i || degree[j] >= maxPerNode) continue;

      const distance = nodes[i].position.distanceTo(nodes[j].position);
      if (distance < proximityThreshold && rng() < proximityProbability) {
        connections.push([i, j]);
        degree[i]++;
        degree[j]++;
      }
    }
  }
}

/** Long strands across the cloud — these are what read as a web rather than a mist. */
function connectLongRange(rng: Rng, nodes: NeuralNode[], connections: Connection[]): void {
  const { longRangeCount, longRangeDistance } = CONNECTION_CONFIG;

  for (let i = 0; i < longRangeCount; i++) {
    const a = pickIndex(rng, nodes.length);
    const b = pickIndex(rng, nodes.length);
    if (a === b) continue;

    const distance = nodes[a].position.distanceTo(nodes[b].position);
    if (distance > longRangeDistance.min && distance < longRangeDistance.max) {
      connections.push([a, b]);
    }
  }
}

function buildAdjacency(nodeCount: number, connections: Connection[]): Adjacency {
  const adjacency: Adjacency = Array.from({ length: nodeCount }, () => []);

  for (const [a, b] of connections) {
    adjacency[a].push(b);
    adjacency[b].push(a);
  }

  return adjacency;
}

/**
 * Build the whole structure. Pure in its seed — the same seed always produces the
 * same cloud, which is what makes the art tunable and reproducible.
 */
export function generateNeuralCloud(seed: number): NeuralCloud {
  const rng = makeRng(seed);
  const nodes: NeuralNode[] = [];
  const connections: Connection[] = [];

  const centers = buildClusterCenters(rng);
  addClusterNodes(rng, centers, nodes);
  addScatteredNodes(rng, nodes);
  addFilamentNodes(rng, centers, nodes);

  connectByProximity(rng, nodes, connections);
  connectLongRange(rng, nodes, connections);

  return { nodes, connections, adjacency: buildAdjacency(nodes.length, connections) };
}

// =============================================================================
// CASCADES
// =============================================================================

/**
 * Breadth-first hop distance from a set of seed nodes.
 *
 * This is what makes an activation wave follow the graph's *topology* instead of
 * simply expanding through space. Writing hop counts into a vertex attribute lets
 * the shader render the wavefront from a single time uniform, so the CPU only pays
 * for this once per cascade rather than once per frame.
 */
export function computeHopDistances(
  adjacency: Adjacency,
  seeds: number[],
  out: Float32Array
): void {
  out.fill(UNREACHABLE);

  const queue = new Int32Array(adjacency.length);
  let head = 0;
  let tail = 0;

  for (const seed of seeds) {
    if (out[seed] === 0) continue;
    out[seed] = 0;
    queue[tail++] = seed;
  }

  while (head < tail) {
    const current = queue[head++];
    const nextHop = out[current] + 1;

    for (const neighbour of adjacency[current]) {
      if (out[neighbour] > nextHop) {
        out[neighbour] = nextHop;
        queue[tail++] = neighbour;
      }
    }
  }
}

/** Pick cascade origins, biased toward well-connected nodes so waves travel far. */
export function pickCascadeSeeds(rng: Rng, adjacency: Adjacency, count: number): number[] {
  const seeds: number[] = [];

  for (let i = 0; i < count; i++) {
    let best = pickIndex(rng, adjacency.length);

    // Sample a few candidates and keep the busiest — a cheap stand-in for a
    // proper degree-weighted draw.
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = pickIndex(rng, adjacency.length);
      if (adjacency[candidate].length > adjacency[best].length) best = candidate;
    }

    seeds.push(best);
  }

  return seeds;
}
