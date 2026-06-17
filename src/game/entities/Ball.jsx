import { useRef, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COURT_W, COURT_L, NET_H } from '../Court';

const BALL_RADIUS = 0.15;
const FLOOR_Y = BALL_RADIUS;
const GRAVITY = -18;

const Ball = forwardRef(function Ball({ onBounce, onFault, onScore }, ref) {
  const meshRef = useRef();
  const shadowRef = useRef();

  const vel = useRef(new THREE.Vector3());
  const active = useRef(false);

  // Track bounces per side independently
  // Reset each side's count when ball crosses to that side
  const playerSideBounces = useRef(0); // bounces on Z > 0 (blue/player side)
  const aiSideBounces = useRef(0);     // bounces on Z < 0 (red/AI side)
  const currentSide = useRef(null);    // 'player' | 'ai' | null

  const prevY = useRef(1);
  const prevZ = useRef(0);

  useImperativeHandle(ref, () => ({
    launch(pos, velocity) {
      if (!meshRef.current) return;
      meshRef.current.position.set(pos.x, pos.y, pos.z);
      vel.current.set(velocity.x, velocity.y, velocity.z);
      prevY.current = pos.y;
      prevZ.current = pos.z;
      playerSideBounces.current = 0;
      aiSideBounces.current = 0;
      currentSide.current = pos.z > 0 ? 'player' : 'ai';
      active.current = true;
    },

    stop() {
      active.current = false;
      vel.current.set(0, 0, 0);
    },

    hit(v) {
      vel.current.set(v.x, v.y, v.z);
    },

    getPosition() {
      return meshRef.current?.position.clone() ?? new THREE.Vector3();
    },

    getVelocity() {
      return vel.current.clone();
    },

    // Returns bounces on whichever side ball is currently on
    getBounceCount() {
      const pos = meshRef.current?.position;
      if (!pos) return 0;
      return pos.z > 0 ? playerSideBounces.current : aiSideBounces.current;
    },

    isActive() { return active.current; },
  }));

  useFrame((_, delta) => {
    if (!active.current || !meshRef.current) return;
    const dt = Math.min(delta, 0.025);
    const pos = meshRef.current.position;
    const v = vel.current;

    // Apply gravity
    v.y += GRAVITY * dt;

    // Move
    pos.x += v.x * dt;
    pos.y += v.y * dt;
    pos.z += v.z * dt;

    // Update shadow
    if (shadowRef.current) {
      shadowRef.current.position.x = pos.x;
      shadowRef.current.position.z = pos.z;
      const scale = Math.max(0.3, 1 - pos.y * 0.07);
      shadowRef.current.scale.set(scale, scale, scale);
    }

    // ── SIDE CROSSING — reset bounce count for the side ball enters ──
    const nowSide = pos.z > 0 ? 'player' : 'ai';
    if (nowSide !== currentSide.current) {
      // Ball just crossed to the other side — reset that side's bounce count
      if (nowSide === 'player') playerSideBounces.current = 0;
      else aiSideBounces.current = 0;
      currentSide.current = nowSide;
    }

    // ── NET COLLISION ──
    const crossedFromPlayer = prevZ.current > 0.12 && pos.z <= 0.12;
    const crossedFromAI     = prevZ.current < -0.12 && pos.z >= -0.12;
    if ((crossedFromPlayer || crossedFromAI) && pos.y < NET_H + BALL_RADIUS) {
      active.current = false;
      if (onFault) onFault({ reason: 'NET_HIT', position: pos.clone() });
      prevY.current = pos.y;
      prevZ.current = pos.z;
      return;
    }

    // ── FLOOR BOUNCE ──
    if (pos.y <= FLOOR_Y && prevY.current > FLOOR_Y) {
      pos.y = FLOOR_Y;
      v.y = Math.abs(v.y) * 0.52;
      v.x *= 0.88;
      v.z *= 0.88;
      if (Math.abs(v.y) < 0.4) v.y = 0;

      // Out of bounds on bounce
      if (Math.abs(pos.x) > COURT_W / 2 + 0.15 || Math.abs(pos.z) > COURT_L / 2 + 0.15) {
        active.current = false;
        if (onFault) onFault({ reason: 'OUT_OF_BOUNDS', position: pos.clone() });
        prevY.current = pos.y;
        prevZ.current = pos.z;
        return;
      }

      const side = pos.z > 0 ? 'player' : 'ai';

      // Increment bounce count for current side
      if (side === 'player') {
        playerSideBounces.current += 1;
      } else {
        aiSideBounces.current += 1;
      }

      const sideBounces = side === 'player' ? playerSideBounces.current : aiSideBounces.current;

      if (onBounce) onBounce({ position: pos.clone(), side, sideBounces });

      // ── DOUBLE BOUNCE RULE ──
      // Ball bounced twice on a side = that side loses the point
      if (sideBounces >= 2) {
        active.current = false;
        if (side === 'player') {
          // Ball bounced twice on PLAYER side → AI scores
          if (onScore) onScore({ scorer: 'ai', reason: 'DOUBLE_BOUNCE' });
        } else {
          // Ball bounced twice on AI side → PLAYER scores
          if (onScore) onScore({ scorer: 'player', reason: 'DOUBLE_BOUNCE' });
        }
        prevY.current = pos.y;
        prevZ.current = pos.z;
        return;
      }
    }

    // ── BALL FLEW PAST BASELINE ──
    if (pos.z > COURT_L / 2 + 3) {
      active.current = false;
      if (onScore) onScore({ scorer: 'ai', reason: 'MISSED_SHOT' });
    }
    if (pos.z < -(COURT_L / 2 + 3)) {
      active.current = false;
      if (onScore) onScore({ scorer: 'player', reason: 'MISSED_SHOT' });
    }

    prevY.current = pos.y;
    prevZ.current = pos.z;
  });

  return (
    <group>
      <mesh ref={meshRef} position={[0, 1.5, 10]} castShadow>
        <sphereGeometry args={[BALL_RADIUS, 16, 16]} />
        <meshStandardMaterial
          color="#d4f54e"
          roughness={0.45}
          emissive="#a3e635"
          emissiveIntensity={0.25}
        />
      </mesh>
      <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 10]}>
        <circleGeometry args={[0.28, 16]} />
        <meshStandardMaterial color="#000" transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </group>
  );
});

export default Ball;
export { BALL_RADIUS };
