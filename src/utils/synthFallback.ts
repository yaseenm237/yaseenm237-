import { Genre } from '../types/audio';

const wavCache = new Map<string, string>();

export function createFallbackWavUrl(trackId: string, genre: Genre, durationSec = 24): string {
  const cacheKey = `${trackId}-${genre}`;
  const cached = wavCache.get(cacheKey);
  if (cached) return cached;

  const sampleRate = 22050;
  const numSamples = Math.floor(durationSec * sampleRate);
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  const rootFreq =
    genre === 'Ambient' ? 146.83 : genre === 'Electro' ? 92.5 : genre === 'Cyberpunk' ? 82.41 : 55;
  const bpm = genre === 'Electro' ? 128 : genre === 'Cyberpunk' ? 124 : 110;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const beat = (t * bpm) / 60;
    const fadeIn = Math.min(1, t / 0.15);
    const fadeOut = Math.min(1, (durationSec - t) / 0.25);

    const sub = Math.sin(2 * Math.PI * rootFreq * t) * 0.3;
    const harm = Math.sin(2 * Math.PI * rootFreq * 4 * t) * 0.16 * Math.exp(-((beat * 2) % 1) * 3.5);
    const kickEnv = Math.exp(-((beat % 1) * 14));
    const kick = Math.sin(2 * Math.PI * (48 + 70 * kickEnv) * t) * 0.3 * kickEnv;

    const sample = Math.max(-1, Math.min(1, (sub + harm + kick) * fadeIn * fadeOut));
    view.setInt16(44 + i * 2, Math.round(sample * 32767), true);
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  wavCache.set(cacheKey, url);
  return url;
}
