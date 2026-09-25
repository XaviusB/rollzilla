import { useBox, usePlane } from '@react-three/cannon';
import * as THREE from 'three';

const RIM_HEIGHT = 0.35;
const RIM_THICKNESS = 0.3;
const HALF = 4.6;

interface WallSpec {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number, number];
}

const WALLS: WallSpec[] = [
  { position: [0, RIM_HEIGHT / 2, -HALF], rotation: [0, 0, 0], size: [HALF * 2 + RIM_THICKNESS, RIM_HEIGHT, RIM_THICKNESS] },
  { position: [0, RIM_HEIGHT / 2, HALF], rotation: [0, 0, 0], size: [HALF * 2 + RIM_THICKNESS, RIM_HEIGHT, RIM_THICKNESS] },
  { position: [-HALF, RIM_HEIGHT / 2, 0], rotation: [0, Math.PI / 2, 0], size: [HALF * 2 + RIM_THICKNESS, RIM_HEIGHT, RIM_THICKNESS] },
  { position: [HALF, RIM_HEIGHT / 2, 0], rotation: [0, Math.PI / 2, 0], size: [HALF * 2 + RIM_THICKNESS, RIM_HEIGHT, RIM_THICKNESS] },
];

function Wall({ position, rotation, size }: WallSpec) {
  const [ref] = useBox<THREE.Mesh>(() => ({ type: 'Static', position, rotation, args: size }));
  return (
    <mesh ref={ref} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#5c3a21" roughness={0.8} />
    </mesh>
  );
}

export default function Table() {
  const [floorRef] = usePlane<THREE.Mesh>(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
    material: { friction: 0.5, restitution: 0.3 },
  }));

  return (
    <group>
      <mesh ref={floorRef} receiveShadow>
        <planeGeometry args={[HALF * 2, HALF * 2]} />
        <meshStandardMaterial color="#1f6f43" roughness={0.95} />
      </mesh>
      {WALLS.map((w, i) => (
        <Wall key={i} {...w} />
      ))}
    </group>
  );
}
