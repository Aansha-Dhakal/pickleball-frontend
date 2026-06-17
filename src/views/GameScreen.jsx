import { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';

import Court, { COURT_W, COURT_L, NET_H, KITCHEN_DEPTH } from '../game/Court';
import Ball, { BALL_RADIUS } from '../game/entities/Ball';
import Player, { PLAYER_START_Z, HIT_COOLDOWN } from '../game/entities/Player';
import Bot, { BOT_START_Z } from '../game/entities/Bot';
import BallTrail from '../game/BallTrail';
import Stadium from '../game/Stadium';
import useSoundEffects from '../data/useSoundEffects';

const WINNING_SCORE = 11;
const HIT_RANGE = 2.6;
const GRAVITY = -18;
const START_Y = 1.2;

function calcShot(playerPos, targetX, shotType, aimDepth = 'normal') {
  const distToNet = Math.max(playerPos.z, 3);
  const types = {
    drive:  { hz: 34, netClear: 0.3 },
    normal: { hz: 28, netClear: 0.7 },
    dink:   { hz: 12, netClear: 0.15 },
    lob:    { hz: 15, netClear: 4.5 },
  };
  let { hz, netClear } = types[shotType] || types.normal;
  if (aimDepth === 'deep')  hz = Math.min(hz * 1.25, 40);
  if (aimDepth === 'short') hz = Math.max(hz * 0.7, 8);
  const tToNet = distToNet / hz;
  const vy = (NET_H + netClear - START_Y - 0.5 * GRAVITY * tToNet * tToNet) / tToNet;
  const totalDist = distToNet + Math.abs(BOT_START_Z);
  const dx = targetX - playerPos.x;
  const vx = (dx / totalDist) * hz * 0.4;
  return { x: vx, y: Math.max(vy, 3), z: -hz };
}

// ── CAMERA ────────────────────────────────────────────────────────
function CameraRig({ playerRef }) {
  const { camera } = useThree();
  useFrame(() => {
    if (!playerRef.current) return;
    const p = playerRef.current.getPosition();
    camera.position.lerp(new THREE.Vector3(p.x * 0.25, 9, p.z + 15), 0.07);
    camera.lookAt(p.x * 0.1, 1, p.z - 10);
  });
  return null;
}

// ── GAME LOGIC ────────────────────────────────────────────────────
function GameLogic({ ballRef, playerRef, botRef, keys, difficulty, onScore, onFault, onShot, onBotHit, gameActive }) {
  const lastPlayerHit = useRef(0);
  const lastBotHit    = useRef(0);
  const botDelay = { easy: 0.75, medium: 0.32, hard: 0.1 }[difficulty] || 0.32;
  const botTimer  = useRef(0);
  const botHasHit = useRef(false);

  useFrame((state, delta) => {
    if (!gameActive || !ballRef.current?.isActive()) return;
    const now     = state.clock.elapsedTime;
    const ballPos  = ballRef.current.getPosition();
    const ballVel  = ballRef.current.getVelocity();
    const playerPos = playerRef.current.getPosition();
    const botPos    = botRef.current.getPosition();

    // Bot positioning — predict landing
    botTimer.current += delta;
    if (botTimer.current > botDelay) {
      botTimer.current = 0;
      if (ballVel.z < 0 && ballPos.z < 10) {
        const y0 = ballPos.y, vy = ballVel.y, g = GRAVITY;
        const disc = vy * vy - 2 * g * y0;
        let landZ = BOT_START_Z, landX = ballPos.x;
        if (disc >= 0) {
          const tLand = (-vy - Math.sqrt(disc)) / g;
          if (tLand > 0) {
            landZ = Math.max(-(COURT_L / 2), Math.min(-0.3, ballPos.z + ballVel.z * tLand));
            landX = Math.max(-COURT_W / 2 + 0.5, Math.min(COURT_W / 2 - 0.5, ballPos.x + ballVel.x * tLand));
          }
        }
        botRef.current.moveTo(landX, landZ);
        botHasHit.current = false;
      } else if (ballVel.z >= 0) {
        botRef.current.moveTo(0, BOT_START_Z);
      }
    }

    // Player hit
    const pHit = new THREE.Vector3(playerPos.x, playerPos.y + 1.1, playerPos.z);
    if (ballPos.distanceTo(pHit) < HIT_RANGE && ballPos.z > -2 && now - lastPlayerHit.current > HIT_COOLDOWN) {
      lastPlayerHit.current = now;
      playerRef.current.triggerSwing();

      if (playerRef.current.isInKitchen() && ballRef.current.getBounceCount() === 0) {
        onFault({ reason: 'KITCHEN_VIOLATION', striker: 'PLAYER', position: ballPos.clone() });
        return;
      }

      let shotType = 'normal';
      if (keys.current['Shift'])   shotType = 'drive';
      if (keys.current['Control']) shotType = 'dink';
      if (keys.current['q'] || keys.current['Q']) shotType = 'lob';

      let aimX = botPos.x + (Math.random() - 0.5) * 3;
      if (keys.current['a']) aimX = -(COURT_W * 0.35);
      if (keys.current['d']) aimX =  (COURT_W * 0.35);

      let aimDepth = 'normal';
      if (keys.current['w']) aimDepth = 'deep';
      if (keys.current['s']) aimDepth = 'short';

      const v = calcShot(playerPos, aimX, shotType, aimDepth);
      ballRef.current.hit(v);

      const inKitchenZone = playerPos.z < KITCHEN_DEPTH;
      onShot({
        striker: 'PLAYER',
        shotType,
        shot_type: inKitchenZone && shotType !== 'lob' ? 'DINK' : shotType.toUpperCase(),
        position: ballPos.clone(),
        reaction_time_ms: Math.round((now - lastBotHit.current) * 1000),
      });
    }

    // Bot hit
    const bHit = new THREE.Vector3(botPos.x, botPos.y + 1.1, botPos.z);
    if (ballPos.distanceTo(bHit) < HIT_RANGE && ballPos.z < 2 && now - lastBotHit.current > HIT_COOLDOWN && !botHasHit.current) {
      lastBotHit.current = now;
      botHasHit.current  = true;
      const hitVel = botRef.current.attemptHit(ballPos, ballVel);
      if (hitVel) {
        ballRef.current.hit(hitVel);
        onBotHit();
        onShot({ striker: 'AI', shot_type: 'DRIVE', position: ballPos.clone() });
      } else {
        onScore({ scorer: 'player', reason: 'BOT_MISS' });
      }
    }
  });

  return null;
}

// ── MAIN ──────────────────────────────────────────────────────────
export default function GameScreen({ difficulty, matchId, onGameEnd }) {
  const ballRef   = useRef();
  const playerRef = useRef();
  const botRef    = useRef();
  const keys      = useRef({});
  const telemetry = useRef([]);

  const sfx = useSoundEffects();

  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore,     setAiScore]     = useState(0);
  const [gameActive,  setGameActive]  = useState(false);
  const [gameOver,    setGameOver]    = useState(false);
  const [winner,      setWinner]      = useState(null);
  const [statusMsg,   setStatusMsg]   = useState('Press SPACE to serve');
  const [lastFault,   setLastFault]   = useState('');
  const [serving,     setServing]     = useState(false); // in serve animation

  const playerScoreRef = useRef(0);
  const aiScoreRef     = useRef(0);
  const gameOverRef    = useRef(false);
  const servingRef     = useRef('player');
  const servingAnimRef = useRef(false);

  const logTelemetry = useCallback((eventType, extra = {}) => {
    const pos = ballRef.current?.getPosition() ?? new THREE.Vector3();
    const v   = ballRef.current?.getVelocity() ?? new THREE.Vector3();
    telemetry.current.push({
      event_type:         eventType,
      striker_or_culprit: extra.striker ?? 'NONE',
      shot_type:          extra.shot_type ?? 'NONE',
      fault_reason:       extra.reason ?? extra.fault_reason ?? 'NONE',
      pos_x:              parseFloat((pos.x ?? 0).toFixed(3)),
      pos_y:              parseFloat((pos.y ?? 0).toFixed(3)),
      pos_z:              parseFloat((pos.z ?? 0).toFixed(3)),
      ball_speed:         parseFloat(Math.sqrt(v.x**2 + v.y**2 + v.z**2).toFixed(3)),
      reaction_time_ms:   extra.reaction_time_ms ?? null,
    });
  }, []);

  const endGame = useCallback((winnerSide) => {
    gameOverRef.current = true;
    setGameActive(false);
    setGameOver(true);
    setWinner(winnerSide);
    ballRef.current?.stop();
    if (winnerSide === 'PLAYER') sfx.playMatchWin();
    else sfx.playPointLose();
    sfx.playCrowd();
    fetch('https://pickleball-backend-h86y.onrender.com/api/log-telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: matchId, difficulty, telemetry_events: telemetry.current }),
    }).catch(() => {});
  }, [matchId, difficulty, sfx]);

  const handleScore = useCallback(({ scorer, reason }) => {
    if (gameOverRef.current) return;
    setGameActive(false);
    ballRef.current?.stop();
    const msgs = { DOUBLE_BOUNCE: '2 bounces', MISSED_SHOT: 'Ball out', BOT_MISS: 'AI missed' };
    if (scorer === 'player') {
      playerScoreRef.current += 1;
      setPlayerScore(playerScoreRef.current);
      servingRef.current = 'player';
      setLastFault(`✅ ${msgs[reason] ?? reason}`);
      logTelemetry('FAULT', { striker: 'AI', fault_reason: reason });
      sfx.playPointWin();
      sfx.playCrowd();
    } else {
      aiScoreRef.current += 1;
      setAiScore(aiScoreRef.current);
      servingRef.current = 'ai';
      setLastFault(`❌ ${msgs[reason] ?? reason}`);
      logTelemetry('FAULT', { striker: 'PLAYER', fault_reason: reason });
      sfx.playPointLose();
    }
    if (playerScoreRef.current >= WINNING_SCORE) { endGame('PLAYER'); return; }
    if (aiScoreRef.current >= WINNING_SCORE) { endGame('AI'); return; }
    setTimeout(() => setStatusMsg('Press SPACE to serve'), 80);
  }, [logTelemetry, endGame, sfx]);

  const handleFault = useCallback((fd) => {
    if (!fd || gameOverRef.current) return;
    setGameActive(false);
    ballRef.current?.stop();
    logTelemetry('FAULT', { striker: fd.striker ?? 'PLAYER', fault_reason: fd.reason });
    if (fd.reason === 'NET_HIT') sfx.playNetHit();
    else sfx.playPointLose();
    const playerLoses = fd.striker === 'PLAYER' || !fd.striker;
    if (playerLoses) {
      aiScoreRef.current += 1;
      setAiScore(aiScoreRef.current);
      servingRef.current = 'ai';
      setLastFault(`❌ ${fd.reason.replace(/_/g, ' ')}`);
    } else {
      playerScoreRef.current += 1;
      setPlayerScore(playerScoreRef.current);
      servingRef.current = 'player';
      setLastFault(`✅ AI fault: ${fd.reason.replace(/_/g, ' ')}`);
      sfx.playPointWin();
    }
    if (playerScoreRef.current >= WINNING_SCORE) { endGame('PLAYER'); return; }
    if (aiScoreRef.current >= WINNING_SCORE) { endGame('AI'); return; }
    setTimeout(() => setStatusMsg('Press SPACE to serve'), 80);
  }, [logTelemetry, endGame, sfx]);

  const handleShot = useCallback((sd) => {
    logTelemetry('SHOT', sd);
    // Play correct sound per shot type
    if (sd.striker === 'PLAYER') {
      if (sd.shotType === 'drive') sfx.playDrive();
      else if (sd.shotType === 'dink') sfx.playDink();
      else sfx.playHit();
    } else {
      sfx.playHit(0.7);
    }
  }, [logTelemetry, sfx]);

  const handleBounce = useCallback((bd) => {
    logTelemetry('BOUNCE', { striker: bd.side === 'player' ? 'PLAYER_SIDE' : 'AI_SIDE' });
    sfx.playBounce();
  }, [logTelemetry, sfx]);

  const handleBotHit = useCallback(() => {
    sfx.playHit(0.7);
  }, [sfx]);

  // ── SERVE ──
  const launchBall = useCallback((server) => {
    if (!ballRef.current) return;
    if (server === 'player') {
      ballRef.current.launch({ x: 3, y: 1.4, z: 19 }, { x: -1.2, y: 8.7, z: -28 });
    } else {
      ballRef.current.launch({ x: -3, y: 1.4, z: -19 }, { x: 1.2, y: 8.7, z: 28 });
    }
    sfx.playHit(0.9);
    logTelemetry('SHOT', { striker: server === 'player' ? 'PLAYER' : 'AI', shot_type: 'SERVE' });
    setGameActive(true);
    servingAnimRef.current = false;
    setServing(false);
  }, [logTelemetry, sfx]);

  const serveBall = useCallback(() => {
    if (!ballRef.current || gameOverRef.current) return;
    if (ballRef.current.isActive() || servingAnimRef.current) return;

    const server = servingRef.current;
    setLastFault('');
    setStatusMsg('');
    servingAnimRef.current = true;
    setServing(true);

    if (server === 'player') {
      // Play toss sound, then trigger player serve animation
      sfx.playServeToss();
      playerRef.current?.startServeAnimation(() => {
        launchBall('player');
      });
    } else {
      // Bot serve — short delay then launch
      sfx.playServeToss();
      setTimeout(() => launchBall('ai'), 700);
    }
  }, [launchBall, sfx]);

  useEffect(() => {
    const down = (e) => {
      keys.current[e.key] = true;
      if (e.key === ' ' && !gameOverRef.current) { serveBall(); e.preventDefault(); }
    };
    const up = (e) => { keys.current[e.key] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [serveBall]);

  return (
    <div className="w-full h-screen bg-slate-950 relative overflow-hidden">

      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-8 py-4 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur border border-slate-700 rounded-2xl px-6 py-3 text-center">
          <p className="text-blue-400 text-xs font-mono uppercase tracking-widest">You</p>
          <p className="text-white text-4xl font-black">{playerScore}</p>
        </div>
        <div className="text-center flex flex-col items-center gap-1.5">
          <p className="text-slate-500 text-xs font-mono uppercase tracking-widest">{difficulty} · First to {WINNING_SCORE}</p>
          {serving && <div className="bg-yellow-400/20 border border-yellow-400/40 rounded-xl px-4 py-1.5"><p className="text-yellow-400 text-sm font-mono">Serving...</p></div>}
          {statusMsg && !serving && <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl px-4 py-1.5"><p className="text-lime-400 text-sm font-mono">{statusMsg}</p></div>}
          {lastFault && <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-lg px-3 py-1"><p className="text-slate-300 text-xs font-mono">{lastFault}</p></div>}
        </div>
        <div className="bg-slate-900/80 backdrop-blur border border-slate-700 rounded-2xl px-6 py-3 text-center">
          <p className="text-red-400 text-xs font-mono uppercase tracking-widest">AI Bot</p>
          <p className="text-white text-4xl font-black">{aiScore}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-3 left-0 right-0 z-10 flex flex-wrap justify-center gap-2 pointer-events-none px-4">
        {[
          ['↑↓←→', 'Move', 'text-slate-400'],
          ['SPACE', 'Serve/Hit', 'text-lime-400'],
          ['SHIFT', 'Drive 💥', 'text-orange-400'],
          ['CTRL', 'Dink 🎯', 'text-blue-400'],
          ['Q', 'Lob 🌙', 'text-purple-400'],
          ['A/D', 'Aim L/R', 'text-yellow-400'],
          ['W/S', 'Deep/Short', 'text-green-400'],
        ].map(([k, l, c]) => (
          <span key={k} className="bg-slate-900/80 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono">
            <span className="text-slate-600">{k}</span><span className={`ml-1 ${c}`}>— {l}</span>
          </span>
        ))}
      </div>

      {/* 3D Canvas */}
      <Canvas shadows camera={{ position: [0, 9, 24], fov: 58, near: 0.1, far: 300 }} gl={{ antialias: true }}>
        <ambientLight intensity={0.45} />
        <directionalLight position={[8, 22, 8]} intensity={1.4} castShadow
          shadow-mapSize-width={2048} shadow-mapSize-height={2048}
          shadow-camera-far={80} shadow-camera-left={-28} shadow-camera-right={28}
          shadow-camera-top={35} shadow-camera-bottom={-35} />
        <pointLight position={[-12, 14, -12]} intensity={0.5} color="#3b82f6" />
        <pointLight position={[12, 14, 12]}   intensity={0.4} color="#ef4444" />
        <fog attach="fog" args={['#1e1b4b', 55, 130]} />

        <Stadium />
        <Court />
        <Ball ref={ballRef} onBounce={handleBounce} onFault={handleFault} onScore={handleScore} />
        <BallTrail ballRef={ballRef} />
        <Player
          ref={playerRef}
          keys={keys}
          onHit={() => {}}
          onKitchenViolation={() => handleFault({ reason: 'KITCHEN_VIOLATION', striker: 'PLAYER' })}
        />
        <Bot ref={botRef} difficulty={difficulty} />
        <GameLogic
          ballRef={ballRef} playerRef={playerRef} botRef={botRef}
          keys={keys} difficulty={difficulty}
          onScore={handleScore} onFault={handleFault}
          onShot={handleShot} onBotHit={handleBotHit}
          gameActive={gameActive}
        />
        <CameraRig playerRef={playerRef} />
      </Canvas>

      {/* Game Over */}
      {gameOver && (
        <div className="absolute inset-0 z-20 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
          <p className="text-slate-400 text-sm font-mono uppercase tracking-widest">Match Complete</p>
          <h2 className={`text-6xl font-black ${winner === 'PLAYER' ? 'text-lime-400' : 'text-red-400'}`}>
            {winner === 'PLAYER' ? '🏆 You Win!' : '💀 AI Wins'}
          </h2>
          <p className="text-slate-300 text-2xl font-bold">{playerScore} — {aiScore}</p>
          <p className="text-slate-500 text-sm font-mono">{telemetry.current.length} events recorded</p>
          <button onClick={() => onGameEnd(telemetry.current)}
            className="px-8 py-3 bg-lime-400 hover:bg-lime-300 text-slate-950 font-black rounded-xl transition-all hover:scale-105">
            View Analytics →
          </button>
        </div>
      )}
    </div>
  );
}
