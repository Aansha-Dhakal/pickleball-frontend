import { useState } from 'react';

const difficulties = [
  {
    id: 'easy',
    label: 'Easy',
    description: 'Slow AI, great for learning the controls',
    color: 'from-emerald-500 to-green-400',
    border: 'border-emerald-500',
    glow: 'shadow-emerald-500/30',
  },
  {
    id: 'medium',
    label: 'Medium',
    description: 'Balanced AI, reacts with moderate speed',
    color: 'from-yellow-500 to-amber-400',
    border: 'border-yellow-500',
    glow: 'shadow-yellow-500/30',
  },
  {
    id: 'hard',
    label: 'Hard',
    description: 'Fast AI, punishes every mistake',
    color: 'from-red-500 to-rose-400',
    border: 'border-red-500',
    glow: 'shadow-red-500/30',
  },
];

export default function HomeScreen({ onStartGame }) {
  const [selected, setSelected] = useState('medium');

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 py-12">

      {/* Header */}
      <div className="text-center mb-12">
        <p className="text-lime-400 text-sm font-mono tracking-widest uppercase mb-3">
          3D Simulator + Analytics
        </p>
        <h1 className="text-6xl font-black tracking-tight text-white mb-4">
          PICKLE<span className="text-lime-400">BALL</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-md mx-auto">
          Play against an AI bot. Every shot, bounce, and fault is tracked.
          Review your performance in the analytics dashboard after the match.
        </p>
      </div>

      {/* Court Preview Badge */}
      <div className="flex items-center gap-3 mb-10 bg-slate-900 border border-slate-800 rounded-full px-5 py-2">
        <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse"></span>
        <span className="text-slate-300 text-sm font-mono">3D Court · Real Physics · Live Telemetry</span>
      </div>

      {/* Difficulty Selector */}
      <div className="w-full max-w-2xl mb-10">
        <p className="text-slate-500 text-xs font-mono tracking-widest uppercase text-center mb-4">
          Select Difficulty
        </p>
        <div className="grid grid-cols-3 gap-4">
          {difficulties.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelected(d.id)}
              className={`
                relative flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all duration-200
                ${selected === d.id
                  ? `${d.border} bg-slate-900 shadow-xl ${d.glow}`
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-600'}
              `}
            >
              {selected === d.id && (
                <span className={`absolute top-3 right-3 w-2 h-2 rounded-full bg-gradient-to-br ${d.color}`} />
              )}
              <span className={`text-2xl font-black bg-gradient-to-br ${d.color} bg-clip-text text-transparent`}>
                {d.label}
              </span>
              <span className="text-slate-400 text-xs text-center leading-snug">
                {d.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Start Button */}
      <button
        onClick={() => onStartGame(selected)}
        className="group relative px-12 py-4 bg-lime-400 hover:bg-lime-300 text-slate-950 font-black text-lg rounded-2xl transition-all duration-200 shadow-xl shadow-lime-400/20 hover:shadow-lime-400/40 hover:scale-105 active:scale-95"
      >
        START MATCH
        <span className="ml-3 group-hover:translate-x-1 inline-block transition-transform duration-200">→</span>
      </button>

      {/* Controls hint */}
      <div className="mt-10 flex gap-6 text-slate-600 text-xs font-mono">
        <span>↑ / W — Move Up</span>
        <span>↓ / S — Move Down</span>
        <span>First to 11 wins</span>
      </div>

    </div>
  );
}
