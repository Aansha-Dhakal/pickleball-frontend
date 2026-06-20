// Reusable Pickleball App Icon — SVG inline, no external deps
export default function AppIcon({ size = 36 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ flexShrink: 0, display: 'block' }}
    >
      {/* Rounded square background */}
      <rect width="100" height="100" rx="22" ry="22" fill="#4ade80"/>
      <rect width="100" height="100" rx="22" ry="22" fill="url(#bgGrad)" opacity="0.6"/>

      {/* Ball body */}
      <circle cx="52" cy="52" r="30" fill="url(#ballGrad)"/>
      {/* Shine */}
      <ellipse cx="43" cy="40" rx="9" ry="6" fill="rgba(255,255,255,0.25)" transform="rotate(-25 43 40)"/>
      {/* Rim */}
      <circle cx="52" cy="52" r="30" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5"/>

      {/* Perforations */}
      <circle cx="44" cy="29" r="3.2" fill="rgba(0,0,0,0.3)"/>
      <circle cx="56" cy="27" r="3.2" fill="rgba(0,0,0,0.3)"/>
      <circle cx="67" cy="34" r="3.2" fill="rgba(0,0,0,0.3)"/>
      <circle cx="36" cy="40" r="3.2" fill="rgba(0,0,0,0.3)"/>
      <circle cx="48" cy="40" r="3.2" fill="rgba(0,0,0,0.3)"/>
      <circle cx="61" cy="43" r="3.2" fill="rgba(0,0,0,0.3)"/>
      <circle cx="72" cy="46" r="3.2" fill="rgba(0,0,0,0.3)"/>
      <circle cx="34" cy="52" r="3.2" fill="rgba(0,0,0,0.3)"/>
      <circle cx="46" cy="55" r="3.2" fill="rgba(0,0,0,0.3)"/>
      <circle cx="60" cy="56" r="3.2" fill="rgba(0,0,0,0.3)"/>
      <circle cx="73" cy="54" r="3.2" fill="rgba(0,0,0,0.3)"/>
      <circle cx="38" cy="65" r="3.2" fill="rgba(0,0,0,0.3)"/>
      <circle cx="51" cy="67" r="3.2" fill="rgba(0,0,0,0.3)"/>
      <circle cx="64" cy="64" r="3.2" fill="rgba(0,0,0,0.3)"/>
      <circle cx="45" cy="76" r="3.2" fill="rgba(0,0,0,0.3)"/>
      <circle cx="57" cy="74" r="3.2" fill="rgba(0,0,0,0.3)"/>

      <defs>
        <radialGradient id="bgGrad" cx="30%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0.15"/>
        </radialGradient>
        <radialGradient id="ballGrad" cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#e8f840"/>
          <stop offset="55%" stopColor="#B6FF2E"/>
          <stop offset="100%" stopColor="#86c41a"/>
        </radialGradient>
      </defs>
    </svg>
  );
}
