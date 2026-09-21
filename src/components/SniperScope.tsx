import React from 'react';

interface SniperScopeProps {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  isFiring: boolean;
}

export const SniperScope: React.FC<SniperScopeProps> = ({ x, y, isFiring }) => {
  const effectiveX = Math.max(4, Math.min(96, x));
  const effectiveY = Math.max(4, Math.min(96, y));

  return (
    <>
      {/* 
        Night Vision Pitch Black Mask with Optical Aperture:
        Surrounding area is pitch black, only revealing the circular scope sight.
      */}
      <div
        className="absolute inset-0 pointer-events-none z-20 overflow-hidden"
        style={{
          background: `radial-gradient(circle 95px at ${effectiveX}% ${effectiveY}%, transparent 0%, transparent 88px, rgba(0, 0, 0, 0.7) 94px, rgba(0, 0, 0, 0.99) 105px)`,
        }}
      />

      {/* Crosshair & Optical Scope Reticle positioned at (effectiveX, effectiveY) */}
      <div
        className="absolute pointer-events-none select-none z-30 transition-transform duration-75 ease-out"
        style={{
          left: `${effectiveX}%`,
          top: `${effectiveY}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Outer Scope Housing Ring */}
        <div
          className={`relative w-48 h-48 sm:w-56 sm:h-56 rounded-full border-[3px] flex items-center justify-center transition-all duration-100 ${
            isFiring
              ? 'scale-95 border-amber-400 shadow-[0_0_60px_rgba(251,191,36,0.85)]'
              : 'border-emerald-500/90 shadow-[0_0_35px_rgba(16,185,129,0.35)]'
          }`}
          style={{
            background:
              'radial-gradient(circle, rgba(16, 185, 129, 0.02) 30%, rgba(5, 15, 10, 0.15) 80%, rgba(0, 0, 0, 0.55) 100%)',
          }}
        >
          {/* Tactical Crosshair Horizontal Bar */}
          <div className="absolute w-full h-[1.5px] bg-emerald-400/90" />
          {/* Tactical Crosshair Vertical Bar */}
          <div className="absolute h-full w-[1.5px] bg-emerald-400/90" />

          {/* Sub Mil-dot Graduations */}
          <div className="absolute w-32 h-[1px] bg-emerald-300/40" />
          <div className="absolute h-32 w-[1px] bg-emerald-300/40" />

          {/* Precision Center Ring (Clean reticle without any red dot) */}
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-emerald-400/70 flex items-center justify-center pointer-events-none" />

          {/* Subtle tactical elevation marks */}
          <div className="absolute left-3 text-[9px] font-mono text-emerald-400/60 font-bold select-none">
            -2
          </div>
          <div className="absolute right-3 text-[9px] font-mono text-emerald-400/60 font-bold select-none">
            +2
          </div>

          {/* Corner Framing Notches */}
          <div className="absolute top-4 left-4 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-400" />
          <div className="absolute top-4 right-4 w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-400" />
          <div className="absolute bottom-4 left-4 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-400" />
          <div className="absolute bottom-4 right-4 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-400" />
        </div>
      </div>
    </>
  );
};
