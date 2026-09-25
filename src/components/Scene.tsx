import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { OrbitControls } from '@react-three/drei';
import Table from './Table';
import Die from './Die';
import { useDiceStore } from '../store/useDiceStore';

export default function Scene() {
  const activeDice = useDiceStore((s) => s.activeDice);
  const reportResult = useDiceStore((s) => s.reportResult);

  return (
    <Canvas shadows camera={{ position: [0, 8.5, 9], fov: 40 }}>
      <color attach="background" args={['#12181f']} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[5, 10, 4]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      <pointLight position={[-6, 6, -4]} intensity={0.4} />
      <Physics gravity={[0, -20, 0]} iterations={12} allowSleep>
        <Table />
        {activeDice.map((d, i) => (
          <Die key={d.id} id={d.id} type={d.type} index={i} onSettled={reportResult} />
        ))}
      </Physics>
      <OrbitControls
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={5}
        maxDistance={16}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}
