import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const TRAIL_LENGTH = 10;  // number of trail segments
const TRAIL_INTERVAL = 0.018; // seconds between trail points

export default function BallTrail({ ballRef }) {
  const trailMeshes = useRef([]);
  const trailPositions = useRef([]);
  const lastCapture = useRef(0);

  useFrame((state) => {
    if (!ballRef?.current) return;

    const now = state.clock.elapsedTime;
    const ball = ballRef.current;

    if (!ball.isActive()) {
      // Hide all trail segments when ball is inactive
      trailMeshes.current.forEach(m => { if (m) m.visible = false; });
      trailPositions.current = [];
      return;
    }

    // Capture ball position at interval
    if (now - lastCapture.current > TRAIL_INTERVAL) {
      lastCapture.current = now;
      const pos = ball.getPosition();
      trailPositions.current.unshift(pos.clone());
      if (trailPositions.current.length > TRAIL_LENGTH) {
        trailPositions.current.pop();
      }
    }

    // Update each trail sphere
    trailMeshes.current.forEach((mesh, i) => {
      if (!mesh) return;
      const pos = trailPositions.current[i];
      if (!pos) {
        mesh.visible = false;
        return;
      }
      mesh.visible = true;
      mesh.position.copy(pos);

      // Fade out — older segments are smaller and more transparent
      const t = 1 - i / TRAIL_LENGTH;
      const scale = t * 0.9;
      mesh.scale.setScalar(scale);

      if (mesh.material) {
        mesh.material.opacity = t * 0.55;
      }
    });
  });

  return (
    <group>
      {Array.from({ length: TRAIL_LENGTH }).map((_, i) => {
        const t = 1 - i / TRAIL_LENGTH;
        // Color shifts from lime → yellow → orange as trail ages
        const color = new THREE.Color().setHSL(0.22 - i * 0.015, 1, 0.55);
        return (
          <mesh
            key={i}
            ref={el => (trailMeshes.current[i] = el)}
            visible={false}
          >
            <sphereGeometry args={[0.13, 6, 6]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.6}
              transparent
              opacity={0}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
