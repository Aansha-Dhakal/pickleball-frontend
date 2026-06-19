import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'https://pickleball-backend-h86y.onrender.com';

// ── TOKENS ────────────────────────────────────────────────────────
const C = {
  bg:     '#07090C',
  panel:  '#11161A',
  panel2: '#161D22',
  border: 'rgba(255,255,255,0.06)',
  lime:   '#B6FF2E',
  lime2:  '#93E52D',
  white:  '#FFFFFF',
  muted:  '#9EA7AE',
  danger: '#FF6B4A',
  warning:'#FFD43B',
  success:'#7CFF65',
  blue:   '#4EA8FF',
};

const card = (extra = {}) => ({
  background: C.panel,
  borderRadius: '20px',
  border: `1px solid ${C.border}`,
  boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
  padding: '24px',
  ...extra,
});

const DIFF_CONFIG = {
  easy:   { color: C.success, bg: 'rgba(124,255,101,0.1)',  border: 'rgba(124,255,101,0.25)' },
  medium: { color: C.lime,    bg: 'rgba(182,255,46,0.1)',   border: 'rgba(182,255,46,0.25)'  },
  hard:   { color: C.danger,  bg: 'rgba(255,107,74,0.1)',   border: 'rgba(255,107,74,0.25)'  },
};

// ── MINI SPARKLINE ────────────────────────────────────────────────
function Sparkline({ values = [], color = C.lime }) {
  if (!values.length) return null;
  const W = 80, H = 28, P = 2;
  const mn = Math.min(...values), mx = Math.max(...values), rng = mx - mn || 1;
  const pts = values.map((v, i) => {
    const x = P + (i / Math.max(values.length - 1, 1)) * (W - P * 2);
    const y = H - P - ((v - mn) / rng) * (H - P * 2);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={W} height={H}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

// ── DIFF BADGE ────────────────────────────────────────────────────
function DiffBadge({ diff }) {
  const d = diff?.toLowerCase() ?? 'medium';
  const cfg = DIFF_CONFIG[d] ?? DIFF_CONFIG.medium;
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em',
      textTransform: 'uppercase', padding: '3px 10px',
      borderRadius: '999px', fontFamily: 'Inter,sans-serif',
    }}>{d}</span>
  );
}

// ── STAT CHIP ─────────────────────────────────────────────────────
function StatChip({ icon, label, value, color = C.white }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '60px' }}>
      <div style={{ fontSize: '14px' }}>{icon}</div>
      <div style={{ color, fontSize: '15px', fontWeight: 700, fontFamily: "'Space Grotesk',monospace" }}>{value}</div>
      <div style={{ color: C.muted, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'Inter,sans-serif' }}>{label}</div>
    </div>
  );
}

// ── SUMMARY BAR ───────────────────────────────────────────────────
function SummaryBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ color: C.muted, fontSize: '11px', fontFamily: 'Inter,sans-serif', width: '70px', flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: '999px', background: color, boxShadow: `0 0 6px ${color}66`, transition: 'width 0.8s ease' }}/>
      </div>
      <div style={{ color: C.white, fontSize: '11px', fontWeight: 700, fontFamily: "'Space Grotesk',monospace", width: '28px', textAlign: 'right' }}>{value}</div>
    </div>
  );
}

// ── MATCH ROW ─────────────────────────────────────────────────────
function MatchRow({ match, index, total, onView, loading }) {
  const [hov, setHov] = useState(false);
  const diff = match.difficulty?.toLowerCase() ?? 'medium';
  const cfg  = DIFF_CONFIG[diff] ?? DIFF_CONFIG.medium;
  const avgR = match.avg_reaction_ms ? `${Math.round(match.avg_reaction_ms)}ms` : '—';
  const shots  = match.total_shots  ?? 0;
  const faults = match.total_faults ?? 0;
  const accuracy = shots > 0 ? Math.round((shots / (shots + faults)) * 100) : 0;

  const date = match.played_at
    ? new Date(match.played_at).toLocaleDateString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })
    : '—';

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...card({ padding: '20px 24px' }),
        display: 'flex', alignItems: 'center', gap: '20px',
        transition: 'all 0.2s ease',
        transform: hov ? 'translateY(-2px)' : 'none',
        boxShadow: hov ? `0 16px 48px rgba(0,0,0,0.45), 0 0 24px rgba(182,255,46,0.06)` : '0 12px 40px rgba(0,0,0,0.35)',
        animation: `fadeUp 0.4s ease ${index * 60}ms both`,
        cursor: 'default',
      }}
    >
      {/* Index badge */}
      <div style={{
        width: '40px', height: '40px', borderRadius: '12px',
        background: C.panel2, border: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: C.muted, fontSize: '13px', fontFamily: "'Space Grotesk',monospace", fontWeight: 700,
        flexShrink: 0,
      }}>#{total - index}</div>

      {/* Diff + date */}
      <div style={{ flexShrink: 0 }}>
        <DiffBadge diff={diff}/>
        <div style={{ color: C.muted, fontSize: '11px', fontFamily: 'Inter,sans-serif', marginTop: '4px' }}>{date}</div>
      </div>

      {/* Match ID */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontFamily: 'monospace', letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {match.match_id}
        </div>
      </div>

      {/* Stats chips */}
      <div style={{ display: 'flex', gap: '20px', flexShrink: 0 }}>
        <StatChip icon="🎯" label="Shots"    value={shots}    color={C.lime}/>
        <StatChip icon="⚠️" label="Faults"   value={faults}   color={faults > 5 ? C.danger : C.success}/>
        <StatChip icon="⚡" label="Reaction" value={avgR}      color={C.warning}/>
        <StatChip icon="📊" label="Accuracy" value={`${accuracy}%`} color={accuracy >= 70 ? C.lime : C.danger}/>
      </div>

      {/* Accuracy mini bar */}
      <div style={{ width: '80px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ color: C.muted, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em' }}>accuracy</span>
          <span style={{ color: accuracy >= 70 ? C.lime : C.danger, fontSize: '9px', fontWeight: 700, fontFamily: "'Space Grotesk',monospace" }}>{accuracy}%</span>
        </div>
        <div style={{ height: '3px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${accuracy}%`, borderRadius: '999px', background: accuracy >= 70 ? C.lime : C.danger, transition: 'width 0.8s ease' }}/>
        </div>
      </div>

      {/* View button */}
      <button
        onClick={() => onView(match.match_id)}
        disabled={loading}
        style={{
          padding: '9px 18px', borderRadius: '12px',
          border: `1px solid ${hov ? C.lime : C.border}`,
          background: hov ? 'rgba(182,255,46,0.1)' : 'transparent',
          color: hov ? C.lime : C.muted,
          fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          fontFamily: 'Inter,sans-serif', transition: 'all 0.2s ease',
          flexShrink: 0, whiteSpace: 'nowrap',
        }}
      >
        {loading ? '···' : 'View →'}
      </button>
    </div>
  );
}

// ── OVERVIEW CARDS ────────────────────────────────────────────────
function OverviewCard({ icon, label, value, sub, color = C.lime, delay = 0 }) {
  return (
    <div style={{
      ...card({ padding: '20px', height: '110px' }),
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      animation: `fadeUp 0.4s ease ${delay}ms both`,
      transition: 'all 0.2s ease', cursor: 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 16px 48px rgba(0,0,0,0.45), 0 0 20px rgba(182,255,46,0.06)`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.35)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: C.muted, fontSize: '10px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'Inter,sans-serif' }}>{label}</span>
        <span style={{ fontSize: '18px' }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontFamily: "'Space Grotesk',monospace", fontSize: '28px', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ color: C.muted, fontSize: '11px', fontFamily: 'Inter,sans-serif', marginTop: '2px' }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────
export default function HistoryScreen({ username, onViewMatch, onBack }) {
  const [matches,      setMatches]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [loadingMatch, setLoadingMatch] = useState(null);
  const [filter,       setFilter]       = useState('all'); // 'all' | 'easy' | 'medium' | 'hard'

  useEffect(() => {
    if (!username) return;
    fetch(`${API}/api/matches?user_id=${encodeURIComponent(username)}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setMatches(data); setLoading(false); })
      .catch(() => { setError('Could not load match history.'); setLoading(false); });
  }, [username]);

  const handleView = async (matchId) => {
    setLoadingMatch(matchId);
    try {
      const res  = await fetch(`${API}/api/match/${matchId}?user_id=${encodeURIComponent(username)}`);
      const data = await res.json();
      onViewMatch(data, matchId);
    } catch {
      setError('Could not load match.');
    } finally {
      setLoadingMatch(null);
    }
  };

  const filtered = filter === 'all' ? matches : matches.filter(m => m.difficulty?.toLowerCase() === filter);

  // Overview stats
  const totalShots  = matches.reduce((a, m) => a + (m.total_shots  ?? 0), 0);
  const totalFaults = matches.reduce((a, m) => a + (m.total_faults ?? 0), 0);
  const avgReaction = matches.length
    ? Math.round(matches.filter(m => m.avg_reaction_ms).reduce((a,m) => a + m.avg_reaction_ms, 0) / Math.max(matches.filter(m=>m.avg_reaction_ms).length,1))
    : 0;
  const overallAccuracy = totalShots > 0 ? Math.round((totalShots / (totalShots + totalFaults)) * 100) : 0;
  const diffCounts = { easy: 0, medium: 0, hard: 0 };
  matches.forEach(m => { const d = m.difficulty?.toLowerCase(); if (d && diffCounts[d] !== undefined) diffCounts[d]++; });
  const maxDiff = Math.max(diffCounts.easy, diffCounts.medium, diffCounts.hard, 1);

  return (
    <div style={{
      background: `radial-gradient(circle at top center, rgba(182,255,46,0.05), transparent 45%), linear-gradient(180deg, #07090C, #090D12)`,
      minHeight: '100vh', color: C.white, fontFamily: 'Inter, sans-serif', paddingBottom: '48px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 48px' }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', animation: 'fadeUp 0.4s ease both' }}>
          <div>
            <div style={{ color: C.lime, fontSize: '11px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '6px', fontFamily: 'Inter,sans-serif' }}>
              Match Archive
            </div>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '48px', letterSpacing: '-0.02em', color: C.white, lineHeight: 1 }}>
              Match History
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: C.muted, fontSize: '13px' }}>
              <span style={{ fontFamily: "'Space Grotesk',monospace", color: C.lime, fontWeight: 700 }}>{username}</span>
              <span style={{ color: C.border }}>•</span>
              <span>{matches.length} {matches.length === 1 ? 'match' : 'matches'} recorded</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {matches.length > 0 && (
              <a href={`${API}/api/export-csv?user_id=${encodeURIComponent(username)}`} target="_blank" rel="noopener noreferrer"
                style={{ padding: '10px 18px', borderRadius: '14px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.04)', color: C.muted, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter,sans-serif', backdropFilter: 'blur(8px)', transition: 'all 0.2s ease', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.15)';e.currentTarget.style.color=C.white;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}
              >↓ Export All CSV</a>
            )}
            <button onClick={onBack}
              style={{ padding: '10px 24px', borderRadius: '14px', border: 'none', background: `linear-gradient(135deg, #C7FF34, #A9E928)`, color: '#07090C', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter,sans-serif', boxShadow: '0 0 24px rgba(182,255,46,0.3)', transition: 'all 0.2s ease' }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 0 32px rgba(182,255,46,0.45)';}}
              onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 0 24px rgba(182,255,46,0.3)';}}
            >← Back Home</button>
          </div>
        </div>

        {/* ── OVERVIEW CARDS ── */}
        {matches.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '16px', marginBottom: '24px' }}>
            <OverviewCard icon="🏓" label="Total Matches"   value={matches.length}         sub="all time"          color={C.lime}    delay={0}/>
            <OverviewCard icon="🎯" label="Total Shots"     value={totalShots}             sub="across all matches" color={C.white}   delay={60}/>
            <OverviewCard icon="📊" label="Avg Accuracy"    value={`${overallAccuracy}%`}  sub="shots vs faults"   color={overallAccuracy>=70?C.lime:C.danger} delay={120}/>
            <OverviewCard icon="⚡" label="Avg Reaction"    value={avgReaction?`${avgReaction}ms`:'—'} sub="response time"  color={C.warning} delay={180}/>
            <OverviewCard icon="🏆" label="Hard Matches"    value={diffCounts.hard}        sub={`${diffCounts.medium} medium`} color={C.danger}  delay={240}/>
          </div>
        )}

        {/* ── SPLIT: Difficulty breakdown + match list ── */}
        {matches.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '16px', marginBottom: '24px' }}>
            {/* Left — difficulty breakdown */}
            <div style={{ ...card(), animation: 'fadeUp 0.4s ease 0.2s both', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ color: C.muted, fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Difficulty Split</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {['easy','medium','hard'].map(d => (
                  <SummaryBar key={d} label={d.charAt(0).toUpperCase()+d.slice(1)} value={diffCounts[d]} max={maxDiff} color={DIFF_CONFIG[d].color}/>
                ))}
              </div>
              <div style={{ marginTop: 'auto', borderTop: `1px solid ${C.border}`, paddingTop: '16px' }}>
                <div style={{ color: C.muted, fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '10px' }}>Fault Discipline</div>
                <SummaryBar label="Faults" value={totalFaults} max={totalShots} color={C.danger}/>
                <SummaryBar label="Clean"  value={totalShots - totalFaults} max={totalShots} color={C.lime}/>
              </div>
            </div>

            {/* Right — filter pills */}
            <div style={{ ...card(), animation: 'fadeUp 0.4s ease 0.25s both', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: C.muted, fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                  Recent Performance
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['all','easy','medium','hard'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      style={{ padding: '4px 12px', borderRadius: '999px', border: `1px solid ${filter===f?(DIFF_CONFIG[f]||{color:C.lime}).color:C.border}`, background: filter===f?`${(DIFF_CONFIG[f]||{color:C.lime}).color}18`:'transparent', color: filter===f?(DIFF_CONFIG[f]||{color:C.lime}).color:C.muted, fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Inter,sans-serif', transition: 'all 0.15s ease' }}
                    >{f}</button>
                  ))}
                </div>
              </div>
              {/* Mini accuracy trend for filtered matches */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Sparkline values={filtered.slice(0,12).map(m => m.total_shots > 0 ? Math.round((m.total_shots/(m.total_shots+(m.total_faults||0)))*100) : 0).reverse()} color={C.lime}/>
                <div style={{ color: C.muted, fontSize: '11px' }}>Accuracy trend — last {Math.min(filtered.length,12)} matches</div>
              </div>
            </div>
          </div>
        )}

        {/* ── MATCH LIST ── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px', gap: '16px' }}>
            <div style={{ width: '36px', height: '36px', border: `2px solid ${C.lime}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
            <div style={{ color: C.muted, fontSize: '13px', fontFamily: 'Inter,sans-serif' }}>Loading match history...</div>
          </div>
        )}

        {error && (
          <div style={{ ...card(), textAlign: 'center', padding: '40px', borderColor: 'rgba(255,107,74,0.2)' }}>
            <div style={{ color: C.danger, fontSize: '14px', fontFamily: 'Inter,sans-serif' }}>{error}</div>
          </div>
        )}

        {!loading && !error && matches.length === 0 && (
          <div style={{ ...card(), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '64px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px' }}>🏓</div>
            <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '32px', letterSpacing: '2px', color: C.white }}>No Matches Yet</h2>
            <p style={{ color: C.muted, fontSize: '14px', fontFamily: 'Inter,sans-serif' }}>Play your first match to see your history here, {username}!</p>
            <button onClick={onBack}
              style={{ padding: '12px 28px', borderRadius: '14px', border: 'none', background: `linear-gradient(135deg, #C7FF34, #A9E928)`, color: '#07090C', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter,sans-serif', marginTop: '8px', boxShadow: '0 0 24px rgba(182,255,46,0.3)' }}
            >Play Now</button>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Column headers */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '0 24px', color: C.muted, fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'Inter,sans-serif' }}>
              <div style={{ width: '40px', flexShrink: 0 }}>#</div>
              <div style={{ width: '120px', flexShrink: 0 }}>Difficulty</div>
              <div style={{ flex: 1 }}>Session ID</div>
              <div style={{ width: '280px', display: 'flex', gap: '20px', flexShrink: 0 }}>
                <span style={{ minWidth: '60px', textAlign: 'center' }}>Shots</span>
                <span style={{ minWidth: '60px', textAlign: 'center' }}>Faults</span>
                <span style={{ minWidth: '60px', textAlign: 'center' }}>Reaction</span>
                <span style={{ minWidth: '60px', textAlign: 'center' }}>Accuracy</span>
              </div>
              <div style={{ width: '80px', flexShrink: 0 }}>Bar</div>
              <div style={{ width: '80px', flexShrink: 0 }}></div>
            </div>

            {filtered.map((match, i) => (
              <MatchRow
                key={match.match_id}
                match={match}
                index={i}
                total={filtered.length}
                onView={handleView}
                loading={loadingMatch === match.match_id}
              />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && matches.length > 0 && (
          <div style={{ ...card(), textAlign: 'center', padding: '40px', color: C.muted, fontSize: '14px' }}>
            No {filter} difficulty matches found.
          </div>
        )}

      </div>
    </div>
  );
}
