/**
 * Headless (no rendering, no worker) physics reproduction of the dice
 * settling logic used in Die.tsx, run directly against cannon-es so it can
 * be verified in Node without a browser/WebGL. For many random rolls per
 * die type, this:
 *   1. Simulates a die falling exactly like the production body config.
 *   2. Runs the SAME settle-detection algorithm as Die.tsx to get an "early"
 *      detected result.
 *   3. Keeps simulating far longer to find the true final resting face.
 *   4. Reports any mismatch between the two.
 */
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { getDieModel, DIE_TYPES, type DieType } from '../src/dice/dieGeometry';
import { geometryToConvex } from '../src/dice/convex';

const UP = new THREE.Vector3(0, 1, 0);
const SETTLE_SPEED = 0.08;
const SETTLE_FRAMES = 40;
const STEP = 1 / 60;

function topFaceNumber(model: ReturnType<typeof getDieModel>, quat: CANNON.Quaternion): number {
  const q = new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w);
  let best = model.faceNormals[0];
  let bestDot = -Infinity;
  const worldNormal = new THREE.Vector3();
  for (const fn of model.faceNormals) {
    worldNormal.copy(fn.normal).applyQuaternion(q);
    const d = worldNormal.dot(UP);
    if (d > bestDot) {
      bestDot = d;
      best = fn;
    }
  }
  return best.number;
}

function runTrial(type: DieType, seed: number): { detected: number | null; detectedAtStep: number | null; final: number; steps: number } {
  const model = getDieModel(type);
  const { vertices, faces } = geometryToConvex(model.geometry);

  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -20, 0) });
  world.allowSleep = true;

  const floorMaterial = new CANNON.Material('floor');
  const dieMaterial = new CANNON.Material('die');
  world.addContactMaterial(new CANNON.ContactMaterial(floorMaterial, dieMaterial, { friction: 0.4, restitution: 0.3 }));

  const floorBody = new CANNON.Body({ type: CANNON.Body.STATIC, material: floorMaterial });
  floorBody.addShape(new CANNON.Plane());
  floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  world.addBody(floorBody);

  const shapeVerts = vertices.map(([x, y, z]) => new CANNON.Vec3(x, y, z));
  const shape = new CANNON.ConvexPolyhedron({ vertices: shapeVerts, faces });

  // Deterministic pseudo-random per trial so results are reproducible.
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  const body = new CANNON.Body({
    mass: 1,
    material: dieMaterial,
    linearDamping: 0.2,
    angularDamping: 0.3,
  });
  body.addShape(shape);
  body.position.set((rand() - 0.5) * 3, 4.5, (rand() - 0.5) * 3);
  const e = new THREE.Euler(rand() * Math.PI * 2, rand() * Math.PI * 2, rand() * Math.PI * 2);
  const q0 = new THREE.Quaternion().setFromEuler(e);
  body.quaternion.set(q0.x, q0.y, q0.z, q0.w);
  body.velocity.set((rand() - 0.5) * 4, -1, (rand() - 0.5) * 4);
  body.angularVelocity.set((rand() - 0.5) * 22, (rand() - 0.5) * 22, (rand() - 0.5) * 22);
  world.addBody(body);

  let settledFrames = 0;
  let candidateNumber: number | null = null;
  let detected: number | null = null;
  let detectedAtStep: number | null = null;

  const MAX_STEPS = 60 * 20; // 20 seconds hard cap
  let step = 0;
  for (; step < MAX_STEPS; step++) {
    world.step(STEP);

    if (detected === null) {
      const best = topFaceNumber(model, body.quaternion);
      const speed = body.velocity.length() + body.angularVelocity.length();
      const isSlow = speed < SETTLE_SPEED;

      if (isSlow && candidateNumber === best) {
        settledFrames += 1;
      } else {
        settledFrames = 0;
        candidateNumber = best;
      }

      if (settledFrames > SETTLE_FRAMES) {
        detected = best;
        detectedAtStep = step;
      }
    }

    // Stop early once truly asleep or very slow, well past detection point.
    if (detected !== null && step > detectedAtStep! + 300) break;
  }

  const final = topFaceNumber(model, body.quaternion);
  return { detected, detectedAtStep, final, steps: step };
}

const TRIALS_PER_TYPE = 25;
let totalMismatches = 0;

for (const type of DIE_TYPES) {
  let mismatches = 0;
  for (let i = 0; i < TRIALS_PER_TYPE; i++) {
    const { detected, detectedAtStep, final, steps } = runTrial(type, i * 7919 + 13);
    if (detected !== final) {
      mismatches++;
      console.log(
        `[MISMATCH] ${type} trial ${i}: detected=${detected} (at step ${detectedAtStep}) final=${final} (ran ${steps} steps)`,
      );
    }
  }
  console.log(`${type}: ${mismatches}/${TRIALS_PER_TYPE} mismatches`);
  totalMismatches += mismatches;
}

console.log(`\nTOTAL mismatches: ${totalMismatches}/${TRIALS_PER_TYPE * DIE_TYPES.length}`);
