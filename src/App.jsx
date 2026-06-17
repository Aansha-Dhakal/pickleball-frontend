import { useState } from 'react';
import HomeScreen from './views/HomeScreen';
import GameScreen from './views/GameScreen';
import DashboardScreen from './views/DashboardScreen';
import HistoryScreen from './views/HistoryScreen';

export default function App() {
  const [screen, setScreen] = useState('HOME');
  const [matchTelemetry, setMatchTelemetry] = useState([]);
  const [difficulty, setDifficulty] = useState('medium');
  const [matchId, setMatchId] = useState(null);

  const handleStartGame = (selectedDifficulty) => {
    setDifficulty(selectedDifficulty);
    setMatchId(`match_${Date.now()}`);
    setMatchTelemetry([]);
    setScreen('GAME');
  };

  const handleMatchComplete = (finalTelemetry) => {
    setMatchTelemetry(finalTelemetry);
    setScreen('DASHBOARD');
  };

  const handleRestart = () => {
    setMatchTelemetry([]);
    setMatchId(null);
    setScreen('HOME');
  };

  // Called from HistoryScreen when user clicks a past match
  const handleViewHistoryMatch = (telemetryData, histMatchId) => {
    setMatchTelemetry(telemetryData);
    setMatchId(histMatchId);
    setScreen('DASHBOARD_HISTORY');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">

      {screen === 'HOME' && (
        <HomeScreen
          onStartGame={handleStartGame}
          onHistory={() => setScreen('HISTORY')}
        />
      )}

      {screen === 'GAME' && (
        <GameScreen
          difficulty={difficulty}
          matchId={matchId}
          onGameEnd={handleMatchComplete}
        />
      )}

      {screen === 'DASHBOARD' && (
        <DashboardScreen
          data={matchTelemetry}
          matchId={matchId}
          difficulty={difficulty}
          onRestart={handleRestart}
          onHistory={() => setScreen('HISTORY')}
        />
      )}

      {/* Dashboard loaded from history — no Play Again, just back to history */}
      {screen === 'DASHBOARD_HISTORY' && (
        <DashboardScreen
          data={matchTelemetry}
          matchId={matchId}
          difficulty={difficulty}
          onRestart={handleRestart}
          onHistory={() => setScreen('HISTORY')}
          fromHistory
        />
      )}

      {screen === 'HISTORY' && (
        <HistoryScreen
          onViewMatch={handleViewHistoryMatch}
          onBack={() => setScreen('HOME')}
        />
      )}

    </div>
  );
}
