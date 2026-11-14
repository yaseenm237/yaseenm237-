import React from 'react';
import { BrainCircuit, Loader2, RotateCcw, Sparkles, Zap } from 'lucide-react';
import { EqControlStyle, EqPreset, EqSettings, ZoomedKnobTarget } from '../types/audio';
import { EQ_PRESETS } from '../data/tracks';
import { RotaryKnob } from './RotaryKnob';

interface EqualizerPanelProps {
  dspEnabled: boolean;
  bassBoost: boolean;
  smartAiEnabled: boolean;
  isProfilingAi?: boolean;
  aiStatus: string | null;
  eqControlStyle: EqControlStyle;
  band60Hz: number;
  band250Hz: number;
  band1kHz: number;
  band4kHz: number;
  band16kHz: number;
  onToggleDsp: (enabled: boolean) => void;
  onToggleBassBoost: (enabled: boolean) => void;
  onToggleSmartAi: () => void;
  onRunAiProfile?: () => void;
  onChangeControlStyle: (style: EqControlStyle) => void;
  onChangeBand: (band: '60hz' | '250hz' | '1khz' | '4khz' | '16khz', val: number) => void;
  onApplyPreset: (preset: EqPreset) => void;
  onReset: () => void;
  onZoomKnob: (target: ZoomedKnobTarget) => void;
}

export const EqualizerPanel: React.FC<EqualizerPanelProps> = ({
  dspEnabled,
  bassBoost,
  smartAiEnabled,
  isProfilingAi = false,
  aiStatus,
  eqControlStyle,
  band60Hz,
  band250Hz,
  band1kHz,
  band4kHz,
  band16kHz,
  onToggleDsp,
  onToggleBassBoost,
  onToggleSmartAi,
  onRunAiProfile,
  onChangeControlStyle,
  onChangeBand,
  onApplyPreset,
  onReset,
  onZoomKnob
}) => {
  const currentEq: EqSettings = {
    band60Hz,
    band250Hz,
    band1kHz,
    band4kHz,
    band16kHz,
    bassBoost
  };

  const isMatchingPreset = (presetKey: EqPreset) => {
    const p = EQ_PRESETS[presetKey].values;
    return (
      p.band60Hz === currentEq.band60Hz &&
      p.band250Hz === currentEq.band250Hz &&
      p.band1kHz === currentEq.band1kHz &&
      p.band4kHz === currentEq.band4kHz &&
      p.band16kHz === currentEq.band16kHz &&
      p.bassBoost === currentEq.bassBoost
    );
  };

  const bands: Array<{
    id: '60hz' | '250hz' | '1khz' | '4khz' | '16khz';
    label: string;
    value: number;
  }> = [
    { id: '60hz', label: '60 Hz', value: band60Hz },
    { id: '250hz', label: '250 Hz', value: band250Hz },
    { id: '1khz', label: '1 kHz', value: band1kHz },
    { id: '4khz', label: '4 kHz', value: band4kHz },
    { id: '16khz', label: '16 kHz', value: band16kHz }
  ];

  // Build smooth SVG frequency response curve across 300x56 viewBox
  const curveWidth = 300;
  const curveHeight = 56;
  const midY = curveHeight / 2;
  const dbToY = (db: number) => {
    const clamped = Math.max(-14, Math.min(14, dspEnabled ? db : 0));
    return midY - (clamped / 14) * (curveHeight * 0.4);
  };

  const curvePoints = bands.map((b, i) => {
    const x = 22 + (i / (bands.length - 1)) * (curveWidth - 44);
    const boostLift = i === 0 && dspEnabled && bassBoost ? 3 : 0;
    return { x, y: dbToY(b.value + boostLift), db: b.value };
  });

  const buildSmoothPath = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length === 0) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const linePath = buildSmoothPath(curvePoints);
  const areaPath = `${linePath} L ${curvePoints[curvePoints.length - 1].x} ${curveHeight} L ${curvePoints[0].x} ${curveHeight} Z`;

  return (
    <div className="flex flex-col h-full min-h-0 justify-between gap-3">
      {/* Top Bar: DSP Switch, Mode Toggle, AI Auto-EQ */}
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleDsp(!dspEnabled)}
            className={`h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg text-xs font-mono font-semibold border transition-colors ${
              dspEnabled
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                : 'bg-[#090d12] border-white/10 text-slate-400'
            }`}
          >
            DSP: {dspEnabled ? 'ON' : 'BYPASS'}
          </button>

          <button
            type="button"
            onClick={onToggleSmartAi}
            title="Auto-run Smart Genre Profiler from track ID3 tags"
            className={`h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              smartAiEnabled
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-[#090d12] border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            {isProfilingAi ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
            ) : (
              <BrainCircuit className="w-3.5 h-3.5" />
            )}
            <span>Smart Profiler</span>
          </button>

          {onRunAiProfile && (
            <button
              type="button"
              onClick={onRunAiProfile}
              disabled={isProfilingAi}
              title="Analyze current track ID3 tags with AI Smart Genre Profiler now"
              className="h-8 sm:h-9 px-2.5 rounded-lg text-xs font-mono border bg-[#090d12] border-white/10 text-cyan-300 hover:border-cyan-400/50 hover:bg-cyan-500/10 flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Scan ID3</span>
            </button>
          )}
        </div>

        <div className="flex items-center bg-[#090d12] p-1 rounded-lg border border-white/10 text-xs font-mono">
          <button
            type="button"
            onClick={() => onChangeControlStyle('knobs')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              eqControlStyle === 'knobs' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Knobs
          </button>
          <button
            type="button"
            onClick={() => onChangeControlStyle('sliders')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              eqControlStyle === 'sliders' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sliders
          </button>
        </div>
      </div>

      {/* Inline AI Status Line */}
      {aiStatus && (
        <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs font-mono text-amber-300 truncate shrink-0" title={aiStatus}>
          {aiStatus}
        </div>
      )}

      {/* Presets Row */}
      <div className="space-y-1.5 shrink-0">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
          Acoustic Presets
        </span>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {(Object.keys(EQ_PRESETS) as EqPreset[]).map((key) => {
            const active = dspEnabled && isMatchingPreset(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => onApplyPreset(key)}
                className={`h-8 rounded-lg border text-xs font-mono transition-colors ${
                  active
                    ? 'bg-cyan-500/15 border-cyan-400/60 text-cyan-300 font-semibold'
                    : 'bg-[#090d12] border-white/10 text-slate-300 hover:border-white/25'
                }`}
              >
                {EQ_PRESETS[key].label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5-Band EQ Rack + Real-Time Frequency Response Curve */}
      <div className="flex-1 min-h-0 flex flex-col justify-between rounded-2xl bg-[#090d12] border border-white/10 p-3 sm:p-4 gap-3">
        {/* Live Frequency Response Curve SVG */}
        <div className="relative h-14 w-full rounded-xl bg-[#0c1118] border border-white/[0.06] overflow-hidden shrink-0">
          <svg
            viewBox={`0 0 ${curveWidth} ${curveHeight}`}
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            <defs>
              <linearGradient id="eqCurveFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={dspEnabled ? '#22d3ee' : '#64748b'} stopOpacity="0.28" />
                <stop offset="100%" stopColor={dspEnabled ? '#22d3ee' : '#64748b'} stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* 0dB Reference Line */}
            <line
              x1="0"
              y1={midY}
              x2={curveWidth}
              y2={midY}
              stroke="rgba(148,163,184,0.16)"
              strokeDasharray="3 3"
              strokeWidth="1"
            />

            {/* Curve Area + Stroke */}
            <path d={areaPath} fill="url(#eqCurveFill)" />
            <path
              d={linePath}
              fill="none"
              stroke={dspEnabled ? '#22d3ee' : '#64748b'}
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Band Nodes */}
            {curvePoints.map((pt, idx) => (
              <circle
                key={bands[idx].id}
                cx={pt.x}
                cy={pt.y}
                r="3"
                fill={dspEnabled ? '#67e8f9' : '#64748b'}
                stroke="#090d12"
                strokeWidth="1.5"
              />
            ))}
          </svg>
          <div className="absolute top-1 left-2 text-[9px] font-mono text-slate-500 pointer-events-none">
            +12dB
          </div>
          <div className="absolute bottom-1 left-2 text-[9px] font-mono text-slate-500 pointer-events-none">
            -12dB
          </div>
          <div className="absolute top-1 right-2 text-[9px] font-mono text-slate-500 pointer-events-none">
            {dspEnabled ? 'CURVE' : 'BYPASSED'}
          </div>
        </div>

        {/* Knobs or Sliders */}
        <div className="flex-1 flex flex-col justify-center">
          {eqControlStyle === 'knobs' ? (
            <>
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-3 sm:grid sm:grid-cols-5 sm:gap-2">
                {bands.map((b) => (
                  <RotaryKnob
                    key={b.id}
                    label={b.label}
                    value={b.value}
                    min={-12}
                    max={12}
                    disabled={!dspEnabled}
                    knobId={b.id}
                    onChange={(val) => onChangeBand(b.id, val)}
                    onZoom={onZoomKnob}
                  />
                ))}
              </div>
              <p className="text-[11px] text-slate-500 text-center mt-2.5">
                Drag dial vertically or double-tap for 0.1 dB precision wheel
              </p>
            </>
          ) : (
            <div className="grid grid-cols-5 gap-2 py-1">
              {bands.map((b) => (
                <div key={b.id} className="flex flex-col items-center gap-1.5">
                  <span className="text-[11px] font-mono text-slate-300">{b.label}</span>
                  <div className="relative h-32 flex items-center justify-center">
                    {/* 0dB center reference notch */}
                    <div className="absolute w-5 h-px bg-slate-600/70 pointer-events-none" />
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      step={0.5}
                      value={b.value}
                      disabled={!dspEnabled}
                      onChange={(e) => onChangeBand(b.id, parseFloat(e.target.value))}
                      aria-label={`${b.label} gain`}
                      className="h-28 w-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-400 [writing-mode:vertical-lr] [direction:rtl] disabled:opacity-40 relative z-10"
                    />
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-cyan-300">
                    {b.value > 0 ? `+${b.value.toFixed(1)}` : b.value.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls: Bass Boost & Reset */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.08] shrink-0">
        <button
          type="button"
          disabled={!dspEnabled}
          onClick={() => onToggleBassBoost(!bassBoost)}
          className={`h-9 sm:h-10 px-3 rounded-xl border text-xs font-mono flex items-center gap-2 transition-colors disabled:opacity-40 ${
            bassBoost && dspEnabled
              ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-semibold'
              : 'bg-[#090d12] border-white/10 text-slate-300 hover:border-white/20'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Bass Boost +6dB (90 Hz)</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          className="h-9 sm:h-10 px-3 rounded-xl bg-[#090d12] border border-white/10 text-slate-300 hover:text-white hover:border-white/25 text-xs font-mono flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};
