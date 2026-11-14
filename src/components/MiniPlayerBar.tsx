import React from 'react';
import { Disc, Maximize2, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { Track } from '../types/audio';
import { formatTime } from '../data/tracks';

interface MiniPlayerBarProps {
  track: Track;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  compactMode: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (val: number) => void;
  onVolumeChange: (val: number) => void;
  onToggleMute: () => void;
  onExpand: () => void;
}

export const MiniPlayerBar: React.FC<MiniPlayerBarProps> = ({
  track,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  compactMode,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onExpand
}) => {
  const progressPct = Math.min(100, Math.max(0, (currentTime / (duration || 1)) * 100));
  const effectiveVolume = isMuted ? 0 : volume;

  return (
    <div className="bg-[#111720]/95 backdrop-blur-md border-t border-white/10 relative shrink-0">
      {/* Interactive thin seek bar with tactile hover thumb */}
      <div className="relative h-1.5 w-full bg-slate-800 group">
        <div
          className="h-full bg-cyan-400 transition-[width] duration-100 pointer-events-none"
          style={{ width: `${progressPct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-cyan-300 border border-[#090d12] opacity-80 group-hover:opacity-100 group-hover:scale-125 transition-all pointer-events-none"
          style={{ left: `calc(${progressPct}% - 5px)` }}
        />
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          aria-label="Seek track position"
          className="absolute inset-0 w-full h-4 -top-1.5 opacity-0 cursor-pointer"
        />
      </div>

      <div className="px-3 sm:px-5 py-2 flex items-center justify-between gap-2.5">
        {/* Track Info - clickable to expand full player */}
        <button
          type="button"
          onClick={onExpand}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left group"
        >
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${track.coverAccent} border border-white/10 flex items-center justify-center shrink-0`}>
            <Disc className={`w-4 h-4 text-white ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
              {track.title}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {track.artist} · {track.album}
            </p>
          </div>
        </button>

        {/* Transport Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous track"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-9 h-9 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center transition-colors shadow-sm"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={onNext}
            aria-label="Next track"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right Controls: Timer, Volume (desktop), Expand */}
        {!compactMode && (
          <div className="hidden sm:flex items-center gap-4 shrink-0">
            <span className="text-xs font-mono tabular-nums text-slate-400">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex items-center gap-2 w-24">
              <button
                type="button"
                onClick={onToggleMute}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                className="text-slate-400 hover:text-white transition-colors shrink-0"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <div className="relative flex-1 h-4 flex items-center group">
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden pointer-events-none">
                  <div
                    className={`h-full ${isMuted ? 'bg-amber-400/50' : 'bg-cyan-400'}`}
                    style={{ width: `${effectiveVolume}%` }}
                  />
                </div>
                <div
                  className="absolute w-3 h-3 rounded-full bg-cyan-300 border border-[#090d12] pointer-events-none"
                  style={{ left: `calc(${effectiveVolume}% - 6px)` }}
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={effectiveVolume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  aria-label="Volume"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onExpand}
          title="Expand Player"
          className="h-8 px-2.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5 text-xs font-medium shrink-0"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          {!compactMode && <span className="hidden sm:inline">Expand</span>}
        </button>
      </div>
    </div>
  );
};
