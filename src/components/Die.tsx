import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useConvexPolyhedron } from '@react-three/cannon';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { getDieModel, DIE_COLORS, type DieType } from '../dice/dieGeometry';
import { geometryToConvex } from '../dice/convex';
import { getNumberTexture } from '../dice/numberTexture';

interface DieProps {
  id: string;
  type: DieType;
  index: number;
  onSettled: (id: string, value: number) => void;
}

const UP = new THREE.Vector3(0, 1, 0);
const SETTLE_SPEED = 0.08;
const SETTLE_FRAMES = 40;

export default function Die({ id, type, index, onSettled }: DieProps) {
  const model = useMemo(() => getDieModel(type), [type]);

  const convexArgs = useMemo(() => {
    const { vertices, faces } = geometryToConvex(model.geometry);
    return [vertices, faces, undefined] as [typeof vertices, typeof faces, undefined];
  }, [model]);

  const velocityRef = useRef<[number, number, number]>([0, 0, 0]);
  const angularRef = useRef<[number, number, number]>([0, 0, 0]);
  const settledFrames = useRef(0);
  const candidateNumber = useRef<number | null>(null);
  const reported = useRef(false);

  const [ref, api] = useConvexPolyhedron<THREE.Mesh>(() => {
    const spawnX = (Math.random() - 0.5) * 3;
    const spawnZ = (Math.random() - 0.5) * 3;
    const spawnY = 4.5 + index * 0.7;
    return {
      mass: 1,
      args: convexArgs,
      position: [spawnX, spawnY, spawnZ],
      rotation: [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2],
      velocity: [(Math.random() - 0.5) * 4, -1, (Math.random() - 0.5) * 4],
      angularVelocity: [(Math.random() - 0.5) * 22, (Math.random() - 0.5) * 22, (Math.random() - 0.5) * 22],
      linearDamping: 0.2,
      angularDamping: 0.3,
      material: { friction: 0.4, restitution: 0.35 },
    };
  });

  useEffect(() => {
    reported.current = false;
    settledFrames.current = 0;
    candidateNumber.current = null;
    const unsubV = api.velocity.subscribe((v) => {
      velocityRef.current = v;
    });
    const unsubA = api.angularVelocity.subscribe((v) => {
      angularRef.current = v;
    });
    return () => {
      unsubV();
      unsubA();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  useFrame(() => {
    if (reported.current || !ref.current) return;

    // Determine which face currently points most "up" every frame, regardless
    // of speed, so we can detect if it changes while the die is still
    // settling (e.g. slowly tipping over an edge after a low-speed lull).
    let best = model.faceNormals[0];
    let bestDot = -Infinity;
    const worldNormal = new THREE.Vector3();
    for (const fn of model.faceNormals) {
      worldNormal.copy(fn.normal).applyQuaternion(ref.current.quaternion);
      const d = worldNormal.dot(UP);
      if (d > bestDot) {
        bestDot = d;
        best = fn;
      }
    }

    const speed = Math.hypot(...velocityRef.current) + Math.hypot(...angularRef.current);
    const isSlow = speed < SETTLE_SPEED;

    if (isSlow && candidateNumber.current === best.number) {
      settledFrames.current += 1;
    } else {
      // Either still moving, or the top face changed since the last check
      // (die tipped over) — restart the settle countdown from scratch.
      settledFrames.current = 0;
      candidateNumber.current = best.number;
    }

    if (settledFrames.current > SETTLE_FRAMES) {
      reported.current = true;
      onSettled(id, best.number);
    }
  });

  const reroll = (event: ThreeEvent<MouseEvent>) => {
    // Prevent OrbitControls / other dice from reacting to this click.
    event.stopPropagation();
    if (!reported.current) return; // only allow re-rolling a die that's already settled

    reported.current = false;
    settledFrames.current = 0;
    candidateNumber.current = null;

    const spawnX = (Math.random() - 0.5) * 3;
    const spawnZ = (Math.random() - 0.5) * 3;
    api.position.set(spawnX, 4.5, spawnZ);
    const q = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2),
    );
    api.quaternion.set(q.x, q.y, q.z, q.w);
    api.velocity.set((Math.random() - 0.5) * 4, -1, (Math.random() - 0.5) * 4);
    api.angularVelocity.set((Math.random() - 0.5) * 22, (Math.random() - 0.5) * 22, (Math.random() - 0.5) * 22);
    api.wakeUp();
  };

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (reported.current) document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    document.body.style.cursor = 'auto';
  };

  return (
    <mesh
      ref={ref}
      geometry={model.geometry}
      castShadow
      receiveShadow
      onClick={reroll}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <meshStandardMaterial color={DIE_COLORS[type]} roughness={0.35} metalness={0.08} />
      {model.labels.map((label, i) => (
        <mesh key={i} position={label.position} quaternion={label.quaternion}>
          <planeGeometry args={[0.32, 0.32]} />
          <meshBasicMaterial map={getNumberTexture(label.number)} transparent depthWrite={false} />
        </mesh>
      ))}
    </mesh>
  );
}
