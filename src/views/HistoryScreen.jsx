import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'https://pickleball-backend-h86y.onrender.com';

const DIFFICULTY_COLORS = {
  easy:   { text: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30' },
  medium: { text: 'text-yellow-400',  bg: 'bg-yellow-400/10 border-yellow-400/30' },
  hard:   { text: 'text-red-400',     bg: 'bg-red-400/10 border-red-400/30' },
};

function StatPill({ label, value, color = 'text-slate-300' }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`text-lg font-black ${color}`}>{value}</span>
      <span className="text-slate-600 text-xs font-mono">{label}</span>
    </div>
  );
}

export default function HistoryScreen({ onViewMatch, onBack }) {
  const [matches, setMatches]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [loadingMatch, setLoadingMatch] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/matches`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch matches');
        return r.json();
      })
      .then(data => {
        setMatches(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Could not load match history. Make sure the backend is running.');
        setLoading(false);
      });
  }, []);

  const handleViewMatch = async (matchId) => {
    setLoadingMatch(matchId);
    try {
      const res  = await fetch(`${API}/api/match/${matchId}`);
      const data = await res.json();
      onViewMatch(data, matchId);
    } catch {
      setError('Could not load match data.');
    } finally {
      setLoadingMatch(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-lime-400 text-xs font-mono tracking-widest uppercase mb-1">
              Match Archive
            </p>
            <h1 className="text-4xl font-black text-white">Match History</h1>
            <p className="text-slate-500 text-sm mt-1">
              {matches.length} {matches.length === 1 ? 'match' : 'matches'} recorded
            </p>
          </div>
          <button
            onClick={onBack}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-mono rounded-xl transition-all"
          >
            ← Back
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 text-sm font-mono">Loading match history...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-950/30 border border-red-800 rounded-2xl p-6 text-center">
            <p className="text-red-400 font-mono text-sm">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && matches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="text-6xl">🏓</p>
            <p className="text-white text-xl font-black">No matches yet</p>
            <p className="text-slate-500 text-sm">Play a match to see your history here</p>
            <button
              onClick={onBack}
              className="mt-4 px-6 py-3 bg-lime-400 hover:bg-lime-300 text-slate-950 font-black rounded-xl transition-all hover:scale-105"
            >
              Play Now
            </button>
          </div>
        )}

        {/* Match list */}
        {!loading && !error && matches.length > 0 && (
          <div className="flex flex-col gap-4">
            {matches.map((match, i) => {
              const diff = match.difficulty?.toLowerCase() ?? 'medium';
              const colors = DIFFICULTY_COLORS[diff] ?? DIFFICULTY_COLORS.medium;
              const avgReaction = match.avg_reaction_ms
                ? `${Math.round(match.avg_reaction_ms)}ms`
                : 'N/A';

              return (
                <div
                  key={match.match_id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl p-6 transition-all duration-200 hover:bg-slate-800/50"
                >
                  <div className="flex items-center justify-between gap-4">

                    {/* Left — match info */}
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Index */}
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-slate-400 text-sm font-mono">#{matches.length - i}</span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text}`}>
                            {match.difficulty?.toUpperCase() ?? 'MEDIUM'}
                          </span>
                          <span className="text-slate-600 text-xs font-mono">
                            {formatDate(match.played_at)}
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs font-mono truncate">
                          {match.match_id}
                        </p>
                      </div>
                    </div>

                    {/* Center — stats */}
                    <div className="hidden md:flex items-center gap-8">
                      <StatPill
                        label="Shots"
                        value={match.total_shots ?? 0}
                        color="text-blue-400"
                      />
                      <StatPill
                        label="Faults"
                        value={match.total_faults ?? 0}
                        color={match.total_faults > 5 ? 'text-red-400' : 'text-lime-400'}
                      />
                      <StatPill
                        label="Reaction"
                        value={avgReaction}
                        color="text-yellow-400"
                      />
                      <StatPill
                        label="Events"
                        value={match.total_events ?? 0}
                        color="text-slate-400"
                      />
                    </div>

                    {/* Right — view button */}
                    <button
                      onClick={() => handleViewMatch(match.match_id)}
                      disabled={loadingMatch === match.match_id}
                      className="flex-shrink-0 px-5 py-2.5 bg-slate-700 hover:bg-lime-400 hover:text-slate-950 border border-slate-600 hover:border-lime-400 text-slate-300 text-sm font-black rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingMatch === match.match_id ? (
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                          Loading
                        </span>
                      ) : 'View →'}
                    </button>
                  </div>

                  {/* Mobile stats */}
                  <div className="flex md:hidden items-center gap-6 mt-4 pt-4 border-t border-slate-800">
                    <StatPill label="Shots"    value={match.total_shots ?? 0}  color="text-blue-400" />
                    <StatPill label="Faults"   value={match.total_faults ?? 0} color="text-red-400" />
                    <StatPill label="Reaction" value={avgReaction}              color="text-yellow-400" />
                    <StatPill label="Events"   value={match.total_events ?? 0} color="text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Export all */}
        {matches.length > 0 && (
          <div className="mt-8 flex justify-center">
            <a
              href={`${API}/api/export-csv`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 text-sm font-mono rounded-xl transition-all"
            >
              ↓ Export All Matches CSV
            </a>
          </div>
        )}

      </div>
    </div>
  );
}
