import React from 'react';
import { BrainCircuit, RotateCcw, Zap } from 'lucide-react';
import { EqControlStyle, EqPreset, EqSettings, ZoomedKnobTarget } from '../types/audio';
import { EQ_PRESETS } from '../data/tracks';
import { RotaryKnob } from './RotaryKnob';

interface EqualizerPanelProps {
  dspEnabled: boolean;
  bassBoost: boolean;
  smartAiEnabled: boolean;
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

  return (
    <div className="flex flex-col h-full justify-between gap-4">
      {/* Top Bar: DSP Switch, Mode Toggle, AI Auto-EQ */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleDsp(!dspEnabled)}
            className={`h-9 px-3 rounded-lg text-xs font-mono font-semibold border transition-colors ${
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
            title="Automatically adapt EQ preset based on track genre"
            className={`h-9 px-3 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              smartAiEnabled
                ? 'bg-amber-500/10 border-amber-500/35 text-amber-300'
                : 'bg-[#090d12] border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>Auto Genre EQ</span>
          </button>
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

      {/* Inline AI Status Line (no noisy banner) */}
      {aiStatus && (
        <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs font-mono text-amber-300">
          {aiStatus}
        </div>
      )}

      {/* Presets Row */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
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
                className={`h-9 rounded-lg border text-xs font-mono transition-colors ${
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

      {/* 5-Band EQ Rack */}
      <div className="flex-1 flex flex-col justify-center rounded-2xl bg-[#090d12] border border-white/10 p-4">
        {eqControlStyle === 'knobs' ? (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-y-4 gap-x-2">
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
            <p className="text-[11px] text-slate-500 text-center mt-4">
              Drag dial vertically or double-tap for 0.1 dB precision wheel
            </p>
          </>
        ) : (
          <div className="grid grid-cols-5 gap-2 py-2">
            {bands.map((b) => (
              <div key={b.id} className="flex flex-col items-center gap-2">
                <span className="text-[11px] font-mono text-slate-300">{b.label}</span>
                <div className="h-36 flex items-center justify-center">
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={0.5}
                    value={b.value}
                    disabled={!dspEnabled}
                    onChange={(e) => onChangeBand(b.id, parseFloat(e.target.value))}
                    aria-label={`${b.label} gain`}
                    className="h-32 w-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-400 [writing-mode:vertical-lr] [direction:rtl] disabled:opacity-40"
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

      {/* Bottom Controls: Bass Boost & Reset */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.08]">
        <button
          type="button"
          disabled={!dspEnabled}
          onClick={() => onToggleBassBoost(!bassBoost)}
          className={`h-10 px-3.5 rounded-xl border text-xs font-mono flex items-center gap-2 transition-colors disabled:opacity-40 ${
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
          className="h-10 px-3.5 rounded-xl bg-[#090d12] border border-white/10 text-slate-300 hover:text-white hover:border-white/25 text-xs font-mono flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};
