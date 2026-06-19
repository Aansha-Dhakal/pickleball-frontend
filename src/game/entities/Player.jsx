import { useRef, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COURT_W, COURT_L, KITCHEN_DEPTH } from '../Court';

const PLAYER_SPEED = 12;
const PADDLE_REACH = 1.2;
const HIT_COOLDOWN = 0.4;
const PLAYER_START_Z = 14;

// Serve animation states
const SERVE_IDLE    = 'IDLE';
const SERVE_TOSS    = 'TOSS';    // arm raises, ball goes up
const SERVE_WINDUP  = 'WINDUP';  // paddle arm winds back
const SERVE_STRIKE  = 'STRIKE';  // swing forward
const SERVE_FOLLOW  = 'FOLLOW';  // follow through

const Player = forwardRef(function Player({ keys, onHit, onKitchenViolation, onServeReady }, ref) {
  const groupRef   = useRef();
  const paddleRef  = useRef();
  const tossArmRef = useRef(); // left arm for ball toss
  const bodyRef    = useRef();

  const swingRef     = useRef(false);
  const swingAngle   = useRef(0);
  const lastHitTime  = useRef(0);

  // Serve animation
  const serveState   = useRef(SERVE_IDLE);
  const serveTimer   = useRef(0);
  const serveCallback = useRef(null);

  useImperativeHandle(ref, () => ({
    getPosition() {
      return groupRef.current?.position.clone() ?? new THREE.Vector3(0, 0, PLAYER_START_Z);
    },

    isInKitchen() {
      const z = groupRef.current?.position.z ?? PLAYER_START_Z;
      return z > 0 && z < KITCHEN_DEPTH;
    },

    triggerSwing() {
      swingRef.current  = true;
      swingAngle.current = 0;
    },

    // Start the serve wind-up animation, call onReady when ball should launch
    startServeAnimation(onReady) {
      serveState.current  = SERVE_TOSS;
      serveTimer.current  = 0;
      serveCallback.current = onReady;
    },
  }));

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const pos = groupRef.current.position;
    const dt  = Math.min(delta, 0.05);
    const now = state.clock.elapsedTime;

    // ── MOVEMENT (arrow keys only) ──
    let moved = false;
    if (keys.current['ArrowUp'])    { pos.z -= PLAYER_SPEED * dt; moved = true; }
    if (keys.current['ArrowDown'])  { pos.z += PLAYER_SPEED * dt; moved = true; }
    if (keys.current['ArrowLeft'])  { pos.x -= PLAYER_SPEED * dt; moved = true; }
    if (keys.current['ArrowRight']) { pos.x += PLAYER_SPEED * dt; moved = true; }

    pos.x = Math.max(-COURT_W / 2 + 0.5, Math.min(COURT_W / 2 - 0.5, pos.x));
    pos.z = Math.max(0.5, Math.min(COURT_L / 2, pos.z));

    // Body bob while moving
    if (moved) {
      groupRef.current.position.y = Math.sin(now * 9) * 0.03;
    } else {
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0, delta * 7);
    }

    // ── SERVE ANIMATION STATE MACHINE ──
    if (serveState.current !== SERVE_IDLE) {
      serveTimer.current += dt;

      if (serveState.current === SERVE_TOSS) {
        // Raise toss arm over ~0.4s
        if (tossArmRef.current) {
          tossArmRef.current.rotation.x = THREE.MathUtils.lerp(
            tossArmRef.current.rotation.x,
            -2.2, // arm straight up
            dt * 6
          );
        }
        if (serveTimer.current > 0.4) {
          serveState.current = SERVE_WINDUP;
          serveTimer.current = 0;
        }
      }

      else if (serveState.current === SERVE_WINDUP) {
        // Wind paddle arm back
        if (paddleRef.current) {
          paddleRef.current.rotation.x = THREE.MathUtils.lerp(
            paddleRef.current.rotation.x,
            -1.8, // arm back
            dt * 7
          );
          paddleRef.current.rotation.z = THREE.MathUtils.lerp(
            paddleRef.current.rotation.z,
            0.4,
            dt * 7
          );
        }
        if (serveTimer.current > 0.35) {
          serveState.current = SERVE_STRIKE;
          serveTimer.current = 0;
          // This is when ball launches
          if (serveCallback.current) {
            serveCallback.current();
            serveCallback.current = null;
          }
        }
      }

      else if (serveState.current === SERVE_STRIKE) {
        // Slam paddle forward fast
        if (paddleRef.current) {
          paddleRef.current.rotation.x = THREE.MathUtils.lerp(
            paddleRef.current.rotation.x,
            1.2, // forward swing
            dt * 20
          );
          paddleRef.current.rotation.z = THREE.MathUtils.lerp(
            paddleRef.current.rotation.z,
            -0.2,
            dt * 20
          );
        }
        if (serveTimer.current > 0.15) {
          serveState.current = SERVE_FOLLOW;
          serveTimer.current = 0;
        }
      }

      else if (serveState.current === SERVE_FOLLOW) {
        // Return to rest over 0.5s
        if (paddleRef.current) {
          paddleRef.current.rotation.x = THREE.MathUtils.lerp(paddleRef.current.rotation.x, 0, dt * 5);
          paddleRef.current.rotation.z = THREE.MathUtils.lerp(paddleRef.current.rotation.z, 0, dt * 5);
        }
        if (tossArmRef.current) {
          tossArmRef.current.rotation.x = THREE.MathUtils.lerp(tossArmRef.current.rotation.x, 0, dt * 5);
        }
        if (serveTimer.current > 0.5) {
          serveState.current = SERVE_IDLE;
          serveTimer.current = 0;
        }
      }
    }

    // ── REGULAR SWING ANIMATION ──
    else if (swingRef.current) {
      swingAngle.current = Math.min(swingAngle.current + delta * 14, Math.PI * 0.65);
      if (paddleRef.current) {
        paddleRef.current.rotation.x = -swingAngle.current;
      }
      if (swingAngle.current >= Math.PI * 0.65) {
        swingRef.current  = false;
        swingAngle.current = 0;
      }
    } else {
      // Return paddle to rest
      if (paddleRef.current) {
        paddleRef.current.rotation.x = THREE.MathUtils.lerp(paddleRef.current.rotation.x, 0, delta * 9);
        paddleRef.current.rotation.z = THREE.MathUtils.lerp(paddleRef.current.rotation.z, 0, delta * 9);
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, PLAYER_START_Z]}>

      {/* Body */}
      <mesh ref={bodyRef} position={[0, 1.0, 0]} castShadow>
        <capsuleGeometry args={[0.28, 0.9, 8, 16]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.7} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.85, 0]} castShadow>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.6} />
      </mesh>

      {/* Cap */}
      <mesh position={[0, 2.0, -0.05]} rotation={[0.2, 0, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.08, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#1e40af" roughness={0.5} />
      </mesh>

      {/* Toss arm (left) — raises during serve */}
      <group ref={tossArmRef} position={[-0.38, 1.45, 0]}>
        <mesh rotation={[0, 0, 0.3]}>
          <capsuleGeometry args={[0.08, 0.5, 4, 8]} />
          <meshStandardMaterial color="#3b82f6" roughness={0.7} />
        </mesh>
        {/* Hand */}
        <mesh position={[-0.12, 0.3, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color="#fbbf24" roughness={0.7} />
        </mesh>
      </group>

      {/* Paddle arm (right) */}
      <mesh position={[0.38, 1.2, 0]} rotation={[0, 0, -0.4]} castShadow>
        <capsuleGeometry args={[0.08, 0.5, 4, 8]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.7} />
      </mesh>

      {/* Paddle group */}
      <group ref={paddleRef} position={[0.5, 1.15, -0.2]}>
        {/* Handle */}
        <mesh rotation={[0.3, 0, 0.2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.45, 8]} />
          <meshStandardMaterial color="#78350f" roughness={0.8} />
        </mesh>
        {/* Face */}
        <mesh position={[0.05, 0.35, -0.05]} rotation={[0.3, 0.1, 0.2]} castShadow>
          <boxGeometry args={[0.5, 0.6, 0.04]} />
          <meshStandardMaterial color="#16a34a" roughness={0.5} metalness={0.1} />
        </mesh>
        {/* Edge */}
        <mesh position={[0.05, 0.35, -0.05]} rotation={[0.3, 0.1, 0.2]}>
          <boxGeometry args={[0.52, 0.62, 0.02]} />
          <meshStandardMaterial color="#15803d" roughness={0.6} />
        </mesh>
        {/* Grip */}
        <mesh position={[0, -0.05, 0]} rotation={[0.3, 0, 0.2]}>
          <cylinderGeometry args={[0.055, 0.055, 0.25, 8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.9} />
        </mesh>
      </group>

      {/* Legs */}
      <mesh position={[-0.15, 0.35, 0]} castShadow>
        <capsuleGeometry args={[0.1, 0.5, 4, 8]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.8} />
      </mesh>
      <mesh position={[0.15, 0.35, 0]} castShadow>
        <capsuleGeometry args={[0.1, 0.5, 4, 8]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.8} />
      </mesh>

      {/* Shoes */}
      <mesh position={[-0.15, 0.07, 0.08]}>
        <boxGeometry args={[0.2, 0.12, 0.38]} />
        <meshStandardMaterial color="#ffffff" roughness={0.7} />
      </mesh>
      <mesh position={[0.15, 0.07, 0.08]}>
        <boxGeometry args={[0.2, 0.12, 0.38]} />
        <meshStandardMaterial color="#ffffff" roughness={0.7} />
      </mesh>

    </group>
  );
});

export default Player;
export { PLAYER_START_Z, PADDLE_REACH, HIT_COOLDOWN };
