import { useState, useEffect, useRef } from 'react';
import AppIcon from './AppIcon';

const BG_SRC = "/backgroundpick.png";

const C = {
  bg:    '#07090C',
  panel: '#11161A',
  border:'rgba(255,255,255,0.06)',
  lime:  '#B6FF2E',
  lime2: '#93E52D',
  white: '#FFFFFF',
  muted: '#9EA7AE',
};

// SVG pickleball icon — perforated ball

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [error,    setError]    = useState('');
  const [focused,  setFocused]  = useState(false);
  const [hov,      setHov]      = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('pkl_username');
    if (saved) setUsername(saved);
    // Focus input after mount
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSubmit = () => {
    const clean = username.trim();
    if (!clean)           { setError('Please enter a username'); return; }
    if (clean.length < 2) { setError('At least 2 characters'); return; }
    if (clean.length > 20){ setError('Max 20 characters'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) { setError('Letters, numbers and _ only'); return; }
    localStorage.setItem('pkl_username', clean);
    onLogin(clean);
  };

  return (
    <div style={{
      width: '100vw', height: '100vh',
      position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 30px rgba(182,255,46,0.2); } 50% { box-shadow: 0 0 50px rgba(182,255,46,0.35); } }
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
      `}</style>

      {/* Background image */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `url(${BG_SRC})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'brightness(0.28) blur(2px)',
      }}/>

      {/* Dark overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'radial-gradient(ellipse at center, rgba(7,9,12,0.5) 0%, rgba(7,9,12,0.88) 100%)',
      }}/>

      {/* Lime radial glow behind card */}
      <div style={{
        position: 'absolute', zIndex: 1,
        width: '500px', height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(182,255,46,0.08) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }}/>

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: '360px',
        background: 'rgba(17,22,26,0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
        padding: '40px 36px 36px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0',
        animation: 'fadeUp 0.5s ease both',
      }}>

        {/* App icon — floating */}
        <div style={{ animation: 'float 3s ease-in-out infinite', marginBottom: '20px' }}>
          <div style={{ filter: 'drop-shadow(0 8px 24px rgba(74,222,128,0.45))' }}>
            <AppIcon size={80}/>
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '32px', letterSpacing: '4px',
            color: C.white, lineHeight: 1,
            textShadow: '0 0 30px rgba(182,255,46,0.15)',
          }}>PICKLEBALL</h1>
          {/* Decorative line + SIMULATOR */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: '4px' }}>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, rgba(182,255,46,0.4))' }}/>
            <span style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '13px', letterSpacing: '6px',
              color: C.lime,
            }}>SIMULATOR</span>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, rgba(182,255,46,0.4))' }}/>
          </div>
        </div>

        {/* Input section */}
        <div style={{ width: '100%', marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            color: C.muted, fontSize: '11px', fontWeight: 600,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            marginBottom: '8px', fontFamily: 'Inter,sans-serif',
          }}>Enter Username</label>

          <div style={{
            position: 'relative',
            border: `1.5px solid ${focused ? C.lime : error ? 'rgba(255,107,74,0.5)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.04)',
            transition: 'all 0.2s ease',
            boxShadow: focused ? `0 0 0 3px rgba(182,255,46,0.1)` : 'none',
          }}>
            {/* User icon */}
            <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={focused ? C.lime : C.muted} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>
              </svg>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={username}
              placeholder="e.g. PicklePro99"
              maxLength={20}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{
                width: '100%', padding: '13px 14px 13px 40px',
                background: 'transparent', border: 'none', outline: 'none',
                color: C.white, fontSize: '14px', fontWeight: 500,
                fontFamily: 'Inter,sans-serif',
              }}
            />
          </div>

          {error ? (
            <div style={{ color: '#FF6B4A', fontSize: '11px', fontFamily: 'Inter,sans-serif', marginTop: '6px' }}>⚠ {error}</div>
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.22)', fontSize: '11px', fontFamily: 'Inter,sans-serif', marginTop: '6px' }}>
              Letters, numbers and _ only · Min 2 characters
            </div>
          )}
        </div>

        {/* Play button */}
        <button
          onClick={handleSubmit}
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            width: '100%', height: '52px',
            borderRadius: '14px', border: 'none',
            background: 'linear-gradient(135deg, #C7FF34, #A9E928)',
            color: '#07090C', fontFamily: "'Bebas Neue',sans-serif",
            fontSize: '20px', letterSpacing: '4px',
            cursor: 'pointer', transition: 'all 0.15s ease',
            boxShadow: hov
              ? '0 0 40px rgba(182,255,46,0.55), 0 6px 20px rgba(0,0,0,0.3)'
              : '0 0 24px rgba(182,255,46,0.25), 0 4px 14px rgba(0,0,0,0.2)',
            transform: hov ? 'scale(1.02) translateY(-1px)' : 'scale(1)',
            animation: 'pulse 3s ease infinite',
          }}
        >LET'S PLAY!</button>

        {/* Footer text */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginTop: '20px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
            <path d="M18 20V10M12 20V4M6 20v-6"/>
          </svg>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', fontFamily: 'Inter,sans-serif', letterSpacing: '0.05em', textAlign: 'center' }}>
            Your progress. Every match. Every time.
          </p>
        </div>
      </div>
    </div>
  );
}
