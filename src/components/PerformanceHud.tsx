import React, { useEffect, useState } from 'react';
import { Activity, Cpu, Gauge } from 'lucide-react';

interface PerformanceHudProps {
  audioCtxRef: React.RefObject<AudioContext | null>;
  analyserRef: React.RefObject<AnalyserNode | null>;
  isPlaying: boolean;
  dspEnabled: boolean;
  bassBoost: boolean;
  sampleRateSetting: '48kHz' | '96kHz';
}

interface HudMetrics {
  latencyMs: number;
  sampleRateKhz: string;
  isHardwareActive: boolean;
  ctxState: 'running' | 'suspended' | 'standby';
}

export const PerformanceHud: React.FC<PerformanceHudProps> = ({
  audioCtxRef,
  analyserRef,
  isPlaying,
  dspEnabled,
  bassBoost,
  sampleRateSetting
}) => {
  const [metrics, setMetrics] = useState<HudMetrics>(() => ({
    latencyMs: sampleRateSetting === '96kHz' ? 2.7 : 5.3,
    sampleRateKhz: sampleRateSetting === '96kHz' ? '96.0 kHz' : '48.0 kHz',
    isHardwareActive: false,
    ctxState: 'standby'
  }));

  useEffect(() => {
    const readMetrics = () => {
      const ctx = audioCtxRef.current;
      const analyser = analyserRef.current;

      if (ctx) {
        const hwRate = ctx.sampleRate || 48000;
        const baseLat = typeof ctx.baseLatency === 'number' ? ctx.baseLatency : 0;
        const outLat =
          typeof (ctx as AudioContext & { outputLatency?: number }).outputLatency === 'number'
            ? (ctx as AudioContext & { outputLatency?: number }).outputLatency || 0
            : 0;

        let totalLatencyMs = (baseLat + outLat) * 1000;
        if (totalLatencyMs <= 0.1) {
          // Fallback to real Web Audio render quantum (128 frames) + analyser window
          const fftSize = analyser?.fftSize || 128;
          totalLatencyMs = ((128 + fftSize) / hwRate) * 1000;
        }

        setMetrics({
          latencyMs: Number(totalLatencyMs.toFixed(1)),
          sampleRateKhz: `${(hwRate / 1000).toFixed(1)} kHz`,
          isHardwareActive: true,
          ctxState: ctx.state === 'running' ? 'running' : 'suspended'
        });
      } else {
        const fallbackRate = sampleRateSetting === '96kHz' ? 96000 : 48000;
        const nominalLatencyMs = ((128 + 128) / fallbackRate) * 1000;
        setMetrics({
          latencyMs: Number(nominalLatencyMs.toFixed(1)),
          sampleRateKhz: `${(fallbackRate / 1000).toFixed(1)} kHz`,
          isHardwareActive: false,
          ctxState: 'standby'
        });
      }
    };

    readMetrics();
    const timer = window.setInterval(readMetrics, 400);
    return () => window.clearInterval(timer);
  }, [audioCtxRef, analyserRef, isPlaying, sampleRateSetting]);

  const activeNodes = dspEnabled ? (bassBoost ? 9 : 8) : 3;

  return (
    <footer className="border-t border-white/[0.08] bg-[#0b1017]/85 backdrop-blur-md px-4 sm:px-6 py-2 shrink-0">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-[11px] font-mono">
        {/* Left: Engine Status */}
        <div className="flex items-center gap-2 text-slate-400">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              metrics.ctxState === 'running' && isPlaying
                ? 'bg-emerald-400'
                : metrics.isHardwareActive
                ? 'bg-cyan-400'
                : 'bg-slate-600'
            }`}
          />
          <span className="text-slate-300 font-medium tracking-wide">PERFORMANCE HUD</span>
          <span className="text-slate-600">·</span>
          <span className={metrics.ctxState === 'running' && isPlaying ? 'text-emerald-400' : 'text-slate-400'}>
            {metrics.ctxState === 'running' && isPlaying
              ? 'DSP ACTIVE'
              : metrics.isHardwareActive
              ? 'ENGINE READY'
              : 'STANDBY'}
          </span>
        </div>

        {/* Right: Real-time Buffer Latency & Hardware Sample Rate */}
        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 tabular-nums">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <span>Buffer Latency:</span>
            <span className="text-white font-semibold">{metrics.latencyMs.toFixed(1)} ms</span>
          </div>

          <span className="text-slate-700 hidden sm:inline">|</span>

          <div className="flex items-center gap-1.5 text-slate-400">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sample Rate:</span>
            <span className="text-cyan-300 font-semibold">
              {metrics.sampleRateKhz}
            </span>
            <span className="text-[10px] text-slate-500">
              {metrics.isHardwareActive ? '(HW)' : '(Target)'}
            </span>
          </div>

          <span className="text-slate-700 hidden md:inline">|</span>

          <div className="hidden md:flex items-center gap-1.5 text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span>Graph:</span>
            <span className="text-slate-200 font-medium">
              {dspEnabled ? `${activeNodes} Biquad Nodes` : 'Bypass'}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
