import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

function ParticleNetwork() {
  const ref = useRef<THREE.Points>(null);
  const { mouse } = useThree();

  // Create random particles
  const [positions, colorArray] = useMemo(() => {
    const count = 180;
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;

      // Give them neon colors (blue/purple/indigo gradients)
      cols[i * 3] = 0.39 + Math.random() * 0.15; // R (indigo/fuchsia)
      cols[i * 3 + 1] = 0.4 + Math.random() * 0.2; // G
      cols[i * 3 + 2] = 0.9 + Math.random() * 0.1; // B
    }
    return [pos, cols];
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    
    // Rotate slowly
    ref.current.rotation.y = state.clock.getElapsedTime() * 0.04;
    ref.current.rotation.x = state.clock.getElapsedTime() * 0.015;

    // Gentle parallax mouse responsiveness
    const targetX = mouse.x * 2.5;
    const targetY = mouse.y * 2.5;
    ref.current.position.x += (targetX - ref.current.position.x) * 0.05;
    ref.current.position.y += (targetY - ref.current.position.y) * 0.05;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colorArray, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.16}
        vertexColors
        transparent
        opacity={0.65}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function Hero3D() {
  return (
    <div className="absolute inset-0 -z-10 w-full h-[60vh] opacity-60 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
        <ambientLight intensity={0.4} />
        <ParticleNetwork />
      </Canvas>
    </div>
  );
}
