import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Waterfall particle system
function WaterfallParticles({ position }) {
  const meshRef = useRef();
  const positions = useRef([]);
  const count = 80;

  // Init particles
  if (positions.current.length === 0) {
    for (let i = 0; i < count; i++) {
      positions.current.push({
        x: (Math.random() - 0.5) * 3,
        y: 18 + Math.random() * 8,
        z: 0,
        vy: -(2 + Math.random() * 4),
        life: Math.random(),
      });
    }
  }

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const pos = meshRef.current.geometry.attributes.position;
    positions.current.forEach((p, i) => {
      p.y += p.vy * delta * 2;
      p.x += (Math.random() - 0.5) * 0.05;
      p.life -= delta * 0.3;
      if (p.y < 0 || p.life <= 0) {
        p.x = (Math.random() - 0.5) * 3;
        p.y = 18 + Math.random() * 4;
        p.vy = -(2 + Math.random() * 4);
        p.life = 1;
      }
      pos.setXYZ(i, p.x, p.y, p.z);
    });
    pos.needsUpdate = true;
  });

  const geo = new THREE.BufferGeometry();
  const posArr = new Float32Array(count * 3);
  positions.current.forEach((p, i) => {
    posArr[i * 3]     = p.x;
    posArr[i * 3 + 1] = p.y;
    posArr[i * 3 + 2] = p.z;
  });
  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));

  return (
    <group position={position}>
      <points ref={meshRef} geometry={geo}>
        <pointsMaterial color="#a0d8ff" size={0.18} transparent opacity={0.6} sizeAttenuation />
      </points>
      {/* Mist pool at bottom */}
      <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4, 16]} />
        <meshStandardMaterial color="#c8e8ff" transparent opacity={0.08} />
      </mesh>
    </group>
  );
}

// Rocky mountain cliff
function RockCliff({ position, rotation = [0, 0, 0], scale = [1, 1, 1] }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 4, 0]} castShadow receiveShadow>
        <boxGeometry args={[8, 12, 4]} />
        <meshStandardMaterial color="#4a4a3a" roughness={0.95} metalness={0.05} />
      </mesh>
      <mesh position={[2, 7, 0.5]} castShadow>
        <boxGeometry args={[5, 8, 3]} />
        <meshStandardMaterial color="#3e3e2e" roughness={0.95} />
      </mesh>
      <mesh position={[-1, 9, 0]} castShadow>
        <boxGeometry args={[4, 5, 3.5]} />
        <meshStandardMaterial color="#525240" roughness={0.9} />
      </mesh>
      {/* Moss patches */}
      <mesh position={[0, 5, 2.1]}>
        <boxGeometry args={[6, 3, 0.2]} />
        <meshStandardMaterial color="#2d5a1a" roughness={0.9} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

// Mountain tree
function Tree({ position, scale = 1 }) {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.25, 3, 6]} />
        <meshStandardMaterial color="#3d2b1a" roughness={0.95} />
      </mesh>
      <mesh position={[0, 4, 0]} castShadow>
        <coneGeometry args={[1.4, 3.5, 7]} />
        <meshStandardMaterial color="#1a4a10" roughness={0.8} />
      </mesh>
      <mesh position={[0, 5.8, 0]} castShadow>
        <coneGeometry args={[1.0, 2.8, 7]} />
        <meshStandardMaterial color="#1e5a14" roughness={0.8} />
      </mesh>
      <mesh position={[0, 7.2, 0]} castShadow>
        <coneGeometry args={[0.65, 2.2, 7]} />
        <meshStandardMaterial color="#236618" roughness={0.8} />
      </mesh>
    </group>
  );
}

// Fog plane
function FogPlane({ y, opacity, color = '#c8ddc8' }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
      <planeGeometry args={[120, 120]} />
      <meshStandardMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

export default function Stadium() {
  const mistRef1 = useRef();
  const mistRef2 = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (mistRef1.current) {
      mistRef1.current.material.opacity = 0.04 + Math.sin(t * 0.3) * 0.02;
    }
    if (mistRef2.current) {
      mistRef2.current.material.opacity = 0.03 + Math.sin(t * 0.2 + 1) * 0.015;
    }
  });

  return (
    <group>
      {/* ── GROUND ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#1a2e0a" roughness={1} />
      </mesh>

      {/* Grassy surround */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[44, 60]} />
        <meshStandardMaterial color="#1e380a" roughness={0.95} />
      </mesh>

      {/* ── MOUNTAIN CLIFFS — background ── */}
      <RockCliff position={[-35, 0, -40]} rotation={[0, 0.3, 0]} scale={[1.8, 2, 1.5]} />
      <RockCliff position={[30, 0, -45]} rotation={[0, -0.4, 0]} scale={[2, 2.2, 1.6]} />
      <RockCliff position={[0, 0, -50]} rotation={[0, 0.1, 0]} scale={[2.5, 2.5, 2]} />
      <RockCliff position={[-20, 0, -35]} rotation={[0, 0.6, 0]} scale={[1.4, 1.8, 1.3]} />
      <RockCliff position={[20, 0, -38]} rotation={[0, -0.2, 0]} scale={[1.6, 1.9, 1.4]} />

      {/* Side cliffs */}
      <RockCliff position={[-40, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={[1.5, 1.8, 1.2]} />
      <RockCliff position={[40, 0, 0]}  rotation={[0, -Math.PI / 2, 0]} scale={[1.5, 1.8, 1.2]} />

      {/* ── WATERFALL — back left cliff ── */}
      <WaterfallParticles position={[-32, 0, -38]} />
      {/* Waterfall stream */}
      <mesh position={[-32, 9, -38]}>
        <boxGeometry args={[1.5, 18, 0.3]} />
        <meshStandardMaterial color="#a0d0ff" transparent opacity={0.25} />
      </mesh>
      {/* Water pool glow */}
      <pointLight position={[-32, 1, -38]} intensity={0.6} color="#80c8ff" distance={12} decay={2} />

      {/* ── TREES ── */}
      {[
        [-28, 0, -28], [-22, 0, -30], [-18, 0, -25],
        [22, 0, -28],  [26, 0, -32],  [18, 0, -26],
        [-30, 0, -15], [30, 0, -15],
        [-30, 0, 10],  [30, 0, 10],
        [-26, 0, 22],  [26, 0, 22],
      ].map(([x, y, z], i) => (
        <Tree key={i} position={[x, y, z]} scale={0.8 + Math.random() * 0.6} />
      ))}

      {/* ── LIGHT POLES (minimal — 2 only) ── */}
      {[[-13, -20], [13, -20]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 7, 0]}>
            <cylinderGeometry args={[0.12, 0.18, 14, 6]} />
            <meshStandardMaterial color="#4a4a3a" metalness={0.5} roughness={0.6} />
          </mesh>
          <pointLight position={[0, 13.5, 0]} intensity={1.4} color="#fffbeb" distance={45} decay={1.5} />
          <mesh position={[0, 13.8, 0]}>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshStandardMaterial color="#fef9c3" emissive="#fef9c3" emissiveIntensity={3} />
          </mesh>
        </group>
      ))}

      {/* ── ANIMATED MIST LAYERS ── */}
      <mesh ref={mistRef1} rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.5, -10]}>
        <planeGeometry args={[80, 50]} />
        <meshStandardMaterial color="#c8e8d0" transparent opacity={0.05} depthWrite={false} />
      </mesh>
      <mesh ref={mistRef2} rotation={[-Math.PI / 2, 0, 0]} position={[0, 3, -20]}>
        <planeGeometry args={[100, 60]} />
        <meshStandardMaterial color="#d0e8c0" transparent opacity={0.04} depthWrite={false} />
      </mesh>

      {/* Static fog layers at different heights */}
      <FogPlane y={0.8}  opacity={0.03} color="#c8ddc8" />
      <FogPlane y={2.5}  opacity={0.025} color="#d0e8d0" />
      <FogPlane y={5}    opacity={0.02} color="#c0d8c0" />

      {/* ── PERIMETER BARRIER ── */}
      <mesh position={[-13, 0.5, 0]}>
        <boxGeometry args={[0.3, 1, 52]} />
        <meshStandardMaterial color="#2a4a1a" roughness={0.9} />
      </mesh>
      <mesh position={[13, 0.5, 0]}>
        <boxGeometry args={[0.3, 1, 52]} />
        <meshStandardMaterial color="#2a4a1a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.5, -27]}>
        <boxGeometry args={[27, 1, 0.3]} />
        <meshStandardMaterial color="#2a4a1a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.3, 27]}>
        <boxGeometry args={[27, 0.6, 0.3]} />
        <meshStandardMaterial color="#2a4a1a" roughness={0.9} />
      </mesh>
    </group>
  );
}
