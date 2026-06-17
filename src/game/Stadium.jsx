import * as THREE from 'three';

// Lightweight outdoor night stadium — no heavy geometry, pure atmosphere
export default function Stadium() {
  return (
    <group>

      {/* ── GROUND PLANE ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#0a0f1a" roughness={1} />
      </mesh>

      {/* Court surround — dark rubberized look */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <planeGeometry args={[36, 58]} />
        <meshStandardMaterial color="#111827" roughness={0.95} />
      </mesh>

      {/* ── 4 STADIUM LIGHT POLES (just poles + point lights, no geometry crowd) ── */}
      {[[-13, -20], [13, -20], [-13, 20], [13, 20]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          {/* Pole */}
          <mesh position={[0, 7, 0]}>
            <cylinderGeometry args={[0.12, 0.18, 14, 6]} />
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Arm */}
          <mesh position={[x > 0 ? -0.8 : 0.8, 13.5, 0]} rotation={[0, 0, x > 0 ? 0.3 : -0.3]}>
            <cylinderGeometry args={[0.07, 0.07, 2, 6]} />
            <meshStandardMaterial color="#334155" metalness={0.6} />
          </mesh>
          {/* Light housing */}
          <mesh position={[x > 0 ? -1.4 : 1.4, 13.8, 0]}>
            <boxGeometry args={[0.8, 0.3, 0.5]} />
            <meshStandardMaterial color="#1e293b" metalness={0.5} />
          </mesh>
          {/* Actual light */}
          <pointLight
            position={[x > 0 ? -1.4 : 1.4, 13.5, 0]}
            intensity={1.8}
            color="#fffbeb"
            distance={55}
            decay={1.4}
          />
          {/* Lens glow */}
          <mesh position={[x > 0 ? -1.4 : 1.4, 13.9, 0.25]}>
            <sphereGeometry args={[0.18, 8, 8]} />
            <meshStandardMaterial color="#fef9c3" emissive="#fef9c3" emissiveIntensity={3} />
          </mesh>
        </group>
      ))}

      {/* ── LOW PERIMETER FENCE / BARRIER ── */}
      {/* Left barrier */}
      <mesh position={[-12.5, 0.5, 0]}>
        <boxGeometry args={[0.25, 1, 50]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.8} metalness={0.2} />
      </mesh>
      {/* Right barrier */}
      <mesh position={[12.5, 0.5, 0]}>
        <boxGeometry args={[0.25, 1, 50]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.8} metalness={0.2} />
      </mesh>
      {/* Far end barrier */}
      <mesh position={[0, 0.5, -25]}>
        <boxGeometry args={[26, 1, 0.25]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.8} metalness={0.2} />
      </mesh>
      {/* Near end barrier — lower so player can see over it */}
      <mesh position={[0, 0.3, 25]}>
        <boxGeometry args={[26, 0.6, 0.25]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* ── DISTANT CROWD GLOW — fake ambient crowd with colored fog planes ── */}
      {/* Left stand glow */}
      <mesh position={[-18, 4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[50, 8]} />
        <meshStandardMaterial
          color="#1d4ed8"
          emissive="#1e40af"
          emissiveIntensity={0.25}
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Right stand glow */}
      <mesh position={[18, 4, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[50, 8]} />
        <meshStandardMaterial
          color="#dc2626"
          emissive="#b91c1c"
          emissiveIntensity={0.25}
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Far end stand glow */}
      <mesh position={[0, 4, -28]} rotation={[0, 0, 0]}>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial
          color="#7c3aed"
          emissive="#6d28d9"
          emissiveIntensity={0.2}
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* ── SIMPLIFIED CROWD SILHOUETTES (billboards, very cheap) ── */}
      {/* Left side crowd row */}
      {Array.from({ length: 12 }).map((_, i) => {
        const z = -22 + i * 4;
        return (
          <group key={`lc-${i}`} position={[-15, 1.8, z]}>
            <mesh rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[0.5, 1.4]} />
              <meshStandardMaterial
                color={['#1d4ed8','#dc2626','#16a34a','#ca8a04','#7c3aed'][i % 5]}
                emissive={['#1e40af','#b91c1c','#15803d','#b45309','#6d28d9'][i % 5]}
                emissiveIntensity={0.4}
                side={THREE.DoubleSide}
                transparent opacity={0.85}
              />
            </mesh>
            {/* Head */}
            <mesh position={[0, 0.85, 0]}>
              <sphereGeometry args={[0.18, 6, 6]} />
              <meshStandardMaterial
                color={['#fbbf24','#f87171','#86efac','#fde68a','#c4b5fd'][i % 5]}
                emissive={['#d97706','#dc2626','#16a34a','#d97706','#7c3aed'][i % 5]}
                emissiveIntensity={0.3}
              />
            </mesh>
          </group>
        );
      })}

      {/* Right side crowd row */}
      {Array.from({ length: 12 }).map((_, i) => {
        const z = -22 + i * 4;
        return (
          <group key={`rc-${i}`} position={[15, 1.8, z]}>
            <mesh rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[0.5, 1.4]} />
              <meshStandardMaterial
                color={['#7c3aed','#0891b2','#be185d','#1d4ed8','#dc2626'][i % 5]}
                emissive={['#6d28d9','#0e7490','#9d174d','#1e40af','#b91c1c'][i % 5]}
                emissiveIntensity={0.4}
                side={THREE.DoubleSide}
                transparent opacity={0.85}
              />
            </mesh>
            <mesh position={[0, 0.85, 0]}>
              <sphereGeometry args={[0.18, 6, 6]} />
              <meshStandardMaterial
                color={['#fbbf24','#f87171','#86efac','#fde68a','#c4b5fd'][i % 5]}
                emissive={['#d97706','#dc2626','#16a34a','#d97706','#7c3aed'][i % 5]}
                emissiveIntensity={0.3}
              />
            </mesh>
          </group>
        );
      })}

      {/* Far end crowd row */}
      {Array.from({ length: 8 }).map((_, i) => {
        const x = -14 + i * 4;
        return (
          <group key={`fc-${i}`} position={[x, 1.8, -26]}>
            <mesh>
              <planeGeometry args={[0.5, 1.4]} />
              <meshStandardMaterial
                color={['#1d4ed8','#dc2626','#16a34a','#ca8a04'][i % 4]}
                emissive={['#1e40af','#b91c1c','#15803d','#b45309'][i % 4]}
                emissiveIntensity={0.4}
                side={THREE.DoubleSide}
                transparent opacity={0.85}
              />
            </mesh>
            <mesh position={[0, 0.85, 0]}>
              <sphereGeometry args={[0.18, 6, 6]} />
              <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={0.3} />
            </mesh>
          </group>
        );
      })}

      {/* ── SCOREBOARD (far end, simple + cheap) ── */}
      <group position={[0, 9, -27]}>
        <mesh>
          <boxGeometry args={[7, 2.5, 0.2]} />
          <meshStandardMaterial color="#0f172a" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.12]}>
          <boxGeometry args={[6.4, 2, 0.05]} />
          <meshStandardMaterial color="#1e3a5f" emissive="#1e40af" emissiveIntensity={0.5} />
        </mesh>
        {/* PICKLEBALL banner strip */}
        <mesh position={[0, 0.6, 0.15]}>
          <boxGeometry args={[5, 0.5, 0.02]} />
          <meshStandardMaterial color="#a3e635" emissive="#84cc16" emissiveIntensity={1.5} />
        </mesh>
        {/* Blue score panel */}
        <mesh position={[-1.5, -0.3, 0.15]}>
          <boxGeometry args={[1.8, 0.9, 0.02]} />
          <meshStandardMaterial color="#1d4ed8" emissive="#3b82f6" emissiveIntensity={1} />
        </mesh>
        {/* Red score panel */}
        <mesh position={[1.5, -0.3, 0.15]}>
          <boxGeometry args={[1.8, 0.9, 0.02]} />
          <meshStandardMaterial color="#dc2626" emissive="#ef4444" emissiveIntensity={1} />
        </mesh>
        {/* Support pole */}
        <mesh position={[0, -4, 0]}>
          <cylinderGeometry args={[0.15, 0.2, 8, 6]} />
          <meshStandardMaterial color="#334155" metalness={0.6} />
        </mesh>
        {/* Scoreboard point light */}
        <pointLight position={[0, 0, 2]} intensity={0.6} color="#a3e635" distance={15} />
      </group>

    </group>
  );
}
