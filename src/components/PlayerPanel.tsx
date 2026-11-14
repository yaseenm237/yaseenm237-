import React, { memo } from 'react';
import {
  Folder,
  Heart,
  Minimize2,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ZoomIn
} from 'lucide-react';
import { Track, VisualizerTheme, ZoomedKnobTarget } from '../types/audio';
import { formatTime } from '../data/tracks';
import { VisualizerStage } from './VisualizerStage';

interface PlayerPanelProps {
  track: Track;
  trackIndex: number;
  totalTracks: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  loop: boolean;
  shuffle: boolean;
  dspEnabled: boolean;
  bassBoost: boolean;
  visualizerTheme?: VisualizerTheme;
  analyserRef: React.RefObject<AnalyserNode | null>;
  showCollapseButton?: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (val: number) => void;
  onVolumeChange: (val: number) => void;
  onToggleMute: () => void;
  onToggleLoop: () => void;
  onToggleShuffle: () => void;
  onToggleFavorite: (id: string) => void;
  onZoomVolume: (target: ZoomedKnobTarget) => void;
  onCollapseMini?: () => void;
  onRelinkTrack?: (trackId: string, file: File) => void;
}

const PlayerPanelInner: React.FC<PlayerPanelProps> = ({
  track,
  trackIndex,
  totalTracks,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  loop,
  shuffle,
  dspEnabled,
  bassBoost,
  visualizerTheme = 'cyber_cyan',
  analyserRef,
  showCollapseButton = false,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleLoop,
  onToggleShuffle,
  onToggleFavorite,
  onZoomVolume,
  onCollapseMini,
  onRelinkTrack
}) => {
  const progressPct = Math.min(100, Math.max(0, (currentTime / (duration || 1)) * 100));
  const effectiveVolume = isMuted ? 0 : volume;

  return (
    <div className="flex flex-col h-full justify-between gap-2.5 sm:gap-3.5">
      {/* Top Path & Quick Playback Flags */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0 text-xs font-mono text-slate-400">
          <Folder className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="truncate">{track.folder}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onToggleFavorite(track.id)}
            title="Toggle Favorite"
            aria-label="Toggle Favorite"
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center transition-colors ${
              track.isFavorite
                ? 'text-rose-400 bg-rose-500/10'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Heart className={`w-4 h-4 ${track.isFavorite ? 'fill-rose-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onToggleShuffle}
            title="Shuffle"
            aria-label="Shuffle"
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center transition-colors ${
              shuffle
                ? 'text-cyan-400 bg-cyan-500/10'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleLoop}
            title="Repeat Track"
            aria-label="Repeat Track"
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center transition-colors ${
              loop
                ? 'text-cyan-400 bg-cyan-500/10'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Repeat className="w-4 h-4" />
          </button>

          {showCollapseButton && onCollapseMini && (
            <button
              type="button"
              onClick={onCollapseMini}
              title="Collapse to Mini Player"
              aria-label="Collapse to Mini Player"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Isolated Visualizer Stage (updates to visualizerStyle do not re-render PlayerPanel) */}
      <VisualizerStage
        trackId={track.id}
        trackIndex={trackIndex}
        totalTracks={totalTracks}
        coverAccent={track.coverAccent}
        needsRelink={Boolean(track.isImported && !track.url)}
        isPlaying={isPlaying}
        dspEnabled={dspEnabled}
        bassBoost={bassBoost}
        visualizerTheme={visualizerTheme}
        analyserRef={analyserRef}
        onRelinkTrack={onRelinkTrack}
      />

      {/* Track Metadata */}
      <div className="text-center space-y-0.5 px-1 shrink-0">
        <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight truncate">
          {track.title}
        </h2>
        <p className="text-xs text-slate-400 truncate">
          {track.artist} · {track.album} · <span className="text-slate-500">{track.genre}</span>
        </p>
      </div>

      {/* Progress & Timestamps with Tactile Scrubber Thumb */}
      <div className="space-y-1.5 shrink-0">
        <div className="relative h-4 flex items-center group">
          <div className="w-full h-1.5 group-hover:h-2 bg-slate-800 rounded-full overflow-hidden pointer-events-none transition-[height]">
            <div
              className="h-full bg-cyan-400 transition-[width] duration-100"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div
            className="absolute w-3.5 h-3.5 rounded-full bg-cyan-300 border-2 border-[#090d12] shadow-[0_0_8px_rgba(34,211,238,0.55)] pointer-events-none transition-transform group-hover:scale-115"
            style={{ left: `calc(${progressPct}% - 7px)` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            aria-label="Seek track position"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Transport Controls */}
      <div className="flex items-center justify-center gap-4 shrink-0">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous Track"
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#0c1118] border border-white/10 text-slate-300 hover:text-white hover:border-white/25 flex items-center justify-center transition-colors active:scale-95"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center transition-colors shadow-lg shadow-cyan-500/20 active:scale-95"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 fill-current" />
          ) : (
            <Play className="w-6 h-6 fill-current ml-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={onNext}
          aria-label="Next Track"
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#0c1118] border border-white/10 text-slate-300 hover:text-white hover:border-white/25 flex items-center justify-center transition-colors active:scale-95"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* Master Volume Bar with Unified Fill & Thumb */}
      <div className="flex items-center gap-2.5 pt-2 border-t border-white/[0.08] shrink-0">
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-4 h-4 text-amber-400" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>

        <div className="relative flex-1 h-4 flex items-center group">
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden pointer-events-none">
            <div
              className={`h-full transition-[width] duration-75 ${
                isMuted ? 'bg-amber-400/50' : 'bg-cyan-400'
              }`}
              style={{ width: `${effectiveVolume}%` }}
            />
          </div>
          <div
            className="absolute w-3.5 h-3.5 rounded-full bg-cyan-300 border-2 border-[#090d12] shadow-[0_0_6px_rgba(34,211,238,0.45)] pointer-events-none transition-transform group-hover:scale-115"
            style={{ left: `calc(${effectiveVolume}% - 7px)` }}
          />
          <input
            type="range"
            min={0}
            max={100}
            value={effectiveVolume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            aria-label="Master Volume"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <span className="text-xs font-mono tabular-nums text-slate-300 w-9 text-right shrink-0">
          {Math.round(effectiveVolume)}%
        </span>

        <button
          type="button"
          onClick={() =>
            onZoomVolume({
              id: 'volume',
              label: 'Master Volume',
              value: volume,
              min: 0,
              max: 100,
              unit: '%'
            })
          }
          title="Open precision volume dial"
          className="h-8 sm:h-9 px-2.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1 text-xs font-mono shrink-0"
        >
          <ZoomIn className="w-3.5 h-3.5" />
          <span>Dial</span>
        </button>
      </div>
    </div>
  );
};

export const PlayerPanel = memo(PlayerPanelInner);
