import React from 'react';
import { X } from 'lucide-react';
import { ZoomedKnobTarget } from '../types/audio';

interface KnobZoomModalProps {
  target: ZoomedKnobTarget | null;
  onChange: (val: number) => void;
  onClose: () => void;
}

export const KnobZoomModal: React.FC<KnobZoomModalProps> = ({ target, onChange, onClose }) => {
  if (!target) return null;

  const fraction = (target.value - target.min) / (target.max - target.min);
  const angle = -135 + fraction * 270;
  const step = target.unit === '%' ? 1 : 0.1;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#111720] border border-white/12 rounded-2xl max-w-xs w-full p-6 shadow-2xl text-center relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close precision dial"
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
          Precision Wheel
        </span>
        <h3 className="text-lg font-semibold text-white mb-5">{target.label}</h3>

        <div className="relative w-36 h-36 mx-auto my-3 rounded-full bg-[#090d12] border border-white/15 flex items-center justify-center shadow-inner">
          <div
            className="w-full h-full absolute inset-0"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            <span className="absolute top-2.5 left-1/2 -translate-x-1/2 w-1.5 h-5 rounded-full bg-cyan-400" />
          </div>
          <div className="w-24 h-24 rounded-full bg-[#131a24] border border-white/10 flex flex-col items-center justify-center">
            <span className="text-xl font-bold font-mono tabular-nums text-white">
              {target.value > 0 && target.min < 0 ? `+${target.value.toFixed(1)}` : target.value.toFixed(target.unit === '%' ? 0 : 1)}
            </span>
            <span className="text-[11px] font-mono text-slate-400">{target.unit}</span>
          </div>
        </div>

        <input
          type="range"
          min={target.min}
          max={target.max}
          step={step}
          value={target.value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="studio-slider w-full h-1.5 bg-slate-800 rounded-full my-5"
        />

        <button
          onClick={onClose}
          className="w-full h-11 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};
