import * as THREE from 'three';
import { computeFaces, assignNumbers } from './faceLabels';

export const DIE_TYPES = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'] as const;
export type DieType = (typeof DIE_TYPES)[number];

export const SIDES: Record<DieType, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
};

export const DIE_COLORS: Record<DieType, string> = {
  d4: '#e74c3c',
  d6: '#3498db',
  d8: '#2ecc71',
  d10: '#9b59b6',
  d12: '#f39c12',
  d20: '#1abc9c',
};

// Exact vertices (2 apexes + 10 equatorial ring points) and kite-quad faces of a
// pentagonal trapezohedron, derived as the dual of a uniform pentagonal antiprism
// (apex distance normalized to 1). Each face below is a planar quadrilateral, split
// into 2 triangles when building the BufferGeometry.
const D10_VERTICES: [number, number, number][] = [
  [0, 0, 1],
  [0, 0, -1],
  [0.44721, 0.32492, 0.10557],
  [0.17082, 0.52573, -0.10557],
  [-0.17082, 0.52573, 0.10557],
  [-0.44721, 0.32492, -0.10557],
  [-0.55279, 0, 0.10557],
  [-0.44721, -0.32492, -0.10557],
  [-0.17082, -0.52573, 0.10557],
  [0.17082, -0.52573, -0.10557],
  [0.44721, -0.32492, 0.10557],
  [0.55279, 0, -0.10557],
];

const D10_FACES: [number, number, number, number][] = [
  [10, 11, 2, 0],
  [0, 2, 3, 4],
  [0, 4, 5, 6],
  [0, 6, 7, 8],
  [0, 8, 9, 10],
  [1, 3, 2, 11],
  [1, 5, 4, 3],
  [1, 7, 6, 5],
  [1, 9, 8, 7],
  [11, 10, 9, 1],
];

/** Builds an exact pentagonal-trapezohedron d10 shape with planar kite faces. */
function buildD10Geometry(radius: number): THREE.BufferGeometry {
  const positions: number[] = [];
  for (const [a, b, c, d] of D10_FACES) {
    const va = D10_VERTICES[a];
    const vb = D10_VERTICES[b];
    const vc = D10_VERTICES[c];
    const vd = D10_VERTICES[d];
    // Split the planar quad kite into 2 triangles, preserving CCW outward winding.
    positions.push(...va, ...vb, ...vc);
    positions.push(...va, ...vc, ...vd);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  geo.scale(radius, radius, radius);
  return geo;
}

function buildDieGeometry(type: DieType): THREE.BufferGeometry {
  switch (type) {
    case 'd4':
      return new THREE.TetrahedronGeometry(0.85);
    case 'd6':
      return new THREE.BoxGeometry(0.95, 0.95, 0.95);
    case 'd8':
      return new THREE.OctahedronGeometry(0.78);
    case 'd10':
      return buildD10Geometry(0.72);
    case 'd12':
      return new THREE.DodecahedronGeometry(0.68);
    case 'd20':
      return new THREE.IcosahedronGeometry(0.75);
  }
}

export interface DieLabel {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  number: number;
}

export interface DieModel {
  type: DieType;
  geometry: THREE.BufferGeometry;
  labels: DieLabel[];
  /** Local-space outward normal -> number, used to read the top face after a roll. */
  faceNormals: { normal: THREE.Vector3; number: number }[];
}

const modelCache = new Map<DieType, DieModel>();

export function getDieModel(type: DieType): DieModel {
  const cached = modelCache.get(type);
  if (cached) return cached;

  const geometry = buildDieGeometry(type);
  const faces = computeFaces(geometry);
  const numbers = assignNumbers(faces);
  const zAxis = new THREE.Vector3(0, 0, 1);

  const labels: DieLabel[] = faces.map((f, i) => {
    const q = new THREE.Quaternion().setFromUnitVectors(zAxis, f.normal);
    const labelPos = f.centroid.clone().add(f.normal.clone().multiplyScalar(0.02));
    return {
      position: [labelPos.x, labelPos.y, labelPos.z],
      quaternion: [q.x, q.y, q.z, q.w],
      number: numbers[i],
    };
  });

  const faceNormals = faces.map((f, i) => ({ normal: f.normal.clone(), number: numbers[i] }));

  const model: DieModel = { type, geometry, labels, faceNormals };
  modelCache.set(type, model);
  return model;
}
