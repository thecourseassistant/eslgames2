import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Crosshair, Award, Flame, Play, Shield, Skull, RotateCcw } from 'lucide-react';
import { VOCABULARY_LIST, PUBG_BG } from './data';
import { ActiveTarget, GameState, LeaderboardEntry } from './types';
import { sounds } from './utils/audio';
import { getLeaderboard, saveLeaderboardEntry } from './utils/leaderboard';
import { SniperScope } from './components/SniperScope';
import { Leaderboard } from './components/Leaderboard';

const ROUND_TIME_LIMIT = 60; // 60 seconds round
const TARGETS_ON_SCREEN = 4; // 4 targets on screen for challenge
const MAGAZINE_CAPACITY = 4; // 4 bullets in magazine

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');

  // Scoring & Stats
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [shotsFired, setShotsFired] = useState(0);
  const [hits, setHits] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME_LIMIT);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Magazine & Ammo (4 bullets)
  const [ammo, setAmmo] = useState(MAGAZINE_CAPACITY);
  const [isReloading, setIsReloading] = useState(false);

  // Vocabulary progression
  const [remainingVocab, setRemainingVocab] = useState<typeof VOCABULARY_LIST>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);

  // Scope Aim (percentage 0-100%)
  const [scopePos, setScopePos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
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

  // Load initial leaderboard
  useEffect(() => {
    setLeaderboardList(getLeaderboard());
  }, []);

  // Current active target prompt
  const currentPrompt = remainingVocab[currentPromptIndex] || null;

  // Pronounce prompt with speech synthesis
  useEffect(() => {
    if (gameState === 'PLAYING' && currentPrompt && soundEnabled) {
      sounds.speak(currentPrompt.phrase);
    }
  }, [currentPrompt, gameState, soundEnabled]);

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

      // Faster dynamic velocities
      const dirX = Math.random() > 0.5 ? 1 : -1;
      const dirY = Math.random() > 0.5 ? 1 : -1;
      const speedMagnitudeX = 0.22 + Math.random() * 0.18; // ~2x faster than previous
      const speedMagnitudeY = 0.18 + Math.random() * 0.16;

      return {
        id: `${vocab.id}-${Date.now()}-${Math.random()}`,
        vocabId: vocab.id,
        x: baseX,
        y: baseY,
        radius: 46,
        speedX: dirX * speedMagnitudeX,
        speedY: dirY * speedMagnitudeY,
        scale: 0.95 + Math.random() * 0.1,
        condition: vocab.condition,
        phrase: vocab.phrase,
        image: vocab.image,
      };
    });

    setTargets(newTargets);
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
    setTimeLeft(ROUND_TIME_LIMIT);
    setElapsedTime(0);
    setScopePos({ x: 50, y: 50 });
    setAmmo(MAGAZINE_CAPACITY);
    setIsReloading(false);
    setFeedbackEffect(null);
    setCurrentEntryId(undefined);

    spawnTargetsForPrompt(shuffled[0], shuffled);
    setGameState('PLAYING');
  }, []);

  // Faster targets animation loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const gameLoop = () => {
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
  }, [gameState]);

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

  // Round countdown timer
  useEffect(() => {
    if (gameState === 'PLAYING') {
      timerIntervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            finishGame();
            return 0;
          }
          return prev - 1;
        });
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [gameState, finishGame]);

  // Aim handler with touch or mouse
  const handleAimPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!battlefieldRef.current) return;
    const rect = battlefieldRef.current.getBoundingClientRect();
    const pctX = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
    const pctY = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));
    setScopePos({ x: pctX, y: pctY });
  };

  // Direct target tap - aims and fires instantly on click
  const handleDirectTargetTap = (target: ActiveTarget, e: React.PointerEvent) => {
    e.stopPropagation();
    setScopePos({ x: target.x, y: target.y });
    triggerFireAt(target.x, target.y);
  };

  // Reload handler
  const handleReload = () => {
    if (isReloading || ammo === MAGAZINE_CAPACITY) return;
    setIsReloading(true);
    if (soundEnabled) {
      sounds.playReload();
    }
    setFeedbackEffect({
      type: 'RELOAD',
      text: 'RELOADING 4 ROUNDS...',
      id: Date.now(),
    });

    setTimeout(() => {
      setAmmo(MAGAZINE_CAPACITY);
      setIsReloading(false);
    }, 1100);
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

      if (dist < 65 && dist < minDistance) {
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
        const timeBonus = Math.max(10, Math.floor(timeLeft / 2));
        const pointsAwarded = 100 + streakBonus + timeBonus;

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
        text: 'MISSED TARGET! Scan the darkness.',
        id: Date.now(),
      });
    }
  };

  const handleShootButtonClick = (e: React.PointerEvent) => {
    e.preventDefault();
    triggerFireAt(scopePos.x, scopePos.y);
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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-black text-slate-100 select-none font-sans">
      {/* Top HUD Bar */}
      <header className="h-14 sm:h-16 px-3 sm:px-6 bg-slate-950/95 border-b border-amber-500/30 flex items-center justify-between z-40 backdrop-blur shrink-0">
        {/* PUBG Military Title */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-amber-500/20 border border-amber-500/60 flex items-center justify-center text-amber-400">
            <Crosshair className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-black tracking-wider uppercase text-amber-400 flex items-center gap-1.5">
              BATTLEGROUNDS
              <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                SNIPER TRAINING
              </span>
            </h1>
          </div>
        </div>

        {/* Real-time stats during game */}
        {gameState === 'PLAYING' && (
          <div className="flex items-center gap-3 sm:gap-6 font-mono text-xs sm:text-sm">
            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-sans">Score</span>
              <span className="font-black text-amber-400 text-sm sm:text-base">{score}</span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-sans">Time</span>
              <span className={`font-black text-sm sm:text-base ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
                {timeLeft}s
              </span>
            </div>

            <div className="hidden sm:flex flex-col items-center">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-sans">Streak</span>
              <span className="font-bold text-orange-400 flex items-center gap-0.5">
                <Flame className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
                {streak}x
              </span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-sans">Target</span>
              <span className="font-bold text-cyan-400">
                {currentPromptIndex + 1}/{remainingVocab.length}
              </span>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            id="sound-toggle-btn"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 sm:p-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition"
            title={soundEnabled ? 'Mute Audio' : 'Enable Audio'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          <button
            id="open-leaderboard-btn"
            onClick={() => setGameState('LEADERBOARD')}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/50 transition"
          >
            <Award className="w-4 h-4" />
            <span className="hidden sm:inline">Leaderboard</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 relative flex flex-col overflow-hidden bg-black">
        {/* GAMEPLAY ACTIVE */}
        {gameState === 'PLAYING' && (
          <>
            {/* Active Mission Banner */}
            <div className="w-full bg-black/90 border-b border-amber-500/40 px-4 py-2 flex items-center justify-between z-30 shadow-lg">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <span className="px-2 py-0.5 text-[9px] uppercase font-mono font-black tracking-widest bg-amber-500 text-black rounded-sm">
                  TARGET ILLNESS
                </span>
                <p className="text-sm sm:text-base font-bold text-amber-200 tracking-wide truncate">
                  &ldquo;{currentPrompt?.phrase}&rdquo;
                </p>
              </div>

              <button
                onClick={() => currentPrompt && sounds.speak(currentPrompt.phrase)}
                className="p-1 text-xs text-amber-400 hover:text-amber-300 bg-amber-950/60 rounded border border-amber-500/40 flex items-center gap-1 shrink-0"
                title="Pronounce prompt"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[10px] font-mono">REPEAT</span>
              </button>
            </div>

            {/* Battlefield Area: Everything Pitch Black Except Inside Scope Vision */}
            <div
              ref={battlefieldRef}
              id="sniper-battlefield"
              onPointerMove={handleAimPointer}
              onPointerDown={handleAimPointer}
              className="flex-1 relative w-full overflow-hidden cursor-crosshair touch-none select-none bg-black"
            >
              {/* Background PUBG Landscape Layer (visible when scope reveals it) */}
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
                  className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded text-xs font-black tracking-wider uppercase pointer-events-none z-50 transition-all duration-300 shadow-2xl border ${
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

              {/* 4 Active Fast-Moving Targets (hidden in darkness, revealed as scope moves over them) */}
              {targets.map((target) => (
                <div
                  key={target.id}
                  id={`target-${target.vocabId}`}
                  onPointerDown={(e) => handleDirectTargetTap(target, e)}
                  style={{
                    left: `${target.x}%`,
                    top: `${target.y}%`,
                    transform: `translate(-50%, -50%) scale(${target.scale})`,
                  }}
                  className="absolute z-10 cursor-pointer group select-none transition-transform duration-75"
                >
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-1.5 shadow-2xl border-2 border-slate-300 group-hover:border-amber-400 group-active:scale-95 transition-all overflow-hidden flex items-center justify-center">
                    <img
                      src={target.image}
                      alt={target.condition}
                      className="w-full h-full object-contain pointer-events-none rounded-xl"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-amber-400 font-bold pointer-events-none">
                      AIM
                    </div>
                  </div>
                </div>
              ))}

              {/* Clean Sniper Scope Optical Sight (No sway text, no red dot) */}
              <SniperScope x={scopePos.x} y={scopePos.y} isFiring={isFiring} />

              {/* PUBG Mobile Style Stacked Controls on Bottom-Right: Bullets -> Reload -> Fire */}
              <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-center gap-2.5 sm:gap-3 select-none">
                {/* Number of bullets above these buttons */}
                <div className="flex flex-col items-center bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 shadow-lg">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-black">
                    <span className="text-[9px] text-slate-400 tracking-wider">MAG</span>
                    <span className={`text-base sm:text-lg ${ammo === 0 ? 'text-red-500 animate-pulse' : 'text-amber-400'}`}>
                      {ammo}
                    </span>
                    <span className="text-slate-500 text-xs">/ {MAGAZINE_CAPACITY}</span>
                  </div>

                  {/* Visual Bullet Cartridge Indicators */}
                  <div className="flex items-center gap-1 mt-0.5">
                    {Array.from({ length: MAGAZINE_CAPACITY }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2.5 sm:w-3 h-5 rounded-sm border transition-all ${
                          i < ammo
                            ? 'bg-gradient-to-t from-amber-600 via-amber-400 to-amber-300 border-amber-200 shadow-[0_0_6px_rgba(245,158,11,0.6)]'
                            : 'bg-black/60 border-slate-700/60 opacity-30'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Reload Button above Fire Button */}
                <button
                  id="pubg-reload-btn"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    handleReload();
                  }}
                  disabled={isReloading || ammo === MAGAZINE_CAPACITY}
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center backdrop-blur-md border-2 transition-all duration-100 select-none shadow-xl active:scale-90 ${
                    isReloading
                      ? 'bg-amber-500/40 border-amber-400 text-amber-300 animate-spin'
                      : ammo === 0
                      ? 'bg-red-500/40 border-red-400 text-white animate-bounce shadow-red-500/40'
                      : ammo < MAGAZINE_CAPACITY
                      ? 'bg-black/40 hover:bg-black/60 border-white/40 text-slate-200'
                      : 'bg-black/20 border-white/20 text-slate-500 opacity-60'
                  }`}
                  title="Reload Magazine"
                >
                  <RotateCcw className={`w-5 h-5 sm:w-6 sm:h-6 ${isReloading ? 'animate-spin' : ''}`} />
                  <span className="text-[8px] font-black tracking-tighter uppercase font-mono mt-0.5">
                    {isReloading ? 'LOAD' : 'RELOAD'}
                  </span>
                </button>

                {/* Fire Button */}
                <button
                  id="pubg-shoot-btn"
                  onPointerDown={handleShootButtonClick}
                  className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center select-none backdrop-blur-md border-[2.5px] transition-all duration-75 shadow-2xl active:scale-95 ${
                    isFiring
                      ? 'bg-amber-400/80 border-amber-200 text-black scale-95 shadow-[0_0_40px_rgba(251,191,36,0.9)]'
                      : ammo === 0
                      ? 'bg-red-950/40 border-red-500/50 text-red-400 opacity-80'
                      : 'bg-black/40 hover:bg-black/55 border-white/50 hover:border-amber-400/90 text-white shadow-[0_0_25px_rgba(0,0,0,0.8)]'
                  }`}
                >
                  {/* PUBG Bullet / Crosshair Icon with concentric styling */}
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-dashed border-white/40 flex items-center justify-center">
                    <Crosshair className={`w-7 h-7 sm:w-8 sm:h-8 ${isFiring ? 'scale-110 text-black' : 'text-white'}`} />
                  </div>
                  <span className="text-[9px] font-black tracking-widest font-mono uppercase mt-0.5">
                    {isReloading ? 'WAIT' : ammo === 0 ? 'EMPTY' : 'FIRE'}
                  </span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* PUBG THEMED INTRO SCREEN */}
        {gameState === 'MENU' && (
          <div
            className="flex-1 relative flex items-center justify-center p-4 bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.85)), url(${PUBG_BG})`,
            }}
          >
            <div className="max-w-md w-full bg-black/85 border-2 border-amber-500/70 rounded-2xl p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(245,158,11,0.25)] backdrop-blur-md">
              <div className="w-16 h-16 rounded-xl bg-amber-500/20 border border-amber-500 flex items-center justify-center mx-auto mb-4 text-amber-400 shadow-lg shadow-amber-500/30">
                <Crosshair className="w-9 h-9" />
              </div>

              <h2 className="text-3xl sm:text-4xl font-black tracking-wider uppercase text-amber-400 mb-1 drop-shadow-md">
                BATTLEGROUNDS
              </h2>
              <p className="text-xs sm:text-sm font-mono tracking-widest text-slate-300 uppercase mb-6">
                Illness Vocabulary Night Sniper
              </p>

              {/* Mission Features */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 mb-6 text-left text-xs text-slate-300 space-y-1.5 font-mono">
                <div className="flex items-center gap-2 text-amber-300">
                  <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>4 Targets roaming faster in darkness</span>
                </div>
                <div className="flex items-center gap-2 text-amber-300">
                  <Skull className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>PUBG Mobile style Shoot & Reload controls</span>
                </div>
                <div className="flex items-center gap-2 text-amber-300">
                  <Crosshair className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>4-round magazine with instant click-to-shoot</span>
                </div>
              </div>

              {/* START PLAYING BUTTON */}
              <button
                id="start-playing-btn"
                onClick={startNewGame}
                className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-lg sm:text-xl tracking-widest uppercase rounded-xl transition shadow-[0_0_30px_rgba(245,158,11,0.5)] active:scale-95 flex items-center justify-center gap-2 border border-amber-200"
              >
                <Play className="w-6 h-6 fill-slate-950" />
                START PLAYING
              </button>

              <button
                id="menu-leaderboard-btn"
                onClick={() => setGameState('LEADERBOARD')}
                className="w-full mt-3 py-2 text-slate-400 hover:text-amber-400 text-xs font-mono tracking-wider transition flex items-center justify-center gap-1.5 uppercase"
              >
                <Award className="w-4 h-4 text-amber-400" />
                View Leaderboard
              </button>
            </div>
          </div>
        )}

        {/* ROUND OVER */}
        {gameState === 'ROUND_OVER' && (
          <div
            className="flex-1 flex items-center justify-center p-4 overflow-y-auto bg-cover bg-center"
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
            className="flex-1 flex items-center justify-center p-4 overflow-y-auto bg-cover bg-center"
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
