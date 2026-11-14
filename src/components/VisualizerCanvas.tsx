import React, { memo, useEffect, useRef } from 'react';
import { VisualizerStyle } from '../types/audio';

interface VisualizerCanvasProps {
  analyserRef: React.RefObject<AnalyserNode | null>;
  isPlaying: boolean;
  visualizerStyle?: VisualizerStyle;
  styleMode?: VisualizerStyle;
  width?: number;
  height?: number;
  className?: string;
}

const HISTORY_BANDS = 36;
const HISTORY_TRAIL_DEPTH = 8;
const BAR_COUNT = 32;
const TERRAIN_COLS = 26;
const TERRAIN_ROWS = 18;
const IDLE_FRAME_INTERVAL_MS = 50; // ~20fps when paused & settled to save CPU/battery

function drawSmoothCurve(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  closeToBottomHeight?: number
) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
  }

  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);

  if (typeof closeToBottomHeight === 'number') {
    ctx.lineTo(last.x, closeToBottomHeight);
    ctx.lineTo(points[0].x, closeToBottomHeight);
    ctx.closePath();
  }
}

const VisualizerCanvasInner: React.FC<VisualizerCanvasProps> = ({
  analyserRef,
  isPlaying,
  visualizerStyle,
  styleMode,
  width = 460,
  height = 180,
  className = 'w-full h-full'
}) => {
  const activeStyle: VisualizerStyle = visualizerStyle ?? styleMode ?? 'waterfall';

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeStyleRef = useRef<VisualizerStyle>(activeStyle);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const analyserPropRef = useRef<React.RefObject<AnalyserNode | null>>(analyserRef);

  // Sync latest props into refs without tearing down the rAF loop
  activeStyleRef.current = activeStyle;
  isPlayingRef.current = isPlaying;
  analyserPropRef.current = analyserRef;

  // Reusable typed arrays (zero per-frame allocations)
  const freqBufferRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(64));
  const timeBufferRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(128));
  const rawBandsRef = useRef<number[]>(new Array(HISTORY_BANDS).fill(0));
  const currentRowRef = useRef<number[]>(new Array(TERRAIN_COLS).fill(0));

  const waterfallHistory = useRef<number[][]>([]);
  const decayBandsRef = useRef<number[]>(new Array(HISTORY_BANDS).fill(0));
  const peakBandsRef = useRef<number[]>(new Array(HISTORY_BANDS).fill(0));
  const peakHoldFramesRef = useRef<number[]>(new Array(HISTORY_BANDS).fill(0));
  const historyTrailsRef = useRef<number[][]>([]);
  const frameCounterRef = useRef<number>(0);

  // Hardware-style bar analyzer state
  const barLevelsRef = useRef<number[]>(new Array(BAR_COUNT).fill(0));
  const barPeaksRef = useRef<number[]>(new Array(BAR_COUNT).fill(0));
  const barPeakHoldRef = useRef<number[]>(new Array(BAR_COUNT).fill(0));
  const barPeakVelRef = useRef<number[]>(new Array(BAR_COUNT).fill(0));

  const particlesRef = useRef<
    Array<{ x: number; y: number; z: number; vz: number; color: string }>
  >([]);

  const blastParticlesRef = useRef<
    Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      bandRatio: number;
      glow: number;
    }>
  >([]);
  const prevHfAvgRef = useRef<number>(0);
  const blastIntensityRef = useRef<number>(0);

  // 3D Waterfall landscape mesh + beat glow state
  const terrain3dRef = useRef<number[][]>(
    Array.from({ length: TERRAIN_ROWS }, () => new Array(TERRAIN_COLS).fill(0))
  );
  const prevBassAvgRef = useRef<number>(0);
  const beatGlowRef = useRef<number>(0);
  const terrainFrameRef = useRef<number>(0);

  useEffect(() => {
    particlesRef.current = Array.from({ length: 56 }, (_, idx) => ({
      x: (Math.random() - 0.5) * 280,
      y: (Math.random() - 0.5) * 140,
      z: Math.random() * 280 + 40,
      vz: Math.random() * 1.8 + 0.8,
      color: idx % 4 === 0 ? '#f59e0b' : '#22d3ee'
    }));

    const neonPalette = ['#22d3ee', '#38bdf8', '#a855f7', '#f59e0b', '#f472b6'];
    blastParticlesRef.current = Array.from({ length: 70 }, (_, idx) => {
      const angle = Math.random() * Math.PI * 2;
      const baseSpeed = 0.0008 + Math.random() * 0.0018;
      return {
        x: Math.random(),
        y: Math.random(),
        vx: Math.cos(angle) * baseSpeed,
        vy: Math.sin(angle) * baseSpeed,
        radius: 1.5 + Math.random() * 2.4,
        color: neonPalette[idx % neonPalette.length],
        bandRatio: 0.35 + Math.random() * 0.65,
        glow: 0.2
      };
    });
  }, []);

  // Single persistent requestAnimationFrame loop for the lifetime of the canvas
  useEffect(() => {
    let animationId = 0;
    let lastRenderTime = 0;
    let hasActiveDecay = false;

    const getFreqBuffer = (size: number) => {
      if (freqBufferRef.current.length !== size) {
        freqBufferRef.current = new Uint8Array(size);
      }
      return freqBufferRef.current;
    };

    const getTimeBuffer = (size: number) => {
      if (timeBufferRef.current.length !== size) {
        timeBufferRef.current = new Uint8Array(size);
      }
      return timeBufferRef.current;
    };

    const drawIdleBaseline = (ctx: CanvasRenderingContext2D, w: number, h: number, nowMs: number) => {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.12)';
      ctx.fillRect(0, h / 2, w, 1);
      const phase = nowMs / 550;
      ctx.fillStyle = 'rgba(34, 211, 238, 0.45)';
      for (let i = 12; i < w - 12; i += 14) {
        const barH = Math.sin(phase + i * 0.04) * 8 + 10;
        ctx.fillRect(i, h / 2 - barH / 2, 2.5, barH);
      }
    };

    const render = (now: number) => {
      animationId = requestAnimationFrame(render);

      if (document.hidden) return;

      const playing = isPlayingRef.current;
      const style = activeStyleRef.current;

      // Throttle frame rate while paused and decayed to minimize idle CPU usage
      if (!playing && !hasActiveDecay && now - lastRenderTime < IDLE_FRAME_INTERVAL_MS) {
        return;
      }
      const dtScale = lastRenderTime > 0 ? Math.min(2.5, (now - lastRenderTime) / 16.67) : 1;
      lastRenderTime = now;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const analyser = analyserPropRef.current.current;
      const hasLiveAudio = Boolean(analyser && playing);
      hasActiveDecay = false;

      if (style === 'oscilloscope') {
        const bufferLength = analyser ? analyser.fftSize : 128;
        const timeDomain = getTimeBuffer(bufferLength);
        if (hasLiveAudio && analyser) {
          analyser.getByteTimeDomainData(timeDomain);
        } else {
          timeDomain.fill(128);
        }

        // Subtle CRT oscilloscope graticule
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.10)';
        ctx.lineWidth = 1;
        for (let g = 1; g <= 3; g++) {
          const gy = (h * g) / 4;
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(w, gy);
          ctx.stroke();
        }
        for (let v = 1; v <= 5; v++) {
          const vx = (w * v) / 6;
          ctx.beginPath();
          ctx.moveTo(vx, 0);
          ctx.lineTo(vx, h);
          ctx.stroke();
        }

        // Rising zero-crossing trigger stabilization
        let triggerOffset = 0;
        if (hasLiveAudio) {
          const searchLimit = Math.floor(bufferLength / 2);
          for (let i = 1; i < searchLimit; i++) {
            if (timeDomain[i - 1] < 128 && timeDomain[i] >= 128) {
              triggerOffset = i;
              break;
            }
          }
        }

        const displaySamples = Math.max(32, bufferLength - triggerOffset);
        const sliceW = w / (displaySamples - 1);
        const centerY = h / 2;
        const amp = h * 0.42;

        ctx.save();
        ctx.beginPath();
        for (let i = 0; i < displaySamples; i++) {
          const sample = (timeDomain[triggerOffset + i] - 128) / 128;
          const x = i * sliceW;
          const y = hasLiveAudio
            ? centerY + sample * amp
            : centerY + Math.sin(now / 450 + i * 0.14) * 3;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = hasLiveAudio ? '#22d3ee' : 'rgba(34, 211, 238, 0.42)';
        ctx.lineWidth = hasLiveAudio ? 2.2 : 1.4;
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = hasLiveAudio ? 10 : 0;
        ctx.stroke();
        ctx.restore();
        return;
      }

      if (style === 'history') {
        const bufferLength = analyser ? analyser.frequencyBinCount : 64;
        const dataArray = getFreqBuffer(bufferLength);
        if (hasLiveAudio && analyser) {
          analyser.getByteFrequencyData(dataArray);
        }

        const maxBin = Math.min(bufferLength, 44);
        const rawBands = rawBandsRef.current;
        for (let i = 0; i < HISTORY_BANDS; i++) {
          if (!hasLiveAudio) {
            rawBands[i] = 0;
          } else {
            const binPos = (i / (HISTORY_BANDS - 1)) * (maxBin - 1);
            const lo = Math.floor(binPos);
            const hi = Math.min(maxBin - 1, lo + 1);
            const frac = binPos - lo;
            const interp = dataArray[lo] * (1 - frac) + dataArray[hi] * frac;
            rawBands[i] = interp / 255;
          }
        }

        let hasResidualEnergy = false;
        for (let i = 0; i < HISTORY_BANDS; i++) {
          const left = rawBands[Math.max(0, i - 1)];
          const center = rawBands[i];
          const right = rawBands[Math.min(HISTORY_BANDS - 1, i + 1)];
          const spatial = left * 0.2 + center * 0.6 + right * 0.2;

          const prev = decayBandsRef.current[i];
          const next =
            spatial > prev
              ? prev + (spatial - prev) * 0.48
              : prev * Math.pow(0.915, dtScale);

          decayBandsRef.current[i] = next < 0.003 ? 0 : next;
          if (decayBandsRef.current[i] > 0.005) hasResidualEnergy = true;

          if (decayBandsRef.current[i] >= peakBandsRef.current[i]) {
            peakBandsRef.current[i] = decayBandsRef.current[i];
            peakHoldFramesRef.current[i] = 14;
          } else if (peakHoldFramesRef.current[i] > 0) {
            peakHoldFramesRef.current[i] -= 1;
          } else {
            peakBandsRef.current[i] = Math.max(
              decayBandsRef.current[i],
              peakBandsRef.current[i] - 0.011 * dtScale
            );
          }
          if (peakBandsRef.current[i] > 0.005) hasResidualEnergy = true;
        }
        hasActiveDecay = hasResidualEnergy;

        frameCounterRef.current += 1;
        if (frameCounterRef.current % 2 === 0) {
          historyTrailsRef.current.unshift([...decayBandsRef.current]);
          if (historyTrailsRef.current.length > HISTORY_TRAIL_DEPTH) {
            historyTrailsRef.current.pop();
          }
        }

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.07)';
        ctx.lineWidth = 1;
        for (let g = 1; g <= 3; g++) {
          const gy = (h * g) / 4;
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(w, gy);
          ctx.stroke();
        }

        if (hasLiveAudio || hasResidualEnergy) {
          const baseY = h - 4;
          const usableH = h * 0.82;
          const toPoints = (vals: number[], yDrift = 0) =>
            vals.map((v, i) => ({
              x: (i / (HISTORY_BANDS - 1)) * w,
              y: baseY - v * usableH - yDrift
            }));

          const trails = historyTrailsRef.current;
          for (let t = trails.length - 1; t >= 1; t--) {
            const ageRatio = 1 - t / HISTORY_TRAIL_DEPTH;
            const ghostAlpha = ageRatio * 0.28;
            const pts = toPoints(trails[t], t * 1.4);
            drawSmoothCurve(ctx, pts);
            ctx.strokeStyle = `rgba(56, 189, 248, ${ghostAlpha.toFixed(3)})`;
            ctx.lineWidth = 1.25;
            ctx.stroke();
          }

          const colW = w / HISTORY_BANDS;
          for (let i = 0; i < HISTORY_BANDS; i++) {
            const val = decayBandsRef.current[i];
            if (val <= 0.01) continue;
            const colH = val * usableH;
            ctx.fillStyle = 'rgba(34, 211, 238, 0.08)';
            ctx.fillRect(i * colW + 1, baseY - colH, Math.max(1, colW - 2), colH);
          }

          const livePoints = toPoints(decayBandsRef.current);
          drawSmoothCurve(ctx, livePoints, baseY);
          const areaGrad = ctx.createLinearGradient(0, baseY - usableH, 0, baseY);
          areaGrad.addColorStop(0, 'rgba(34, 211, 238, 0.34)');
          areaGrad.addColorStop(0.65, 'rgba(34, 211, 238, 0.10)');
          areaGrad.addColorStop(1, 'rgba(34, 211, 238, 0.0)');
          ctx.fillStyle = areaGrad;
          ctx.fill();

          drawSmoothCurve(ctx, livePoints);
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 2;
          ctx.stroke();

          const peakPoints = toPoints(peakBandsRef.current);
          drawSmoothCurve(ctx, peakPoints);
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else {
          drawIdleBaseline(ctx, w, h, now);
        }
        return;
      }

      if (style === 'bars') {
        const bufferLength = analyser ? analyser.frequencyBinCount : 64;
        const dataArray = getFreqBuffer(bufferLength);
        if (hasLiveAudio && analyser) {
          analyser.getByteFrequencyData(dataArray);
        }

        const usableBins = Math.min(bufferLength, 56);
        let hasResidualEnergy = false;

        for (let i = 0; i < BAR_COUNT; i++) {
          let target = 0;
          if (hasLiveAudio) {
            const normPos = i / (BAR_COUNT - 1);
            const binPos = Math.pow(normPos, 1.15) * (usableBins - 1);
            const lo = Math.floor(binPos);
            const hi = Math.min(usableBins - 1, lo + 1);
            const frac = binPos - lo;
            const raw = (dataArray[lo] * (1 - frac) + dataArray[hi] * frac) / 255;
            const hfTilt = 1 + normPos * 0.42;
            target = Math.min(1, raw * hfTilt);
          }

          const prevLevel = barLevelsRef.current[i];
          const nextLevel =
            target > prevLevel
              ? prevLevel + (target - prevLevel) * 0.68
              : prevLevel * Math.pow(0.875, dtScale);

          barLevelsRef.current[i] = nextLevel < 0.004 ? 0 : nextLevel;
          if (barLevelsRef.current[i] > 0.005) hasResidualEnergy = true;

          if (barLevelsRef.current[i] >= barPeaksRef.current[i]) {
            barPeaksRef.current[i] = barLevelsRef.current[i];
            barPeakHoldRef.current[i] = 18;
            barPeakVelRef.current[i] = 0;
          } else if (barPeakHoldRef.current[i] > 0) {
            barPeakHoldRef.current[i] -= 1;
          } else {
            barPeakVelRef.current[i] += 0.0014 * dtScale;
            barPeaksRef.current[i] = Math.max(
              barLevelsRef.current[i],
              barPeaksRef.current[i] - barPeakVelRef.current[i]
            );
          }

          if (barPeaksRef.current[i] > 0.005) hasResidualEnergy = true;
        }
        hasActiveDecay = hasResidualEnergy;

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.07)';
        ctx.lineWidth = 1;
        for (let g = 1; g <= 3; g++) {
          const gy = (h * g) / 4;
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(w, gy);
          ctx.stroke();
        }

        if (hasLiveAudio || hasResidualEnergy) {
          const padX = 8;
          const gap = 3;
          const drawW = w - padX * 2;
          const barW = (drawW - gap * (BAR_COUNT - 1)) / BAR_COUNT;
          const baseY = h - 4;
          const maxBarH = h * 0.84;

          for (let i = 0; i < BAR_COUNT; i++) {
            const x = padX + i * (barW + gap);
            const level = barLevelsRef.current[i];
            const peak = barPeaksRef.current[i];
            const barH = Math.max(2, level * maxBarH);

            const grad = ctx.createLinearGradient(0, baseY, 0, baseY - maxBarH);
            grad.addColorStop(0, 'rgba(34, 211, 238, 0.28)');
            grad.addColorStop(0.65, '#22d3ee');
            grad.addColorStop(0.88, '#38bdf8');
            grad.addColorStop(1, '#f59e0b');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(x, baseY - barH, barW, barH, [2, 2, 0, 0]);
            ctx.fill();

            if (peak > 0.015) {
              const peakY = Math.max(4, baseY - peak * maxBarH - 3);
              ctx.fillStyle = peak > 0.72 ? '#f59e0b' : '#67e8f9';
              ctx.beginPath();
              ctx.roundRect(x, peakY, barW, 2.5, 1);
              ctx.fill();
            }
          }
        } else {
          drawIdleBaseline(ctx, w, h, now);
        }
        return;
      }

      if (style === 'particle_blast') {
        const bufferLength = analyser ? analyser.frequencyBinCount : 64;
        const dataArray = getFreqBuffer(bufferLength);
        if (hasLiveAudio && analyser) {
          analyser.getByteFrequencyData(dataArray);
        }

        let hfSum = 0;
        let hfCount = 0;
        const hfStart = Math.floor(bufferLength * 0.38);
        for (let b = hfStart; b < bufferLength; b++) {
          hfSum += dataArray[b] / 255;
          hfCount++;
        }
        const hfEnergy = hasLiveAudio && hfCount > 0 ? hfSum / hfCount : 0;
        const hfTransient = Math.max(0, hfEnergy - prevHfAvgRef.current * 1.12);
        prevHfAvgRef.current = prevHfAvgRef.current * 0.82 + hfEnergy * 0.18;

        const targetBlast = Math.min(1, hfEnergy * 1.2 + hfTransient * 4.5);
        blastIntensityRef.current =
          targetBlast > blastIntensityRef.current
            ? blastIntensityRef.current + (targetBlast - blastIntensityRef.current) * 0.72
            : blastIntensityRef.current * Math.pow(0.88, dtScale);

        const blast = blastIntensityRef.current;
        if (blast > 0.02) hasActiveDecay = true;
        const speedMultiplier = (hasLiveAudio ? 1 + hfEnergy * 3.2 + blast * 6.5 : 0.65) * dtScale;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (const p of blastParticlesRef.current) {
          const binIdx = Math.min(bufferLength - 1, Math.floor(p.bandRatio * (bufferLength - 1)));
          const binEnergy = hasLiveAudio ? dataArray[binIdx] / 255 : 0;
          const particleBoost = 1 + binEnergy * 1.8 + blast * 1.6;

          const prevX = p.x * w;
          const prevY = p.y * h;

          if (hfTransient > 0.06) {
            const dx = p.x - 0.5;
            const dy = p.y - 0.5;
            const dist = Math.hypot(dx, dy) || 0.01;
            p.x += (dx / dist) * hfTransient * 0.035;
            p.y += (dy / dist) * hfTransient * 0.035;
          }

          p.x += p.vx * speedMultiplier * particleBoost;
          p.y += p.vy * speedMultiplier * particleBoost;

          if (p.x < -0.04) p.x = 1.04;
          else if (p.x > 1.04) p.x = -0.04;
          if (p.y < -0.04) p.y = 1.04;
          else if (p.y > 1.04) p.y = -0.04;

          const px = p.x * w;
          const py = p.y * h;

          const targetGlow = hasLiveAudio ? Math.min(1, 0.25 + binEnergy * 0.6 + blast * 0.85) : 0.18;
          p.glow = p.glow * 0.8 + targetGlow * 0.2;

          const r = p.radius * (0.9 + p.glow * 1.15);

          if (blast > 0.22 && Math.hypot(px - prevX, py - prevY) < 40) {
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = Math.min(0.55, p.glow * 0.5);
            ctx.lineWidth = Math.max(1, r * 0.65);
            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(px, py);
            ctx.stroke();
          }

          ctx.globalAlpha = Math.min(0.95, 0.35 + p.glow * 0.65);
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6 + p.glow * 22;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();

          if (p.glow > 0.55) {
            ctx.shadowBlur = 0;
            ctx.globalAlpha = (p.glow - 0.55) * 1.6;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px, py, Math.max(0.8, r * 0.42), 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.restore();
        return;
      }

      if (style === 'waterfall_3d') {
        const bufferLength = analyser ? analyser.frequencyBinCount : 64;
        const dataArray = getFreqBuffer(bufferLength);
        if (hasLiveAudio && analyser) {
          analyser.getByteFrequencyData(dataArray);
        }

        let bassSum = 0;
        const bassBins = Math.min(6, bufferLength);
        for (let b = 0; b < bassBins; b++) {
          bassSum += dataArray[b] / 255;
        }
        const bassEnergy = hasLiveAudio && bassBins > 0 ? bassSum / bassBins : 0;
        const beatSpike = Math.max(0, bassEnergy - prevBassAvgRef.current * 1.08);
        prevBassAvgRef.current = prevBassAvgRef.current * 0.84 + bassEnergy * 0.16;

        const targetGlow = hasLiveAudio ? Math.min(1, bassEnergy * 0.85 + beatSpike * 3.8) : 0.08;
        beatGlowRef.current =
          targetGlow > beatGlowRef.current
            ? beatGlowRef.current + (targetGlow - beatGlowRef.current) * 0.72
            : beatGlowRef.current * Math.pow(0.87, dtScale);
        const beatGlow = beatGlowRef.current;
        if (beatGlow > 0.1) hasActiveDecay = true;

        const maxBin = Math.min(bufferLength, 42);
        const currentRow = currentRowRef.current;
        for (let c = 0; c < TERRAIN_COLS; c++) {
          if (!hasLiveAudio) {
            currentRow[c] = 0;
          } else {
            const binPos = (c / (TERRAIN_COLS - 1)) * (maxBin - 1);
            const lo = Math.floor(binPos);
            const hi = Math.min(maxBin - 1, lo + 1);
            const frac = binPos - lo;
            currentRow[c] = (dataArray[lo] * (1 - frac) + dataArray[hi] * frac) / 255;
          }
        }

        const smoothedRow = currentRow.map((val, c) => {
          const l = currentRow[Math.max(0, c - 1)];
          const r = currentRow[Math.min(TERRAIN_COLS - 1, c + 1)];
          return l * 0.2 + val * 0.6 + r * 0.2;
        });

        terrainFrameRef.current += 1;
        if (terrainFrameRef.current % 2 === 0) {
          terrain3dRef.current.unshift(smoothedRow);
          if (terrain3dRef.current.length > TERRAIN_ROWS) {
            terrain3dRef.current.pop();
          }
        } else if (terrain3dRef.current.length > 0) {
          terrain3dRef.current[0] = terrain3dRef.current[0].map(
            (prev, idx) => prev * 0.45 + smoothedRow[idx] * 0.55
          );
        }

        const horizonY = h * 0.24;
        const fov = w * 0.62;
        const camDist = 1.45;
        const camHeight = 0.52;

        const project = (col: number, row: number, elev: number) => {
          const nx = (col / (TERRAIN_COLS - 1)) * 2 - 1;
          const nz = row / (TERRAIN_ROWS - 1);
          const worldZ = camDist + nz * 2.6;
          const worldX = nx * 1.45;
          const worldY = camHeight - elev * (0.58 + beatGlow * 0.14);
          const scale = fov / worldZ;
          return {
            x: w / 2 + worldX * scale,
            y: horizonY + worldY * scale * 0.55
          };
        };

        const horizonGrad = ctx.createLinearGradient(0, horizonY - 18, 0, h);
        horizonGrad.addColorStop(0, `rgba(34, 211, 238, ${(0.05 + beatGlow * 0.18).toFixed(3)})`);
        horizonGrad.addColorStop(0.5, `rgba(56, 189, 248, ${(0.03 + beatGlow * 0.08).toFixed(3)})`);
        horizonGrad.addColorStop(1, 'rgba(9, 13, 18, 0)');
        ctx.fillStyle = horizonGrad;
        ctx.fillRect(0, horizonY - 18, w, h - horizonY + 18);

        const rows = terrain3dRef.current;

        for (let r = rows.length - 1; r >= 0; r--) {
          const depthRatio = 1 - r / (TERRAIN_ROWS - 1);
          const rowVals = rows[r];
          const pts = rowVals.map((elev, c) => project(c, r, elev));

          ctx.beginPath();
          ctx.moveTo(pts[0].x, h + 10);
          for (let c = 0; c < pts.length; c++) {
            ctx.lineTo(pts[c].x, pts[c].y);
          }
          ctx.lineTo(pts[pts.length - 1].x, h + 10);
          ctx.closePath();
          ctx.fillStyle = `rgba(9, 13, 18, ${(0.72 + depthRatio * 0.22).toFixed(2)})`;
          ctx.fill();

          if (r < rows.length - 1) {
            const nextRow = rows[r + 1];
            ctx.lineWidth = 0.9;
            ctx.strokeStyle = `rgba(56, 189, 248, ${(0.12 + depthRatio * 0.18 + beatGlow * 0.16).toFixed(3)})`;
            for (let c = 0; c < pts.length; c += 2) {
              const backPt = project(c, r + 1, nextRow[c]);
              ctx.beginPath();
              ctx.moveTo(pts[c].x, pts[c].y);
              ctx.lineTo(backPt.x, backPt.y);
              ctx.stroke();
            }
          }

          ctx.save();
          const rowPeak = Math.max(...rowVals);
          const isHotBeat = beatGlow > 0.45 && rowPeak > 0.42;
          const strokeAlpha = 0.22 + depthRatio * 0.68 + beatGlow * 0.15;

          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let c = 1; c < pts.length; c++) {
            ctx.lineTo(pts[c].x, pts[c].y);
          }

          ctx.strokeStyle = isHotBeat
            ? `rgba(245, 158, 11, ${Math.min(1, strokeAlpha).toFixed(3)})`
            : `rgba(34, 211, 238, ${Math.min(1, strokeAlpha).toFixed(3)})`;
          ctx.lineWidth = (1.0 + depthRatio * 1.1) * (1 + beatGlow * 0.35);

          if (r < 6) {
            ctx.shadowColor = isHotBeat ? '#f59e0b' : '#22d3ee';
            ctx.shadowBlur = (4 + beatGlow * 18) * depthRatio;
          }
          ctx.stroke();
          ctx.restore();
        }
        return;
      }

      if (hasLiveAudio && analyser) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = getFreqBuffer(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        if (style === 'waterfall') {
          waterfallHistory.current.unshift(Array.from(dataArray.subarray(0, 28)));
          if (waterfallHistory.current.length > 12) waterfallHistory.current.pop();
          const rows = waterfallHistory.current;
          for (let r = rows.length - 1; r >= 0; r--) {
            const rowData = rows[r];
            const perspective = 1 - r * 0.055;
            const yOffset = h * 0.86 - r * 8;
            const alpha = (1 - r / rows.length) * 0.85;
            ctx.beginPath();
            ctx.strokeStyle =
              r === 0
                ? `rgba(34, 211, 238, ${alpha})`
                : r % 3 === 0
                ? `rgba(245, 158, 11, ${alpha * 0.65})`
                : `rgba(56, 189, 248, ${alpha * 0.55})`;
            ctx.lineWidth = Math.max(1, 2 * perspective);
            const step = (w * perspective) / (rowData.length - 1);
            const startX = (w * (1 - perspective)) / 2;
            for (let i = 0; i < rowData.length; i++) {
              const val = (rowData[i] / 255) * (h * 0.34) * perspective;
              const x = startX + i * step;
              const y = yOffset - val;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
        } else if (style === 'particles') {
          const beatStrength = dataArray[3] / 255;
          const cx = w / 2;
          const cy = h / 2;
          particlesRef.current.forEach((p) => {
            p.z -= p.vz * (0.9 + beatStrength * 2.8) * dtScale;
            if (p.z <= 12) p.z = 290;
            const scale = 190 / p.z;
            const sx = cx + p.x * scale;
            const sy = cy + p.y * scale;
            if (sx >= 0 && sx <= w && sy >= 0 && sy <= h) {
              const size = Math.max(1.2, (1 - p.z / 290) * 3.8 * (1 + beatStrength));
              ctx.fillStyle = p.color;
              ctx.beginPath();
              ctx.arc(sx, sy, size, 0, Math.PI * 2);
              ctx.fill();
            }
          });
        } else if (style === 'waveform') {
          const timeDomain = getTimeBuffer(analyser.fftSize);
          analyser.getByteTimeDomainData(timeDomain);
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#22d3ee';
          ctx.beginPath();
          const sliceW = w / timeDomain.length;
          let x = 0;
          for (let i = 0; i < timeDomain.length; i++) {
            const v = timeDomain[i] / 128.0;
            const y = (v * h) / 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceW;
          }
          ctx.lineTo(w, h / 2);
          ctx.stroke();
        } else if (style === 'circular') {
          const cx = w / 2;
          const cy = h / 2;
          const radius = Math.min(cx, cy) * 0.5;
          ctx.save();
          ctx.translate(cx, cy);
          const count = Math.min(bufferLength, 48);
          const angleStep = (Math.PI * 2) / count;
          for (let i = 0; i < count; i++) {
            const val = dataArray[i] / 255;
            const barLen = Math.max(4, val * radius * 0.9);
            const angle = i * angleStep - Math.PI / 2;
            const x1 = Math.cos(angle) * radius;
            const y1 = Math.sin(angle) * radius;
            const x2 = Math.cos(angle) * (radius + barLen);
            const y2 = Math.sin(angle) * (radius + barLen);
            ctx.strokeStyle = val > 0.75 ? '#f59e0b' : '#22d3ee';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
          ctx.restore();
        }
      } else {
        drawIdleBaseline(ctx, w, h, now);
      }
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={
        activeStyle === 'waterfall_3d'
          ? { perspective: '520px', transformStyle: 'preserve-3d' }
          : undefined
      }
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={className}
        style={
          activeStyle === 'waterfall_3d'
            ? { transform: 'rotateX(10deg) scale(1.03)', transformOrigin: 'center bottom' }
            : undefined
        }
      />
    </div>
  );
};

export const VisualizerCanvas = memo(VisualizerCanvasInner);
