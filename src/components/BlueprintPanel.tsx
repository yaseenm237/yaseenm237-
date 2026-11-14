import React, { useState } from 'react';
import { Check, Code2, Copy, Cpu, Layers, Palette } from 'lucide-react';
import {
  RUST_BLUEPRINT_SNIPPET,
  RUST_THEME_SNIPPET,
  RUST_VIEW_SNIPPET
} from '../data/tracks';

interface BlueprintPanelProps {
  sampleRate: '48kHz' | '96kHz';
  dspEnabled: boolean;
  bassBoost: boolean;
  onToggleSampleRate: () => void;
}

type BlueprintDocTab = 'theme' | 'view' | 'state';

export const BlueprintPanel: React.FC<BlueprintPanelProps> = ({
  sampleRate,
  dspEnabled,
  bassBoost,
  onToggleSampleRate
}) => {
  const [copied, setCopied] = useState(false);
  const [docTab, setDocTab] = useState<BlueprintDocTab>('view');

  const activeCode =
    docTab === 'theme'
      ? RUST_THEME_SNIPPET
      : docTab === 'view'
      ? RUST_VIEW_SNIPPET
      : RUST_BLUEPRINT_SNIPPET;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const paletteSwatches = [
    { name: 'Void', hex: '#090D12', cls: 'bg-[#090d12]' },
    { name: 'Surface', hex: '#111720', cls: 'bg-[#111720]' },
    { name: 'Cyan', hex: '#22D3EE', cls: 'bg-[#22d3ee]' },
    { name: 'Amber', hex: '#F59E0B', cls: 'bg-[#f59e0b]' }
  ];

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Architecture & Palette Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 shrink-0">
        <div className="p-3 rounded-xl bg-[#090d12] border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-200 font-semibold">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" /> DSP Signal Chain
            </span>
            <span className={dspEnabled ? 'text-cyan-400' : 'text-slate-500'}>
              {dspEnabled ? 'Active' : 'Bypass'}
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
            MP3 Source → 5-Band Biquad → {bassBoost ? '90Hz +6dB → ' : ''}Gain → FFT Analyser
          </p>
        </div>

        <div className="p-3 rounded-xl bg-[#090d12] border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-200 font-semibold">
              <Palette className="w-3.5 h-3.5 text-cyan-400" /> Iced Theme Tokens
            </span>
            <button
              type="button"
              onClick={onToggleSampleRate}
              title="Toggle target hardware sample rate"
              className="text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              {sampleRate}
            </button>
          </div>
          <div className="flex items-center justify-between gap-1.5 pt-0.5">
            {paletteSwatches.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 min-w-0">
                <span className={`w-3 h-3 rounded-sm border border-white/20 shrink-0 ${s.cls}`} />
                <span className="text-[10px] font-mono text-slate-400 truncate">{s.hex}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rust + Iced UI Code Mapping */}
      <div className="flex-1 min-h-0 flex flex-col rounded-xl bg-[#090d12] border border-white/10 overflow-hidden">
        <div className="px-3 py-2 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-2 shrink-0 bg-[#0c1118]">
          <div className="flex items-center gap-1">
            {(
              [
                { id: 'view', label: 'view.rs', icon: <Layers className="w-3.5 h-3.5" /> },
                { id: 'theme', label: 'theme.rs', icon: <Palette className="w-3.5 h-3.5" /> },
                { id: 'state', label: 'state.rs', icon: <Code2 className="w-3.5 h-3.5" /> }
              ] as const
            ).map((t) => {
              const active = docTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setDocTab(t.id)}
                  className={`h-7 px-2.5 rounded-lg text-[11px] font-mono flex items-center gap-1.5 transition-colors ${
                    active
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="h-7 px-2.5 rounded-lg border border-white/10 text-[11px] font-mono text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <pre className="flex-1 overflow-auto p-3.5 text-[11px] sm:text-xs font-mono text-slate-300 leading-relaxed">
          <code>{activeCode}</code>
        </pre>
      </div>
    </div>
  );
};
