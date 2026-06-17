import { useRef, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COURT_W, COURT_L, NET_H } from '../Court';

const BALL_RADIUS = 0.15;
const FLOOR_Y     = BALL_RADIUS;
const GRAVITY     = -18;

const Ball = forwardRef(function Ball({ onBounce, onFault, onScore }, ref) {
  const meshRef   = useRef();
  const shadowRef = useRef();

  const vel         = useRef(new THREE.Vector3());
  const active      = useRef(false);
  const lastStriker = useRef('NONE');

  const playerSideBounces = useRef(0);
  const aiSideBounces     = useRef(0);
  const currentSide       = useRef(null);
  const prevY = useRef(1);
  const prevZ = useRef(0);

  useImperativeHandle(ref, () => ({
    launch(pos, velocity, striker = 'PLAYER') {
      if (!meshRef.current) return;
      meshRef.current.position.set(pos.x, pos.y, pos.z);
      vel.current.set(velocity.x, velocity.y, velocity.z);
      prevY.current = pos.y;
      prevZ.current = pos.z;
      playerSideBounces.current = 0;
      aiSideBounces.current     = 0;
      currentSide.current       = pos.z > 0 ? 'player' : 'ai';
      lastStriker.current       = striker;
      active.current            = true;
    },

    stop() {
      active.current = false;
      vel.current.set(0, 0, 0);
    },

    hit(v, striker = 'PLAYER') {
      vel.current.set(v.x, v.y, v.z);
      lastStriker.current = striker;
    },

    getPosition()    { return meshRef.current?.position.clone() ?? new THREE.Vector3(); },
    getVelocity()    { return vel.current.clone(); },
    getLastStriker() { return lastStriker.current; },
    isActive()       { return active.current; },

    getBounceCount() {
      const pos = meshRef.current?.position;
      if (!pos) return 0;
      return pos.z > 0 ? playerSideBounces.current : aiSideBounces.current;
    },
  }));

  useFrame((_, delta) => {
    if (!active.current || !meshRef.current) return;
    const dt  = Math.min(delta, 0.025);
    const pos = meshRef.current.position;
    const v   = vel.current;

    v.y += GRAVITY * dt;
    pos.x += v.x * dt;
    pos.y += v.y * dt;
    pos.z += v.z * dt;

    // Shadow
    if (shadowRef.current) {
      shadowRef.current.position.x = pos.x;
      shadowRef.current.position.z = pos.z;
      const s = Math.max(0.3, 1 - pos.y * 0.07);
      shadowRef.current.scale.set(s, s, s);
    }

    // Side crossing — reset that side's bounce count
    const nowSide = pos.z > 0 ? 'player' : 'ai';
    if (nowSide !== currentSide.current) {
      if (nowSide === 'player') playerSideBounces.current = 0;
      else                      aiSideBounces.current     = 0;
      currentSide.current = nowSide;
    }

    // ── NET COLLISION ──
    const crossedFromPlayer = prevZ.current >  0.12 && pos.z <=  0.12;
    const crossedFromAI     = prevZ.current < -0.12 && pos.z >= -0.12;
    if ((crossedFromPlayer || crossedFromAI) && pos.y < NET_H + BALL_RADIUS) {
      active.current = false;
      if (onFault) onFault({ reason: 'NET_HIT', striker: lastStriker.current, position: pos.clone() });
      prevY.current = pos.y;
      prevZ.current = pos.z;
      return;
    }

    // ── FLOOR BOUNCE ──
    if (pos.y <= FLOOR_Y && prevY.current > FLOOR_Y) {
      pos.y = FLOOR_Y;
      v.y   = Math.abs(v.y) * 0.52;
      v.x  *= 0.88;
      v.z  *= 0.88;
      if (Math.abs(v.y) < 0.4) v.y = 0;

      const halfW = COURT_W / 2;
      const halfL = COURT_L / 2;

      // ── OUT OF BOUNDS on bounce ──
      // Key fix: use WHICH SIDE the ball is on to decide who gets the point,
      // NOT who hit it last. If ball bounces out on AI side → player scores.
      // If ball bounces out on player side → AI scores.
      if (Math.abs(pos.x) > halfW + 0.15 || Math.abs(pos.z) > halfL + 0.15) {
        active.current = false;
        const outSide = pos.z > 0 ? 'player' : 'ai';
        if (outSide === 'ai') {
          // Ball went out on AI side — player scores
          if (onScore) onScore({ scorer: 'player', reason: 'OUT_OF_BOUNDS' });
        } else {
          // Ball went out on player side — AI scores
          if (onScore) onScore({ scorer: 'ai', reason: 'OUT_OF_BOUNDS' });
        }
        prevY.current = pos.y;
        prevZ.current = pos.z;
        return;
      }

      const side = pos.z > 0 ? 'player' : 'ai';
      if (side === 'player') playerSideBounces.current += 1;
      else                   aiSideBounces.current     += 1;

      const sideBounces = side === 'player'
        ? playerSideBounces.current
        : aiSideBounces.current;

      if (onBounce) onBounce({ position: pos.clone(), side, sideBounces });

      // ── DOUBLE BOUNCE ──
      if (sideBounces >= 2) {
        active.current = false;
        if (side === 'player') onScore?.({ scorer: 'ai',    reason: 'DOUBLE_BOUNCE' });
        else                   onScore?.({ scorer: 'player', reason: 'DOUBLE_BOUNCE' });
        prevY.current = pos.y;
        prevZ.current = pos.z;
        return;
      }
    }

    // ── MISSED PAST BASELINE (never bounced, flew over) ──
    if (pos.z >  COURT_L / 2 + 3) { active.current = false; onScore?.({ scorer: 'ai',    reason: 'MISSED_SHOT' }); }
    if (pos.z < -(COURT_L / 2 + 3)) { active.current = false; onScore?.({ scorer: 'player', reason: 'MISSED_SHOT' }); }

    prevY.current = pos.y;
    prevZ.current = pos.z;
  });

  return (
    <group>
      <mesh ref={meshRef} position={[0, 1.5, 10]} castShadow>
        <sphereGeometry args={[BALL_RADIUS, 16, 16]} />
        <meshStandardMaterial color="#d4f54e" roughness={0.45} emissive="#a3e635" emissiveIntensity={0.25} />
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
