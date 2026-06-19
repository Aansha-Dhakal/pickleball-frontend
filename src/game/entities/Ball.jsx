import { useRef, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COURT_W, COURT_L, NET_H } from '../Court';

const BALL_RADIUS = 0.15;
const FLOOR_Y     = BALL_RADIUS;
const GRAVITY     = -18;

/*
  SCORING RULES — one source of truth:

  After a HIT:
  - Ball must cross net and land IN opponent's court
  - If it lands OUT (first bounce out of bounds) → hitter loses
  - If it lands IN then goes anywhere after → receiver must return it
    (second bounce = double bounce = hitter of that side wins)
  - Mid-air past baseline without bouncing → the person who sent it there loses

  KEY: we track firstBounceSide per rally (resets on each hit()).
  The OUT check only applies on the FIRST bounce.
  After the first in-bounds bounce, second bounce = double bounce (receiver loses).
*/

const Ball = forwardRef(function Ball({ onBounce, onFault, onScore }, ref) {
  const meshRef   = useRef();
  const shadowRef = useRef();
  const vel               = useRef(new THREE.Vector3());
  const active            = useRef(false);
  const lastStriker       = useRef('NONE');
  const playerSideBounces = useRef(0);
  const aiSideBounces     = useRef(0);
  const currentSide       = useRef(null);
  const prevY             = useRef(1);
  const prevZ             = useRef(0);
  const hasBouncedThisRally = useRef(false); // did ball bounce IN-BOUNDS this rally?

  useImperativeHandle(ref, () => ({
    launch(pos, velocity, striker = 'PLAYER') {
      if (!meshRef.current) return;
      meshRef.current.position.set(pos.x, pos.y, pos.z);
      vel.current.set(velocity.x, velocity.y, velocity.z);
      prevY.current               = pos.y;
      prevZ.current               = pos.z;
      playerSideBounces.current   = 0;
      aiSideBounces.current       = 0;
      currentSide.current         = pos.z > 0 ? 'player' : 'ai';
      lastStriker.current         = striker;
      hasBouncedThisRally.current = false;
      active.current              = true;
    },
    stop() { active.current = false; vel.current.set(0, 0, 0); },
    hit(v, striker = 'PLAYER') {
      vel.current.set(v.x, v.y, v.z);
      lastStriker.current         = striker;
      hasBouncedThisRally.current = false; // new shot — reset
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

    v.y   += GRAVITY * dt;
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

    // Track side crossing
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
      prevY.current = pos.y; prevZ.current = pos.z;
      return;
    }

    // ── FLOOR CONTACT ──
    if (pos.y <= FLOOR_Y && prevY.current > FLOOR_Y) {
      pos.y = FLOOR_Y;
      v.y   = Math.abs(v.y) * 0.52;
      v.x  *= 0.88;
      v.z  *= 0.88;
      if (Math.abs(v.y) < 0.4) v.y = 0;

      const halfW = COURT_W / 2;
      const halfL = COURT_L / 2;
      const inBounds = Math.abs(pos.x) <= halfW + 0.05 && Math.abs(pos.z) <= halfL + 0.05;

      if (!inBounds) {
        // ── FIRST BOUNCE OUT OF BOUNDS ──
        // Ball landed out of court — whoever hit it there loses
        // UNLESS the ball already bounced in-bounds — then it's a missed return
        active.current = false;

        if (hasBouncedThisRally.current) {
          // Ball already bounced in bounds — this is a SECOND bounce = receiver loses
          // The side it's currently on is who missed it
          const side = pos.z > 0 ? 'player' : 'ai';
          if (side === 'player') {
            onScore?.({ scorer: 'ai', reason: 'DOUBLE_BOUNCE' });
          } else {
            onScore?.({ scorer: 'player', reason: 'DOUBLE_BOUNCE' });
          }
        } else {
          // First bounce and it's already out — hitter sent it out
          if (lastStriker.current === 'PLAYER') {
            onScore?.({ scorer: 'ai', reason: 'OUT_OF_BOUNDS' });
          } else {
            onScore?.({ scorer: 'player', reason: 'OUT_OF_BOUNDS' });
          }
        }
        prevY.current = pos.y; prevZ.current = pos.z;
        return;
      }

      // ── VALID IN-BOUNDS BOUNCE ──
      hasBouncedThisRally.current = true;

      const side = pos.z > 0 ? 'player' : 'ai';
      if (side === 'player') playerSideBounces.current += 1;
      else                   aiSideBounces.current     += 1;

      const sideBounces = side === 'player'
        ? playerSideBounces.current
        : aiSideBounces.current;

      if (onBounce) onBounce({ position: pos.clone(), side, sideBounces });

      // ── DOUBLE BOUNCE — receiver didn't return in time ──
      if (sideBounces >= 2) {
        active.current = false;
        if (side === 'player') onScore?.({ scorer: 'ai',    reason: 'DOUBLE_BOUNCE' });
        else                   onScore?.({ scorer: 'player', reason: 'DOUBLE_BOUNCE' });
        prevY.current = pos.y; prevZ.current = pos.z;
        return;
      }
    }

    // ── MID-AIR PAST BASELINE (never bounced) ──
    if (pos.y > FLOOR_Y) {
      if (pos.z < -(COURT_L / 2 + 2)) {
        active.current = false;
        // Past AI baseline in the air
        if (hasBouncedThisRally.current) {
          // Already bounced on AI side — player scored, AI missed the return
          onScore?.({ scorer: 'player', reason: 'MISSED_SHOT' });
        } else {
          // Never bounced — player hit it too long
          onScore?.({ scorer: 'ai', reason: 'MISSED_SHOT' });
        }
        prevY.current = pos.y; prevZ.current = pos.z;
        return;
      }
      if (pos.z > COURT_L / 2 + 2) {
        active.current = false;
        // Past player baseline in the air
        if (hasBouncedThisRally.current) {
          // Already bounced on player side — AI scored, player missed the return
          onScore?.({ scorer: 'ai', reason: 'MISSED_SHOT' });
        } else {
          // Never bounced — AI hit it too long
          onScore?.({ scorer: 'player', reason: 'MISSED_SHOT' });
        }
        prevY.current = pos.y; prevZ.current = pos.z;
        return;
      }
      // Sideways out mid-air — hitter responsible
      if (Math.abs(pos.x) > COURT_W / 2 + 0.3) {
        active.current = false;
        if (lastStriker.current === 'PLAYER') {
          onScore?.({ scorer: 'ai', reason: 'OUT_OF_BOUNDS' });
        } else {
          onScore?.({ scorer: 'player', reason: 'OUT_OF_BOUNDS' });
        }
        prevY.current = pos.y; prevZ.current = pos.z;
        return;
      }
    }

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
