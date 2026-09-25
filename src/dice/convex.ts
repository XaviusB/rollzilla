import * as THREE from 'three';

export interface ConvexData {
  vertices: [number, number, number][];
  faces: number[][];
}

/**
 * Converts a triangulated BufferGeometry into deduplicated vertices + face
 * index lists suitable for cannon-es's ConvexPolyhedron shape (used by
 * @react-three/cannon's useConvexPolyhedron).
 */
export function geometryToConvex(geometry: THREE.BufferGeometry): ConvexData {
  const geo = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = geo.getAttribute('position');

  const vertices: THREE.Vector3[] = [];
  const faces: number[][] = [];
  const indexByKey = new Map<string, number>();
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i += 3) {
    const faceIdx: number[] = [];
    for (let k = 0; k < 3; k++) {
      v.fromBufferAttribute(pos, i + k);
      const key = `${v.x.toFixed(5)}_${v.y.toFixed(5)}_${v.z.toFixed(5)}`;
      let idx = indexByKey.get(key);
      if (idx === undefined) {
        idx = vertices.length;
        vertices.push(v.clone());
        indexByKey.set(key, idx);
      }
      faceIdx.push(idx);
    }
    faces.push(faceIdx);
  }

  return {
    vertices: vertices.map((p) => [p.x, p.y, p.z]),
    faces,
  };
}
