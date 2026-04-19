import React from 'react';

const BrandMark = ({ className = 'w-11 h-11' }) => {
  return (
    <div className={`${className} rounded-2xl border border-[#b6cbf6] bg-gradient-to-br from-[#eef4ff] via-[#e3eeff] to-[#d7e7ff] flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]`}>
      <svg viewBox="0 0 64 64" className="w-[80%] h-[80%]" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="markShield" x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2F7DFF" />
            <stop offset="1" stopColor="#1F66F4" />
          </linearGradient>
          <linearGradient id="markBallot" x1="20" y1="24" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#EAF2FF" />
          </linearGradient>
        </defs>

        <path
          d="M32 5L51 13.5V29.5C51 42.2 43.4 52.4 32 58.5C20.6 52.4 13 42.2 13 29.5V13.5L32 5Z"
          fill="url(#markShield)"
        />

        <rect x="19" y="27" width="26" height="17" rx="4.5" fill="url(#markBallot)" stroke="#AFC6F4" strokeWidth="1.4" />
        <path d="M24 32H40" stroke="#B3C9F4" strokeWidth="1.6" strokeLinecap="round" />

        <path
          d="M36.8 16.3L43.6 22.8C44.3 23.4 43.9 24.6 42.9 24.8L35.2 26.2C34.4 26.3 33.7 25.7 33.7 24.9L33.6 17.3C33.6 16.3 35.9 15.4 36.8 16.3Z"
          fill="#EAF3FF"
          transform="rotate(8 38 21)"
        />

        <path d="M23 39L28.8 44.2L40.5 32.6" stroke="#1F66F4" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

export default BrandMark;
