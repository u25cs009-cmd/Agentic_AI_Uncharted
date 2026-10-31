import React from 'react';

interface ShaktAILogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  glow?: boolean;
}

const SIZES = {
  xs: 'w-5 h-5',
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16'
};

export const ShaktAILogo: React.FC<ShaktAILogoProps> = ({
  size = 'md',
  className = '',
  glow = false
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${SIZES[size]} ${className}`}>
      {glow && (
        <div className="absolute inset-0 rounded-2xl bg-amber-400/30 blur-md -z-10 animate-pulse" />
      )}
      <svg
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-xs"
      >
        <defs>
          <linearGradient id="shaktiGoldComp" x1="16" y1="16" x2="112" y2="112" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="40%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
          <linearGradient id="shaktiDarkComp" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0B0F17" />
          </linearGradient>
        </defs>

        {/* Outer Medallion */}
        <rect
          x="8"
          y="8"
          width="112"
          height="112"
          rx="28"
          fill="url(#shaktiDarkComp)"
          stroke="url(#shaktiGoldComp)"
          strokeWidth="3.5"
        />

        {/* Inner Ring */}
        <circle cx="64" cy="64" r="44" stroke="#F59E0B" strokeOpacity="0.25" strokeDasharray="4 4" strokeWidth="1.5" />

        {/* Power Glyph (Shakti Lightning) */}
        <path
          d="M72 24 L42 62 H62 L52 104 L86 58 H66 Z"
          fill="url(#shaktiGoldComp)"
          stroke="#FFFBEB"
          strokeWidth="1.2"
        />

        {/* Central Core Node */}
        <circle cx="64" cy="60" r="4.5" fill="#FFFFFF" />
        <circle cx="64" cy="60" r="7.5" stroke="#FDE047" strokeWidth="1.5" strokeOpacity="0.8" />
      </svg>
    </div>
  );
};
