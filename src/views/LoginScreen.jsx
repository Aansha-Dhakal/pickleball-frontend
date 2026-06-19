import { useState, useEffect } from 'react';

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [error, setError]       = useState('');
  const [hovered, setHovered]   = useState(false);

  // Auto-fill if returning user
  useEffect(() => {
    const saved = localStorage.getItem('pkl_username');
    if (saved) setUsername(saved);
  }, []);

  const handleSubmit = () => {
    const clean = username.trim();
    if (!clean) { setError('Please enter a username'); return; }
    if (clean.length < 2) { setError('At least 2 characters'); return; }
    if (clean.length > 20) { setError('Max 20 characters'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) { setError('Letters, numbers and _ only'); return; }
    localStorage.setItem('pkl_username', clean);
    onLogin(clean);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div style={{
      width: '100vw', minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 40%, #5a8a28 0%, #2e5a0a 22%, #152e04 50%, #080f02 100%)',
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>

      {/* Atmosphere */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 20%, rgba(180,255,100,0.1) 0%, transparent 52%)' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 50%, transparent 28%, rgba(0,0,0,0.58) 100%)' }} />

      {/* Green edge borders */}
      {['left','right'].map(side => (
        <div key={side} style={{
          position: 'absolute', [side]: 0, top: 0, bottom: 0, width: '8px',
          background: 'linear-gradient(to bottom, transparent, #4ade80 25%, #16a34a 50%, #4ade80 75%, transparent)',
          boxShadow: '0 0 28px rgba(74,222,128,0.55)', zIndex: 10, pointerEvents: 'none',
        }} />
      ))}
      {['top','bottom'].map(side => (
        <div key={side} style={{
          position: 'absolute', [side]: 0, left: 0, right: 0, height: '6px',
          background: 'linear-gradient(to right, transparent, #4ade80, #16a34a, #4ade80, transparent)',
          boxShadow: '0 0 22px rgba(74,222,128,0.55)', zIndex: 10, pointerEvents: 'none',
        }} />
      ))}

      {/* Card */}
      <div style={{
        background: 'rgba(8,22,4,0.85)',
        border: '2px solid rgba(74,222,128,0.3)',
        borderRadius: '24px',
        padding: '48px 52px',
        boxShadow: '0 8px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(120,220,60,0.08)',
        backdropFilter: 'blur(16px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px',
        minWidth: '380px',
        position: 'relative', zIndex: 2,
      }}>

        {/* Ball icon */}
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #e8f840, #b8c820)',
          boxShadow: '0 4px 20px rgba(180,200,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '32px',
        }}>
          🏓
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontFamily: '"Arial Black", Impact, sans-serif',
            fontSize: '28px', fontWeight: '900',
            color: '#d4f54e',
            textShadow: '0 0 20px rgba(180,220,40,0.4), 2px 3px 0 #0d2200',
            WebkitTextStroke: '1px #0d2200',
            margin: 0, letterSpacing: '3px',
          }}>
            PICKLEBALL
          </h1>
          <p style={{
            color: 'rgba(140,220,70,0.6)', fontSize: '11px',
            fontFamily: 'monospace', letterSpacing: '5px',
            textTransform: 'uppercase', marginTop: '4px',
          }}>
            Simulator
          </p>
        </div>

        {/* Username input */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{
            color: 'rgba(140,210,70,0.7)', fontSize: '10px',
            fontFamily: 'monospace', letterSpacing: '3px',
            textTransform: 'uppercase',
          }}>
            Enter Username
          </label>
          <input
            type="text"
            value={username}
            onChange={e => { setUsername(e.target.value); setError(''); }}
            onKeyDown={handleKey}
            placeholder="e.g. PicklePro99"
            maxLength={20}
            autoFocus
            style={{
              width: '100%',
              padding: '14px 18px',
              borderRadius: '12px',
              border: `2px solid ${error ? 'rgba(248,113,113,0.6)' : 'rgba(74,222,128,0.3)'}`,
              background: 'rgba(15,35,8,0.8)',
              color: '#d4f54e',
              fontFamily: '"Arial Black", monospace',
              fontSize: '16px',
              fontWeight: '700',
              letterSpacing: '2px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(74,222,128,0.7)'}
            onBlur={e => e.target.style.borderColor = error ? 'rgba(248,113,113,0.6)' : 'rgba(74,222,128,0.3)'}
          />
          {error && (
            <p style={{ color: '#f87171', fontSize: '11px', fontFamily: 'monospace', margin: 0 }}>
              ⚠ {error}
            </p>
          )}
          <p style={{ color: 'rgba(100,160,60,0.4)', fontSize: '10px', fontFamily: 'monospace', margin: 0 }}>
            Letters, numbers and _ only · Max 20 chars
          </p>
        </div>

        {/* Play button */}
        <button
          onClick={handleSubmit}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            width: '100%', padding: '16px',
            borderRadius: '16px',
            border: '3px solid #0d2a0a',
            background: hovered
              ? 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)'
              : 'linear-gradient(180deg, #16a34a 0%, #0f7a30 100%)',
            color: '#d4f54e',
            fontFamily: '"Arial Black", Impact, sans-serif',
            fontSize: '20px', fontWeight: '900',
            letterSpacing: '4px', cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: hovered
              ? '0 0 28px rgba(74,222,128,0.55), 0 5px 0 #083a10'
              : '0 5px 0 #083a10, 0 7px 16px rgba(0,0,0,0.4)',
            transform: hovered ? 'scale(1.03) translateY(-2px)' : 'scale(1)',
            WebkitTextStroke: '1px #0d2a0a',
            textShadow: '0 2px 4px rgba(0,0,0,0.4)',
          }}
        >
          LET'S PLAY!
        </button>

        <p style={{
          color: 'rgba(80,140,40,0.35)', fontSize: '10px',
          fontFamily: 'monospace', letterSpacing: '2px',
          textAlign: 'center', margin: 0,
        }}>
          Your username saves your match history
        </p>
      </div>
    </div>
  );
}
