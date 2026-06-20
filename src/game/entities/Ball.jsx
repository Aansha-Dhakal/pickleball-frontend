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
  const vel                 = useRef(new THREE.Vector3());
  const active              = useRef(false);
  const lastStriker         = useRef('NONE');
  const playerSideBounces   = useRef(0);
  const aiSideBounces       = useRef(0);
  const currentSide         = useRef(null);
  const prevY               = useRef(1);
  const prevZ               = useRef(0);
  const bounceCount         = useRef(0); // total in-bounds bounces since last hit

  useImperativeHandle(ref, () => ({
    launch(pos, velocity, striker = 'PLAYER') {
      if (!meshRef.current) return;
      meshRef.current.position.set(pos.x, pos.y, pos.z);
      vel.current.set(velocity.x, velocity.y, velocity.z);
      prevY.current             = pos.y;
      prevZ.current             = pos.z;
      playerSideBounces.current = 0;
      aiSideBounces.current     = 0;
      bounceCount.current       = 0;
      currentSide.current       = pos.z > 0 ? 'player' : 'ai';
      lastStriker.current       = striker;
      active.current            = true;
    },
    stop() { active.current = false; vel.current.set(0, 0, 0); },
    hit(v, striker = 'PLAYER') {
      vel.current.set(v.x, v.y, v.z);
      lastStriker.current = striker;
      // Reset bounceCount only if ball hasn't bounced yet this rally
      // Once bounced, the rally outcome is already determined by landingSide
      // Resetting here was causing mid-rally hits to lose the bounce record
      bounceCount.current = 0;
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

    if (shadowRef.current) {
      shadowRef.current.position.x = pos.x;
      shadowRef.current.position.z = pos.z;
      const s = Math.max(0.3, 1 - pos.y * 0.07);
      shadowRef.current.scale.set(s, s, s);
    }

    const nowSide = pos.z > 0 ? 'player' : 'ai';
    if (nowSide !== currentSide.current) {
      if (nowSide === 'player') playerSideBounces.current = 0;
      else                      aiSideBounces.current     = 0;
      currentSide.current = nowSide;
    }

    // ── NET ──
    const crossedFromPlayer = prevZ.current >  0.12 && pos.z <=  0.12;
    const crossedFromAI     = prevZ.current < -0.12 && pos.z >= -0.12;
    if ((crossedFromPlayer || crossedFromAI) && pos.y < NET_H + BALL_RADIUS) {
      active.current = false;
      onFault?.({ reason: 'NET_HIT', striker: lastStriker.current, position: pos.clone() });
      prevY.current = pos.y; prevZ.current = pos.z;
      return;
    }

    // ── FLOOR ──
    if (pos.y <= FLOOR_Y && prevY.current > FLOOR_Y) {
      pos.y = FLOOR_Y;
      v.y   = Math.abs(v.y) * 0.52;
      v.x  *= 0.88;
      v.z  *= 0.88;
      if (Math.abs(v.y) < 0.4) v.y = 0;

      const halfW = COURT_W / 2;
      const halfL = COURT_L / 2;

      const outSide = Math.abs(pos.x) > halfW + 0.05;  // out via sideline
      const outBase = Math.abs(pos.z) > halfL + 0.05;  // out via baseline
      const outOfBounds = outSide || outBase;

      if (outOfBounds) {
        active.current = false;

        if (bounceCount.current > 0) {
          // ── BALL ALREADY BOUNCED IN BOUNDS → "BALL OUT" ──
          // After a valid bounce, the ball going out = receiver's fault
          // Whoever is on the side the ball is on now failed to keep it in
          // Simple rule: the side the ball is currently on LOSES
          const losingSide = pos.z > 0 ? 'player' : 'ai';
          if (losingSide === 'player') {
            onScore?.({ scorer: 'ai',    reason: 'BALL_OUT' });
          } else {
            onScore?.({ scorer: 'player', reason: 'BALL_OUT' });
          }
        } else {
          // ── FIRST BOUNCE IS OUT → "OUT OF BOUNDS" ──
          // Ball never landed in court — hitter loses
          if (lastStriker.current === 'PLAYER') {
            onScore?.({ scorer: 'ai',    reason: 'OUT_OF_BOUNDS' });
          } else {
            onScore?.({ scorer: 'player', reason: 'OUT_OF_BOUNDS' });
          }
        }

        prevY.current = pos.y; prevZ.current = pos.z;
        return;
      }

      // ── VALID IN-BOUNDS BOUNCE ──
      bounceCount.current += 1;

      const side = pos.z > 0 ? 'player' : 'ai';
      if (side === 'player') playerSideBounces.current += 1;
      else                   aiSideBounces.current     += 1;

      const sideBounces = side === 'player'
        ? playerSideBounces.current
        : aiSideBounces.current;

      onBounce?.({ position: pos.clone(), side, sideBounces });

      // ── DOUBLE BOUNCE ──
      if (sideBounces >= 2) {
        active.current = false;
        if (side === 'player') onScore?.({ scorer: 'ai',    reason: 'DOUBLE_BOUNCE' });
        else                   onScore?.({ scorer: 'player', reason: 'DOUBLE_BOUNCE' });
        prevY.current = pos.y; prevZ.current = pos.z;
        return;
      }
    }

    // ── MID-AIR BOUNDARY ──
    if (pos.y > FLOOR_Y) {
      // Past AI baseline
      if (pos.z < -(COURT_L / 2 + 2)) {
        active.current = false;
        if (bounceCount.current > 0) {
          // Bounced in AI court already — ball out, AI loses
          onScore?.({ scorer: 'player', reason: 'BALL_OUT' });
        } else {
          // Never bounced — player hit long
          onScore?.({ scorer: 'ai', reason: 'OUT_OF_BOUNDS' });
        }
        prevY.current = pos.y; prevZ.current = pos.z;
        return;
      }
      // Past player baseline
      if (pos.z > COURT_L / 2 + 2) {
        active.current = false;
        if (bounceCount.current > 0) {
          // Bounced in player court already — ball out, player loses
          onScore?.({ scorer: 'ai', reason: 'BALL_OUT' });
        } else {
          // Never bounced — AI hit long
          onScore?.({ scorer: 'player', reason: 'OUT_OF_BOUNDS' });
        }
        prevY.current = pos.y; prevZ.current = pos.z;
        return;
      }
      // Sideways mid-air
      if (Math.abs(pos.x) > COURT_W / 2 + 0.3) {
        active.current = false;
        if (bounceCount.current > 0) {
          // Already bounced in bounds — ball out, side it's on loses
          const losingSide = pos.z > 0 ? 'player' : 'ai';
          if (losingSide === 'player') {
            onScore?.({ scorer: 'ai',    reason: 'BALL_OUT' });
          } else {
            onScore?.({ scorer: 'player', reason: 'BALL_OUT' });
          }
        } else {
          // Never bounced — hitter hit it wide
          if (lastStriker.current === 'PLAYER') {
            onScore?.({ scorer: 'ai',    reason: 'OUT_OF_BOUNDS' });
          } else {
            onScore?.({ scorer: 'player', reason: 'OUT_OF_BOUNDS' });
          }
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
