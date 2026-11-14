import React from 'react';
import {
  Disc,
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
import { Track, VisualizerStyle, ZoomedKnobTarget } from '../types/audio';
import { VISUALIZER_OPTIONS, formatTime } from '../data/tracks';
import { VisualizerCanvas } from './VisualizerCanvas';

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
  visualizerStyle: VisualizerStyle;
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
  onChangeVisualizer: (style: VisualizerStyle) => void;
  onZoomVolume: (target: ZoomedKnobTarget) => void;
  onCollapseMini?: () => void;
}

export const PlayerPanel: React.FC<PlayerPanelProps> = ({
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
  visualizerStyle,
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
  onChangeVisualizer,
  onZoomVolume,
  onCollapseMini
}) => {
  const progressPct = Math.min(100, (currentTime / (duration || 1)) * 100);

  return (
    <div className="flex flex-col h-full justify-between gap-4">
      {/* Top Path & Quick Playback Flags */}
      <div className="flex items-center justify-between gap-2">
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
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
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
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
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
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
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
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Visualizer Stage */}
      <div className="relative rounded-2xl bg-[#090d12] border border-white/10 overflow-hidden flex flex-col justify-between min-h-[196px]">
        <div className={`absolute inset-0 bg-gradient-to-br ${track.coverAccent} opacity-25 pointer-events-none`} />

        {/* Live Canvas */}
        <div className="relative h-36 w-full flex items-center justify-center">
          <VisualizerCanvas
            analyserRef={analyserRef}
            isPlaying={isPlaying}
            styleMode={visualizerStyle}
            width={440}
            height={144}
            className="w-full h-full"
          />

          {/* Subtle center disc icon only when idle or circular */}
          {(!isPlaying || visualizerStyle === 'circular') && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className={`w-12 h-12 rounded-full bg-[#090d12]/80 border border-white/15 flex items-center justify-center ${
                  isPlaying ? 'animate-spin' : ''
                }`}
                style={{ animationDuration: '6s' }}
              >
                <Disc className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          )}

          {/* Clean unboxed top-corner metadata */}
          <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-slate-400 pointer-events-none">
            <span className="tabular-nums">
              Track {trackIndex + 1} / {totalTracks}
            </span>
            <span>
              {dspEnabled ? (bassBoost ? 'DSP Active · Bass +6dB' : 'DSP Active') : 'DSP Bypassed'}
            </span>
          </div>
        </div>

        {/* Inline Visualizer Mode Switcher (no modal needed) */}
        <div className="relative z-10 border-t border-white/[0.08] bg-[#0c1118]/90 px-2 py-1.5 flex items-center justify-between gap-1 overflow-x-auto">
          {VISUALIZER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChangeVisualizer(opt.id)}
              title={opt.desc}
              className={`px-2 py-1 rounded-lg text-[11px] font-mono transition-colors shrink-0 ${
                visualizerStyle === opt.id
                  ? 'bg-cyan-500/15 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Track Metadata */}
      <div className="text-center space-y-1 px-1">
        <h2 className="text-lg font-semibold text-white tracking-tight truncate">{track.title}</h2>
        <p className="text-xs text-slate-400 truncate">
          {track.artist} · {track.album} · <span className="text-slate-500">{track.genre}</span>
        </p>
      </div>

      {/* Progress & Timestamps */}
      <div className="space-y-1.5">
        <div className="relative flex items-center">
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden pointer-events-none">
            <div
              className="h-full bg-cyan-400 transition-[width] duration-100"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            aria-label="Seek track position"
            className="studio-slider absolute inset-0 w-full h-4 -top-1.5 opacity-0 cursor-pointer"
          />
        </div>
        <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Transport Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous Track"
          className="w-11 h-11 rounded-xl bg-[#0c1118] border border-white/10 text-slate-300 hover:text-white hover:border-white/20 flex items-center justify-center transition-colors active:scale-95"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="w-14 h-14 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center transition-colors shadow-lg shadow-cyan-500/15 active:scale-95"
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
          className="w-11 h-11 rounded-xl bg-[#0c1118] border border-white/10 text-slate-300 hover:text-white hover:border-white/20 flex items-center justify-center transition-colors active:scale-95"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* Master Volume Bar */}
      <div className="flex items-center gap-3 pt-2 border-t border-white/[0.08]">
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-4 h-4 text-amber-400" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>

        <input
          type="range"
          min={0}
          max={100}
          value={isMuted ? 0 : volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          aria-label="Master Volume"
          className="studio-slider flex-1 h-1.5 bg-slate-800 rounded-full"
        />

        <span className="text-xs font-mono tabular-nums text-slate-300 w-9 text-right shrink-0">
          {Math.round(isMuted ? 0 : volume)}%
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
          className="h-9 px-2.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1 text-xs font-mono shrink-0"
        >
          <ZoomIn className="w-3.5 h-3.5" />
          <span>Dial</span>
        </button>
      </div>
    </div>
  );
};
