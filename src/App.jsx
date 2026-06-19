import { useState, useEffect } from 'react';
import LoginScreen    from './views/LoginScreen';
import HomeScreen     from './views/HomeScreen';
import GameScreen     from './views/GameScreen';
import DashboardScreen from './views/DashboardScreen';
import HistoryScreen  from './views/HistoryScreen';

export default function App() {
  const [screen,        setScreen]        = useState('LOGIN');
  const [username,      setUsername]      = useState(null);
  const [matchTelemetry,setMatchTelemetry]= useState([]);
  const [difficulty,    setDifficulty]    = useState('medium');
  const [matchId,       setMatchId]       = useState(null);

  // Auto-login if username already saved
  useEffect(() => {
    const saved = localStorage.getItem('pkl_username');
    if (saved) {
      setUsername(saved);
      setScreen('HOME');
    }
  }, []);

  const handleLogin = (name) => {
    setUsername(name);
    setScreen('HOME');
  };

  const handleLogout = () => {
    localStorage.removeItem('pkl_username');
    setUsername(null);
    setScreen('LOGIN');
  };

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

  const handleViewHistoryMatch = (telemetryData, histMatchId) => {
    setMatchTelemetry(telemetryData);
    setMatchId(histMatchId);
    setScreen('DASHBOARD_HISTORY');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">

      {screen === 'LOGIN' && (
        <LoginScreen onLogin={handleLogin} />
      )}

      {screen === 'HOME' && (
        <HomeScreen
          onStartGame={handleStartGame}
          onHistory={() => setScreen('HISTORY')}
          username={username}
          onLogout={handleLogout}
        />
      )}

      {screen === 'GAME' && (
        <GameScreen
          difficulty={difficulty}
          matchId={matchId}
          username={username}
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
          username={username}
          onViewMatch={handleViewHistoryMatch}
          onBack={() => setScreen('HOME')}
        />
      )}

    </div>
  );
}
