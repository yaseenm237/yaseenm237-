import React, { memo, useState } from 'react';
import { ChevronLeft, ChevronRight, Disc, LayoutGrid, Upload } from 'lucide-react';
import { VisualizerStyle } from '../types/audio';
import { VISUALIZER_OPTIONS } from '../data/tracks';
import { VisualizerCanvas } from './VisualizerCanvas';

const VIZ_STORAGE_KEY = 'dsp_visualizer_style_v1';

function readSavedVisualizerStyle(): VisualizerStyle {
  if (typeof window === 'undefined' || !window.localStorage) return 'waterfall';
  const saved = window.localStorage.getItem(VIZ_STORAGE_KEY) as VisualizerStyle | null;
  return saved && VISUALIZER_OPTIONS.some((opt) => opt.id === saved) ? saved : 'waterfall';
}

interface VisualizerStageProps {
  trackId: string;
  trackIndex: number;
  totalTracks: number;
  coverAccent: string;
  needsRelink: boolean;
  isPlaying: boolean;
  dspEnabled: boolean;
  bassBoost: boolean;
  analyserRef: React.RefObject<AnalyserNode | null>;
  onRelinkTrack?: (trackId: string, file: File) => void;
}

const VisualizerStageInner: React.FC<VisualizerStageProps> = ({
  trackId,
  trackIndex,
  totalTracks,
  coverAccent,
  needsRelink,
  isPlaying,
  dspEnabled,
  bassBoost,
  analyserRef,
  onRelinkTrack
}) => {
  // Isolate visualizerStyle state inside VisualizerStage so style switches never re-render PlayerPanel or App
  const [visualizerStyle, setVisualizerStyle] = useState<VisualizerStyle>(readSavedVisualizerStyle);
  const [showModePicker, setShowModePicker] = useState(false);

  const selectStyle = (next: VisualizerStyle) => {
    setVisualizerStyle(next);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(VIZ_STORAGE_KEY, next);
    }
  };

  const activeVizIndex = Math.max(
    0,
    VISUALIZER_OPTIONS.findIndex((opt) => opt.id === visualizerStyle)
  );
  const activeViz = VISUALIZER_OPTIONS[activeVizIndex] || VISUALIZER_OPTIONS[0];

  const stepVisualizer = (dir: -1 | 1) => {
    const nextIdx =
      (activeVizIndex + dir + VISUALIZER_OPTIONS.length) % VISUALIZER_OPTIONS.length;
    selectStyle(VISUALIZER_OPTIONS[nextIdx].id);
  };

  return (
    <div className="relative rounded-2xl bg-[#090d12] border border-white/10 overflow-hidden flex flex-col justify-between shrink-0">
      <div className={`absolute inset-0 bg-gradient-to-br ${coverAccent} opacity-25 pointer-events-none`} />

      {/* Live Canvas */}
      <div className="relative h-32 sm:h-36 w-full flex items-center justify-center">
        <VisualizerCanvas
          analyserRef={analyserRef}
          isPlaying={isPlaying}
          visualizerStyle={visualizerStyle}
          width={440}
          height={144}
          className="w-full h-full"
        />

        {/* Center Disc only for Radial mode so other visualizers stay crisp */}
        {visualizerStyle === 'circular' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className={`w-11 h-11 rounded-full bg-[#090d12]/85 border border-white/15 flex items-center justify-center ${
                isPlaying ? 'animate-spin' : ''
              }`}
              style={{ animationDuration: '6s' }}
            >
              <Disc className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
        )}

        {/* Mode Grid Overlay (Zero Horizontal Overflow) */}
        {showModePicker && (
          <div className="absolute inset-0 z-20 bg-[#090d12]/95 backdrop-blur-sm p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400 px-0.5">
              <span>Select Visualizer</span>
              <button
                type="button"
                onClick={() => setShowModePicker(false)}
                className="text-cyan-400 hover:text-cyan-300"
              >
                Done
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5 my-auto">
              {VISUALIZER_OPTIONS.map((opt) => {
                const active = visualizerStyle === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      selectStyle(opt.id);
                      setShowModePicker(false);
                    }}
                    title={opt.desc}
                    className={`h-8 px-2 rounded-lg text-[11px] font-mono truncate border transition-colors ${
                      active
                        ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 font-semibold'
                        : 'bg-[#111720] border-white/10 text-slate-300 hover:text-white hover:border-white/25'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Clean unboxed top-corner metadata */}
        <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-slate-400 pointer-events-none">
          <span className="tabular-nums">
            Track {trackIndex + 1} / {totalTracks}
          </span>
          <span className={dspEnabled ? 'text-cyan-300/90' : 'text-slate-500'}>
            {dspEnabled ? (bassBoost ? 'DSP · Bass +6dB' : 'DSP Active') : 'Bypass'}
          </span>
        </div>

        {/* Prompt when an old local track lacks binary audio data */}
        {needsRelink && !showModePicker && onRelinkTrack && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#090d12]/80 backdrop-blur-xs gap-2 p-3 text-center">
            <p className="text-xs text-amber-300 font-medium">
              Local audio file needs relinking once
            </p>
            <label className="h-8 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Select Audio File</span>
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) onRelinkTrack(trackId, f);
                }}
              />
            </label>
          </div>
        )}
      </div>

      {/* Stepper + Mode Grid Bar */}
      <div className="relative z-10 border-t border-white/[0.08] bg-[#0c1118]/95 px-2 py-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => stepVisualizer(-1)}
            aria-label="Previous visualizer mode"
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => stepVisualizer(1)}
            aria-label="Next visualizer mode"
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowModePicker((prev) => !prev)}
          title={activeViz.desc}
          className="flex-1 min-w-0 h-7 px-2 rounded-md hover:bg-white/5 flex items-center justify-center gap-2 text-xs font-mono transition-colors"
        >
          <span className="text-cyan-300 font-semibold truncate">{activeViz.label}</span>
          <span className="text-[10px] text-slate-500 tabular-nums shrink-0">
            {activeVizIndex + 1}/{VISUALIZER_OPTIONS.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setShowModePicker((prev) => !prev)}
          aria-label="Toggle all visualizer modes"
          title="Show all visualizer modes"
          className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors shrink-0 ${
            showModePicker
              ? 'bg-cyan-500/20 text-cyan-300'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export const VisualizerStage = memo(VisualizerStageInner);
