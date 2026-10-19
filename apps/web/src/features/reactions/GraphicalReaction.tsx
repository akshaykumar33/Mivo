'use client';

import * as React from 'react';

export type ReactionSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

const SIZE_MAP: Record<ReactionSize, { width: number; height: number; classStr: string }> = {
  xs: { width: 14, height: 14, classStr: 'w-3.5 h-3.5' },
  sm: { width: 18, height: 18, classStr: 'w-4.5 h-4.5' },
  md: { width: 22, height: 22, classStr: 'w-5.5 h-5.5' },
  lg: { width: 28, height: 28, classStr: 'w-7 h-7' },
  xl: { width: 36, height: 36, classStr: 'w-9 h-9' },
  '2xl': { width: 44, height: 44, classStr: 'w-11 h-11' },
  '3xl': { width: 56, height: 56, classStr: 'w-14 h-14' },
};

/* ═══════════════════════════════════════════════════════════════════════════════════
   1. HEART (Vibrant 3D Glossy Crimson Heart)
   ═══════════════════════════════════════════════════════════════════════════════════ */
const HeartReaction: React.FC<{ size?: ReactionSize; className?: string }> = ({ size = 'md', className = '' }) => {
  const { width, height } = SIZE_MAP[size];
  const id = React.useId();
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none flex-shrink-0 transition-transform ${className}`}
    >
      <defs>
        <radialGradient id={`hg1-${id}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FF4D6D" />
          <stop offset="45%" stopColor="#E11D48" />
          <stop offset="85%" stopColor="#BE123C" />
          <stop offset="100%" stopColor="#881337" />
        </radialGradient>
        <linearGradient id={`hl1-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <filter id={`hglow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#DC2626" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter={`url(#hglow-${id})`}>
        {/* Main Heart Body */}
        <path
          d="M18 31.5C18 31.5 4.5 22.8 4.5 13.5C4.5 8.5 8.5 4.5 13.5 4.5C16.2 4.5 18 6.5 18 6.5C18 6.5 19.8 4.5 22.5 4.5C27.5 4.5 31.5 8.5 31.5 13.5C31.5 22.8 18 31.5 18 31.5Z"
          fill={`url(#hg1-${id})`}
        />
        {/* Top-Left Specular Light Highlight */}
        <path
          d="M10 8C7.5 10 6.5 12.5 6.5 14.5C6.5 15.2 6.8 15.5 7.5 15C8.8 14 11 11.5 13 10C14 9.2 13.5 8 12.2 8C11.4 8 10.6 8 10 8Z"
          fill={`url(#hl1-${id})`}
        />
      </g>
    </svg>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════════
   2. THUMBS UP (Modern Azure / Golden 3D Like Hand)
   ═══════════════════════════════════════════════════════════════════════════════════ */
const ThumbsUpReaction: React.FC<{ size?: ReactionSize; className?: string }> = ({ size = 'md', className = '' }) => {
  const { width, height } = SIZE_MAP[size];
  const id = React.useId();
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none flex-shrink-0 transition-transform ${className}`}
    >
      <defs>
        <linearGradient id={`tg1-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>
        <linearGradient id={`tcuff-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
        <filter id={`tglow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0284C7" floodOpacity="0.4" />
        </filter>
      </defs>
      <g filter={`url(#tglow-${id})`}>
        {/* Wrist Cuff */}
        <rect x="4" y="16" width="6" height="15" rx="3" fill={`url(#tcuff-${id})`} />
        {/* Hand and Fingers */}
        <path
          d="M12 16.5C12 16.5 13 10 15.5 7C17 5.2 19 5.5 19.5 7C20.2 9.2 18.5 13.5 18.5 14.5H27C29 14.5 30.5 16 30 18L28 27C27.5 29 25.5 30.5 23.5 30.5H12V16.5Z"
          fill={`url(#tg1-${id})`}
        />
        {/* Finger Separation Accents */}
        <path d="M19 18.5H28" stroke="#BAE6FD" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
        <path d="M18.5 22.5H27" stroke="#BAE6FD" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
        <path d="M18 26.5H25" stroke="#BAE6FD" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
        {/* Thumb Specular Highlight */}
        <path d="M16 8C16.8 6.5 17.8 6.8 18.2 7.8C18.8 9.5 17.5 12.8 17.5 13.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
      </g>
    </svg>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════════
   3. FIRE (Radiant Dual-Core Blaze)
   ═══════════════════════════════════════════════════════════════════════════════════ */
const FireReaction: React.FC<{ size?: ReactionSize; className?: string }> = ({ size = 'md', className = '' }) => {
  const { width, height } = SIZE_MAP[size];
  const id = React.useId();
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none flex-shrink-0 transition-transform ${className}`}
    >
      <defs>
        <radialGradient id={`fg-outer-${id}`} cx="50%" cy="80%" r="80%">
          <stop offset="0%" stopColor="#FFAA00" />
          <stop offset="40%" stopColor="#FF4500" />
          <stop offset="85%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#991B1B" />
        </radialGradient>
        <radialGradient id={`fg-inner-${id}`} cx="50%" cy="85%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="35%" stopColor="#FFF380" />
          <stop offset="75%" stopColor="#FFC800" />
          <stop offset="100%" stopColor="#FF7700" />
        </radialGradient>
        <filter id={`fglow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#FF4500" floodOpacity="0.55" />
        </filter>
      </defs>
      <g filter={`url(#fglow-${id})`}>
        {/* Exterior Main Flame */}
        <path
          d="M17.5 4C17.5 4 20 8.5 19.5 11.5C22.5 8 24.5 9 24.5 9C24.5 9 28.5 14 27.5 21C26.5 27.5 21 31.5 16 31.5C9.5 31.5 6 26.5 6.5 19C7 13.5 11.5 8 11.5 8C11.5 8 12.5 13 14 13.5C15 9.5 17.5 4 17.5 4Z"
          fill={`url(#fg-outer-${id})`}
        />
        {/* Inner Blazing Core */}
        <path
          d="M16.5 16C16.5 16 19 19 18.5 21C20.5 19 21.5 20.5 21 23C20.5 26.5 17.5 29 15 29C11.5 29 10 26.5 10.5 22.5C11 19 14 16 14 16C14 16 14.5 18.5 15.5 18.5C16 17.5 16.5 16 16.5 16Z"
          fill={`url(#fg-inner-${id})`}
        />
        {/* Floating Spark Accents */}
        <circle cx="21" cy="6" r="1.2" fill="#FFAA00" opacity="0.9" />
        <circle cx="27" cy="11" r="1" fill="#FF5500" opacity="0.8" />
      </g>
    </svg>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════════
   4. CELEBRATE / PARTY (Party Horn & Vibrant Confetti Sparks)
   ═══════════════════════════════════════════════════════════════════════════════════ */
const PartyReaction: React.FC<{ size?: ReactionSize; className?: string }> = ({ size = 'md', className = '' }) => {
  const { width, height } = SIZE_MAP[size];
  const id = React.useId();
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none flex-shrink-0 transition-transform ${className}`}
    >
      <defs>
        <linearGradient id={`pg1-${id}`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF9F0A" />
          <stop offset="50%" stopColor="#FFD60A" />
          <stop offset="100%" stopColor="#FFA000" />
        </linearGradient>
        <filter id={`pglow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#FF9F0A" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter={`url(#pglow-${id})`}>
        {/* Party Horn Cone */}
        <path d="M5 30.5L9.5 18.5L22 26.5L8.5 32L5 30.5Z" fill={`url(#pg1-${id})`} />
        {/* Striped Accents on Cone */}
        <path d="M7 25L13.5 21.5L16 23L9 28" fill="#DC2626" opacity="0.9" />
        <path d="M12 20L18.5 16.5L20.5 18L14 23.5" fill="#7C3AED" opacity="0.85" />
        {/* Confetti Diamonds & Stars */}
        <polygon points="25,7 28,10 25,13 22,10" fill="#38BDF8" />
        <polygon points="17,5 19,7 17,9 15,7" fill="#F43F5E" />
        <polygon points="30,17 32,19 30,21 28,19" fill="#10B981" />
        <polygon points="26,22 28,24 26,26 24,24" fill="#F59E0B" />
        <circle cx="21" cy="12" r="1.8" fill="#EC4899" />
        <circle cx="28" cy="13" r="1.5" fill="#FBBF24" />
        <circle cx="15" cy="11" r="1.4" fill="#6366F1" />
        {/* Streamers */}
        <path d="M22 17C25 15 28 17 31 14" stroke="#A855F7" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M19 14C22 10 26 12 29 8" stroke="#06B6D4" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════════
   5. LAUGH / JOY (Glossy Radial Face with Blue Crystalline Teardrops)
   ═══════════════════════════════════════════════════════════════════════════════════ */
const LaughReaction: React.FC<{ size?: ReactionSize; className?: string }> = ({ size = 'md', className = '' }) => {
  const { width, height } = SIZE_MAP[size];
  const id = React.useId();
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none flex-shrink-0 transition-transform ${className}`}
    >
      <defs>
        <radialGradient id={`lg-face-${id}`} cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFF275" />
          <stop offset="65%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </radialGradient>
        <linearGradient id={`lg-tear-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7DD3FC" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <filter id={`lglow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#D97706" floodOpacity="0.4" />
        </filter>
      </defs>
      <g filter={`url(#lglow-${id})`}>
        {/* Main Golden Face */}
        <circle cx="18" cy="18" r="14" fill={`url(#lg-face-${id})`} />
        {/* Happy Closed Arc Eyes */}
        <path d="M10.5 13.5C11.5 11 14 11 15 13.5" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
        <path d="M21 13.5C22 11 24.5 11 25.5 13.5" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
        {/* Laughing Open Mouth */}
        <path d="M11 19.5C11 24.5 14 27.5 18 27.5C22 27.5 25 24.5 25 19.5H11Z" fill="#78350F" />
        <path d="M12.5 19.5H23.5C23.5 21 21.5 22 18 22C14.5 22 12.5 21 12.5 19.5Z" fill="#FFFFFF" />
        <path d="M15 25.5C16 26.5 17 27 18 27C19 27 20 26.5 21 25.5C20.5 24 15.5 24 15 25.5Z" fill="#F43F5E" />
        {/* Left Teardrop */}
        <path d="M6.5 16C5 17.5 5 20.5 6.5 21.5C8 22 9 20.5 8.5 19C8 17.5 6.5 16 6.5 16Z" fill={`url(#lg-tear-${id})`} />
        {/* Right Teardrop */}
        <path d="M29.5 16C31 17.5 31 20.5 29.5 21.5C28 22 27 20.5 27.5 19C28 17.5 29.5 16 29.5 16Z" fill={`url(#lg-tear-${id})`} />
      </g>
    </svg>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════════
   6. ROCKET (Futuristic Sleek Spacecraft with Blazing Exhaust)
   ═══════════════════════════════════════════════════════════════════════════════════ */
const RocketReaction: React.FC<{ size?: ReactionSize; className?: string }> = ({ size = 'md', className = '' }) => {
  const { width, height } = SIZE_MAP[size];
  const id = React.useId();
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none flex-shrink-0 transition-transform ${className}`}
    >
      <defs>
        <linearGradient id={`rg-body-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
        <linearGradient id={`rg-flame-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#FBBF24" />
          <stop offset="80%" stopColor="#EF4444" />
        </linearGradient>
        <filter id={`rglow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#DC2626" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter={`url(#rglow-${id})`}>
        {/* Rocket Thrust Exhaust Flame */}
        <path d="M10 23L7 30L14 27L12 25L10 23Z" fill={`url(#rg-flame-${id})`} />
        {/* Left Fin */}
        <path d="M10 18L6 23L11 24L12 20L10 18Z" fill="#DC2626" />
        {/* Right Fin */}
        <path d="M19 26L23 30L24 25L20 24L19 26Z" fill="#DC2626" />
        {/* Rocket Main Hull */}
        <path
          d="M31 5C31 5 21 6.5 15 13C12 16.5 11 20 11 21L15 25C16 25 19.5 24 23 21C29.5 15 31 5 31 5Z"
          fill={`url(#rg-body-${id})`}
        />
        {/* Rocket Nosecone Tip */}
        <path d="M31 5C31 5 27 6 25 8L28 11C30 9 31 5 31 5Z" fill="#DC2626" />
        {/* Glowing Porthole Window */}
        <circle cx="21" cy="15" r="3" fill="#38BDF8" stroke="#0284C7" strokeWidth="1" />
        <circle cx="20.2" cy="14.2" r="1" fill="#FFFFFF" opacity="0.9" />
      </g>
    </svg>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════════
   7. HUNDRED (Bold 3D Crimson 100 with Double Underline)
   ═══════════════════════════════════════════════════════════════════════════════════ */
const HundredReaction: React.FC<{ size?: ReactionSize; className?: string }> = ({ size = 'md', className = '' }) => {
  const { width, height } = SIZE_MAP[size];
  const id = React.useId();
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none flex-shrink-0 transition-transform ${className}`}
    >
      <defs>
        <linearGradient id={`100g-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="60%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>
        <filter id={`100glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#DC2626" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter={`url(#100glow-${id})`} fill={`url(#100g-${id})`}>
        {/* Digit "1" */}
        <path d="M7 11L10.5 7H13.5V23H9.5V12L7 13.5V11Z" />
        {/* First "0" */}
        <path
          d="M19 7C16 7 14.5 10 14.5 15C14.5 20 16 23 19 23C22 23 23.5 20 23.5 15C23.5 10 22 7 19 7ZM19 19.5C18 19.5 17.5 18 17.5 15C17.5 12 18 10.5 19 10.5C20 10.5 20.5 12 20.5 15C20.5 18 20 19.5 19 19.5Z"
        />
        {/* Second "0" */}
        <path
          d="M28.5 7C25.5 7 24 10 24 15C24 20 25.5 23 28.5 23C31.5 23 33 20 33 15C33 10 31.5 7 28.5 7ZM28.5 19.5C27.5 19.5 27 18 27 15C27 12 27.5 10.5 28.5 10.5C29.5 10.5 30 12 30 15C30 18 29.5 19.5 28.5 19.5Z"
        />
        {/* Double Underlines */}
        <rect x="5" y="26" width="28" height="2" rx="1" />
        <rect x="5" y="29.5" width="28" height="2" rx="1" />
      </g>
    </svg>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════════
   8. SPARKLES (Radiant 4-Point Golden Starburst)
   ═══════════════════════════════════════════════════════════════════════════════════ */
const SparklesReaction: React.FC<{ size?: ReactionSize; className?: string }> = ({ size = 'md', className = '' }) => {
  const { width, height } = SIZE_MAP[size];
  const id = React.useId();
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none flex-shrink-0 transition-transform ${className}`}
    >
      <defs>
        <radialGradient id={`sg-star-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="35%" stopColor="#FDE047" />
          <stop offset="70%" stopColor="#EAB308" />
          <stop offset="100%" stopColor="#CA8A04" />
        </radialGradient>
        <filter id={`sglow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodColor="#FBBF24" floodOpacity="0.6" />
        </filter>
      </defs>
      <g filter={`url(#sglow-${id})`}>
        {/* Large Central Star */}
        <path
          d="M18 4C18 11.5 20.5 14 28 14C20.5 14 18 16.5 18 24C18 16.5 15.5 14 8 14C15.5 14 18 11.5 18 4Z"
          fill={`url(#sg-star-${id})`}
        />
        {/* Top-Right Secondary Sparkle */}
        <path
          d="M27 18C27 21.5 28 22.5 31.5 22.5C28 22.5 27 23.5 27 27C27 23.5 26 22.5 22.5 22.5C26 22.5 27 21.5 27 18Z"
          fill="#38BDF8"
        />
        {/* Bottom-Left Mini Sparkle */}
        <path
          d="M10 22C10 24 10.5 24.5 12.5 24.5C10.5 24.5 10 25 10 27C10 25 9.5 24.5 7.5 24.5C9.5 24.5 10 24 10 22Z"
          fill="#F43F5E"
        />
      </g>
    </svg>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════════
   9. CLAP (Celebratory Hands with Motion Sparks)
   ═══════════════════════════════════════════════════════════════════════════════════ */
const ClapReaction: React.FC<{ size?: ReactionSize; className?: string }> = ({ size = 'md', className = '' }) => {
  const { width, height } = SIZE_MAP[size];
  const id = React.useId();
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none flex-shrink-0 transition-transform ${className}`}
    >
      <defs>
        <linearGradient id={`cg1-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="60%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <filter id={`cglow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#F59E0B" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter={`url(#cglow-${id})`}>
        {/* Left Hand */}
        <path
          d="M14 16C12.5 13.5 10.5 12.5 9 14C7.5 15.5 8.5 17.5 10.5 19.5L16 25L19 22L14 16Z"
          fill={`url(#cg1-${id})`}
        />
        {/* Right Hand */}
        <path
          d="M22 16C23.5 13.5 25.5 12.5 27 14C28.5 15.5 27.5 17.5 25.5 19.5L20 25L17 22L22 16Z"
          fill={`url(#cg1-${id})`}
        />
        {/* Wrists */}
        <rect x="7" y="24" width="6" height="7" rx="2" transform="rotate(-30 7 24)" fill="#E2E8F0" />
        <rect x="24" y="21" width="6" height="7" rx="2" transform="rotate(30 24 21)" fill="#E2E8F0" />
        {/* Clapping Spark Lines */}
        <path d="M18 6V11" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
        <path d="M11 9L15 12" stroke="#FBBF24" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M25 9L21 12" stroke="#FBBF24" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </svg>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════════
   10. RAISE HAND (Golden Amber Open Hand)
   ═══════════════════════════════════════════════════════════════════════════════════ */
const RaiseHandReaction: React.FC<{ size?: ReactionSize; className?: string }> = ({ size = 'md', className = '' }) => {
  const { width, height } = SIZE_MAP[size];
  const id = React.useId();
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none flex-shrink-0 transition-transform ${className}`}
    >
      <defs>
        <linearGradient id={`rhg-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <filter id={`rhglow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#F59E0B" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter={`url(#rhglow-${id})`}>
        {/* Palm & 4 Fingers */}
        <path
          d="M10 16V9.5C10 8 11.5 7 13 8.5V17M13 14V6.5C13 5 14.5 4 16 5.5V17M16 14V5.5C16 4 17.5 3 19 4.5V17M19 15V8.5C19 7 20.5 6 22 7.5V20C22 26 17 31 11 31H10M7 21C6 19 7 17 9 18L10 18.5"
          stroke={`url(#rhg-${id})`}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Raised Signal Arcs */}
        <path d="M7 6C13 1 23 1 29 6" stroke="#FBBF24" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="1 3" />
      </g>
    </svg>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════════════
   REACTION REGISTRY & HELPER
   ═══════════════════════════════════════════════════════════════════════════════════ */
export interface ReactionMeta {
  id: string;
  label: string;
  aliases: string[];
  component: React.FC<{ size?: ReactionSize; className?: string }>;
}

export const GRAPHICAL_REACTIONS: ReactionMeta[] = [
  { id: 'heart', label: 'Heart', aliases: ['❤️', 'heart', 'love'], component: HeartReaction },
  { id: 'thumbs_up', label: 'Thumbs Up', aliases: ['👍', 'thumbs_up', 'like'], component: ThumbsUpReaction },
  { id: 'fire', label: 'Fire', aliases: ['🔥', 'fire', 'lit'], component: FireReaction },
  { id: 'party', label: 'Celebrate', aliases: ['🎉', 'party', 'celebrate'], component: PartyReaction },
  { id: 'laugh', label: 'Joy', aliases: ['😂', 'laugh', 'joy', 'lol'], component: LaughReaction },
  { id: 'rocket', label: 'Rocket', aliases: ['🚀', 'rocket', 'launch'], component: RocketReaction },
  { id: 'hundred', label: '100', aliases: ['💯', 'hundred', '100'], component: HundredReaction },
  { id: 'sparkles', label: 'Sparkles', aliases: ['✨', 'sparkles', 'magic'], component: SparklesReaction },
  { id: 'clap', label: 'Clap', aliases: ['👏', 'clap', 'applause'], component: ClapReaction },
  { id: 'raise_hand', label: 'Raise Hand', aliases: ['✋', 'raise_hand', 'hand'], component: RaiseHandReaction },
];

/**
 * Normalizes any unicode emoji or key string to its canonical reaction ID.
 */
export function normalizeReactionKey(input: string): string {
  if (!input) return 'heart';
  const trimmed = input.trim();
  const matched = GRAPHICAL_REACTIONS.find(
    (r) => r.id === trimmed || r.aliases.includes(trimmed)
  );
  return matched ? matched.id : 'heart';
}

/**
 * High-fidelity Graphical Reaction Component.
 * Automatically accepts either unicode emojis (e.g. '❤️', '🔥') or canonical reaction IDs (e.g. 'heart', 'fire').
 */
export const GraphicalReaction: React.FC<{
  name: string;
  size?: ReactionSize;
  className?: string;
  title?: string;
}> = ({ name, size = 'md', className = '', title }) => {
  const normalizedId = normalizeReactionKey(name);
  const reaction = GRAPHICAL_REACTIONS.find((r) => r.id === normalizedId) || GRAPHICAL_REACTIONS[0];
  const Component = reaction.component;

  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      title={title || reaction.label}
      role="img"
      aria-label={reaction.label}
    >
      <Component size={size} />
    </span>
  );
};
