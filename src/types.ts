export interface DataNode {
  id: string;
  value: number;
  position: [number, number, number];
  color: string;
}

export interface Edge {
  source: string;
  target: string;
}