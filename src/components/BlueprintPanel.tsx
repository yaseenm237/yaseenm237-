import React, { useState } from 'react';
import { Check, Code2, Copy, Cpu } from 'lucide-react';
import { RUST_BLUEPRINT_SNIPPET } from '../data/tracks';

interface BlueprintPanelProps {
  sampleRate: '48kHz' | '96kHz';
  dspEnabled: boolean;
  bassBoost: boolean;
  onToggleSampleRate: () => void;
}

export const BlueprintPanel: React.FC<BlueprintPanelProps> = ({
  sampleRate,
  dspEnabled,
  bassBoost,
  onToggleSampleRate
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(RUST_BLUEPRINT_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* Architecture Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 shrink-0">
        <div className="p-3.5 rounded-xl bg-[#090d12] border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-200 font-semibold">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Web Audio DSP Graph
            </span>
            <span>{dspEnabled ? 'Active' : 'Bypass'}</span>
          </div>
          <p className="text-xs font-mono text-slate-400 leading-relaxed">
            MediaSource → 5-Band Biquad (60Hz–16kHz) → {bassBoost ? '90Hz +6dB → ' : ''}Gain → FFT Analyser
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-[#090d12] border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="text-slate-200 font-semibold">Iced Viewport Targets</span>
            <button
              type="button"
              onClick={onToggleSampleRate}
              className="text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              {sampleRate}
            </button>
          </div>
          <p className="text-xs font-mono text-slate-400 leading-relaxed">
            Desktop split: 950×650 · Mobile bottom-tabs: 360×600 min
          </p>
        </div>
      </div>

      {/* Rust Code Mapping */}
      <div className="flex-1 min-h-0 flex flex-col rounded-xl bg-[#090d12] border border-white/10 overflow-hidden">
        <div className="px-3.5 py-2.5 border-b border-white/[0.08] flex items-center justify-between shrink-0">
          <span className="text-xs font-mono font-medium text-slate-200 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-cyan-400" />
            src/state.rs — Rust + Iced Mapping
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="h-8 px-2.5 rounded-lg border border-white/10 text-xs font-mono text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <pre className="flex-1 overflow-auto p-3.5 text-xs font-mono text-slate-300 leading-relaxed">
          <code>{RUST_BLUEPRINT_SNIPPET}</code>
        </pre>
      </div>
    </div>
  );
};
