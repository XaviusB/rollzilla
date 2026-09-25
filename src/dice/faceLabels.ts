import * as THREE from 'three';

export interface FaceInfo {
  normal: THREE.Vector3;
  centroid: THREE.Vector3;
}

/**
 * Groups the triangles of a (possibly triangulated) convex polyhedron geometry
 * into flat faces by clustering triangles that share the same outward normal.
 * Works for any of the Platonic-solid style geometries three.js ships as well
 * as custom BufferGeometry (e.g. the d10 trapezohedron), since it only relies
 * on geometric properties (no assumptions about winding order beyond outward
 * facing normals).
 */
export function computeFaces(geometry: THREE.BufferGeometry, precision = 3): FaceInfo[] {
  const geo = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = geo.getAttribute('position');

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();

  const groups = new Map<string, { normalSum: THREE.Vector3; centroidSum: THREE.Vector3; count: number }>();

  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);

    const normal = new THREE.Vector3().crossVectors(
      b.clone().sub(a),
      c.clone().sub(a),
    ).normalize();

    const centroid = a.clone().add(b).add(c).divideScalar(3);

    // Ensure the normal points away from the solid's center (origin).
    if (normal.dot(centroid) < 0) normal.negate();

    const key = [normal.x, normal.y, normal.z]
      .map((v) => Math.round(v * 10 ** precision))
      .join('_');

    let group = groups.get(key);
    if (!group) {
      group = { normalSum: new THREE.Vector3(), centroidSum: new THREE.Vector3(), count: 0 };
      groups.set(key, group);
    }
    group.normalSum.add(normal);
    group.centroidSum.add(centroid);
    group.count += 1;
  }

  return Array.from(groups.values()).map((g) => ({
    normal: g.normalSum.clone().normalize(),
    centroid: g.centroidSum.clone().divideScalar(g.count),
  }));
}

function sphericalKey(n: THREE.Vector3): number {
  // Deterministic ordering key, not physically meaningful.
  return Math.atan2(n.z, n.x) * 1000 + n.y;
}

/**
 * Assigns 1..N numbers to a face list. For centrally symmetric solids (cube,
 * octahedron, dodecahedron, icosahedron, and our pentagonal-trapezohedron
 * d10) opposite faces are paired so their values sum to N + 1, matching the
 * convention used on real dice. Shapes without antipodal faces (tetrahedron)
 * fall back to plain sequential numbering.
 */
export function assignNumbers(faces: FaceInfo[]): number[] {
  const n = faces.length;
  const numbers = new Array<number>(n).fill(0);
  const used = new Array<boolean>(n).fill(false);

  const order = faces
    .map((_, i) => i)
    .sort((i, j) => sphericalKey(faces[i].normal) - sphericalKey(faces[j].normal));

  let low = 1;
  let high = n;

  for (const i of order) {
    if (used[i]) continue;

    let bestJ = -1;
    let bestDot = Infinity;
    for (let j = 0; j < n; j++) {
      if (used[j] || j === i) continue;
      const dot = faces[i].normal.dot(faces[j].normal);
      if (dot < bestDot) {
        bestDot = dot;
        bestJ = j;
      }
    }

    if (bestJ !== -1 && bestDot < -0.9) {
      numbers[i] = low++;
      numbers[bestJ] = high--;
      used[i] = true;
      used[bestJ] = true;
    } else {
      numbers[i] = low++;
      used[i] = true;
    }
  }

  return numbers;
}
