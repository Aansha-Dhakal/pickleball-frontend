import { useRef } from 'react';
import * as THREE from 'three';

// Real pickleball court: 20ft wide x 44ft long
// 1 Three.js unit = 1 foot
const COURT_W = 20;
const COURT_L = 44;
const NET_H = 0.98; // 36 inches at posts, 34 at center (~3ft)
const KITCHEN_DEPTH = 7; // 7ft from net each side
const LINE_W = 0.15;
const LINE_H = 0.02;

function CourtLine({ position, scale }) {
  return (
    <mesh position={position} scale={scale} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#ffffff" />
    </mesh>
  );
}

function NetPost({ x }) {
  return (
    <group position={[x, 0, 0]}>
      {/* Post */}
      <mesh position={[0, NET_H / 2 + 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, NET_H + 0.2, 8]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Base */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 0.1, 8]} />
        <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Net() {
  const netSegments = 24;
  const segmentWidth = COURT_W / netSegments;

  return (
    <group position={[0, 0, 0]}>
      {/* Net posts */}
      <NetPost x={-COURT_W / 2 - 0.3} />
      <NetPost x={COURT_W / 2 + 0.3} />

      {/* Top net band */}
      <mesh position={[0, NET_H, 0]} castShadow>
        <boxGeometry args={[COURT_W + 0.6, 0.08, 0.05]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>

      {/* Net mesh — vertical strands */}
      {Array.from({ length: netSegments + 1 }).map((_, i) => (
        <mesh
          key={`v-${i}`}
          position={[
            -COURT_W / 2 + i * segmentWidth,
            NET_H / 2,
            0,
          ]}
        >
          <boxGeometry args={[0.02, NET_H, 0.02]} />
          <meshStandardMaterial color="#cbd5e1" transparent opacity={0.7} />
        </mesh>
      ))}

      {/* Net mesh — horizontal strands */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh
          key={`h-${i}`}
          position={[0, (i + 1) * (NET_H / 9), 0]}
        >
          <boxGeometry args={[COURT_W, 0.02, 0.02]} />
          <meshStandardMaterial color="#cbd5e1" transparent opacity={0.5} />
        </mesh>
      ))}

      {/* Bottom net anchor */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[COURT_W + 0.6, 0.04, 0.05]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
    </group>
  );
}

export default function Court() {
  return (
    <group>
      {/* ── MAIN COURT SURFACE ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[COURT_W, COURT_L]} />
        <meshStandardMaterial color="#1e40af" roughness={0.8} metalness={0.0} />
      </mesh>

      {/* ── KITCHEN ZONES (NVZ) ── */}
      {/* Player side kitchen (near, positive Z) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, KITCHEN_DEPTH / 2 + 0.01]} receiveShadow>
        <planeGeometry args={[COURT_W, KITCHEN_DEPTH]} />
        <meshStandardMaterial color="#166534" roughness={0.8} />
      </mesh>

      {/* AI side kitchen (far, negative Z) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, -(KITCHEN_DEPTH / 2 + 0.01)]} receiveShadow>
        <planeGeometry args={[COURT_W, KITCHEN_DEPTH]} />
        <meshStandardMaterial color="#166534" roughness={0.8} />
      </mesh>

      {/* ── OUTER BOUNDARY LINES ── */}
      {/* Far baseline (AI side) */}
      <CourtLine position={[0, LINE_H / 2, -COURT_L / 2]} scale={[COURT_W, LINE_H, LINE_W]} />
      {/* Near baseline (Player side) */}
      <CourtLine position={[0, LINE_H / 2, COURT_L / 2]} scale={[COURT_W, LINE_H, LINE_W]} />
      {/* Left sideline */}
      <CourtLine position={[-COURT_W / 2, LINE_H / 2, 0]} scale={[LINE_W, LINE_H, COURT_L]} />
      {/* Right sideline */}
      <CourtLine position={[COURT_W / 2, LINE_H / 2, 0]} scale={[LINE_W, LINE_H, COURT_L]} />

      {/* ── KITCHEN LINES (NVZ boundaries) ── */}
      {/* Player side kitchen line */}
      <CourtLine position={[0, LINE_H / 2, KITCHEN_DEPTH]} scale={[COURT_W, LINE_H, LINE_W]} />
      {/* AI side kitchen line */}
      <CourtLine position={[0, LINE_H / 2, -KITCHEN_DEPTH]} scale={[COURT_W, LINE_H, LINE_W]} />

      {/* ── CENTER SERVICE LINES ── */}
      {/* Player side center line */}
      <CourtLine
        position={[0, LINE_H / 2, (COURT_L / 2 + KITCHEN_DEPTH) / 2]}
        scale={[LINE_W, LINE_H, COURT_L / 2 - KITCHEN_DEPTH]}
      />
      {/* AI side center line */}
      <CourtLine
        position={[0, LINE_H / 2, -(COURT_L / 2 + KITCHEN_DEPTH) / 2]}
        scale={[LINE_W, LINE_H, COURT_L / 2 - KITCHEN_DEPTH]}
      />

      {/* ── THE NET ── */}
      <Net />

      {/* ── SURROUNDINGS ── */}
      {/* Ground plane outside court */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#0f172a" roughness={1} />
      </mesh>

      {/* Side walls / crowd area feel */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} receiveShadow>
        <planeGeometry args={[40, 60]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>

      {/* ── COURT LABEL: KITCHEN ── */}
      {/* Visual markers using thin colored strips */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.003, side * (KITCHEN_DEPTH / 2)]}
        >
          <planeGeometry args={[COURT_W - 0.5, KITCHEN_DEPTH - 0.3]} />
          <meshStandardMaterial
            color="#14532d"
            transparent
            opacity={0.4}
            roughness={0.9}
          />
        </mesh>
      ))}
    </group>
  );
}

export { COURT_W, COURT_L, NET_H, KITCHEN_DEPTH };
