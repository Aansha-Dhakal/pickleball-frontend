import { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import Court, { COURT_W, COURT_L, NET_H, KITCHEN_DEPTH } from '../game/Court';
import Ball, { BALL_RADIUS } from '../game/entities/Ball';
import Player, { PLAYER_START_Z, HIT_COOLDOWN } from '../game/entities/Player';
import Bot, { BOT_START_Z } from '../game/entities/Bot';
import BallTrail from '../game/BallTrail';
import useSoundEffects from '../data/useSoundEffects';

const WINNING_SCORE = 11;
const HIT_RANGE     = 2.6;
const GRAVITY       = -18;
const START_Y       = 1.2;
const API = import.meta.env.VITE_API_URL || 'https://pickleball-backend-h86y.onrender.com';

// ── FONTS / TOKENS ────────────────────────────────────────────────
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600&family=Space+Grotesk:wght@700&display=swap');`;

// ── SHOT PHYSICS ─────────────────────────────────────────────────
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
  const vy     = (NET_H + netClear - START_Y - 0.5 * GRAVITY * tToNet * tToNet) / tToNet;
  const a = 0.5 * GRAVITY, b = vy, c = START_Y;
  const disc  = b * b - 4 * a * c;
  const tLand = disc >= 0 ? (-b - Math.sqrt(disc)) / (2 * a) : tToNet * 2;
  const vx    = (targetX - playerPos.x) / tLand;
  return { x: vx, y: Math.max(vy, 3), z: -hz };
}

// ── FIXED CAMERA ──────────────────────────────────────────────────
function FixedCamera() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 7, 11);
    camera.lookAt(0, 0.5, -2);
  }, [camera]);
  return null;
}

// ── LOW-POLY ENVIRONMENT ──────────────────────────────────────────
function Environment() {
  // Pine tree
  const Tree = ({ pos, s = 1 }) => (
    <group position={pos} scale={[s, s, s]}>
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.18, 0.25, 2.4, 6]} />
        <meshStandardMaterial color="#3d2b1a" roughness={1} />
      </mesh>
      {[0, 1.4, 2.6].map((y, i) => (
        <mesh key={i} position={[0, 3.2 + y, 0]}>
          <coneGeometry args={[1.4 - i * 0.35, 2, 7]} />
          <meshStandardMaterial color={['#1a4a10','#1e5514','#236618'][i]} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );

  // Simple building
  const Building = ({ pos, w = 4, h = 6, d = 3, color = '#1a1f2e' }) => (
    <mesh position={pos}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  );

  // Light pole
  const Pole = ({ x, z }) => (
    <group position={[x, 0, z]}>
      <mesh position={[0, 6, 0]}>
        <cylinderGeometry args={[0.1, 0.14, 12, 6]} />
        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 12.2, 0]}>
        <boxGeometry args={[1.2, 0.3, 0.5]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <pointLight position={[0, 11.8, 0]} intensity={2.2} color="#fffbeb" distance={50} decay={1.4} />
      <mesh position={[0, 12.4, 0.3]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="#fef9c3" emissive="#fef9c3" emissiveIntensity={3} />
      </mesh>
    </group>
  );

  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#0d1408" roughness={1} />
      </mesh>

      {/* Court surround */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <planeGeometry args={[38, 58]} />
        <meshStandardMaterial color="#195B39" roughness={0.95} />
      </mesh>

      {/* Light poles */}
      <Pole x={-12} z={-18} />
      <Pole x={ 12} z={-18} />
      <Pole x={-12} z={ 18} />
      <Pole x={ 12} z={ 18} />

      {/* Trees */}
      {[[-24,0,-22],[-20,0,-28],[-28,0,-18],[22,0,-22],[26,0,-28],[20,0,-18],
        [-24,0,20],[-20,0,26],[22,0,20],[26,0,26],[-28,0,8],[28,0,8]].map(([x,y,z],i) => (
        <Tree key={i} pos={[x,y,z]} s={0.7 + (i%3)*0.2}/>
      ))}

      {/* Buildings */}
      <Building pos={[-36, 5, -30]} w={10} h={14} d={8} color="#12161e"/>
      <Building pos={[36, 4, -28]}  w={8}  h={12} d={7} color="#0e1218"/>
      <Building pos={[0, 3, -42]}   w={16} h={10} d={6} color="#14191f"/>
      <Building pos={[-32, 3, 0]}   w={6}  h={8}  d={5} color="#11151c"/>
      <Building pos={[32, 3, 0]}    w={6}  h={8}  d={5} color="#11151c"/>

      {/* Fog */}
      <fog attach="fog" args={['#070d14', 35, 85]} />
    </group>
  );
}

// ── GAME LOGIC ────────────────────────────────────────────────────
function GameLogic({ ballRef, playerRef, botRef, keys, keyHoldTime, difficulty, onScore, onFault, onShot, onBotHit, gameActive }) {
  const lastPlayerHit = useRef(0);
  const lastBotHit    = useRef(0);
  const botDelay = { easy: 0.75, medium: 0.32, hard: 0.1 }[difficulty] || 0.32;
  const botTimer  = useRef(0);
  const botHasHit = useRef(false);

  useFrame((state, delta) => {
    if (!gameActive || !ballRef.current?.isActive()) return;
    const now       = state.clock.elapsedTime;
    const ballPos   = ballRef.current.getPosition();
    const ballVel   = ballRef.current.getVelocity();
    const playerPos = playerRef.current.getPosition();
    const botPos    = botRef.current.getPosition();

    // Bot tracking
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
            landZ = Math.max(-(COURT_L/2), Math.min(-0.3, ballPos.z + ballVel.z * tLand));
            landX = Math.max(-COURT_W/2+0.5, Math.min(COURT_W/2-0.5, ballPos.x + ballVel.x * tLand));
            const ballBouncedOnAISide = ballRef.current.getBounceCount() > 0;
            if (landZ > -KITCHEN_DEPTH && !ballBouncedOnAISide) landZ = -KITCHEN_DEPTH - 0.3;
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

      const MAX_HOLD = 1.0, MAX_X = COURT_W * 0.44;
      let aimX = botPos.x + (Math.random() - 0.5) * 1.5;
      if (keys.current['a']) { const t = Math.min(keyHoldTime.current['a']||0,MAX_HOLD)/MAX_HOLD; aimX = -(MAX_X*(0.4+t*0.6)); }
      else if (keys.current['d']) { const t = Math.min(keyHoldTime.current['d']||0,MAX_HOLD)/MAX_HOLD; aimX = MAX_X*(0.4+t*0.6); }
      let aimDepth = 'normal';
      if (keys.current['w']) aimDepth = 'deep';
      if (keys.current['s']) aimDepth = 'short';

      const v = calcShot(playerPos, aimX, shotType, aimDepth);
      ballRef.current.hit(v, 'PLAYER');
      const inKitchenZone = playerPos.z < KITCHEN_DEPTH;
      onShot({ striker:'PLAYER', shotType, shot_type: inKitchenZone&&shotType!=='lob'?'DINK':shotType.toUpperCase(), position:ballPos.clone(), reaction_time_ms:Math.round((now-lastBotHit.current)*1000) });
    }

    // Bot hit
    const bHit = new THREE.Vector3(botPos.x, botPos.y + 1.1, botPos.z);
    if (ballPos.distanceTo(bHit) < HIT_RANGE && ballPos.z < 2 && now - lastBotHit.current > HIT_COOLDOWN && !botHasHit.current) {
      lastBotHit.current = now;
      botHasHit.current  = true;
      const botInKitchen = botPos.z > -KITCHEN_DEPTH && botPos.z < 0;
      if (botInKitchen && ballRef.current.getBounceCount() === 0) {
        onFault({ reason:'KITCHEN_VIOLATION', striker:'AI', position:ballPos.clone() });
        return;
      }
      const hitVel = botRef.current.attemptHit(ballPos, ballVel);
      if (hitVel) { ballRef.current.hit(hitVel, 'AI'); onBotHit(); onShot({ striker:'AI', shot_type:'DRIVE', position:ballPos.clone() }); }
      else onScore({ scorer:'player', reason:'BOT_MISS' });
    }
  });
  return null;
}

// ── MAIN ──────────────────────────────────────────────────────────
export default function GameScreen({ difficulty, matchId, username, onGameEnd }) {
  const ballRef    = useRef();
  const playerRef  = useRef();
  const botRef     = useRef();
  const keys       = useRef({});
  const keyHoldTime = useRef({});
  const telemetry  = useRef([]);
  const sfx        = useSoundEffects();

  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore,     setAiScore]     = useState(0);
  const [gameActive,  setGameActive]  = useState(false);
  const [gameOver,    setGameOver]    = useState(false);
  const [winner,      setWinner]      = useState(null);
  const [statusMsg,   setStatusMsg]   = useState('Press SPACE to serve');
  const [lastFault,   setLastFault]   = useState('');
  const [serving,     setServing]     = useState(false);
  const [aimIndicator,setAimIndicator]= useState('');
  const [hudVisible,  setHudVisible]  = useState(false);

  const playerScoreRef = useRef(0);
  const aiScoreRef     = useRef(0);
  const gameOverRef    = useRef(false);
  const servingRef     = useRef('player');
  const servingAnimRef = useRef(false);
  const lastFrameTime  = useRef(Date.now());

  // HUD slide in
  useEffect(() => { setTimeout(() => setHudVisible(true), 100); }, []);

  // Key hold timer
  useEffect(() => {
    let rafId;
    const tick = () => {
      const now = Date.now();
      const dt  = (now - lastFrameTime.current) / 1000;
      lastFrameTime.current = now;
      Object.keys(keys.current).forEach(k => { if (keys.current[k]) keyHoldTime.current[k] = (keyHoldTime.current[k]||0)+dt; });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const logTelemetry = useCallback((eventType, extra = {}) => {
    const pos = ballRef.current?.getPosition() ?? new THREE.Vector3();
    const v   = ballRef.current?.getVelocity() ?? new THREE.Vector3();
    telemetry.current.push({
      event_type: eventType,
      striker_or_culprit: extra.striker ?? 'NONE',
      shot_type:    extra.shot_type ?? 'NONE',
      fault_reason: extra.reason ?? extra.fault_reason ?? 'NONE',
      pos_x: parseFloat((pos.x??0).toFixed(3)),
      pos_y: parseFloat((pos.y??0).toFixed(3)),
      pos_z: parseFloat((pos.z??0).toFixed(3)),
      ball_speed: parseFloat(Math.sqrt(v.x**2+v.y**2+v.z**2).toFixed(3)),
      reaction_time_ms: extra.reaction_time_ms ?? null,
    });
  }, []);

  const endGame = useCallback((winnerSide) => {
    gameOverRef.current = true;
    setGameActive(false); setGameOver(true); setWinner(winnerSide);
    ballRef.current?.stop();
    if (winnerSide==='PLAYER') { sfx.playMatchWin(); sfx.playCrowd(); } else sfx.playPointLose();
    fetch(`${API}/api/log-telemetry`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ user_id: username, match_id:matchId, difficulty, telemetry_events:telemetry.current }),
    }).catch(() => {});
  }, [matchId, difficulty, username, sfx]);

  const handleScore = useCallback(({ scorer, reason }) => {
    if (gameOverRef.current) return;
    setGameActive(false); ballRef.current?.stop();
    const msgs = { DOUBLE_BOUNCE:'2 bounces', MISSED_SHOT:'Ball out', BOT_MISS:'AI missed', OUT_OF_BOUNDS:'Out of bounds' };
    if (scorer==='player') {
      playerScoreRef.current += 1; setPlayerScore(playerScoreRef.current);
      servingRef.current = 'player';
      setLastFault(`✓ ${msgs[reason]??reason}`);
      logTelemetry('FAULT', { striker:'AI', fault_reason:reason });
      sfx.playPointWin(); sfx.playCrowd();
    } else {
      aiScoreRef.current += 1; setAiScore(aiScoreRef.current);
      servingRef.current = 'ai';
      setLastFault(`✗ ${msgs[reason]??reason}`);
      logTelemetry('FAULT', { striker:'PLAYER', fault_reason:reason });
      sfx.playPointLose();
    }
    if (playerScoreRef.current >= WINNING_SCORE) { endGame('PLAYER'); return; }
    if (aiScoreRef.current >= WINNING_SCORE)     { endGame('AI');     return; }
    setTimeout(() => setStatusMsg('Press SPACE to serve'), 80);
  }, [logTelemetry, endGame, sfx]);

  const handleFault = useCallback((fd) => {
    if (!fd || gameOverRef.current) return;
    setGameActive(false); ballRef.current?.stop();
    logTelemetry('FAULT', { striker:fd.striker??'PLAYER', fault_reason:fd.reason });
    if (fd.reason==='NET_HIT') sfx.playNetHit(); else sfx.playPointLose();
    const playerLoses = fd.striker==='PLAYER';
    if (playerLoses) {
      aiScoreRef.current += 1; setAiScore(aiScoreRef.current);
      servingRef.current = 'ai';
      setLastFault(`✗ ${fd.reason.replace(/_/g,' ')}`);
    } else {
      playerScoreRef.current += 1; setPlayerScore(playerScoreRef.current);
      servingRef.current = 'player';
      setLastFault(`✓ AI fault`);
      sfx.playPointWin();
    }
    if (playerScoreRef.current >= WINNING_SCORE) { endGame('PLAYER'); return; }
    if (aiScoreRef.current >= WINNING_SCORE)     { endGame('AI');     return; }
    setTimeout(() => setStatusMsg('Press SPACE to serve'), 80);
  }, [logTelemetry, endGame, sfx]);

  const handleShot = useCallback((sd) => {
    logTelemetry('SHOT', sd);
    if (sd.striker==='PLAYER') {
      if (sd.shotType==='drive') sfx.playDrive();
      else if (sd.shotType==='dink') sfx.playDink();
      else sfx.playHit();
    } else sfx.playHit(0.7);
  }, [logTelemetry, sfx]);

  const handleBounce = useCallback((bd) => {
    logTelemetry('BOUNCE', { striker: bd.side==='player'?'PLAYER_SIDE':'AI_SIDE' });
    sfx.playBounce();
  }, [logTelemetry, sfx]);

  const handleBotHit = useCallback(() => sfx.playHit(0.7), [sfx]);

  const launchBall = useCallback((server) => {
    if (!ballRef.current) return;
    if (server==='player') ballRef.current.launch({x:3,y:1.4,z:19},{x:-1.2,y:8.7,z:-28},'PLAYER');
    else ballRef.current.launch({x:-3,y:1.4,z:-19},{x:1.2,y:8.7,z:28},'AI');
    sfx.playHit(0.9);
    logTelemetry('SHOT',{striker:server==='player'?'PLAYER':'AI',shot_type:'SERVE'});
    setGameActive(true); servingAnimRef.current=false; setServing(false);
  }, [logTelemetry, sfx]);

  const serveBall = useCallback(() => {
    if (!ballRef.current || gameOverRef.current) return;
    if (ballRef.current.isActive() || servingAnimRef.current) return;
    const server = servingRef.current;
    setLastFault(''); setStatusMsg('');
    servingAnimRef.current = true; setServing(true);
    sfx.playServeToss();
    if (server==='player') playerRef.current?.startServeAnimation(() => launchBall('player'));
    else setTimeout(() => launchBall('ai'), 700);
  }, [launchBall, sfx]);

  useEffect(() => {
    const down = (e) => {
      if (!e.repeat) { keys.current[e.key]=true; keyHoldTime.current[e.key]=0; }
      if (e.key==='a') setAimIndicator('← Left');
      if (e.key==='d') setAimIndicator('Right →');
      if (e.key==='w') setAimIndicator('↑ Deep');
      if (e.key==='s') setAimIndicator('↓ Short');
      if (e.key===' ' && !gameOverRef.current) { serveBall(); e.preventDefault(); }
      if (e.key==='Shift'||e.key==='Control') e.preventDefault();
    };
    const up = (e) => { keys.current[e.key]=false; keyHoldTime.current[e.key]=0; if(['a','d','w','s'].includes(e.key)) setAimIndicator(''); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown',down); window.removeEventListener('keyup',up); };
  }, [serveBall]);

  // Glass card style
  const glassCard = (extra={}) => ({
    background: 'rgba(17,22,26,0.72)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
    ...extra,
  });

  return (
    <div style={{ width:'100vw', height:'100vh', background:'#07090C', position:'relative', overflow:'hidden' }}>
      <style>{`
        ${FONT_IMPORT}
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes slideDown { from{opacity:0;transform:translateY(-16px)} to{opacity:1;transform:none} }
        @keyframes slideUp   { from{opacity:0;transform:translateY(16px)}  to{opacity:1;transform:none} }
        @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes scorePop  { 0%{transform:scale(1)} 50%{transform:scale(1.25)} 100%{transform:scale(1)} }
      `}</style>

      {/* ── HUD TOP ── */}
      <div style={{ position:'absolute', top:0, left:0, right:0, zIndex:10, display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'20px 24px', pointerEvents:'none',
        opacity: hudVisible ? 1 : 0, transition: 'opacity 0.5s ease',
        animation: hudVisible ? 'slideDown 0.5s ease both' : 'none',
      }}>
        {/* YOU score */}
        <div style={{ ...glassCard({ borderRadius:'20px', padding:'12px 20px', minWidth:'100px', textAlign:'center', borderTop:`2px solid #B6FF2E` }) }}>
          <div style={{ color:'#B6FF2E', fontSize:'11px', fontWeight:600, letterSpacing:'0.18em', textTransform:'uppercase', fontFamily:'Inter,sans-serif', marginBottom:'4px' }}>YOU</div>
          <div style={{ color:'#fff', fontSize:'44px', fontWeight:700, fontFamily:"'Space Grotesk',monospace", lineHeight:1, animation: playerScore > 0 ? 'scorePop 0.3s ease' : 'none' }}>{playerScore}</div>
        </div>

        {/* Center info */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'8px' }}>
          <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'12px', fontFamily:'Inter,sans-serif', letterSpacing:'0.05em' }}>
            {difficulty.toUpperCase()} · FIRST TO {WINNING_SCORE}
          </div>
          {serving && (
            <div style={{ ...glassCard({ borderRadius:'18px', padding:'8px 20px', border:'1px solid rgba(182,255,46,0.3)', boxShadow:'0 0 20px rgba(182,255,46,0.18)' }) }}>
              <span style={{ color:'#B6FF2E', fontSize:'13px', fontFamily:'Inter,sans-serif', fontWeight:500, animation:'pulse 1.5s ease infinite' }}>Serving...</span>
            </div>
          )}
          {statusMsg && !serving && (
            <div style={{ ...glassCard({ borderRadius:'18px', padding:'8px 20px', border:'1px solid rgba(182,255,46,0.3)', boxShadow:'0 0 20px rgba(182,255,46,0.18)' }) }}>
              <span style={{ color:'#B6FF2E', fontSize:'13px', fontFamily:'Inter,sans-serif', fontWeight:500, animation:'pulse 2s ease infinite' }}>{statusMsg}</span>
            </div>
          )}
          {lastFault && (
            <div style={{ background:'rgba(0,0,0,0.5)', borderRadius:'12px', padding:'4px 14px' }}>
              <span style={{ color: lastFault.startsWith('✓') ? '#B6FF2E' : '#FF6B4A', fontSize:'11px', fontFamily:'Inter,sans-serif', fontWeight:500 }}>{lastFault}</span>
            </div>
          )}
          {aimIndicator && (
            <div style={{ background:'rgba(182,255,46,0.12)', border:'1px solid rgba(182,255,46,0.3)', borderRadius:'10px', padding:'3px 12px' }}>
              <span style={{ color:'#B6FF2E', fontSize:'10px', fontFamily:'monospace', fontWeight:700 }}>{aimIndicator}</span>
            </div>
          )}
        </div>

        {/* AI BOT score */}
        <div style={{ ...glassCard({ borderRadius:'20px', padding:'12px 20px', minWidth:'100px', textAlign:'center', borderTop:`2px solid #FF6B4A` }) }}>
          <div style={{ color:'#FF6B4A', fontSize:'11px', fontWeight:600, letterSpacing:'0.18em', textTransform:'uppercase', fontFamily:'Inter,sans-serif', marginBottom:'4px' }}>AI BOT</div>
          <div style={{ color:'#fff', fontSize:'44px', fontWeight:700, fontFamily:"'Space Grotesk',monospace", lineHeight:1, animation: aiScore > 0 ? 'scorePop 0.3s ease' : 'none' }}>{aiScore}</div>
        </div>
      </div>

      {/* ── HUD BOTTOM CONTROLS ── */}
      <div style={{
        position:'absolute', bottom:'20px', left:'50%', transform:'translateX(-50%)',
        zIndex:10, pointerEvents:'none',
        opacity: hudVisible ? 1 : 0,
        animation: hudVisible ? 'slideUp 0.6s ease 0.2s both' : 'none',
      }}>
        <div style={{
          ...glassCard({ borderRadius:'999px', padding:'10px 24px', background:'rgba(7,9,12,0.75)' }),
          display:'flex', alignItems:'center', gap:'20px', whiteSpace:'nowrap',
        }}>
          {[
            { key:'↑↓←→',     label:'Move',      color:'rgba(255,255,255,0.45)' },
            { key:'SPACE',     label:'Serve / Hit',color:'#B6FF2E' },
            { key:'SHIFT',     label:'Drive',     color:'#FFD43B' },
            { key:'CTRL',      label:'Dink',      color:'#4EA8FF' },
            { key:'Q',         label:'Lob',       color:'#c084fc' },
            { key:'A / D',     label:'Aim',       color:'rgba(255,255,255,0.45)' },
          ].map(({ key, label, color }) => (
            <div key={key} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <span style={{ color:'rgba(255,255,255,0.35)', fontSize:'11px', fontFamily:'monospace', fontWeight:600 }}>{key}</span>
              <span style={{ color:'rgba(255,255,255,0.2)', fontSize:'10px' }}>—</span>
              <span style={{ color, fontSize:'11px', fontFamily:'Inter,sans-serif', fontWeight:500 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3D CANVAS ── */}
      <Canvas
        shadows={false}
        camera={{ position:[0,7,11], fov:55, near:0.1, far:200 }}
        gl={{ antialias:true, alpha:false }}
        style={{ background:'#07090C' }}
      >
        {/* Lighting — night match */}
        <ambientLight intensity={0.3} color="#c8d8ff" />
        <directionalLight position={[0, 20, 5]} intensity={0.5} color="#e8f0ff" />
        <pointLight position={[0, 8, -10]} intensity={0.4} color="#a0c8a0" distance={30} decay={2}/>

        <FixedCamera />
        <Environment />
        <Court />
        <Ball ref={ballRef} onBounce={handleBounce} onFault={handleFault} onScore={handleScore} />
        <BallTrail ballRef={ballRef} />
        <Player ref={playerRef} keys={keys}
          onHit={() => {}}
          onKitchenViolation={() => handleFault({ reason:'KITCHEN_VIOLATION', striker:'PLAYER' })}
        />
        <Bot ref={botRef} difficulty={difficulty} />
        <GameLogic
          ballRef={ballRef} playerRef={playerRef} botRef={botRef}
          keys={keys} keyHoldTime={keyHoldTime} difficulty={difficulty}
          onScore={handleScore} onFault={handleFault}
          onShot={handleShot} onBotHit={handleBotHit}
          gameActive={gameActive}
        />
      </Canvas>

      {/* ── GAME OVER OVERLAY ── */}
      {gameOver && (
        <div style={{
          position:'absolute', inset:0, zIndex:20,
          background:'rgba(7,9,12,0.82)', backdropFilter:'blur(8px)',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'16px',
          animation:'slideDown 0.4s ease both',
        }}>
          <div style={{ color: winner==='PLAYER'?'#B6FF2E':'#FF6B4A', fontSize:'11px', fontWeight:600, letterSpacing:'0.18em', textTransform:'uppercase', fontFamily:'Inter,sans-serif' }}>
            Match Complete
          </div>
          <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'64px', letterSpacing:'-0.02em', color: winner==='PLAYER'?'#B6FF2E':'#FF6B4A', lineHeight:1 }}>
            {winner==='PLAYER' ? 'You Win!' : 'AI Wins'}
          </h2>
          <div style={{ fontFamily:"'Space Grotesk',monospace", fontSize:'28px', fontWeight:700, color:'rgba(255,255,255,0.7)' }}>
            {playerScore} — {aiScore}
          </div>
          <div style={{ color:'rgba(255,255,255,0.3)', fontSize:'12px', fontFamily:'Inter,sans-serif' }}>
            {telemetry.current.length} events recorded
          </div>
          <button
            onClick={() => onGameEnd(telemetry.current)}
            style={{
              marginTop:'8px', padding:'14px 32px', borderRadius:'14px', border:'none',
              background:'linear-gradient(135deg,#C7FF34,#A9E928)',
              color:'#07090C', fontSize:'15px', fontWeight:700,
              cursor:'pointer', fontFamily:'Inter,sans-serif',
              boxShadow:'0 0 28px rgba(182,255,46,0.4)',
              transition:'all 0.2s ease',
            }}
            onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.04)';}}
            onMouseLeave={e=>{e.currentTarget.style.transform='';}}
          >
            View Analytics →
          </button>
        </div>
      )}
    </div>
  );
}
