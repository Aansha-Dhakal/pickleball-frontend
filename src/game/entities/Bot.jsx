import { useRef, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COURT_W, COURT_L, KITCHEN_DEPTH, NET_H } from '../Court';

const BOT_START_Z = -16;

const BOT_CONFIGS = {
  easy:   { speed: 7,  accuracy: 0.60, missChance: 0.25, shotSpeed: 9,  lobChance: 0.05 },
  medium: { speed: 11, accuracy: 0.80, missChance: 0.12, shotSpeed: 13, lobChance: 0.10 },
  hard:   { speed: 16, accuracy: 0.95, missChance: 0.03, shotSpeed: 17, lobChance: 0.15 },
};

const Bot = forwardRef(function Bot({ difficulty = 'medium' }, ref) {
  const groupRef = useRef();
  const paddleRef = useRef();
  const swingAngle = useRef(0);
  const swinging = useRef(false);
  const targetPos = useRef(new THREE.Vector3(0, 0, BOT_START_Z));
  const cfg = BOT_CONFIGS[difficulty] || BOT_CONFIGS.medium;

  useImperativeHandle(ref, () => ({
    getPosition() {
      return groupRef.current?.position.clone() ?? new THREE.Vector3(0, 0, BOT_START_Z);
    },

    moveTo(x, z) {
      // Bot should stay behind kitchen line (-KITCHEN_DEPTH) unless
      // chasing a ball that has already landed in the kitchen
      const minZ = z > -KITCHEN_DEPTH
        ? Math.max(-KITCHEN_DEPTH - 0.3, z) // allow entering kitchen only when ball lands there
        : z;
      targetPos.current.set(
        Math.max(-COURT_W / 2 + 0.5, Math.min(COURT_W / 2 - 0.5, x)),
        0,
        Math.max(-(COURT_L / 2), Math.min(-0.5, minZ))
      );
    },

    isInKitchen() {
      const z = groupRef.current?.position.z ?? BOT_START_Z;
      return z < 0 && z > -KITCHEN_DEPTH;
    },

    // Returns a hit velocity or null (miss)
    attemptHit(ballPos) {
      if (Math.random() < cfg.missChance) return null;

      swinging.current = true;
      swingAngle.current = 0;

      const pos = groupRef.current?.position ?? new THREE.Vector3(0, 0, BOT_START_Z);

      // Pick a target on player side
      const targetX = (Math.random() - 0.5) * COURT_W * 0.7;
      const targetZ = COURT_L / 2 - 2; // near player baseline

      const dx = targetX - pos.x;
      const dz = targetZ - pos.z; // positive (toward player)
      const horizDist = Math.sqrt(dx * dx + dz * dz);

      const speed = cfg.shotSpeed;
      const timeOfFlight = horizDist / speed;

      // Loft to clear net + land on player side
      // Net is at z=0, bot is at negative z
      const distToNet = Math.abs(pos.z);
      const tToNet = distToNet / speed;
      const vy = (NET_H + 0.6) / tToNet + GRAVITY_EST * tToNet * -0.5 + 3;

      return {
        x: (dx / horizDist) * speed * 0.4,
        y: Math.max(vy, 5),
        z: (dz / horizDist) * speed,
      };
    },
  }));

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const pos = groupRef.current.position;
    const dt = Math.min(delta, 0.05);

    // Smooth movement
    const dx = targetPos.current.x - pos.x;
    const dz = targetPos.current.z - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 0.05) {
      pos.x += (dx / dist) * cfg.speed * dt;
      pos.z += (dz / dist) * cfg.speed * dt;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 9) * 0.025;
    } else {
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0, delta * 8);
    }

    // Clamp
    pos.x = Math.max(-COURT_W / 2 + 0.5, Math.min(COURT_W / 2 - 0.5, pos.x));
    pos.z = Math.max(-COURT_L / 2, Math.min(-0.5, pos.z));

    // Swing
    if (swinging.current) {
      swingAngle.current = Math.min(swingAngle.current + delta * 14, Math.PI * 0.65);
      if (paddleRef.current) paddleRef.current.rotation.x = swingAngle.current;
      if (swingAngle.current >= Math.PI * 0.65) { swinging.current = false; swingAngle.current = 0; }
    } else {
      if (paddleRef.current) paddleRef.current.rotation.x = THREE.MathUtils.lerp(paddleRef.current.rotation.x, 0, delta * 9);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, BOT_START_Z]} rotation={[0, Math.PI, 0]}>
      <mesh position={[0, 1.0, 0]} castShadow>
        <capsuleGeometry args={[0.28, 0.9, 8, 16]} />
        <meshStandardMaterial color="#ef4444" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.85, 0]} castShadow>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.0, -0.05]} rotation={[0.2, 0, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.08, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#7f1d1d" roughness={0.5} />
      </mesh>
      <mesh position={[0.38, 1.2, 0]} rotation={[0, 0, -0.4]} castShadow>
        <capsuleGeometry args={[0.08, 0.5, 4, 8]} />
        <meshStandardMaterial color="#ef4444" roughness={0.7} />
      </mesh>
      <group ref={paddleRef} position={[0.5, 1.15, -0.2]}>
        <mesh position={[0, 0, 0]} rotation={[0.3, 0, 0.2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.45, 8]} />
          <meshStandardMaterial color="#78350f" roughness={0.8} />
        </mesh>
        <mesh position={[0.05, 0.35, -0.05]} rotation={[0.3, 0.1, 0.2]} castShadow>
          <boxGeometry args={[0.5, 0.6, 0.04]} />
          <meshStandardMaterial color="#dc2626" roughness={0.5} />
        </mesh>
      </group>
      <mesh position={[-0.15, 0.35, 0]} castShadow>
        <capsuleGeometry args={[0.1, 0.5, 4, 8]} />
        <meshStandardMaterial color="#7f1d1d" roughness={0.8} />
      </mesh>
      <mesh position={[0.15, 0.35, 0]} castShadow>
        <capsuleGeometry args={[0.1, 0.5, 4, 8]} />
        <meshStandardMaterial color="#7f1d1d" roughness={0.8} />
      </mesh>
      <mesh position={[-0.15, 0.07, 0.08]}>
        <boxGeometry args={[0.2, 0.12, 0.38]} />
        <meshStandardMaterial color="#111827" roughness={0.7} />
      </mesh>
      <mesh position={[0.15, 0.07, 0.08]}>
        <boxGeometry args={[0.2, 0.12, 0.38]} />
        <meshStandardMaterial color="#111827" roughness={0.7} />
      </mesh>
    </group>
  );
});

// Estimated gravity for bot shot calc (matches Ball.jsx GRAVITY)
const GRAVITY_EST = -18;

export default Bot;
export { BOT_START_Z };
