import { useMemo } from 'react';

// ── HELPERS ────────────────────────────────────────────────────────

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function KpiCard({ label, value, sub, color = 'text-white' }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-1">
      <p className="text-slate-500 text-xs font-mono uppercase tracking-widest">{label}</p>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-slate-500 text-xs">{sub}</p>}
    </div>
  );
}

function ShotBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs font-mono text-slate-400">
        <span>{label}</span>
        <span>{count} ({pct}%)</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Mini court heatmap using canvas-like SVG dots
function CourtHeatmap({ shots }) {
  const COURT_W = 340;
  const COURT_H = 200;
  const NET_X = COURT_W / 2;
  const KITCHEN_W = 60;

  return (
    <svg width={COURT_W} height={COURT_H} className="rounded-xl overflow-hidden">
      {/* Court surface */}
      <rect width={COURT_W} height={COURT_H} fill="#0f3460" rx="8" />
      {/* Kitchens */}
      <rect x={NET_X - KITCHEN_W} width={KITCHEN_W} height={COURT_H} fill="#0d4f3c" />
      <rect x={NET_X} width={KITCHEN_W} height={COURT_H} fill="#0d4f3c" />
      {/* Lines */}
      <rect x={0} y={0} width={COURT_W} height={COURT_H} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" rx="8" />
      <line x1={NET_X - KITCHEN_W} y1={0} x2={NET_X - KITCHEN_W} y2={COURT_H} stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      <line x1={NET_X + KITCHEN_W} y1={0} x2={NET_X + KITCHEN_W} y2={COURT_H} stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      <line x1={0} y1={COURT_H / 2} x2={NET_X - KITCHEN_W} y2={COURT_H / 2} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      <line x1={NET_X + KITCHEN_W} y1={COURT_H / 2} x2={COURT_W} y2={COURT_H / 2} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      {/* Net */}
      <line x1={NET_X} y1={0} x2={NET_X} y2={COURT_H} stroke="#e2e8f0" strokeWidth="3" />

      {/* Shot dots — map pos_x (-10 to 10) and pos_z (-22 to 22) to SVG space */}
      {shots.map((s, i) => {
        const svgX = ((s.pos_x + 10) / 20) * COURT_W;
        const svgY = ((s.pos_z + 22) / 44) * COURT_H;
        const isPlayer = s.striker_or_culprit === 'PLAYER';
        return (
          <circle
            key={i}
            cx={svgX}
            cy={svgY}
            r={4}
            fill={isPlayer ? 'rgba(163,230,53,0.75)' : 'rgba(248,113,113,0.75)'}
            stroke={isPlayer ? '#bef264' : '#ef4444'}
            strokeWidth="1"
          />
        );
      })}

      {/* Legend */}
      <circle cx={10} cy={10} r={4} fill="rgba(163,230,53,0.75)" />
      <text x={18} y={14} fill="#94a3b8" fontSize="9" fontFamily="monospace">YOU</text>
      <circle cx={10} cy={24} r={4} fill="rgba(248,113,113,0.75)" />
      <text x={18} y={28} fill="#94a3b8" fontSize="9" fontFamily="monospace">AI</text>
    </svg>
  );
}

// Reaction time chart as a simple SVG line graph
function ReactionChart({ data }) {
  if (!data.length) return (
    <div className="flex items-center justify-center h-32 text-slate-600 text-sm font-mono">
      No reaction data recorded
    </div>
  );

  const W = 340, H = 120, PAD = 20;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2);
    const y = H - PAD - ((v - min) / range) * (H - PAD * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={W} height={H}>
      <polyline
        points={points}
        fill="none"
        stroke="#a3e635"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {data.map((v, i) => {
        const x = PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2);
        const y = H - PAD - ((v - min) / range) * (H - PAD * 2);
        return <circle key={i} cx={x} cy={y} r={3} fill="#bef264" />;
      })}
      {/* Axis labels */}
      <text x={PAD} y={H - 4} fill="#475569" fontSize="9" fontFamily="monospace">Shot 1</text>
      <text x={W - PAD - 20} y={H - 4} fill="#475569" fontSize="9" fontFamily="monospace">Latest</text>
      <text x={4} y={PAD + 4} fill="#475569" fontSize="9" fontFamily="monospace">{max}ms</text>
      <text x={4} y={H - PAD} fill="#475569" fontSize="9" fontFamily="monospace">{min}ms</text>
    </svg>
  );
}

// ── MAIN DASHBOARD ──────────────────────────────────────────────────

export default function DashboardScreen({ data, matchId, difficulty, onRestart }) {

  const stats = useMemo(() => {
    const shots = data.filter(e => e.event_type === 'SHOT');
    const faults = data.filter(e => e.event_type === 'FAULT');
    const playerShots = shots.filter(e => e.striker_or_culprit === 'PLAYER');
    const aiShots = shots.filter(e => e.striker_or_culprit === 'AI');
    const playerFaults = faults.filter(e => e.striker_or_culprit === 'PLAYER');
    const aiFaults = faults.filter(e => e.striker_or_culprit === 'AI');

    const reactionTimes = playerShots
      .map(e => e.reaction_time_ms)
      .filter(v => v !== null && v > 0 && v < 5000);

    const dinks = playerShots.filter(e => e.shot_type === 'DINK').length;
    const drives = playerShots.filter(e => e.shot_type === 'DRIVE').length;
    const other = playerShots.filter(e => e.shot_type === 'SHOT').length;

    const faultTypes = {
      MISSED_SHOT: playerFaults.filter(e => e.fault_reason === 'MISSED_SHOT').length,
      NET_HIT: playerFaults.filter(e => e.fault_reason === 'NET_HIT').length,
      OUT_OF_BOUNDS: playerFaults.filter(e => e.fault_reason === 'OUT_OF_BOUNDS').length,
      KITCHEN_VIOLATION: playerFaults.filter(e => e.fault_reason === 'KITCHEN_VIOLATION').length,
    };

    const accuracy = shots.length > 0
      ? Math.round((aiFaults.length / Math.max(shots.length, 1)) * 100)
      : 0;

    return {
      totalEvents: data.length,
      totalShots: shots.length,
      playerShots: playerShots.length,
      aiShots: aiShots.length,
      playerFaults: playerFaults.length,
      aiFaults: aiFaults.length,
      avgReaction: reactionTimes.length ? Math.round(avg(reactionTimes)) : null,
      minReaction: reactionTimes.length ? Math.min(...reactionTimes) : null,
      maxReaction: reactionTimes.length ? Math.max(...reactionTimes) : null,
      reactionTimes,
      dinks, drives, other,
      faultTypes,
      accuracy,
      allShots: shots,
    };
  }, [data]);

  const handleExportCSV = () => {
    window.open(`https://pickleball-backend-h86y.onrender.com/api/export-csv?match_id=${matchId}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-lime-400 text-xs font-mono tracking-widest uppercase mb-1">
              Post-Match Analytics
            </p>
            <h1 className="text-4xl font-black text-white">
              Match Report
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-mono">
              {matchId} · Difficulty: {difficulty}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExportCSV}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-mono rounded-xl transition-all"
            >
              ↓ Export CSV
            </button>
            <button
              onClick={onRestart}
              className="px-5 py-2.5 bg-lime-400 hover:bg-lime-300 text-slate-950 text-sm font-black rounded-xl transition-all hover:scale-105"
            >
              Play Again
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KpiCard
            label="Your Shots"
            value={stats.playerShots}
            sub={`AI: ${stats.aiShots} shots`}
            color="text-blue-400"
          />
          <KpiCard
            label="Your Faults"
            value={stats.playerFaults}
            sub={`AI Faults: ${stats.aiFaults}`}
            color={stats.playerFaults > stats.aiFaults ? 'text-red-400' : 'text-lime-400'}
          />
          <KpiCard
            label="Avg Reaction"
            value={stats.avgReaction !== null ? `${stats.avgReaction}ms` : 'N/A'}
            sub={stats.minReaction !== null ? `Best: ${stats.minReaction}ms` : ''}
            color="text-yellow-400"
          />
          <KpiCard
            label="Total Events"
            value={stats.totalEvents}
            sub="shots + faults logged"
            color="text-slate-300"
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

          {/* Shot Placement Heatmap */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-4">
              Shot Placement Map
            </p>
            <CourtHeatmap shots={stats.allShots} />
            <p className="text-slate-600 text-xs font-mono mt-3">
              Green = your shots · Red = AI shots
            </p>
          </div>

          {/* Reaction Time Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-1">
              Reaction Time Over Match
            </p>
            <p className="text-slate-600 text-xs mb-4">
              Time between AI hit → your response (ms)
            </p>
            <ReactionChart data={stats.reactionTimes} />
            {stats.avgReaction && (
              <p className="text-slate-600 text-xs font-mono mt-2">
                Avg: {stats.avgReaction}ms · Best: {stats.minReaction}ms · Worst: {stats.maxReaction}ms
              </p>
            )}
          </div>
        </div>

        {/* Shot Types + Fault Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Shot Type Distribution */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-5">
              Your Shot Breakdown
            </p>
            <div className="flex flex-col gap-4">
              <ShotBar label="Dinks" count={stats.dinks} total={stats.playerShots} color="bg-lime-400" />
              <ShotBar label="Drives" count={stats.drives} total={stats.playerShots} color="bg-blue-400" />
              <ShotBar label="Other" count={stats.other} total={stats.playerShots} color="bg-slate-500" />
            </div>
          </div>

          {/* Fault Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-5">
              Your Fault Breakdown
            </p>
            {stats.playerFaults === 0 ? (
              <p className="text-slate-600 text-sm font-mono">No faults recorded 🎉</p>
            ) : (
              <div className="flex flex-col gap-4">
                <ShotBar label="Missed Shot" count={stats.faultTypes.MISSED_SHOT} total={stats.playerFaults} color="bg-red-400" />
                <ShotBar label="Net Hit" count={stats.faultTypes.NET_HIT} total={stats.playerFaults} color="bg-orange-400" />
                <ShotBar label="Out of Bounds" count={stats.faultTypes.OUT_OF_BOUNDS} total={stats.playerFaults} color="bg-yellow-400" />
                <ShotBar label="Kitchen Violation" count={stats.faultTypes.KITCHEN_VIOLATION} total={stats.playerFaults} color="bg-purple-400" />
              </div>
            )}
          </div>
        </div>

        {/* Raw data note */}
        <p className="text-center text-slate-700 text-xs font-mono mt-8">
          {stats.totalEvents} events saved to pickleball.db · Export CSV to run Python/Pandas EDA
        </p>

      </div>
    </div>
  );
}
