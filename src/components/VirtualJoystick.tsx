import React, { useRef, useState, useCallback, useEffect } from 'react';

interface VirtualJoystickProps {
  onMove: (vector: { x: number; y: number }) => void;
  onEnd: () => void;
  disabled?: boolean;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onMove,
  onEnd,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState<boolean>(false);

  // Maximum deflection radius in pixels
  const MAX_RADIUS = 38;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || activePointerIdRef.current !== null) return;
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture not supported
    }
    activePointerIdRef.current = e.pointerId;
    setIsActive(true);
    updateJoystick(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    updateJoystick(e.clientX, e.clientY);
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }
    activePointerIdRef.current = null;
    setIsActive(false);
    setKnobPos({ x: 0, y: 0 });
    onEnd();
  };

  const updateJoystick = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = clientX - centerX;
      const deltaY = clientY - centerY;
      const distance = Math.hypot(deltaX, deltaY);

      if (distance === 0) {
        setKnobPos({ x: 0, y: 0 });
        onMove({ x: 0, y: 0 });
        return;
      }

      // Clamp to MAX_RADIUS
      const clampedDist = Math.min(distance, MAX_RADIUS);
      const angle = Math.atan2(deltaY, deltaX);

      const knobX = Math.cos(angle) * clampedDist;
      const knobY = Math.sin(angle) * clampedDist;

      setKnobPos({ x: knobX, y: knobY });

      // Normalized vector between -1 and 1
      const normalizedX = knobX / MAX_RADIUS;
      const normalizedY = knobY / MAX_RADIUS;

      onMove({ x: normalizedX, y: normalizedY });
    },
    [onMove, MAX_RADIUS]
  );

  // Clean up if unmounted while active
  useEffect(() => {
    return () => {
      activePointerIdRef.current = null;
      onEnd();
    };
  }, [onEnd]);

  return (
    <div
      ref={containerRef}
      id="virtual-joystick-pad"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
      className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 transition-colors select-none touch-none flex items-center justify-center backdrop-blur-md shadow-2xl ${
        isActive
          ? 'bg-emerald-950/60 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.5)]'
          : 'bg-black/50 border-emerald-500/30 hover:border-emerald-500/60'
      }`}
      style={{
        touchAction: 'none',
      }}
    >
      {/* Outer Tactical Crosshair & Compass markings */}
      <div className="absolute inset-0 pointer-events-none rounded-full flex items-center justify-center">
        {/* Cardinal tick lines */}
        <div className="absolute top-1 w-0.5 h-2 bg-emerald-400/50" />
        <div className="absolute bottom-1 w-0.5 h-2 bg-emerald-400/50" />
        <div className="absolute left-1 w-2 h-0.5 bg-emerald-400/50" />
        <div className="absolute right-1 w-2 h-0.5 bg-emerald-400/50" />

        {/* Concentric inner radar circle */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-dashed border-emerald-500/25" />
      </div>

      {/* Floating Joystick Thumb Knob */}
      <div
        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center pointer-events-none transition-transform duration-75 ease-out shadow-lg ${
          isActive
            ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 border-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.8)] scale-105'
            : 'bg-gradient-to-br from-slate-800 to-slate-950 border-emerald-500/60 shadow-[0_0_10px_rgba(0,0,0,0.8)]'
        }`}
        style={{
          transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
        }}
      >
        {/* Center tactical crosshair dot */}
        <div
          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
            isActive ? 'border-black bg-emerald-100' : 'border-emerald-400/80 bg-emerald-950'
          }`}
        >
          <div
            className={`w-1 h-1 rounded-full ${isActive ? 'bg-black' : 'bg-emerald-400'}`}
          />
        </div>
      </div>

      {/* Joystick Label */}
      <div className="absolute -bottom-4 sm:-bottom-5 pointer-events-none text-[8px] sm:text-[9px] font-mono font-black tracking-wider text-emerald-400/80 uppercase bg-black/70 px-1.5 py-0.2 rounded border border-emerald-500/30">
        AIM
      </div>
    </div>
  );
};
