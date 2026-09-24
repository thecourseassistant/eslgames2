import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Crosshair, Award, Flame, Play, Shield, Skull, RotateCcw } from 'lucide-react';
import { VOCABULARY_LIST, PUBG_BG } from './data';
import { ActiveTarget, GameState, LeaderboardEntry } from './types';
import { sounds } from './utils/audio';
import { getLeaderboard, saveLeaderboardEntry, fetchCloudAudio, syncAudioToCloud } from './utils/leaderboard';
import { SniperScope } from './components/SniperScope';
import { Leaderboard } from './components/Leaderboard';
import { VirtualJoystick } from './components/VirtualJoystick';

const TARGETS_ON_SCREEN = 4; // 4 targets on screen for challenge
const MAGAZINE_CAPACITY = 4; // 4 bullets in magazine

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');

  // Scoring & Stats
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [shotsFired, setShotsFired] = useState(0);
  const [hits, setHits] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Magazine & Ammo (4 bullets)
  const [ammo, setAmmo] = useState(MAGAZINE_CAPACITY);
  const [isReloading, setIsReloading] = useState(false);
  const [reloadTimer, setReloadTimer] = useState(3);

  // Reload countdown timer effect
  useEffect(() => {
    let interval: number | null = null;
    if (isReloading) {
      interval = window.setInterval(() => {
        setReloadTimer((prev) => {
          if (prev <= 1) {
            setAmmo(MAGAZINE_CAPACITY);
            setIsReloading(false);
            if (interval) clearInterval(interval);
            return 3;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isReloading]);

  // Vocabulary progression
  const [remainingVocab, setRemainingVocab] = useState<typeof VOCABULARY_LIST>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);

  // Scope Aim & Smooth Sensitivity
  const [scopePos, setScopePos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [scopeSensitivity, setScopeSensitivity] = useState<number>(0.45); // Smooth precision sensitivity
  const [isFiring, setIsFiring] = useState(false);
  const [feedbackEffect, setFeedbackEffect] = useState<{ type: 'HIT' | 'MISS' | 'RELOAD'; text: string; id: number } | null>(null);

  const scopePosRef = useRef<{ x: number; y: number }>({ x: 50, y: 50 });
  useEffect(() => {
    scopePosRef.current = scopePos;
  }, [scopePos]);

  // Active targets on battlefield
  const [targets, setTargets] = useState<ActiveTarget[]>([]);

  // Sound toggle
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Leaderboard state
  const [leaderboardList, setLeaderboardList] = useState<LeaderboardEntry[]>([]);
  const [currentEntryId, setCurrentEntryId] = useState<string | undefined>(undefined);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'no_url' | 'failed' | undefined>(undefined);
  const [lastRoundStats, setLastRoundStats] = useState<{
    score: number;
    accuracy: number;
    totalTime: number;
    correct: number;
    totalQuestions: number;
  } | undefined>(undefined);

  const battlefieldRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  // Virtual Joystick state
  const joystickVectorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isJoystickActiveRef = useRef<boolean>(false);

  const handleJoystickMove = useCallback((vector: { x: number; y: number }) => {
    joystickVectorRef.current = vector;
    isJoystickActiveRef.current = vector.x !== 0 || vector.y !== 0;
  }, []);

  const handleJoystickEnd = useCallback(() => {
    joystickVectorRef.current = { x: 0, y: 0 };
    isJoystickActiveRef.current = false;
  }, []);

  // Load initial leaderboard and sync shared cloud audio across devices
  useEffect(() => {
    setLeaderboardList(getLeaderboard());
    fetchCloudAudio().then((res) => {
      if (res) {
        if (res.fireSound) sounds.setCustomFireSound(res.fireSound);
        if (res.reloadSound) sounds.setCustomReloadSound(res.reloadSound);
      }
    });
  }, []);

  // Current active target prompt
  const currentPrompt = remainingVocab[currentPromptIndex] || null;

  // Spawn dynamic targets ensuring correct one is present (faster motion speeds)
  const spawnTargetsForPrompt = (correctItem: typeof VOCABULARY_LIST[0], allItems: typeof VOCABULARY_LIST) => {
    if (!correctItem) return;

    // Pick 3 distractors from all remaining items (making total of 4 targets on screen)
    const distractors = allItems
      .filter((item) => item.id !== correctItem.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, TARGETS_ON_SCREEN - 1);

    const targetCandidates = [correctItem, ...distractors].sort(() => Math.random() - 0.5);

    // Distribute across screen sectors
    const zoneWidth = 76 / TARGETS_ON_SCREEN;
    const newTargets: ActiveTarget[] = targetCandidates.map((vocab, idx) => {
      const baseX = 12 + idx * zoneWidth + Math.random() * (zoneWidth - 6);
      const baseY = 22 + Math.random() * 52;

      // Smooth, steady target velocities
      const dirX = Math.random() > 0.5 ? 1 : -1;
      const dirY = Math.random() > 0.5 ? 1 : -1;
      const speedMagnitudeX = 0.11 + Math.random() * 0.10;
      const speedMagnitudeY = 0.09 + Math.random() * 0.09;

      return {
        id: `${vocab.id}-${Date.now()}-${Math.random()}`,
        vocabId: vocab.id,
        x: baseX,
        y: baseY,
        radius: 65,
        speedX: dirX * speedMagnitudeX,
        speedY: dirY * speedMagnitudeY,
        scale: 1.0 + Math.random() * 0.1,
        condition: vocab.condition,
        phrase: vocab.phrase,
        image: vocab.image,
      };
    });

    setTargets(newTargets);
  };

  // Format count-up timer as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Start round
  const startNewGame = useCallback(() => {
    const shuffled = [...VOCABULARY_LIST].sort(() => Math.random() - 0.5);
    setRemainingVocab(shuffled);
    setCurrentPromptIndex(0);
    setScore(0);
    setStreak(0);
    setShotsFired(0);
    setHits(0);
    setElapsedTime(0);
    setScopePos({ x: 50, y: 50 });
    setAmmo(MAGAZINE_CAPACITY);
    setIsReloading(false);
    setFeedbackEffect(null);
    setCurrentEntryId(undefined);

    spawnTargetsForPrompt(shuffled[0], shuffled);
    setGameState('PLAYING');
  }, []);

  // Smooth targets & precision scope animation loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const gameLoop = () => {
      // Update scope position smoothly from Virtual Joystick using scopeSensitivity
      if (isJoystickActiveRef.current) {
        const vx = joystickVectorRef.current.x;
        const vy = joystickVectorRef.current.y;
        if (vx !== 0 || vy !== 0) {
          setScopePos((prev) => {
            const nextX = Math.max(5, Math.min(95, prev.x + vx * scopeSensitivity));
            const nextY = Math.max(5, Math.min(95, prev.y + vy * scopeSensitivity));
            return { x: nextX, y: nextY };
          });
        }
      }

      setTargets((prevTargets) =>
        prevTargets.map((t) => {
          let newX = t.x + t.speedX;
          let newY = t.y + t.speedY;
          let newSpeedX = t.speedX;
          let newSpeedY = t.speedY;

          if (newX < 10) {
            newX = 10;
            newSpeedX = Math.abs(newSpeedX);
          } else if (newX > 90) {
            newX = 90;
            newSpeedX = -Math.abs(newSpeedX);
          }

          if (newY < 16) {
            newY = 16;
            newSpeedY = Math.abs(newSpeedY);
          } else if (newY > 78) {
            newY = 78;
            newSpeedY = -Math.abs(newSpeedY);
          }

          return {
            ...t,
            x: newX,
            y: newY,
            speedX: newSpeedX,
            speedY: newSpeedY,
          };
        })
      );

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, scopeSensitivity]);

  // Finish round
  const finishGame = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    const finalAccuracy = shotsFired > 0 ? (hits / shotsFired) * 100 : 0;
    const stats = {
      score,
      accuracy: finalAccuracy,
      totalTime: elapsedTime,
      correct: hits,
      totalQuestions: VOCABULARY_LIST.length,
    };
    setLastRoundStats(stats);
    setGameState('ROUND_OVER');
  }, [score, shotsFired, hits, elapsedTime]);

  // Count-up timer (No time limit)
  useEffect(() => {
    if (gameState === 'PLAYING') {
      timerIntervalRef.current = window.setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [gameState]);

  // Reload handler
  const handleReload = () => {
    if (isReloading || ammo === MAGAZINE_CAPACITY) return;
    setIsReloading(true);
    setReloadTimer(3);
    if (soundEnabled) {
      sounds.playReload();
    }
  };

  // Fire shot on click / tap (No hold-breath required)
  const triggerFireAt = (aimX: number, aimY: number) => {
    if (gameState !== 'PLAYING' || !currentPrompt || !battlefieldRef.current) return;

    // Check if reloading
    if (isReloading) {
      setFeedbackEffect({
        type: 'MISS',
        text: 'RELOADING IN PROGRESS...',
        id: Date.now(),
      });
      return;
    }

    // Check ammo in magazine
    if (ammo <= 0) {
      if (soundEnabled) {
        sounds.playDryFire();
      }
      setFeedbackEffect({
        type: 'MISS',
        text: '*CLICK* OUT OF AMMO! TAP RELOAD',
        id: Date.now(),
      });
      return;
    }

    // Consume 1 bullet
    setAmmo((prev) => prev - 1);

    if (soundEnabled) {
      sounds.playShot();
    }

    setIsFiring(true);
    setTimeout(() => setIsFiring(false), 140);

    setShotsFired((prev) => prev + 1);

    const rect = battlefieldRef.current.getBoundingClientRect();
    const aimPxX = (aimX / 100) * rect.width;
    const aimPxY = (aimY / 100) * rect.height;

    let hitTarget: ActiveTarget | null = null;
    let minDistance = Infinity;

    for (const target of targets) {
      const targetPxX = (target.x / 100) * rect.width;
      const targetPxY = (target.y / 100) * rect.height;
      const dist = Math.hypot(aimPxX - targetPxX, aimPxY - targetPxY);

      if (dist < 90 && dist < minDistance) {
        hitTarget = target;
        minDistance = dist;
      }
    }

    if (hitTarget) {
      if (hitTarget.vocabId === currentPrompt.id) {
        // Elimination confirmed
        if (soundEnabled) {
          sounds.playHit();
        }

        const streakBonus = streak * 25;
        const speedBonus = Math.max(10, 100 - elapsedTime * 2);
        const pointsAwarded = 100 + streakBonus + speedBonus;

        setScore((prev) => prev + pointsAwarded);
        setHits((prev) => prev + 1);
        setStreak((prev) => prev + 1);
        setFeedbackEffect({
          type: 'HIT',
          text: `+${pointsAwarded} TARGET CONFIRMED!`,
          id: Date.now(),
        });

        const nextIndex = currentPromptIndex + 1;
        if (nextIndex >= remainingVocab.length) {
          setTimeout(() => {
            finishGame();
          }, 600);
        } else {
          setCurrentPromptIndex(nextIndex);
          spawnTargetsForPrompt(remainingVocab[nextIndex], remainingVocab);
        }
      } else {
        // Target mismatch
        if (soundEnabled) {
          sounds.playMiss();
        }
        setStreak(0);
        setScore((prev) => Math.max(0, prev - 35));
        setFeedbackEffect({
          type: 'MISS',
          text: `MISMATCH! Struck "${hitTarget.condition}". Target was: "${currentPrompt.condition}"`,
          id: Date.now(),
        });
      }
    } else {
      // Miss
      if (soundEnabled) {
        sounds.playMiss();
      }
      setStreak(0);
      setScore((prev) => Math.max(0, prev - 10));
      setFeedbackEffect({
        type: 'MISS',
        text: 'MISSED',
        id: Date.now(),
      });
    }
  };

  const handleShootButtonClick = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerFireAt(scopePosRef.current.x, scopePosRef.current.y);
  };

  const handleSaveStudentRecord = async (studentName: string) => {
    if (!lastRoundStats) return;
    const result = await saveLeaderboardEntry({
      studentName,
      score: lastRoundStats.score,
      accuracy: lastRoundStats.accuracy,
      totalTime: lastRoundStats.totalTime,
    });
    setLeaderboardList(getLeaderboard());
    setCurrentEntryId(result.entry.id);
    setSyncStatus(result.cloudSyncStatus);
  };

  return (
    <div className="flex flex-col h-full w-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-black text-slate-100 select-none font-sans">
      {/* Top HUD Bar - Compact on all devices including rotated landscape */}
      <header className="h-10 sm:h-12 md:h-14 px-2 sm:px-4 md:px-6 bg-slate-950/95 border-b border-amber-500/30 flex items-center justify-between z-40 backdrop-blur shrink-0">
        {/* PUBG Military Title */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded bg-amber-500/20 border border-amber-500/60 flex items-center justify-center text-amber-400">
            <Crosshair className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h1 className="text-[11px] sm:text-xs md:text-sm font-black tracking-wider uppercase text-amber-400 flex items-center gap-1.5">
              <span className="line-through decoration-red-500 decoration-2 text-slate-400 opacity-75">BATTLEGROUNDS</span>
              <span className="text-amber-400 font-black">DELTA FORCE</span>
              <span className="hidden xs:inline text-[8px] sm:text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                SNIPER
              </span>
            </h1>
          </div>
        </div>

        {/* Real-time stats during game */}
        {gameState === 'PLAYING' && (
          <div className="flex items-center gap-2.5 sm:gap-5 font-mono text-[11px] sm:text-xs">
            <div className="flex flex-col items-center">
              <span className="text-[8px] uppercase tracking-wider text-slate-400 font-sans leading-none">Score</span>
              <span className="font-black text-amber-400 text-xs sm:text-sm leading-tight">{score}</span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[8px] uppercase tracking-wider text-slate-400 font-sans leading-none">Time</span>
              <span className="font-black text-xs sm:text-sm leading-tight text-emerald-400">
                {formatTime(elapsedTime)}
              </span>
            </div>

            <div className="hidden md:flex flex-col items-center">
              <span className="text-[8px] uppercase tracking-wider text-slate-400 font-sans leading-none">Streak</span>
              <span className="font-bold text-orange-400 flex items-center gap-0.5 text-xs">
                <Flame className="w-3 h-3 fill-orange-400 text-orange-400" />
                {streak}x
              </span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[8px] uppercase tracking-wider text-slate-400 font-sans leading-none">Target</span>
              <span className="font-bold text-cyan-400 text-xs sm:text-sm leading-tight">
                {currentPromptIndex + 1}/{remainingVocab.length}
              </span>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            id="sound-toggle-btn"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 sm:p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition"
            title={soundEnabled ? 'Mute Audio' : 'Enable Audio'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />}
          </button>

          <button
            id="open-leaderboard-btn"
            onClick={() => setGameState('LEADERBOARD')}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-bold rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/50 transition"
          >
            <Award className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Leaderboard</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 min-h-0 relative flex flex-col overflow-hidden bg-black">
        {/* GAMEPLAY ACTIVE */}
        {gameState === 'PLAYING' && (
          <>
            {/* Active Mission Banner - Ultra compact */}
            <div className="w-full bg-black/90 border-b border-amber-500/40 px-2.5 py-1 sm:py-1.5 flex items-center justify-between z-30 shadow-lg shrink-0">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="px-1.5 py-0.2 text-[8px] sm:text-[9px] uppercase font-mono font-black tracking-widest bg-amber-500 text-black rounded-xs">
                  TARGET
                </span>
                <p className="text-xs sm:text-sm md:text-base font-bold text-amber-200 tracking-wide truncate">
                  &ldquo;{currentPrompt?.phrase}&rdquo;
                </p>
              </div>

              <button
                onClick={() => currentPrompt && sounds.speak(currentPrompt.phrase)}
                className="p-1 text-xs text-amber-400 hover:text-amber-300 bg-amber-950/60 rounded border border-amber-500/40 flex items-center gap-1 shrink-0"
                title="Pronounce prompt"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[9px] font-mono">REPEAT</span>
              </button>
            </div>

            {/* Battlefield Area: Pitch Black Except Inside Scope Vision */}
            <div
              ref={battlefieldRef}
              id="sniper-battlefield"
              className="flex-1 min-h-0 relative w-full overflow-hidden touch-none select-none bg-black"
            >
              {/* Background PUBG Landscape Layer */}
              <div
                className="absolute inset-0 pointer-events-none opacity-40 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${PUBG_BG})`,
                }}
              />

              {/* Feedback Pop-up Message */}
              {feedbackEffect && (
                <div
                  key={feedbackEffect.id}
                  className={`absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded text-[10px] sm:text-xs font-black tracking-wider uppercase pointer-events-none z-50 transition-all duration-300 shadow-2xl border ${
                    feedbackEffect.type === 'HIT'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-emerald-500/50 animate-bounce'
                      : feedbackEffect.type === 'RELOAD'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-cyan-500/50 animate-pulse'
                      : 'bg-red-600 text-white border-red-400 shadow-red-600/50'
                  }`}
                >
                  {feedbackEffect.text}
                </div>
              )}

              {/* 4 Active Targets (Aim with joystick/crosshair or tap battlefield, tap FIRE to shoot) */}
              {targets.map((target) => (
                <div
                  key={target.id}
                  id={`target-${target.vocabId}`}
                  style={{
                    left: `${target.x}%`,
                    top: `${target.y}%`,
                    transform: `translate(-50%, -50%) scale(${target.scale})`,
                  }}
                  className="absolute z-10 pointer-events-none select-none transition-transform duration-75"
                >
                  <div className="relative w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-3xl bg-white p-2 shadow-2xl border-2 border-slate-300 overflow-hidden flex items-center justify-center">
                    <img
                      src={target.image}
                      alt={target.condition}
                      className="w-full h-full object-contain pointer-events-none rounded-2xl"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/85 text-[8px] sm:text-[10px] font-mono text-amber-400 font-bold pointer-events-none">
                      AIM
                    </div>
                  </div>
                </div>
              ))}

              {/* Clean Sniper Scope Optical Sight */}
              <SniperScope x={scopePos.x} y={scopePos.y} isFiring={isFiring} />

              {/* PUBG Mobile Style Virtual Joystick on Bottom-Left */}
              <div
                className="absolute z-40 select-none pointer-events-auto"
                style={{
                  bottom: 'max(0.6rem, env(safe-area-inset-bottom, 0.6rem))',
                  left: 'max(0.6rem, env(safe-area-inset-left, 0.6rem))',
                }}
              >
                <VirtualJoystick onMove={handleJoystickMove} onEnd={handleJoystickEnd} />
              </div>

              {/* PUBG Mobile Style Ergonomic Controls on Bottom-Right: MAG HUD + Reload + Fire */}
              <div
                className="absolute z-40 flex flex-col items-end gap-1.5 sm:gap-2 select-none pointer-events-auto"
                style={{
                  bottom: 'max(0.6rem, env(safe-area-inset-bottom, 0.6rem))',
                  right: 'max(0.6rem, env(safe-area-inset-right, 0.6rem))',
                }}
              >
                {/* Number of bullets in magazine */}
                <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/20 shadow-lg">
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs font-mono font-black">
                    <span className="text-[8px] text-slate-400 tracking-wider">MAG</span>
                    <span className={`text-sm sm:text-base ${ammo === 0 ? 'text-red-500 animate-pulse' : 'text-amber-400'}`}>
                      {ammo}
                    </span>
                    <span className="text-slate-500 text-[10px]">/{MAGAZINE_CAPACITY}</span>
                  </div>

                  {/* Visual Bullet Cartridge Indicators */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: MAGAZINE_CAPACITY }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 sm:w-2.5 h-3.5 sm:h-4 rounded-xs border transition-all ${
                          i < ammo
                            ? 'bg-gradient-to-t from-amber-600 via-amber-400 to-amber-300 border-amber-200 shadow-[0_0_5px_rgba(245,158,11,0.6)]'
                            : 'bg-black/60 border-slate-700/60 opacity-30'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Tactical Buttons Row: Reload & Fire */}
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Reload Button with countdown clock inside */}
                  <button
                    id="pubg-reload-btn"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleReload();
                    }}
                    disabled={isReloading || ammo === MAGAZINE_CAPACITY}
                    className={`w-13 h-13 sm:w-16 sm:h-16 rounded-full flex items-center justify-center backdrop-blur-md border-2 transition-all duration-100 select-none shadow-xl active:scale-90 ${
                      isReloading
                        ? 'bg-amber-500/30 border-amber-400 text-amber-300'
                        : ammo === 0
                        ? 'bg-red-500/40 border-red-400 text-white animate-bounce shadow-red-500/40'
                        : ammo < MAGAZINE_CAPACITY
                        ? 'bg-black/45 hover:bg-black/65 border-white/40 text-slate-200'
                        : 'bg-black/25 border-white/20 text-slate-500 opacity-60'
                    }`}
                    title="Reload Magazine"
                  >
                    {isReloading ? (
                      <span className="text-sm sm:text-base font-black font-mono text-amber-300 animate-pulse">
                        {reloadTimer}s
                      </span>
                    ) : (
                      <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
                    )}
                  </button>

                  {/* Fire Button (Icon only) */}
                  <button
                    id="pubg-shoot-btn"
                    onPointerDown={handleShootButtonClick}
                    className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center select-none backdrop-blur-md border-[2.5px] transition-all duration-75 shadow-2xl active:scale-95 ${
                      isFiring
                        ? 'bg-amber-400/90 border-amber-200 text-black scale-95 shadow-[0_0_35px_rgba(251,191,36,0.9)]'
                        : ammo === 0
                        ? 'bg-red-950/50 border-red-500/60 text-red-400 opacity-80'
                        : 'bg-black/50 hover:bg-black/65 border-amber-400/90 text-white shadow-[0_0_20px_rgba(0,0,0,0.9)]'
                    }`}
                  >
                    <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full border border-dashed border-white/40 flex items-center justify-center pointer-events-none">
                      <Crosshair className={`w-5 h-5 sm:w-7 sm:h-7 ${isFiring ? 'scale-110 text-black' : 'text-amber-400'}`} />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* PUBG THEMED INTRO SCREEN */}
        {gameState === 'MENU' && (
          <div
            className="flex-1 min-h-0 relative flex items-center justify-center p-2 sm:p-4 overflow-y-auto bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.85)), url(${PUBG_BG})`,
            }}
          >
            <div className="max-w-md w-full my-auto bg-black/85 border-2 border-amber-500/70 rounded-2xl p-4 sm:p-6 text-center shadow-[0_0_50px_rgba(245,158,11,0.25)] backdrop-blur-md">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-amber-500/20 border border-amber-500 flex items-center justify-center mx-auto mb-2 text-amber-400 shadow-lg shadow-amber-500/30">
                <Crosshair className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>

              <h2 className="text-xl sm:text-3xl font-black tracking-wider uppercase mb-0.5 drop-shadow-md flex items-center justify-center gap-2 flex-wrap">
                <span className="line-through decoration-red-500 decoration-3 text-slate-400 opacity-75">BATTLEGROUNDS</span>
                <span className="text-amber-400">DELTA FORCE</span>
              </h2>
              <p className="text-[10px] sm:text-xs font-mono tracking-widest text-slate-300 uppercase mb-3">
                Illness Vocabulary Night Sniper
              </p>

              {/* Mission Features */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 mb-3 text-left text-[11px] sm:text-xs text-slate-300 space-y-1 font-mono">
                <div className="flex items-center gap-2 text-amber-300">
                  <Crosshair className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Virtual Joystick on left thumb to aim scope</span>
                </div>
                <div className="flex items-center gap-2 text-amber-300">
                  <Skull className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Multi-touch: tap FIRE on right to shoot target</span>
                </div>
                <div className="flex items-center gap-2 text-amber-300">
                  <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>4-round magazine with instant reload</span>
                </div>
              </div>

              {/* START PLAYING BUTTON */}
              <button
                id="start-playing-btn"
                onClick={startNewGame}
                className="w-full py-2.5 sm:py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-base sm:text-lg tracking-widest uppercase rounded-xl transition shadow-[0_0_30px_rgba(245,158,11,0.5)] active:scale-95 flex items-center justify-center gap-2 border border-amber-200"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                START PLAYING
              </button>

              <button
                id="menu-leaderboard-btn"
                onClick={() => setGameState('LEADERBOARD')}
                className="w-full mt-2 py-1.5 text-slate-400 hover:text-amber-400 text-[11px] font-mono tracking-wider transition flex items-center justify-center gap-1 uppercase"
              >
                <Award className="w-3.5 h-3.5 text-amber-400" />
                View Leaderboard
              </button>
            </div>
          </div>
        )}

        {/* ROUND OVER */}
        {gameState === 'ROUND_OVER' && (
          <div
            className="flex-1 min-h-0 flex items-center justify-center p-2 sm:p-4 overflow-y-auto bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.9)), url(${PUBG_BG})`,
            }}
          >
            <Leaderboard
              entries={leaderboardList}
              currentEntryId={currentEntryId}
              onPlayAgain={startNewGame}
              onSaveName={handleSaveStudentRecord}
              onClearLeaderboard={() => setLeaderboardList([])}
              lastRoundStats={lastRoundStats}
              syncStatus={syncStatus}
            />
          </div>
        )}

        {/* LEADERBOARD VIEW */}
        {gameState === 'LEADERBOARD' && (
          <div
            className="flex-1 min-h-0 flex items-center justify-center p-2 sm:p-4 overflow-y-auto bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.9)), url(${PUBG_BG})`,
            }}
          >
            <Leaderboard
              entries={leaderboardList}
              currentEntryId={currentEntryId}
              onPlayAgain={startNewGame}
              onClearLeaderboard={() => setLeaderboardList([])}
            />
          </div>
        )}
      </main>
    </div>
  );
}
