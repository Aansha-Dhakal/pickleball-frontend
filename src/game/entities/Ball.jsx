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
  const vel               = useRef(new THREE.Vector3());
  const active            = useRef(false);
  const lastStriker       = useRef('NONE');
  const playerSideBounces = useRef(0);
  const aiSideBounces     = useRef(0);
  const currentSide       = useRef(null);
  const prevY             = useRef(1);
  const prevZ             = useRef(0);

  // Track whether ball has bounced on the RECEIVING side since last hit
  // This is the key: if ball bounced on AI side, player hit a good shot
  // If it then goes out, player still scores (it was in)
  const bouncedOnReceivingSide = useRef(false);
  const receivingSide          = useRef(null); // 'player' or 'ai'

  useImperativeHandle(ref, () => ({
    launch(pos, velocity, striker = 'PLAYER') {
      if (!meshRef.current) return;
      meshRef.current.position.set(pos.x, pos.y, pos.z);
      vel.current.set(velocity.x, velocity.y, velocity.z);
      prevY.current             = pos.y;
      prevZ.current             = pos.z;
      playerSideBounces.current = 0;
      aiSideBounces.current     = 0;
      currentSide.current       = pos.z > 0 ? 'player' : 'ai';
      lastStriker.current       = striker;
      bouncedOnReceivingSide.current = false;
      receivingSide.current     = striker === 'PLAYER' ? 'ai' : 'player';
      active.current            = true;
    },
    stop() { active.current = false; vel.current.set(0, 0, 0); },
    hit(v, striker = 'PLAYER') {
      vel.current.set(v.x, v.y, v.z);
      lastStriker.current = striker;
      bouncedOnReceivingSide.current = false;
      receivingSide.current = striker === 'PLAYER' ? 'ai' : 'player';
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

    // Track side crossing — reset bounce count for new side
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

    // ── FLOOR BOUNCE ──
    if (pos.y <= FLOOR_Y && prevY.current > FLOOR_Y) {
      pos.y = FLOOR_Y;
      v.y   = Math.abs(v.y) * 0.52;
      v.x  *= 0.88;
      v.z  *= 0.88;
      if (Math.abs(v.y) < 0.4) v.y = 0;

      const halfW = COURT_W / 2;
      const halfL = COURT_L / 2;

      // ── OUT OF BOUNDS ON BOUNCE ──
      if (Math.abs(pos.x) > halfW + 0.15 || Math.abs(pos.z) > halfL + 0.15) {
        active.current = false;

        // KEY RULE:
        // If ball already bounced on receiving side → hitter scored a winner that went long/wide
        //   → The RECEIVER loses (they should have let it go)
        //   → Wait — in pickleball, if ball lands OUT, the hitter loses the point
        //   → If ball lands IN then goes out after bounce, it's already scored
        //
        // SIMPLEST CORRECT RULE:
        // Whoever hit the ball last is responsible for where it lands.
        // If PLAYER hit it and it lands out → AI scores
        // If AI hit it and it lands out → PLAYER scores
        // This is correct for ALL cases:
        //   - You hit wide on AI side → AI scores ✅
        //   - AI hit wide on your side → You score ✅  
        //   - You hit long past AI baseline → AI scores ✅
        //   - AI hit long past your baseline → You score ✅

        if (lastStriker.current === 'PLAYER') {
          onScore?.({ scorer: 'ai', reason: 'OUT_OF_BOUNDS' });
        } else {
          onScore?.({ scorer: 'player', reason: 'OUT_OF_BOUNDS' });
        }
        prevY.current = pos.y; prevZ.current = pos.z;
        return;
      }

      // Valid in-bounds bounce
      const side = pos.z > 0 ? 'player' : 'ai';
      if (side === 'player') playerSideBounces.current += 1;
      else                   aiSideBounces.current     += 1;

      const sideBounces = side === 'player'
        ? playerSideBounces.current
        : aiSideBounces.current;

      // Mark that ball bounced on receiving side
      if (side === receivingSide.current) {
        bouncedOnReceivingSide.current = true;
      }

      if (onBounce) onBounce({ position: pos.clone(), side, sideBounces });

      // ── DOUBLE BOUNCE ──
      if (sideBounces >= 2) {
        active.current = false;
        if (side === 'player') onScore?.({ scorer: 'ai',    reason: 'DOUBLE_BOUNCE' });
        else                   onScore?.({ scorer: 'player', reason: 'DOUBLE_BOUNCE' });
        prevY.current = pos.y; prevZ.current = pos.z;
        return;
      }
    }

    // ── MID-AIR OUT — past baseline without bouncing ──
    // Ball flying toward AI past their baseline = player hit it too long = AI scores
    // Ball flying toward player past their baseline = AI hit it too long = player scores
    if (pos.y > FLOOR_Y) {
      if (pos.z < -(COURT_L / 2 + 2)) {
        active.current = false;
        // Flying past AI baseline — who sent it there?
        if (lastStriker.current === 'PLAYER') {
          // Player hit it too long — AI scores
          onScore?.({ scorer: 'ai', reason: 'MISSED_SHOT' });
        } else {
          // AI returned it past their own baseline somehow, player scores
          onScore?.({ scorer: 'player', reason: 'MISSED_SHOT' });
        }
        prevY.current = pos.y; prevZ.current = pos.z;
        return;
      }
      if (pos.z > COURT_L / 2 + 2) {
        active.current = false;
        // Flying past player baseline — who sent it there?
        if (lastStriker.current === 'AI') {
          // AI hit it too long — player scores
          onScore?.({ scorer: 'player', reason: 'MISSED_SHOT' });
        } else {
          // Player returned it past their own baseline, AI scores
          onScore?.({ scorer: 'ai', reason: 'MISSED_SHOT' });
        }
        prevY.current = pos.y; prevZ.current = pos.z;
        return;
      }

      // ── MID-AIR SIDEWAYS OUT ──
      if (Math.abs(pos.x) > COURT_W / 2 + 0.3) {
        active.current = false;
        // Whoever hit it last sent it wide
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
