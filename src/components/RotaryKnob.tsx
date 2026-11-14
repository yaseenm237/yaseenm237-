import React, { useRef } from 'react';
import { ZoomIn } from 'lucide-react';
import { KnobId, ZoomedKnobTarget } from '../types/audio';

interface RotaryKnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  knobId: KnobId;
  onChange: (val: number) => void;
  onZoom: (target: ZoomedKnobTarget) => void;
}

export const RotaryKnob: React.FC<RotaryKnobProps> = ({
  label,
  value,
  min,
  max,
  step = 0.5,
  unit = 'dB',
  disabled = false,
  knobId,
  onChange,
  onZoom
}) => {
  const dragStartRef = useRef<{ y: number; startVal: number } | null>(null);

  const fraction = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const angle = -135 + fraction * 270;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = { y: e.clientY, startVal: value };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current || disabled) return;
    const deltaY = dragStartRef.current.y - e.clientY;
    const range = max - min;
    const rawNext = dragStartRef.current.startVal + (deltaY / 110) * range;
    const snapped = Math.round(rawNext / step) * step;
    const clamped = Math.max(min, Math.min(max, Number(snapped.toFixed(1))));
    onChange(clamped);
  };

  const handlePointerUp = () => {
    dragStartRef.current = null;
  };

  const openZoom = () => {
    onZoom({ id: knobId, label, value, min, max, unit });
  };

  // SVG arc math for active track
  const r = 24;
  const circumference = 2 * Math.PI * r;
  const arcTotal = circumference * 0.75; // 270 degrees
  const activeLength = arcTotal * fraction;

  return (
    <div className="flex flex-col items-center select-none group">
      <div className="flex items-center gap-1 mb-1.5">
        <span className="text-[11px] font-mono font-medium text-slate-300">{label}</span>
        <button
          type="button"
          onClick={openZoom}
          title={`Precision dial for ${label}`}
          className="text-slate-500 hover:text-cyan-400 transition-colors p-0.5 rounded"
        >
          <ZoomIn className="w-3 h-3" />
        </button>
      </div>

      <div
        data-knob="true"
        aria-disabled={disabled}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={openZoom}
        title="Drag up/down to adjust, or double-click for precision wheel"
        className={`relative w-16 h-16 flex items-center justify-center touch-none ${
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-ns-resize'
        }`}
      >
        <svg className="w-16 h-16 -rotate-[225deg]" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke="rgba(148, 163, 184, 0.16)"
            strokeWidth="3.5"
            strokeDasharray={`${arcTotal} ${circumference}`}
            strokeLinecap="round"
          />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke={disabled ? '#64748b' : '#22d3ee'}
            strokeWidth="3.5"
            strokeDasharray={`${activeLength} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>

        {/* Inner physical dial */}
        <div className="absolute w-10 h-10 rounded-full bg-[#131a24] border border-white/15 shadow-inner flex items-center justify-center">
          <div
            className="w-full h-full relative"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            <span className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1 h-2.5 rounded-full bg-cyan-400" />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={openZoom}
        disabled={disabled}
        className="mt-1 font-mono text-[11px] tabular-nums text-cyan-300 hover:text-cyan-200 transition-colors"
      >
        {value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)} {unit}
      </button>
    </div>
  );
};
