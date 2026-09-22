import React, { useState } from 'react';
import { Upload, Music, Play, RotateCcw, X, CheckCircle2 } from 'lucide-react';
import { sounds } from '../utils/audio';

interface SoundUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SoundUploaderModal: React.FC<SoundUploaderModalProps> = ({ isOpen, onClose }) => {
  const [fireFileName, setFireFileName] = useState<string | null>(null);
  const [reloadFileName, setReloadFileName] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFireUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      sounds.setCustomFireSound(file);
      setFireFileName(file.name);
    }
  };

  const handleReloadUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      sounds.setCustomReloadSound(file);
      setReloadFileName(file.name);
    }
  };

  const handleReset = () => {
    sounds.setCustomFireSound('/sounds/kar98k_fire.mp3');
    sounds.setCustomReloadSound('/sounds/kar98k_reload.mp3');
    setFireFileName(null);
    setReloadFileName(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-zinc-900 border border-amber-500/30 p-6 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Music className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-amber-400">Custom Weapon Sounds</h2>
              <p className="text-xs text-zinc-400">Upload your own .mp3, .wav, or .ogg files for Fire & Reload</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Controls */}
        <div className="space-y-6">
          {/* Fire Sound */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Gunfire Sound Effect
              </label>
              {fireFileName && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Custom Loaded
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 cursor-pointer transition-colors text-xs text-zinc-300 font-medium">
                <Upload className="w-4 h-4 text-amber-400" />
                <span className="truncate">{fireFileName || 'Choose .mp3 / .wav for Fire'}</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFireUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => sounds.playShot()}
                className="p-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:text-amber-300 transition-colors"
                title="Test Fire Sound"
              >
                <Play className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Reload Sound */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Reload / Magazine Sound Effect
              </label>
              {reloadFileName && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Custom Loaded
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 cursor-pointer transition-colors text-xs text-zinc-300 font-medium">
                <Upload className="w-4 h-4 text-amber-400" />
                <span className="truncate">{reloadFileName || 'Choose .mp3 / .wav for Reload'}</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleReloadUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => sounds.playReload()}
                className="p-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:text-amber-300 transition-colors"
                title="Test Reload Sound"
              >
                <Play className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-zinc-800 pt-5 mt-6">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-amber-400 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Default Sounds
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
