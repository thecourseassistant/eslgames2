import React, { useState } from 'react';
import {
  Trophy,
  Download,
  RotateCcw,
  Medal,
  Award,
  User,
  Clock,
  Target,
  FileSpreadsheet,
  Settings,
  CheckCircle2,
  Copy,
  AlertCircle,
  Lock,
  Unlock,
  Trash2,
  KeyRound,
  ShieldAlert,
  Music,
  Upload,
  Play,
} from 'lucide-react';
import { LeaderboardEntry } from '../types';
import {
  exportLeaderboardToCSV,
  getAppsScriptUrl,
  setAppsScriptUrl,
  clearLeaderboard,
  APPS_SCRIPT_TEMPLATE,
} from '../utils/leaderboard';
import { sounds } from '../utils/audio';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentEntryId?: string;
  onPlayAgain: () => void;
  onSaveName?: (name: string) => Promise<void> | void;
  onClearLeaderboard?: () => void;
  lastRoundStats?: {
    score: number;
    accuracy: number;
    totalTime: number;
    correct: number;
    totalQuestions: number;
  };
  syncStatus?: 'synced' | 'no_url' | 'failed';
}

const ADMIN_PASSWORD = '147852';

export const Leaderboard: React.FC<LeaderboardProps> = ({
  entries,
  currentEntryId,
  onPlayAgain,
  onSaveName,
  onClearLeaderboard,
  lastRoundStats,
  syncStatus,
}) => {
  const [studentName, setStudentName] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [scriptUrl, setScriptUrlState] = useState(getAppsScriptUrl());
  const [showConfig, setShowConfig] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin password & security state
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // Clear leaderboard state
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [clearSuccessMessage, setClearSuccessMessage] = useState(false);

  // Custom audio state inside settings
  const [fireFileName, setFireFileName] = useState<string | null>(null);
  const [reloadFileName, setReloadFileName] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (studentName.trim() && onSaveName && !hasSubmitted) {
      setIsSubmitting(true);
      await onSaveName(studentName.trim());
      setIsSubmitting(false);
      setHasSubmitted(true);
    }
  };

  const handleSettingsButtonClick = () => {
    if (isAdminUnlocked) {
      setShowConfig(!showConfig);
    } else {
      setShowPasswordModal(true);
      setPasswordInput('');
      setPasswordError(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminUnlocked(true);
      setShowPasswordModal(false);
      setShowConfig(true);
      setPasswordError(false);
      setPasswordInput('');
    } else {
      setPasswordError(true);
    }
  };

  const handleSaveScriptUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setAppsScriptUrl(scriptUrl.trim());
    setShowConfig(false);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleClearAllStudents = () => {
    clearLeaderboard();
    if (onClearLeaderboard) {
      onClearLeaderboard();
    }
    setShowConfirmClear(false);
    setClearSuccessMessage(true);
    setTimeout(() => setClearSuccessMessage(false), 3500);
  };

  return (
    <div
      id="leaderboard-modal"
      className="w-full max-w-xl mx-auto my-auto max-h-[95dvh] overflow-y-auto bg-slate-950/95 border-2 border-amber-500/60 rounded-2xl shadow-2xl p-3 sm:p-6 text-white backdrop-blur-md relative"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-amber-400">
              Battle Leaderboard
            </h2>
            <p className="text-xs text-slate-400">Top Sharpshooters & Fastest Times</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Password-protected Admin Settings Button */}
          <button
            id="sheet-config-toggle"
            onClick={handleSettingsButtonClick}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition ${
              isAdminUnlocked
                ? 'bg-amber-500/20 text-amber-300 border-amber-400 hover:bg-amber-500/30'
                : scriptUrl
                ? 'bg-emerald-950/90 text-emerald-400 border-emerald-600/50 hover:bg-emerald-900'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
            title={isAdminUnlocked ? 'Settings Unlocked (Admin)' : 'Admin Settings (Password Protected)'}
          >
            {isAdminUnlocked ? (
              <Unlock className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className="hidden sm:inline">Settings</span>
            <Settings className="w-3 h-3" />
          </button>

          <button
            id="export-csv-btn"
            onClick={() => exportLeaderboardToCSV(entries)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 transition"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Password Prompt Modal */}
      {showPasswordModal && (
        <div className="mb-4 p-4 rounded-xl bg-slate-900/95 border-2 border-amber-500/80 text-xs shadow-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <KeyRound className="w-4 h-4" />
              <span>Enter Admin Passcode</span>
            </div>
            <button
              onClick={() => setShowPasswordModal(false)}
              className="text-slate-400 hover:text-white text-xs font-mono"
            >
              ✕ Close
            </button>
          </div>

          <p className="text-slate-300 text-[11px] mb-3">
            Enter the 6-digit administrator password to access settings and student management:
          </p>

          <form onSubmit={handlePasswordSubmit} className="space-y-2.5">
            <div className="flex gap-2">
              <input
                id="admin-password-input"
                type="password"
                placeholder="Enter password..."
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(false);
                }}
                autoFocus
                className="flex-1 px-3 py-2 bg-black border border-slate-700 rounded-lg text-white font-mono text-sm tracking-widest focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg transition"
              >
                Unlock
              </button>
            </div>

            {passwordError && (
              <p className="text-red-400 text-xs flex items-center gap-1 font-mono">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Incorrect passcode. Access denied.
              </p>
            )}
          </form>
        </div>
      )}

      {/* Unlocked Admin Settings Panel */}
      {showConfig && isAdminUnlocked && (
        <div className="mb-4 p-4 rounded-xl bg-slate-900 border border-amber-500/50 text-xs space-y-4">
          <div className="flex items-center justify-between text-amber-400 font-bold text-sm border-b border-slate-800 pb-2">
            <span className="flex items-center gap-1.5">
              <Unlock className="w-4 h-4 text-emerald-400" /> Admin Settings
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setIsAdminUnlocked(false);
                  setShowConfig(false);
                }}
                className="text-slate-400 hover:text-amber-400 text-[11px] font-mono flex items-center gap-1"
                title="Lock settings again"
              >
                <Lock className="w-3 h-3" /> Lock
              </button>
              <button
                onClick={() => setShowConfig(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* Section 1: Google Sheet Auto-Update */}
          <div className="space-y-2">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Google Sheet Live Integration (Apps Script)</span>
            </div>

            <div className="text-slate-300 space-y-1 text-[11px] leading-relaxed">
              <p>Scores will update automatically into your Google Sheet without a server:</p>
              <ol className="list-decimal pl-4 space-y-0.5 text-slate-400 font-mono text-[10px]">
                <li>In Google Sheets: <strong>Extensions &gt; Apps Script</strong>.</li>
                <li>Paste code below, click <strong>Save</strong>, then <strong>Deploy &gt; New deployment &gt; Web app</strong>.</li>
                <li>Set access to <strong>Anyone</strong>, copy URL (ends in <code>/exec</code>) and paste below.</li>
              </ol>
            </div>

            {/* Apps Script code viewer */}
            <div className="relative">
              <pre className="p-2.5 bg-black/90 rounded border border-slate-700 text-[10px] text-emerald-300 font-mono overflow-x-auto max-h-28">
                {APPS_SCRIPT_TEMPLATE}
              </pre>
              <button
                onClick={handleCopyScript}
                className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center gap-1 text-[10px] font-mono border border-slate-600"
              >
                {copiedCode ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedCode ? 'Copied!' : 'Copy Script'}
              </button>
            </div>

            {/* Web App URL Form */}
            <form onSubmit={handleSaveScriptUrl} className="flex gap-2 pt-1">
              <input
                type="url"
                placeholder="Paste Apps Script Web App URL (https://script.google.com/macros/s/.../exec)"
                value={scriptUrl}
                onChange={(e) => setScriptUrlState(e.target.value)}
                required
                className="flex-1 px-3 py-1.5 bg-black border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs tracking-wider uppercase transition shadow-md"
              >
                Save
              </button>
            </form>
          </div>

          {/* Section 2: Student Leaderboard Data Management */}
          <div className="border-t border-slate-800 pt-3 space-y-2">
            <div className="font-bold text-red-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              <span>Leaderboard Records Management</span>
            </div>

            <p className="text-slate-400 text-[11px]">
              Need to clear student records for a new class or new test session?
            </p>

            {!showConfirmClear ? (
              <button
                id="clear-all-students-btn"
                type="button"
                onClick={() => setShowConfirmClear(true)}
                className="px-3.5 py-2 bg-red-950/80 hover:bg-red-900 text-red-300 hover:text-red-100 border border-red-700/80 rounded-lg text-xs font-bold transition flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>Remove All Students in Leaderboard</span>
              </button>
            ) : (
              <div className="p-3 bg-red-950/90 border border-red-500 rounded-lg space-y-2">
                <p className="text-red-200 font-bold text-xs">
                  Are you sure you want to delete all student records? This action is permanent.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClearAllStudents}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded font-bold text-xs transition uppercase tracking-wider"
                  >
                    Yes, Delete All
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmClear(false)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium text-xs transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Custom Weapon Sound Effects */}
          <div className="border-t border-slate-800 pt-3 space-y-3">
            <div className="font-bold text-amber-400 flex items-center gap-1.5">
              <Music className="w-4 h-4 text-amber-400" />
              <span>Custom Weapon Sound Effects</span>
            </div>

            <p className="text-slate-300 text-[11px] leading-relaxed">
              Upload custom audio files (.mp3, .wav, or .ogg) for shooting and magazine reload sounds:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Gunfire sound */}
              <div className="p-3 bg-black/60 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-200">
                  <span>Gunfire Sound</span>
                  {fireFileName && <span className="text-emerald-400 text-[10px] font-mono">Custom Loaded</span>}
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded cursor-pointer text-[10px] text-slate-300 truncate">
                    <Upload className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">{fireFileName || 'Upload Fire (.mp3/.wav)'}</span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          sounds.setCustomFireSound(file);
                          setFireFileName(file.name);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => sounds.playShot()}
                    className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded transition"
                    title="Test Fire Sound"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Reload sound */}
              <div className="p-3 bg-black/60 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-200">
                  <span>Reload / Magazine</span>
                  {reloadFileName && <span className="text-emerald-400 text-[10px] font-mono">Custom Loaded</span>}
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded cursor-pointer text-[10px] text-slate-300 truncate">
                    <Upload className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">{reloadFileName || 'Upload Reload (.mp3/.wav)'}</span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          sounds.setCustomReloadSound(file);
                          setReloadFileName(file.name);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => sounds.playReload()}
                    className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded transition"
                    title="Test Reload Sound"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                sounds.setCustomFireSound('/sounds/kar98k_fire.mp3');
                sounds.setCustomReloadSound('/sounds/kar98k_reload.mp3');
                setFireFileName(null);
                setReloadFileName(null);
              }}
              className="text-[10px] text-slate-400 hover:text-amber-400 font-mono flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" /> Reset Default Weapon Audio
            </button>
          </div>
        </div>
      )}

      {/* Clear Success Alert */}
      {clearSuccessMessage && (
        <div className="mb-3 px-3 py-2 rounded-lg text-xs font-mono flex items-center gap-2 bg-red-950/80 border border-red-600 text-red-300 animate-pulse">
          <Trash2 className="w-4 h-4 shrink-0" />
          <span>All student records have been cleared from the leaderboard!</span>
        </div>
      )}

      {/* Save Student Record Form (After Match) */}
      {lastRoundStats && !hasSubmitted && onSaveName && (
        <div className="mb-4 p-3.5 rounded-xl bg-slate-900 border border-emerald-500/40 shadow-inner">
          <div className="flex items-center justify-between text-xs text-emerald-300 font-medium mb-2.5">
            <span className="flex items-center gap-1">
              <Target className="w-3.5 h-3.5" /> Score: <strong className="text-white text-sm ml-0.5">{lastRoundStats.score}</strong>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Time: <strong className="text-white text-sm ml-0.5">{lastRoundStats.totalTime.toFixed(1)}s</strong>
            </span>
            <span>
              Accuracy: <strong className="text-white text-sm ml-0.5">{lastRoundStats.accuracy.toFixed(0)}%</strong>
            </span>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                id="student-name-input"
                type="text"
                placeholder="Enter student name..."
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                maxLength={25}
                required
                disabled={isSubmitting}
                className="w-full pl-9 pr-3 py-2 text-sm bg-black border border-emerald-500/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>
            <button
              id="submit-score-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg transition shadow-md flex items-center gap-1.5"
            >
              {isSubmitting ? 'Saving...' : 'Save & Sync'}
            </button>
          </form>
        </div>
      )}

      {/* Sync Status Banner */}
      {hasSubmitted && (
        <div className="mb-3 px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between bg-slate-900 border border-slate-800">
          {syncStatus === 'synced' ? (
            <span className="text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Automatically saved to your Google Sheet!
            </span>
          ) : syncStatus === 'no_url' ? (
            <span className="text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" /> Score saved locally! (Set Apps Script URL above for auto-sync)
            </span>
          ) : (
            <span className="text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Record saved!
            </span>
          )}
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-black/80 max-h-64 overflow-y-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 font-mono">
            <tr>
              <th className="py-2.5 px-3">#</th>
              <th className="py-2.5 px-3">Student</th>
              <th className="py-2.5 px-3 text-right">Score</th>
              <th className="py-2.5 px-3 text-right">Time</th>
              <th className="py-2.5 px-3 text-right">Acc</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-slate-500 font-sans">
                  No records yet. Be the first to play!
                </td>
              </tr>
            ) : (
              entries.map((entry, idx) => {
                const isCurrent = entry.id === currentEntryId;
                return (
                  <tr
                    key={entry.id || idx}
                    className={`transition-colors ${
                      isCurrent
                        ? 'bg-amber-500/20 font-bold text-amber-300'
                        : 'hover:bg-slate-900/60 text-slate-300'
                    }`}
                  >
                    <td className="py-2 px-3">
                      {idx === 0 ? (
                        <Medal className="w-4 h-4 text-amber-400 inline" />
                      ) : idx === 1 ? (
                        <Medal className="w-4 h-4 text-slate-300 inline" />
                      ) : idx === 2 ? (
                        <Award className="w-4 h-4 text-amber-600 inline" />
                      ) : (
                        <span className="text-slate-500 text-xs">{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-medium truncate max-w-[130px] sm:max-w-[180px] font-sans">
                      {entry.studentName}
                      {isCurrent && (
                        <span className="ml-1.5 text-[10px] uppercase text-amber-400 font-bold">
                          (You)
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-amber-400">
                      {entry.score}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      {entry.totalTime.toFixed(1)}s
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-400">
                      {entry.accuracy.toFixed(0)}%
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Action Footer */}
      <div className="mt-4 flex items-center justify-between pt-2">
        <p className="text-[10px] text-slate-400 font-mono">
          {scriptUrl ? '● Connected to Google Sheet' : '○ Local Mode'}
        </p>

        <button
          id="play-again-btn"
          onClick={onPlayAgain}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl transition shadow-lg shadow-amber-500/30 active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          Play New Round
        </button>
      </div>
    </div>
  );
};
