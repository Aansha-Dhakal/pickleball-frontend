import { useState } from 'react';
import HomeScreen from './views/HomeScreen';
import GameScreen from './views/GameScreen';
import DashboardScreen from './views/DashboardScreen';

export default function App() {
  const [screen, setScreen] = useState('HOME'); // 'HOME' | 'GAME' | 'DASHBOARD'
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

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {screen === 'HOME' && (
        <HomeScreen onStartGame={handleStartGame} />
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
        />
      )}
    </div>
  );
}
