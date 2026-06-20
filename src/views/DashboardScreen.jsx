import { useMemo, useEffect, useRef, useState } from 'react';
import AppIcon from './AppIcon';

const API = import.meta.env.VITE_API_URL || 'https://pickleball-backend-h86y.onrender.com';

// ── TOKENS ────────────────────────────────────────────────────────
const C = {
  bg:      '#07090C',
  panel:   '#11161A',
  panel2:  '#161D22',
  border:  'rgba(255,255,255,0.06)',
  lime:    '#B6FF2E',
  lime2:   '#93E52D',
  white:   '#FFFFFF',
  muted:   '#9EA7AE',
  danger:  '#FF6B4A',
  warning: '#FFD43B',
  success: '#7CFF65',
  blue:    '#4EA8FF',
};

const card = (extra = {}) => ({
  background: C.panel,
  borderRadius: '20px',
  border: `1px solid ${C.border}`,
  boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
  padding: '24px',
  ...extra,
});

// ── HELPERS ───────────────────────────────────────────────────────
function avg(arr) { return arr.length ? arr.reduce((a,b) => a+b,0)/arr.length : 0; }

function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target]);
  return val;
}

// ── KPI CARD ─────────────────────────────────────────────────────
function KpiCard({ label, icon, value, footer, footerColor = C.lime, delay = 0 }) {
  const num = useCountUp(typeof value === 'number' ? value : 0, 1000);
  const display = typeof value === 'number' ? num : value;
  return (
    <div style={{
      ...card(),
      height: '130px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      animation: `fadeUp 0.5s ease ${delay}ms both`,
      transition: 'all 0.2s ease',
      cursor: 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 16px 48px rgba(0,0,0,0.45), 0 0 24px rgba(182,255,46,0.08)`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.35)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ color: C.muted, fontSize: '11px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'Inter,sans-serif' }}>
          {label}
        </div>
        <div style={{ fontSize: '22px' }}>{icon}</div>
      </div>
      <div style={{ fontFamily: "'Space Grotesk',monospace", fontSize: '40px', fontWeight: 700, color: C.white, lineHeight: 1 }}>
        {display}
        {typeof value === 'string' && value.includes('ms') && <span style={{ fontSize: '20px', color: C.muted, marginLeft: '4px' }}>ms</span>}
      </div>
      <div style={{ color: footerColor, fontSize: '12px', fontFamily: 'Inter,sans-serif', fontWeight: 500 }}>{footer}</div>
    </div>
  );
}

// ── SHOT HEATMAP ─────────────────────────────────────────────────
function ShotHeatmap({ shots }) {
  const W = 340, H = 220, PAD = 16;
  const CW = 20, CL = 44;

  const toSvg = (x, z) => ({
    sx: PAD + ((x + CW/2) / CW) * (W - PAD*2),
    sy: PAD + ((z + CL/2) / CL) * (H - PAD*2),
  });

  return (
    <svg width={W} height={H} style={{ display: 'block', borderRadius: '12px', overflow: 'hidden' }}>
      {/* Court */}
      <rect width={W} height={H} fill="#0a1f12" rx="12"/>
      {/* Kitchen zones */}
      <rect x={PAD} y={PAD} width={(W-PAD*2)/2} height={(H-PAD*2)*7/44} fill="rgba(30,80,40,0.6)"/>
      <rect x={PAD} y={H-PAD-(H-PAD*2)*7/44} width={(W-PAD*2)/2} height={(H-PAD*2)*7/44} fill="rgba(30,80,40,0.6)"/>
      <rect x={(W)/2} y={PAD} width={(W-PAD*2)/2} height={(H-PAD*2)*7/44} fill="rgba(30,80,40,0.6)"/>
      <rect x={(W)/2} y={H-PAD-(H-PAD*2)*7/44} width={(W-PAD*2)/2} height={(H-PAD*2)*7/44} fill="rgba(30,80,40,0.6)"/>
      {/* Court lines */}
      <rect x={PAD} y={PAD} width={W-PAD*2} height={H-PAD*2} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" rx="4"/>
      {/* Net */}
      <line x1={PAD} y1={H/2} x2={W-PAD} y2={H/2} stroke="rgba(255,255,255,0.5)" strokeWidth="2"/>
      {/* Center lines */}
      <line x1={W/2} y1={PAD} x2={W/2} y2={H/2-(H-PAD*2)*7/44} stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
      <line x1={W/2} y1={H/2+(H-PAD*2)*7/44} x2={W/2} y2={H-PAD} stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
      {/* Kitchen boundary lines */}
      <line x1={PAD} y1={PAD+(H-PAD*2)*7/44} x2={W-PAD} y2={PAD+(H-PAD*2)*7/44} stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
      <line x1={PAD} y1={H-PAD-(H-PAD*2)*7/44} x2={W-PAD} y2={H-PAD-(H-PAD*2)*7/44} stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
      {/* Shot dots */}
      {shots.map((s, i) => {
        const { sx, sy } = toSvg(s.pos_x || 0, s.pos_z || 0);
        const isPlayer = s.striker_or_culprit === 'PLAYER';
        const color = isPlayer ? C.lime : C.danger;
        return (
          <g key={i} style={{ animation: `dotPop 0.3s ease ${i*20}ms both` }}>
            <circle cx={sx} cy={sy} r={7} fill={color} opacity={0.15}/>
            <circle cx={sx} cy={sy} r={4} fill={color} opacity={0.85}/>
            <circle cx={sx} cy={sy} r={2} fill={color}/>
          </g>
        );
      })}
      {/* Labels */}
      <text x={W/2} y={H-4} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="8" fontFamily="Inter,sans-serif" letterSpacing="2">PLAYER SIDE</text>
      <text x={W/2} y={PAD+8} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="8" fontFamily="Inter,sans-serif" letterSpacing="2">AI SIDE</text>
    </svg>
  );
}

// ── REACTION TIME CHART ───────────────────────────────────────────
function ReactionChart({ data }) {
  const pathRef = useRef(null);
  const W = 460, H = 160, PAD = 32;

  useEffect(() => {
    if (!pathRef.current || !data.length) return;
    const len = pathRef.current.getTotalLength?.() || 1000;
    pathRef.current.style.strokeDasharray = len;
    pathRef.current.style.strokeDashoffset = len;
    pathRef.current.style.transition = 'stroke-dashoffset 1.2s ease';
    setTimeout(() => { if (pathRef.current) pathRef.current.style.strokeDashoffset = '0'; }, 100);
  }, [data]);

  if (!data.length) return <div style={{ color: C.muted, textAlign: 'center', padding: '40px' }}>No reaction data</div>;

  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = PAD + (i / Math.max(data.length-1,1)) * (W - PAD*2);
    const y = H - PAD - ((v - min) / range) * (H - PAD*2);
    return [x, y];
  });

  // Smooth curve using cubic bezier
  const d = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p[0]},${p[1]}`;
    const prev = pts[i-1];
    const cpx = (prev[0] + p[0]) / 2;
    return acc + ` C ${cpx},${prev[1]} ${cpx},${p[1]} ${p[0]},${p[1]}`;
  }, '');

  // Fill path
  const fillD = d + ` L ${pts[pts.length-1][0]},${H-PAD} L ${pts[0][0]},${H-PAD} Z`;

  // Y axis labels
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    val: Math.round(min + t * range),
    y: H - PAD - t * (H - PAD*2),
  }));

  const avgVal = Math.round(avg(data));
  const bestVal = Math.min(...data);
  const worstVal = Math.max(...data);

  return (
    <div>
      <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="reactionGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.lime} stopOpacity="0.25"/>
            <stop offset="100%" stopColor={C.lime} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {yLabels.map(l => (
          <g key={l.val}>
            <line x1={PAD} y1={l.y} x2={W-PAD} y2={l.y} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
            <text x={PAD-6} y={l.y+4} textAnchor="end" fill={C.muted} fontSize="9" fontFamily="'Space Grotesk',monospace">{l.val}</text>
          </g>
        ))}
        {/* Area fill */}
        <path d={fillD} fill="url(#reactionGrad)"/>
        {/* Line */}
        <path ref={pathRef} d={d} fill="none" stroke={C.lime} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Dots */}
        {pts.map(([x,y], i) => (
          <circle key={i} cx={x} cy={y} r={3} fill={C.lime} opacity={0.9}/>
        ))}
        {/* Axis labels */}
        <text x={PAD} y={H-4} fill={C.muted} fontSize="9" fontFamily="Inter,sans-serif">Start</text>
        <text x={W/2} y={H-4} textAnchor="middle" fill={C.muted} fontSize="9" fontFamily="Inter,sans-serif">Mid Match</text>
        <text x={W-PAD} y={H-4} textAnchor="end" fill={C.muted} fontSize="9" fontFamily="Inter,sans-serif">Latest</text>
      </svg>

      {/* Bottom metrics */}
      <div style={{ display: 'flex', gap: '32px', marginTop: '16px' }}>
        {[
          { label: 'Average', val: `${avgVal} ms`, color: C.white },
          { label: 'Best',    val: `${bestVal} ms`, badge: 'BEST', color: C.lime },
          { label: 'Worst',   val: `${worstVal} ms`, badge: 'WORST', color: C.danger },
        ].map(m => (
          <div key={m.label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ color: C.muted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.18em', fontFamily: 'Inter,sans-serif' }}>{m.label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: m.color, fontSize: '18px', fontWeight: 700, fontFamily: "'Space Grotesk',monospace" }}>{m.val}</span>
              {m.badge && (
                <span style={{ background: m.color+'22', color: m.color, border: `1px solid ${m.color}44`, fontSize: '9px', padding: '2px 6px', borderRadius: '999px', fontWeight: 700, letterSpacing: '0.1em' }}>
                  {m.badge}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── DONUT CHART ───────────────────────────────────────────────────
function ShotDonut({ drives, dinks, serves, lobs, total }) {
  const cx=70, cy=70, r=55, sw=16, circ=2*Math.PI*r;
  const segments = [
    { label:'Drives', val:drives, color:C.lime },
    { label:'Dinks',  val:dinks,  color:C.blue },
    { label:'Serves', val:serves, color:C.warning },
    { label:'Lobs',   val:lobs,   color:'#c084fc' },
  ].filter(s => s.val > 0);
  const tot = segments.reduce((a,s) => a+s.val, 0) || 1;
  let off = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
      <svg width={140} height={140}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw}/>
        {segments.map((s,i) => {
          const dash = (s.val/tot)*circ;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={s.color} strokeWidth={sw}
              strokeDasharray={`${dash} ${circ-dash}`}
              strokeDashoffset={-off*circ/tot}
              style={{ transform:'rotate(-90deg)', transformOrigin:'center', transition:'all 1s ease' }}
            />
          );
          off += s.val;
          return el;
        })}
        <text x={cx} y={cy-8} textAnchor="middle" fill={C.white} fontSize="22" fontWeight="700" fontFamily="'Space Grotesk',monospace">100%</text>
        <text x={cx} y={cy+8} textAnchor="middle" fill={C.muted} fontSize="9" fontFamily="Inter,sans-serif">Total</text>
        <text x={cx} y={cy+20} textAnchor="middle" fill={C.muted} fontSize="9" fontFamily="Inter,sans-serif">Shots</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {segments.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: s.color, flexShrink:0 }}/>
            <span style={{ color: C.muted, fontSize: '12px', fontFamily: 'Inter,sans-serif', flex: 1 }}>{s.label}</span>
            <span style={{ color: C.white, fontSize: '12px', fontWeight: 700, fontFamily: "'Space Grotesk',monospace" }}>
              {Math.round(s.val/tot*100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── FAULT BARS ────────────────────────────────────────────────────
function FaultBars({ faults }) {
  const types = [
    { key:'MISSED_SHOT',        label:'Missed Shot',    color:C.danger },
    { key:'NET_HIT',            label:'Net Fault',      color:C.warning },
    { key:'OUT_OF_BOUNDS',      label:'Out of Bounds',  color:C.blue },
    { key:'KITCHEN_VIOLATION',  label:'Kitchen Fault',  color:C.success },
  ];
  const counts = {};
  faults.forEach(f => { counts[f.fault_reason] = (counts[f.fault_reason]||0)+1; });
  const max = Math.max(...types.map(t => counts[t.key]||0), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {types.map(t => {
        const count = counts[t.key] || 0;
        const pct = Math.round((count/max)*100);
        return (
          <div key={t.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: C.muted, fontSize: '12px', fontFamily: 'Inter,sans-serif' }}>{t.label}</span>
              <span style={{ color: C.white, fontSize: '12px', fontWeight: 700, fontFamily: "'Space Grotesk',monospace" }}>{count}</span>
            </div>
            <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '999px',
                background: t.color,
                width: `${pct}%`,
                boxShadow: `0 0 8px ${t.color}88`,
                transition: 'width 1s ease',
              }}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── ACCURACY GAUGE ────────────────────────────────────────────────
function AccuracyGauge({ pct }) {
  const R = 60, cx = 80, cy = 80;
  const angle = (pct/100) * 270;
  const startAngle = 135;
  const toRad = d => (d * Math.PI) / 180;
  const arc = (a) => [
    cx + R * Math.cos(toRad(a)),
    cy + R * Math.sin(toRad(a)),
  ];
  const endAngle = startAngle + angle;
  const large = angle > 180 ? 1 : 0;
  const [sx, sy] = arc(startAngle);
  const [ex, ey] = arc(endAngle);
  const [bx, by] = arc(startAngle);
  const [be2x, be2y] = arc(startAngle + 270);

  const display = useCountUp(pct, 1400);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={160} height={120} style={{ overflow: 'visible' }}>
        {/* Track */}
        <path d={`M ${arc(135)[0]},${arc(135)[1]} A ${R} ${R} 0 1 1 ${arc(135+270)[0]},${arc(135+270)[1]}`}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" strokeLinecap="round"/>
        {/* Fill */}
        {pct > 0 && (
          <path d={`M ${sx},${sy} A ${R} ${R} 0 ${large} 1 ${ex},${ey}`}
            fill="none" stroke={C.lime} strokeWidth="14" strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${C.lime}88)` }}/>
        )}
        {/* Labels */}
        <text x={arc(135)[0]-4} y={arc(135)[1]+14} fill={C.muted} fontSize="9" textAnchor="middle" fontFamily="'Space Grotesk',monospace">0%</text>
        <text x={arc(405)[0]+4} y={arc(405)[1]+14} fill={C.muted} fontSize="9" textAnchor="middle" fontFamily="'Space Grotesk',monospace">100%</text>
        {/* Center */}
        <text x={cx} y={cy+4} textAnchor="middle" fill={C.white} fontSize="28" fontWeight="700" fontFamily="'Space Grotesk',monospace">{display}%</text>
        <text x={cx} y={cy+18} textAnchor="middle" fill={C.muted} fontSize="9" fontFamily="Inter,sans-serif">Shot Accuracy</text>
      </svg>
    </div>
  );
}

// ── TIMELINE ─────────────────────────────────────────────────────
function MatchTimeline({ events }) {
  const nodes = events.length > 0 ? events : [
    { icon:'🎯', label:'Serve',      time:'0:00' },
    { icon:'🏃', label:'Long Rally', time:'2:14' },
    { icon:'⚠️', label:'Fault',      time:'5:23' },
    { icon:'🏆', label:'Winner',     time:'7:48' },
    { icon:'⏸',  label:'Timeout',   time:'12:10' },
    { icon:'🏁', label:'Match End',  time:'15:42' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0', overflowX: 'auto', paddingBottom: '8px' }}>
      {nodes.map((n, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: '80px' }}>
            {/* Node */}
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: C.panel2, border: `1.5px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', marginBottom: '8px',
              boxShadow: `0 0 0 4px rgba(182,255,46,0.05)`,
            }}>{n.icon}</div>
            <div style={{ color: C.muted, fontSize: '10px', fontFamily: 'monospace', marginBottom: '2px' }}>{n.time}</div>
            <div style={{ color: C.white, fontSize: '11px', fontFamily: 'Inter,sans-serif', fontWeight: 500, textAlign: 'center' }}>{n.label}</div>
          </div>
          {/* Connector */}
          {i < nodes.length-1 && (
            <div style={{ width: '100%', height: '2px', background: `linear-gradient(to right, ${C.lime}60, ${C.lime}20)`, marginTop: '21px', flex: 2 }}/>
          )}
        </div>
      ))}
    </div>
  );
}

// ── SESSION STAT TILE ─────────────────────────────────────────────
function StatTile({ icon, label, value, unit }) {
  return (
    <div style={{
      background: C.panel2, borderRadius: '16px', border: `1px solid ${C.border}`,
      padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '6px', cursor: 'default', transition: 'all 0.2s ease',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.background = C.panel; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.background = C.panel2; }}
    >
      <div style={{ fontSize: '20px' }}>{icon}</div>
      <div style={{ fontFamily: "'Space Grotesk',monospace", fontSize: '22px', fontWeight: 700, color: C.white }}>{value}</div>
      {unit && <div style={{ color: C.lime, fontSize: '10px', fontFamily: "'Space Grotesk',monospace", fontWeight: 500 }}>{unit}</div>}
      <div style={{ color: C.muted, fontSize: '10px', fontFamily: 'Inter,sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center' }}>{label}</div>
    </div>
  );
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────
export default function DashboardScreen({ data, matchId, difficulty, onRestart, onHistory, fromHistory }) {

  const stats = useMemo(() => {
    if (!data?.length) return null;
    const shots  = data.filter(e => e.event_type === 'SHOT');
    const faults = data.filter(e => e.event_type === 'FAULT');
    const playerShots = shots.filter(e => e.striker_or_culprit === 'PLAYER');
    const aiShots     = shots.filter(e => e.striker_or_culprit === 'AI');
    const playerFaults = faults.filter(e => e.striker_or_culprit === 'PLAYER');
    const reactionTimes = playerShots.map(e => e.reaction_time_ms).filter(v => v && v > 0 && v < 8000);
    const accuracy = shots.length > 0 ? Math.round((playerShots.length / shots.length) * 100) : 0;
    const drives = playerShots.filter(e => e.shot_type === 'DRIVE').length;
    const dinks  = playerShots.filter(e => e.shot_type === 'DINK').length;
    const serves = playerShots.filter(e => e.shot_type === 'SERVE').length;
    const lobs   = playerShots.filter(e => e.shot_type === 'LOB').length;
    const avgReaction = reactionTimes.length ? Math.round(avg(reactionTimes)) : 0;
    const bestReaction = reactionTimes.length ? Math.min(...reactionTimes) : 0;
    return {
      totalShots: playerShots.length,
      aiShots: aiShots.length,
      totalFaults: playerFaults.length,
      avgReaction, bestReaction,
      totalEvents: data.length,
      accuracy, drives, dinks, serves, lobs,
      reactionTimes,
      allShots: shots,
      playerFaults,
    };
  }, [data]);

  const handleExportCSV = () => {
    window.open(`${API}/api/export-csv?match_id=${matchId}`, '_blank');
  };

  if (!stats) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontFamily: 'Inter,sans-serif' }}>
      No match data available.
    </div>
  );

  const sessionDate = new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div style={{
      background: `radial-gradient(circle at top center, rgba(182,255,46,0.06), transparent 45%), linear-gradient(180deg, #07090C, #090D12)`,
      minHeight: '100vh', color: C.white,
      fontFamily: 'Inter, sans-serif',
      paddingBottom: '48px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
        @keyframes dotPop { from { opacity:0; transform:scale(0); } to { opacity:1; transform:scale(1); } }
        @keyframes drawIn { from { stroke-dashoffset: 1000; } to { stroke-dashoffset: 0; } }
      `}</style>

      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '40px 48px' }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', animation: 'fadeUp 0.4s ease both' }}>
          <div>
            <div style={{ color: C.lime, fontSize: '11px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '6px', display:'flex', alignItems:'center', gap:'8px' }}>
              <AppIcon size={20}/>
              Post-Match Analytics
            </div>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '48px', letterSpacing: '-0.02em', color: C.white, lineHeight: 1 }}>
              Match Report
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: C.muted, fontSize: '13px' }}>
              <span>Session #{matchId?.replace('match_','')}</span>
              <span style={{ color: C.border }}>•</span>
              <span style={{ textTransform: 'capitalize' }}>{difficulty} Difficulty</span>
              <span style={{ color: C.border }}>•</span>
              <span>Today {sessionDate}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button onClick={handleExportCSV}
              style={{ padding: '10px 18px', borderRadius: '14px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.04)', color: C.muted, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter,sans-serif', backdropFilter: 'blur(8px)', transition: 'all 0.2s ease', display:'flex', alignItems:'center', gap:'6px' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.15)';e.currentTarget.style.color=C.white;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}
            >
              ↓ Export CSV
            </button>
            <button onClick={onHistory}
              style={{ padding: '10px 18px', borderRadius: '14px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.04)', color: C.muted, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter,sans-serif', backdropFilter: 'blur(8px)', transition: 'all 0.2s ease' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.15)';e.currentTarget.style.color=C.white;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}
            >
              View History
            </button>
            {!fromHistory && (
              <button onClick={onRestart}
                style={{ padding: '10px 24px', borderRadius: '14px', border: 'none', background: `linear-gradient(135deg, #C7FF34, #A9E928)`, color: '#07090C', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter,sans-serif', boxShadow: '0 0 24px rgba(182,255,46,0.3)', transition: 'all 0.2s ease', display:'flex', alignItems:'center', gap:'8px' }}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 0 32px rgba(182,255,46,0.45)';}}
                onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 0 24px rgba(182,255,46,0.3)';}}
              >
                Play Again →
              </button>
            )}
          </div>
        </div>

        {/* ── KPI CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
          <KpiCard label="Your Shots"   icon="🎯" value={stats.totalShots}  footer={`AI fired ${stats.aiShots} shots`}         delay={0}/>
          <KpiCard label="Faults"       icon="⚠️" value={stats.totalFaults} footer={stats.totalFaults <= 3 ? 'Excellent discipline' : 'Work on consistency'} footerColor={stats.totalFaults <= 3 ? C.lime : C.danger} delay={80}/>
          <KpiCard label="Avg Reaction" icon="⚡" value={`${stats.avgReaction}`} footer={`Best: ${stats.bestReaction} ms`} footerColor={C.warning} delay={160}/>
          <KpiCard label="Total Events" icon="📈" value={stats.totalEvents}  footer="Shots + Faults logged" footerColor={C.blue} delay={240}/>
        </div>

        {/* ── MAIN ANALYTICS ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {/* Heatmap */}
          <div style={{ ...card(), animation: 'fadeUp 0.5s ease 0.15s both' }}>
            <div style={{ marginBottom: '4px', color: C.muted, fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Shot Placement Heatmap</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginBottom: '16px' }}>Where each rally landed during the match</div>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              <ShotHeatmap shots={stats.allShots}/>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '12px' }}>
                {[
                  { color: C.lime,   label: 'Your Shots', count: stats.totalShots },
                  { color: C.danger, label: 'AI Shots',   count: stats.aiShots },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: l.color, boxShadow: `0 0 6px ${l.color}88`, flexShrink: 0 }}/>
                    <div>
                      <div style={{ color: C.white, fontSize: '12px', fontFamily: 'Inter,sans-serif' }}>{l.label}</div>
                      <div style={{ color: C.muted, fontSize: '11px', fontFamily: "'Space Grotesk',monospace", fontWeight: 700 }}>{l.count}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Reaction chart */}
          <div style={{ ...card(), animation: 'fadeUp 0.5s ease 0.2s both' }}>
            <div style={{ marginBottom: '4px', color: C.muted, fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Reaction Time Over Match</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginBottom: '16px' }}>Time between AI hit → your response (ms)</div>
            <ReactionChart data={stats.reactionTimes}/>
          </div>
        </div>

        {/* ── SECOND ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {/* Shot Breakdown */}
          <div style={{ ...card(), animation: 'fadeUp 0.5s ease 0.25s both' }}>
            <div style={{ color: C.muted, fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '16px' }}>Shot Breakdown</div>
            <ShotDonut drives={stats.drives} dinks={stats.dinks} serves={stats.serves} lobs={stats.lobs} total={stats.totalShots}/>
          </div>

          {/* Fault Breakdown */}
          <div style={{ ...card(), animation: 'fadeUp 0.5s ease 0.3s both' }}>
            <div style={{ color: C.muted, fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '16px' }}>Fault Breakdown</div>
            <FaultBars faults={stats.playerFaults}/>
          </div>

          {/* AI Coach */}
          <div style={{ ...card(), animation: 'fadeUp 0.5s ease 0.35s both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ fontSize: '20px' }}>🤖</span>
              <span style={{ color: C.muted, fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase' }}>AI Coach Summary</span>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              {[
                stats.drives > stats.dinks ? 'Strong drive consistency.' : 'Good dink game shown.',
                stats.bestReaction < 800 ? 'Lightning fast reactions at times.' : 'Solid reaction time throughout.',
                stats.totalFaults > 3 ? 'Some errors near the kitchen line.' : 'Excellent fault discipline.',
              ].map((tip, i) => (
                <li key={i} style={{ display: 'flex', gap: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontFamily: 'Inter,sans-serif', lineHeight: 1.5 }}>
                  <span style={{ color: C.lime, flexShrink: 0, marginTop: '2px' }}>•</span>
                  {tip}
                </li>
              ))}
            </ul>
            <div style={{ background: 'rgba(182,255,46,0.08)', border: `1px solid rgba(182,255,46,0.2)`, borderRadius: '12px', padding: '10px 12px', display:'flex', gap:'8px', alignItems:'flex-start' }}>
              <span style={{ fontSize: '14px', flexShrink: 0 }}>💡</span>
              <div>
                <div style={{ color: C.lime, fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '3px' }}>Recommendation</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', lineHeight: 1.5 }}>
                  {stats.dinks < 3 ? 'Practice cross-court dinks and transition shots.' : 'Focus on attacking from the baseline more often.'}
                </div>
              </div>
            </div>
          </div>

          {/* Accuracy Gauge */}
          <div style={{ ...card(), animation: 'fadeUp 0.5s ease 0.4s both', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: C.muted, fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '16px', alignSelf: 'flex-start' }}>Shot Accuracy</div>
            <AccuracyGauge pct={stats.accuracy}/>
          </div>
        </div>

        {/* ── BOTTOM ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Timeline */}
          <div style={{ ...card(), animation: 'fadeUp 0.5s ease 0.45s both' }}>
            <div style={{ color: C.muted, fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '20px' }}>Match Timeline</div>
            <MatchTimeline events={[]}/>
          </div>

          {/* Session stats */}
          <div style={{ ...card(), animation: 'fadeUp 0.5s ease 0.5s both' }}>
            <div style={{ color: C.muted, fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '16px' }}>Session Statistics</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
              <StatTile icon="🎯" label="Your Shots"   value={stats.totalShots}/>
              <StatTile icon="🤖" label="AI Shots"     value={stats.aiShots}/>
              <StatTile icon="⚡" label="Best Reaction" value={stats.bestReaction} unit="ms"/>
              <StatTile icon="⚠️" label="Faults"       value={stats.totalFaults}/>
              <StatTile icon="🎾" label="Drives"        value={stats.drives}/>
              <StatTile icon="🏸" label="Dinks"         value={stats.dinks}/>
              <StatTile icon="🌙" label="Lobs"          value={stats.lobs}/>
              <StatTile icon="📊" label="Total Events"  value={stats.totalEvents}/>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
