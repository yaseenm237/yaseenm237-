import React, { useEffect, useRef, useState } from 'react';
import {
  Code2,
  Disc,
  HardDrive,
  Monitor,
  Radio,
  Sliders,
  Smartphone,
  Upload
} from 'lucide-react';
import {
  EqControlStyle,
  EqPreset,
  LibraryTab,
  MobileTab,
  PreviewMode,
  Track,
  VisualizerTheme,
  WorkspaceTab,
  ZoomedKnobTarget
} from './types/audio';
import { DEFAULT_TRACKS, EQ_PRESETS } from './data/tracks';
import { PlayerPanel } from './components/PlayerPanel';
import { LibraryPanel } from './components/LibraryPanel';
import { EqualizerPanel } from './components/EqualizerPanel';
import { BlueprintPanel } from './components/BlueprintPanel';
import { MiniPlayerBar } from './components/MiniPlayerBar';
import { KnobZoomModal } from './components/KnobZoomModal';
import { EditTrackModal } from './components/EditTrackModal';
import { NeonRippleOverlay } from './components/NeonRippleOverlay';
import { PerformanceHud } from './components/PerformanceHud';
import { createFallbackWavUrl } from './utils/synthFallback';
import { deleteTrackBlob, loadAllTrackBlobs, saveTrackBlob } from './utils/audioDb';
import { parseId3Tags } from './utils/id3Parser';
import { loadSavedLibrary, readAudioDuration, saveLibraryToStorage } from './utils/storage';

export default function App() {
  // Library & Track State (hydrated from localStorage + IndexedDB blobs)
  const [playlist, setPlaylist] = useState<Track[]>(() => loadSavedLibrary());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fallbackUrls, setFallbackUrls] = useState<Record<string, string>>({});
  const currentTrack = playlist[currentIndex] || DEFAULT_TRACKS[0];

  // Never override imported/local songs with synthesized fallback audio
  const resolvedAudioUrl = currentTrack.isImported
    ? currentTrack.url || ''
    : fallbackUrls[currentTrack.id] ||
      currentTrack.url ||
      createFallbackWavUrl(currentTrack.id, currentTrack.genre, currentTrack.duration);

  const shouldPlayOnLoadRef = useRef(false);
  const loadedSrcRef = useRef('');

  // Hydrate binary audio blobs from IndexedDB for imported local tracks on mount
  useEffect(() => {
    let cancelled = false;
    loadAllTrackBlobs().then((blobUrls) => {
      if (cancelled || Object.keys(blobUrls).length === 0) return;
      setPlaylist((prev) =>
        prev.map((track) => {
          const restoredUrl = blobUrls[track.id];
          if (!restoredUrl) return track;
          return {
            ...track,
            url: restoredUrl,
            hasAudioData: true
          };
        })
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist playlist & track metadata to localStorage
  useEffect(() => {
    saveLibraryToStorage(playlist);
  }, [playlist]);

  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(currentTrack.duration);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [loop, setLoop] = useState(false);
  const [shuffle, setShuffle] = useState(false);

  // Navigation & Viewport State
  const [previewMode, setPreviewMode] = useState<PreviewMode>('responsive');
  const [isNarrowScreen, setIsNarrowScreen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 900 : false
  );
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('library');
  const [mobileTab, setMobileTab] = useState<MobileTab>('player');
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);

  // Library Filter State
  const [libraryTab, setLibraryTab] = useState<LibraryTab>('tracks');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterArtist, setFilterArtist] = useState<string | null>(null);
  const [filterAlbum, setFilterAlbum] = useState<string | null>(null);
  const [filterFolder, setFilterFolder] = useState<string | null>(null);

  // DSP Equalizer State
  const [dspEnabled, setDspEnabled] = useState(true);
  const [bassBoost, setBassBoost] = useState(true);
  const [autoGainEnabled, setAutoGainEnabled] = useState(true);
  const [autoGainDb, setAutoGainDb] = useState(0);
  const [crossfadeDuration, setCrossfadeDuration] = useState(2.0);
  const [visualizerTheme, setVisualizerTheme] = useState<VisualizerTheme>(() => {
    if (typeof window === 'undefined' || !window.localStorage) return 'cyber_cyan';
    const saved = window.localStorage.getItem('dsp_visualizer_theme_v1') as VisualizerTheme | null;
    return saved === 'cyber_cyan' || saved === 'sunset_pink' || saved === 'monochrome_white'
      ? saved
      : 'cyber_cyan';
  });
  const [band60Hz, setBand60Hz] = useState(4.5);
  const [band250Hz, setBand250Hz] = useState(2.0);
  const [band1kHz, setBand1kHz] = useState(-1.0);
  const [band4kHz, setBand4kHz] = useState(3.0);
  const [band16kHz, setBand16kHz] = useState(5.0);
  const [eqControlStyle, setEqControlStyle] = useState<EqControlStyle>('knobs');
  const [smartAiEnabled, setSmartAiEnabled] = useState(true);
  const [isProfilingAi, setIsProfilingAi] = useState(false);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [sampleRate, setSampleRate] = useState<'48kHz' | '96kHz'>('48kHz');
  const [zoomedKnob, setZoomedKnob] = useState<ZoomedKnobTarget | null>(null);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);

  // Web Audio Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const crossfadeGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const autoGainTrimRef = useRef(1.0);
  const agcFloatBufRef = useRef<Float32Array<ArrayBuffer>>(new Float32Array(128));
  const agcByteBufRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(128));
  const crossfadeDurationRef = useRef(crossfadeDuration);
  crossfadeDurationRef.current = crossfadeDuration;
  const isCrossfadingRef = useRef(false);
  const autoFadeTriggeredRef = useRef(false);
  const pendingFadeInRef = useRef(0);
  const crossfadeTimerRef = useRef<number | null>(null);
  const crossfadeEndTimerRef = useRef<number | null>(null);

  const filter60Ref = useRef<BiquadFilterNode | null>(null);
  const filter250Ref = useRef<BiquadFilterNode | null>(null);
  const filter1kRef = useRef<BiquadFilterNode | null>(null);
  const filter4kRef = useRef<BiquadFilterNode | null>(null);
  const filter16kRef = useRef<BiquadFilterNode | null>(null);
  const bassBoostRef = useRef<BiquadFilterNode | null>(null);
  const aiTimerRef = useRef<number | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);
  const aiRequestSeqRef = useRef(0);
  const aiProfileCacheRef = useRef<
    Map<string, { detectedGenre: string; preset: EqPreset; reason?: string; source?: string }>
  >(new Map());

  useEffect(() => {
    const onResize = () => setIsNarrowScreen(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isCompactLayout =
    previewMode === 'mobile' || (previewMode === 'responsive' && isNarrowScreen);

  // Initialize Web Audio DSP graph on first user playback interaction
  const initAudioContext = () => {
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      return;
    }

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      if (audioRef.current) {
        const source = ctx.createMediaElementSource(audioRef.current);
        sourceNodeRef.current = source;
        audioRef.current.volume = 1;

        const f60 = ctx.createBiquadFilter();
        f60.type = 'lowshelf';
        f60.frequency.value = 60;
        f60.gain.value = dspEnabled ? band60Hz : 0;
        filter60Ref.current = f60;

        const f250 = ctx.createBiquadFilter();
        f250.type = 'peaking';
        f250.frequency.value = 250;
        f250.Q.value = 1.0;
        f250.gain.value = dspEnabled ? band250Hz : 0;
        filter250Ref.current = f250;

        const f1k = ctx.createBiquadFilter();
        f1k.type = 'peaking';
        f1k.frequency.value = 1000;
        f1k.Q.value = 1.0;
        f1k.gain.value = dspEnabled ? band1kHz : 0;
        filter1kRef.current = f1k;

        const f4k = ctx.createBiquadFilter();
        f4k.type = 'peaking';
        f4k.frequency.value = 4000;
        f4k.Q.value = 1.0;
        f4k.gain.value = dspEnabled ? band4kHz : 0;
        filter4kRef.current = f4k;

        const f16k = ctx.createBiquadFilter();
        f16k.type = 'highshelf';
        f16k.frequency.value = 16000;
        f16k.gain.value = dspEnabled ? band16kHz : 0;
        filter16kRef.current = f16k;

        const fBass = ctx.createBiquadFilter();
        fBass.type = 'lowshelf';
        fBass.frequency.value = 90;
        fBass.gain.value = dspEnabled && bassBoost ? 6.0 : 0;
        bassBoostRef.current = fBass;

        const gainNode = ctx.createGain();
        gainNode.gain.value = isMuted
          ? 0
          : (volume / 100) * (autoGainEnabled ? autoGainTrimRef.current : 1);
        gainNodeRef.current = gainNode;

        const crossfadeGain = ctx.createGain();
        crossfadeGain.gain.value = 1.0;
        crossfadeGainRef.current = crossfadeGain;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyserRef.current = analyser;

        source
          .connect(f60)
          .connect(f250)
          .connect(f1k)
          .connect(f4k)
          .connect(f16k)
          .connect(fBass)
          .connect(gainNode)
          .connect(crossfadeGain)
          .connect(analyser)
          .connect(ctx.destination);
      }
    } catch (e) {
      console.error('Web Audio API init error:', e);
    }
  };

  // Sync master volume & Auto-Gain trim without double-attenuating once Web Audio is connected
  useEffect(() => {
    const userLinear = isMuted ? 0 : volume / 100;
    if (audioRef.current) {
      audioRef.current.volume = sourceNodeRef.current ? 1 : userLinear;
    }
    if (gainNodeRef.current && audioCtxRef.current) {
      const totalGain = userLinear * (autoGainEnabled ? autoGainTrimRef.current : 1);
      gainNodeRef.current.gain.setTargetAtTime(totalGain, audioCtxRef.current.currentTime, 0.015);
    }
  }, [volume, isMuted, autoGainEnabled]);

  // Reset Auto-Gain trim smoothly when switching tracks so quiet tracks don't inherit previous cuts
  useEffect(() => {
    autoGainTrimRef.current = 1.0;
    setAutoGainDb(0);
    if (gainNodeRef.current && audioCtxRef.current) {
      const userLinear = isMuted ? 0 : volume / 100;
      gainNodeRef.current.gain.setTargetAtTime(userLinear, audioCtxRef.current.currentTime, 0.02);
    }
  }, [currentTrack.id]);

  // Real-time AnalyserNode-driven Auto-Gain & anti-clipping ceiling limiter
  useEffect(() => {
    if (!autoGainEnabled) {
      autoGainTrimRef.current = 1.0;
      setAutoGainDb(0);
      if (gainNodeRef.current && audioCtxRef.current) {
        const userLinear = isMuted ? 0 : volume / 100;
        gainNodeRef.current.gain.setTargetAtTime(userLinear, audioCtxRef.current.currentTime, 0.04);
      }
      return;
    }

    if (!isPlaying) return;

    let rafId = 0;
    let lastTime = performance.now();
    let lastUiSync = 0;

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);

      const dt = Math.min(0.1, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const analyser = analyserRef.current;
      const gainNode = gainNodeRef.current;
      const ctx = audioCtxRef.current;
      const userLinear = isMuted ? 0 : volume / 100;

      if (!analyser || !gainNode || !ctx || userLinear <= 0.01 || isCrossfadingRef.current) return;

      const sampleCount = analyser.fftSize;
      let postPeak = 0;
      let sumSq = 0;

      if (typeof analyser.getFloatTimeDomainData === 'function') {
        if (agcFloatBufRef.current.length !== sampleCount) {
          agcFloatBufRef.current = new Float32Array(sampleCount);
        }
        const buf = agcFloatBufRef.current;
        analyser.getFloatTimeDomainData(buf);
        for (let i = 0; i < buf.length; i++) {
          const s = buf[i];
          const abs = s < 0 ? -s : s;
          if (abs > postPeak) postPeak = abs;
          sumSq += s * s;
        }
      } else {
        if (agcByteBufRef.current.length !== sampleCount) {
          agcByteBufRef.current = new Uint8Array(sampleCount);
        }
        const buf = agcByteBufRef.current;
        analyser.getByteTimeDomainData(buf);
        for (let i = 0; i < buf.length; i++) {
          const s = (buf[i] - 128) / 128;
          const abs = s < 0 ? -s : s;
          if (abs > postPeak) postPeak = abs;
          sumSq += s * s;
        }
      }

      const postRms = Math.sqrt(sumSq / sampleCount);
      const currentTrim = autoGainTrimRef.current;
      const appliedGain = Math.max(0.02, userLinear * currentTrim);

      // Estimate true pre-GainNode amplitude to avoid feedback pumping
      const prePeak = postPeak / appliedGain;
      const preRms = postRms / appliedGain;

      const TARGET_RMS = 0.22; // ~ -13.1 dBFS reference loudness
      const CLIP_CEILING = 0.89; // ~ -1.0 dBFS anti-clipping headroom
      const MIN_TRIM = 0.28; // ~ -11.1 dB max attenuation
      const MAX_TRIM = 1.45; // ~ +3.2 dB max boost

      let loudnessTrim = currentTrim;
      if (preRms > 0.012) {
        loudnessTrim = Math.min(MAX_TRIM, Math.max(MIN_TRIM, TARGET_RMS / preRms));
      } else {
        // Silence or fade tail: drift smoothly back to unity
        loudnessTrim = currentTrim + (1.0 - currentTrim) * (1 - Math.exp(-dt / 0.8));
      }

      const safePeakTrim =
        prePeak * userLinear > 0.001 ? CLIP_CEILING / (prePeak * userLinear) : MAX_TRIM;

      const desiredTrim = Math.min(
        MAX_TRIM,
        Math.max(MIN_TRIM, Math.min(loudnessTrim, safePeakTrim))
      );

      // Fast attack on hot peaks; slow smooth release on quiet swells
      const isAttenuating = desiredTrim < currentTrim;
      const tau = isAttenuating ? (postPeak > CLIP_CEILING ? 0.008 : 0.03) : 0.55;
      const alpha = 1 - Math.exp(-dt / tau);
      const nextTrim = currentTrim + (desiredTrim - currentTrim) * alpha;

      autoGainTrimRef.current = nextTrim;
      const targetTotalGain = userLinear * nextTrim;
      gainNode.gain.setTargetAtTime(
        targetTotalGain,
        ctx.currentTime,
        isAttenuating ? 0.012 : 0.06
      );

      if (now - lastUiSync >= 180) {
        lastUiSync = now;
        const db = 20 * Math.log10(Math.max(0.05, nextTrim));
        const rounded = Math.round(db * 10) / 10;
        setAutoGainDb((prev) => (prev === rounded ? prev : rounded));
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [autoGainEnabled, isPlaying, volume, isMuted]);

  // Sync EQ biquad filters
  useEffect(() => {
    if (!audioCtxRef.current) return;
    const t = audioCtxRef.current.currentTime;
    if (filter60Ref.current) filter60Ref.current.gain.setTargetAtTime(dspEnabled ? band60Hz : 0, t, 0.05);
    if (filter250Ref.current) filter250Ref.current.gain.setTargetAtTime(dspEnabled ? band250Hz : 0, t, 0.05);
    if (filter1kRef.current) filter1kRef.current.gain.setTargetAtTime(dspEnabled ? band1kHz : 0, t, 0.05);
    if (filter4kRef.current) filter4kRef.current.gain.setTargetAtTime(dspEnabled ? band4kHz : 0, t, 0.05);
    if (filter16kRef.current) filter16kRef.current.gain.setTargetAtTime(dspEnabled ? band16kHz : 0, t, 0.05);
    if (bassBoostRef.current) bassBoostRef.current.gain.setTargetAtTime(dspEnabled && bassBoost ? 6.0 : 0, t, 0.05);
  }, [dspEnabled, bassBoost, band60Hz, band250Hz, band1kHz, band4kHz, band16kHz]);

  const applyPreset = (preset: EqPreset) => {
    const p = EQ_PRESETS[preset].values;
    setDspEnabled(true);
    setBand60Hz(p.band60Hz);
    setBand250Hz(p.band250Hz);
    setBand1kHz(p.band1kHz);
    setBand4kHz(p.band4kHz);
    setBand16kHz(p.band16kHz);
    setBassBoost(p.bassBoost);
  };

  const resetEQ = () => {
    setBand60Hz(0);
    setBand250Hz(0);
    setBand1kHz(0);
    setBand4kHz(0);
    setBand16kHz(0);
    setBassBoost(false);
  };

  const localPresetFallback = (track: Track): EqPreset => {
    const hay = `${track.id3Genre || ''} ${track.genre || ''} ${track.title} ${track.artist} ${track.album}`.toLowerCase();
    if (/(synthwave|cyberpunk|retrowave|outrun|darkwave|vaporwave|synthpop|cyber)/.test(hay)) return 'cyber';
    if (/(electro|electronic|edm|techno|house|trance|dubstep|drum & bass|glitch|bass)/.test(hay)) return 'electronic';
    if (/(rock|metal|punk|grunge|alternative|indie|guitar)/.test(hay)) return 'rock';
    if (/(vocal|pop|r&b|rap|hip-hop|soul|speech|podcast|ballad)/.test(hay)) return 'vocal';
    if (/(acoustic|ambient|jazz|classical|folk|chill|lo-fi|instrumental)/.test(hay)) return 'acoustic';
    return 'flat';
  };

  const triggerAiProfiling = async (track: Track, forceRefresh = false) => {
    if (aiTimerRef.current) window.clearTimeout(aiTimerRef.current);
    if (aiAbortRef.current) aiAbortRef.current.abort();

    const cacheKey = `${track.id}::${track.title}::${track.artist}::${track.id3Genre || track.genre}`;
    if (!forceRefresh) {
      const cached = aiProfileCacheRef.current.get(cacheKey);
      if (cached) {
        applyPreset(cached.preset);
        const modeTag = cached.source === 'gemini-ai' ? 'AI Profiler' : 'ID3 Profiler';
        setAiStatus(
          `${modeTag}: ${cached.detectedGenre} -> ${EQ_PRESETS[cached.preset].label}${
            cached.reason ? ` · ${cached.reason}` : ''
          }`
        );
        aiTimerRef.current = window.setTimeout(() => setAiStatus(null), 4000);
        return;
      }
    }

    const seq = ++aiRequestSeqRef.current;
    const controller = new AbortController();
    aiAbortRef.current = controller;

    setIsProfilingAi(true);
    setAiStatus(`Profiling ID3 tags for "${track.title}"...`);

    try {
      const res = await fetch('/api/smart-genre-profiler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          title: track.title,
          artist: track.artist,
          album: track.album,
          genre: track.genre,
          id3Genre: track.id3Genre,
          bpm: track.bpm,
          year: track.year,
          folder: track.folder
        })
      });

      if (!res.ok) throw new Error(`Profiler HTTP ${res.status}`);
      const data = (await res.json()) as {
        detectedGenre?: string;
        preset?: EqPreset;
        reason?: string;
        source?: string;
      };

      if (seq !== aiRequestSeqRef.current) return;

      const chosenPreset: EqPreset =
        data.preset && data.preset in EQ_PRESETS ? data.preset : localPresetFallback(track);
      applyPreset(chosenPreset);

      const detected = data.detectedGenre || track.id3Genre || track.genre;
      if (data.detectedGenre && track.isImported && !track.id3Genre) {
        setPlaylist((prev) =>
          prev.map((t) => (t.id === track.id ? { ...t, genre: data.detectedGenre || t.genre } : t))
        );
      }

      aiProfileCacheRef.current.set(cacheKey, {
        detectedGenre: detected,
        preset: chosenPreset,
        reason: data.reason,
        source: data.source
      });

      const modeTag = data.source === 'gemini-ai' ? 'AI Profiler' : 'ID3 Profiler';
      setAiStatus(
        `${modeTag}: ${detected} -> ${EQ_PRESETS[chosenPreset].label}${data.reason ? ` · ${data.reason}` : ''}`
      );
      aiTimerRef.current = window.setTimeout(() => setAiStatus(null), 5000);
    } catch (err) {
      if ((err as Error).name === 'AbortError' || seq !== aiRequestSeqRef.current) return;
      const fallbackPreset = localPresetFallback(track);
      applyPreset(fallbackPreset);
      setAiStatus(
        `ID3 Profiler: ${track.id3Genre || track.genre} -> ${EQ_PRESETS[fallbackPreset].label}`
      );
      aiTimerRef.current = window.setTimeout(() => setAiStatus(null), 3500);
    } finally {
      if (seq === aiRequestSeqRef.current) {
        setIsProfilingAi(false);
      }
    }
  };

  // Sync audio element source only when track or resolved URL actually changes
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      if (!resolvedAudioUrl) {
        loadedSrcRef.current = '';
        shouldPlayOnLoadRef.current = false;
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        setCurrentTime(0);
        setDuration(currentTrack.duration);
        setIsPlaying(false);
      } else if (loadedSrcRef.current !== resolvedAudioUrl) {
        loadedSrcRef.current = resolvedAudioUrl;
        audio.pause();
        audio.src = resolvedAudioUrl;
        audio.currentTime = 0;
        setCurrentTime(0);
        setDuration(currentTrack.duration);
        audio.load();
      }
    }
  }, [currentTrack.id, resolvedAudioUrl]);

  // Run Smart Genre Profiler once per active track change when enabled
  useEffect(() => {
    if (smartAiEnabled) {
      void triggerAiProfiling(currentTrack);
    }
  }, [currentTrack.id]);

  const clearCrossfadeTimers = () => {
    if (crossfadeTimerRef.current) {
      window.clearTimeout(crossfadeTimerRef.current);
      crossfadeTimerRef.current = null;
    }
    if (crossfadeEndTimerRef.current) {
      window.clearTimeout(crossfadeEndTimerRef.current);
      crossfadeEndTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearCrossfadeTimers();
  }, []);

  const triggerCrossfadeIn = (durationSecs: number) => {
    const cfNode = crossfadeGainRef.current;
    const ctx = audioCtxRef.current;
    if (!cfNode || !ctx) {
      isCrossfadingRef.current = false;
      return;
    }
    const t = ctx.currentTime;
    cfNode.gain.cancelScheduledValues(t);
    if (durationSecs <= 0.02) {
      cfNode.gain.setValueAtTime(1.0, t);
      isCrossfadingRef.current = false;
      return;
    }
    isCrossfadingRef.current = true;
    cfNode.gain.setValueAtTime(0.001, t);
    cfNode.gain.linearRampToValueAtTime(1.0, t + durationSecs);
    if (crossfadeEndTimerRef.current) window.clearTimeout(crossfadeEndTimerRef.current);
    crossfadeEndTimerRef.current = window.setTimeout(() => {
      isCrossfadingRef.current = false;
      crossfadeEndTimerRef.current = null;
    }, durationSecs * 1000 + 60);
  };

  const resetCrossfadeUnity = () => {
    clearCrossfadeTimers();
    isCrossfadingRef.current = false;
    autoFadeTriggeredRef.current = false;
    pendingFadeInRef.current = 0;
    const cfNode = crossfadeGainRef.current;
    const ctx = audioCtxRef.current;
    if (cfNode && ctx) {
      const t = ctx.currentTime;
      cfNode.gain.cancelScheduledValues(t);
      cfNode.gain.setValueAtTime(cfNode.gain.value, t);
      cfNode.gain.setTargetAtTime(1.0, t, 0.02);
    }
  };

  const transitionToTrackIndex = (
    targetIndex: number,
    rampOutSecs: number,
    rampInSecs: number,
    autoPlayOverride?: boolean
  ) => {
    clearCrossfadeTimers();
    const targetTrack = playlist[targetIndex];
    if (!targetTrack) return;
    const targetHasAudio = targetTrack.isImported ? Boolean(targetTrack.url) : true;
    const shouldPlay = autoPlayOverride !== undefined ? autoPlayOverride : targetHasAudio;

    const commitSwitch = () => {
      shouldPlayOnLoadRef.current = shouldPlay;
      pendingFadeInRef.current = shouldPlay ? rampInSecs : 0;
      autoFadeTriggeredRef.current = false;
      setCurrentIndex(targetIndex);
      setIsPlaying(shouldPlay);
    };

    const cfNode = crossfadeGainRef.current;
    const ctx = audioCtxRef.current;
    if (isPlaying && shouldPlay && rampOutSecs > 0.02 && cfNode && ctx) {
      isCrossfadingRef.current = true;
      const t = ctx.currentTime;
      cfNode.gain.cancelScheduledValues(t);
      cfNode.gain.setValueAtTime(Math.max(0.001, cfNode.gain.value), t);
      cfNode.gain.linearRampToValueAtTime(0.001, t + rampOutSecs);
      crossfadeTimerRef.current = window.setTimeout(() => {
        crossfadeTimerRef.current = null;
        commitSwitch();
      }, rampOutSecs * 1000);
    } else {
      if (!shouldPlay) resetCrossfadeUnity();
      commitSwitch();
    }
  };

  const togglePlay = async () => {
    initAudioContext();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      shouldPlayOnLoadRef.current = false;
      clearCrossfadeTimers();
      isCrossfadingRef.current = false;
      audio.pause();
      setIsPlaying(false);
      return;
    }

    if (!resolvedAudioUrl) {
      setIsPlaying(false);
      return;
    }

    try {
      if (loadedSrcRef.current !== resolvedAudioUrl) {
        loadedSrcRef.current = resolvedAudioUrl;
        audio.src = resolvedAudioUrl;
        audio.load();
      }
      if (audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
        shouldPlayOnLoadRef.current = true;
      }
      await audio.play();
      shouldPlayOnLoadRef.current = false;
      if (pendingFadeInRef.current > 0) {
        const fadeIn = pendingFadeInRef.current;
        pendingFadeInRef.current = 0;
        triggerCrossfadeIn(fadeIn);
      } else {
        resetCrossfadeUnity();
      }
      setIsPlaying(true);
    } catch (err) {
      if (!currentTrack.isImported) {
        console.warn('Demo track failed, switching to local WAV fallback:', err);
        const fallback = createFallbackWavUrl(
          currentTrack.id,
          currentTrack.genre,
          currentTrack.duration
        );
        shouldPlayOnLoadRef.current = true;
        setFallbackUrls((prev) => ({ ...prev, [currentTrack.id]: fallback }));
      } else {
        console.warn('Unable to play imported audio track:', err);
        shouldPlayOnLoadRef.current = false;
        setIsPlaying(false);
      }
    }
  };

  const handleSelectTrack = (index: number) => {
    if (index < 0 || index >= playlist.length) return;
    initAudioContext();
    const targetTrack = playlist[index];
    const targetHasAudio = targetTrack.isImported ? Boolean(targetTrack.url) : true;

    if (index === currentIndex && audioRef.current && targetHasAudio) {
      resetCrossfadeUnity();
      audioRef.current.currentTime = 0;
      audioRef.current
        .play()
        .then(() => {
          shouldPlayOnLoadRef.current = false;
          setIsPlaying(true);
        })
        .catch(() => {});
      return;
    }

    const cfSecs = crossfadeDurationRef.current;
    if (isPlaying && cfSecs > 0 && targetHasAudio) {
      const rampOut = Math.min(0.4, cfSecs * 0.25);
      const rampIn = Math.min(2.5, cfSecs * 0.5);
      transitionToTrackIndex(index, rampOut, rampIn, targetHasAudio);
    } else {
      resetCrossfadeUnity();
      transitionToTrackIndex(index, 0, 0, targetHasAudio);
    }
  };

  const getNextIndex = () => {
    if (shuffle && playlist.length > 1) {
      let nextIdx = Math.floor(Math.random() * playlist.length);
      if (nextIdx === currentIndex) nextIdx = (currentIndex + 1) % playlist.length;
      return nextIdx;
    }
    return (currentIndex + 1) % playlist.length;
  };

  const handleNext = () => {
    if (playlist.length === 0) return;
    const nextIdx = getNextIndex();
    const cfSecs = crossfadeDurationRef.current;
    if (isPlaying && cfSecs > 0) {
      const rampOut = Math.min(0.4, cfSecs * 0.25);
      const rampIn = Math.min(2.5, cfSecs * 0.5);
      transitionToTrackIndex(nextIdx, rampOut, rampIn, true);
    } else {
      resetCrossfadeUnity();
      transitionToTrackIndex(nextIdx, 0, 0, isPlaying);
    }
  };

  const handlePrev = () => {
    if (playlist.length === 0) return;
    const prevIdx = (currentIndex - 1 + playlist.length) % playlist.length;
    const cfSecs = crossfadeDurationRef.current;
    if (isPlaying && cfSecs > 0) {
      const rampOut = Math.min(0.4, cfSecs * 0.25);
      const rampIn = Math.min(2.5, cfSecs * 0.5);
      transitionToTrackIndex(prevIdx, rampOut, rampIn, true);
    } else {
      resetCrossfadeUnity();
      transitionToTrackIndex(prevIdx, 0, 0, isPlaying);
    }
  };

  const handleEnded = () => {
    if (loop && audioRef.current) {
      resetCrossfadeUnity();
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((e) => console.error(e));
      return;
    }

    const cfSecs = crossfadeDurationRef.current;
    const fadeIn =
      cfSecs > 0 ? Math.min(cfSecs / 2, Math.max(0.25, duration * 0.25)) : 0;
    const nextIdx = getNextIndex();
    transitionToTrackIndex(nextIdx, 0, fadeIn, true);
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
    if (audio.duration && !isNaN(audio.duration)) {
      setDuration(audio.duration);

      const cfSecs = crossfadeDurationRef.current;
      if (isPlaying && !loop && cfSecs > 0 && playlist.length > 1) {
        const halfDur = cfSecs / 2;
        const remaining = audio.duration - audio.currentTime;
        if (audio.duration > halfDur + 0.5) {
          if (!autoFadeTriggeredRef.current && remaining <= halfDur && remaining > 0.08) {
            autoFadeTriggeredRef.current = true;
            const cfNode = crossfadeGainRef.current;
            const ctx = audioCtxRef.current;
            if (cfNode && ctx) {
              isCrossfadingRef.current = true;
              const t = ctx.currentTime;
              const fadeOutTime = Math.max(0.08, remaining - 0.04);
              cfNode.gain.cancelScheduledValues(t);
              cfNode.gain.setValueAtTime(Math.max(0.001, cfNode.gain.value), t);
              cfNode.gain.linearRampToValueAtTime(0.001, t + fadeOutTime);
            }
          } else if (autoFadeTriggeredRef.current && remaining <= 0.06) {
            autoFadeTriggeredRef.current = false;
            transitionToTrackIndex(getNextIndex(), 0, halfDur, true);
          }
        }
      }
    }
  };

  const handleSeek = (val: number) => {
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      if (
        audioRef.current.duration &&
        audioRef.current.duration - val > crossfadeDurationRef.current / 2 + 0.2
      ) {
        if (autoFadeTriggeredRef.current || isCrossfadingRef.current) {
          resetCrossfadeUnity();
        }
      }
    }
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    if (isMuted && val > 0) setIsMuted(false);
  };

  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const shortcutActionsRef = useRef({
    togglePlay,
    handleNext,
    handlePrev,
    handleVolumeChange,
    isModalOpen: Boolean(editingTrack || zoomedKnob)
  });
  shortcutActionsRef.current = {
    togglePlay,
    handleNext,
    handlePrev,
    handleVolumeChange,
    isModalOpen: Boolean(editingTrack || zoomedKnob)
  };

  // Studio keyboard shortcuts: Space (Play/Pause), Left/Right (Prev/Next), Up/Down (Volume)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (shortcutActionsRef.current.isModalOpen) return;

      const target = e.target as HTMLElement | null;
      if (target) {
        if (
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement ||
          target.isContentEditable
        ) {
          return;
        }
        if (target instanceof HTMLInputElement) {
          if (target.type !== 'range') return;
          if (
            e.key === 'ArrowLeft' ||
            e.key === 'ArrowRight' ||
            e.key === 'ArrowUp' ||
            e.key === 'ArrowDown'
          ) {
            return;
          }
        }
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (!e.repeat) {
          void shortcutActionsRef.current.togglePlay();
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (!e.repeat) {
          shortcutActionsRef.current.handleNext();
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (!e.repeat) {
          shortcutActionsRef.current.handlePrev();
        }
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const nextVol = Math.min(100, volumeRef.current + 5);
        volumeRef.current = nextVol;
        shortcutActionsRef.current.handleVolumeChange(nextVol);
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextVol = Math.max(0, volumeRef.current - 5);
        volumeRef.current = nextVol;
        shortcutActionsRef.current.handleVolumeChange(nextVol);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const toggleFavorite = (trackId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPlaylist((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, isFavorite: !t.isFavorite } : t))
    );
  };

  const handleBandChange = (band: '60hz' | '250hz' | '1khz' | '4khz' | '16khz', val: number) => {
    if (band === '60hz') setBand60Hz(val);
    else if (band === '250hz') setBand250Hz(val);
    else if (band === '1khz') setBand1kHz(val);
    else if (band === '4khz') setBand4kHz(val);
    else if (band === '16khz') setBand16kHz(val);
  };

  const handleZoomedValueChange = (val: number) => {
    if (!zoomedKnob) return;
    setZoomedKnob((prev) => (prev ? { ...prev, value: val } : null));
    if (zoomedKnob.id === 'volume') {
      handleVolumeChange(val);
    } else {
      handleBandChange(zoomedKnob.id, val);
    }
  };

  const handleSaveTrackMetadata = (
    trackId: string,
    updates: { title: string; artist: string; album: string }
  ) => {
    setPlaylist((prev) =>
      prev.map((track) =>
        track.id === trackId
          ? {
              ...track,
              title: updates.title,
              artist: updates.artist,
              album: updates.album
            }
          : track
      )
    );
  };

  const handleRelinkTrack = async (trackId: string, file: File) => {
    const objectUrl = URL.createObjectURL(file);
    await saveTrackBlob(trackId, file);
    const actualDuration = await readAudioDuration(file);
    shouldPlayOnLoadRef.current = true;
    setPlaylist((prev) =>
      prev.map((t) =>
        t.id === trackId
          ? {
              ...t,
              url: objectUrl,
              duration: actualDuration,
              hasAudioData: true
            }
          : t
      )
    );
    setIsPlaying(true);
  };

  const handleRemoveTrack = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const removeIdx = playlist.findIndex((t) => t.id === trackId);
    if (removeIdx === -1) return;

    const removed = playlist[removeIdx];
    if (removed?.url?.startsWith('blob:')) {
      URL.revokeObjectURL(removed.url);
    }
    void deleteTrackBlob(trackId);

    const updated = playlist.filter((t) => t.id !== trackId);
    setPlaylist(updated);

    if (removeIdx === currentIndex) {
      shouldPlayOnLoadRef.current = false;
      setIsPlaying(false);
      setCurrentIndex(Math.max(0, Math.min(currentIndex, updated.length - 1)));
    } else if (removeIdx < currentIndex) {
      setCurrentIndex((prev) => Math.max(0, prev - 1));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const audioFiles = Array.from(files).filter(
      (file) =>
        file.type.startsWith('audio/') ||
        /\.(mp3|wav|ogg|flac|m4a|aac|opus|wma|webm)$/i.test(file.name)
    );
    e.target.value = '';
    if (audioFiles.length === 0) return;

    const baseTime = Date.now();

    const parsedTracks: Track[] = audioFiles.map((file, idx) => {
      const rawName = file.name.replace(/\.[^/.]+$/, '');
      const relPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || '';
      const pathParts = relPath.split('/').filter(Boolean);
      const folderSegments = pathParts.slice(0, -1);
      const folderPath =
        folderSegments.length > 0 ? `/SDCard/${folderSegments.join('/')}` : '/SDCard/Music/Imported';
      const parentAlbum =
        folderSegments.length > 0 ? folderSegments[folderSegments.length - 1] : 'Imported Audio';

      let parsedArtist = 'Local Device';
      let parsedTitle = rawName;
      const dashIdx = rawName.indexOf(' - ');
      if (dashIdx > 0 && dashIdx < rawName.length - 3) {
        parsedArtist = rawName.slice(0, dashIdx).trim() || 'Local Device';
        parsedTitle = rawName.slice(dashIdx + 3).trim() || rawName;
      }

      return {
        id: `sdcard-${baseTime}-${idx}`,
        title: parsedTitle,
        artist: parsedArtist,
        album: parentAlbum,
        folder: folderPath,
        duration: 180,
        url: URL.createObjectURL(file),
        coverAccent: 'from-cyan-600/80 to-slate-900',
        genre: 'Synthwave',
        isFavorite: false,
        isImported: true,
        hasAudioData: true
      };
    });

    const firstAddedTrackKey = `${parsedTracks[0].folder}::${parsedTracks[0].title}`;
    const resolvedIdsForFiles: string[] = [];

    const mergedPlaylist = [...playlist];
    for (let idx = 0; idx < parsedTracks.length; idx++) {
      const item = parsedTracks[idx];
      const existingIdx = mergedPlaylist.findIndex(
        (t) => t.isImported && `${t.folder}::${t.title}` === `${item.folder}::${item.title}`
      );
      if (existingIdx !== -1) {
        const existingId = mergedPlaylist[existingIdx].id;
        resolvedIdsForFiles.push(existingId);
        mergedPlaylist[existingIdx] = {
          ...mergedPlaylist[existingIdx],
          url: item.url,
          hasAudioData: true
        };
      } else {
        resolvedIdsForFiles.push(item.id);
        mergedPlaylist.push(item);
      }
    }

    // Persist full audio blobs into IndexedDB so large MP3s survive refreshes
    void Promise.all(
      audioFiles.map((file, idx) => saveTrackBlob(resolvedIdsForFiles[idx], file))
    );

    // Clear any old fallback cache for updated tracks
    setFallbackUrls((prev) => {
      const next = { ...prev };
      for (const id of resolvedIdsForFiles) delete next[id];
      return next;
    });

    setPlaylist(mergedPlaylist);
    if (!isPlaying) {
      const targetIdx = mergedPlaylist.findIndex(
        (t) => `${t.folder}::${t.title}` === firstAddedTrackKey
      );
      if (targetIdx !== -1) setCurrentIndex(targetIdx);
    }

    // Extract embedded ID3v1/v2 tags and actual audio duration asynchronously
    const enriched = await Promise.all(
      audioFiles.map(async (file, idx) => {
        const [durationSecs, id3] = await Promise.all([
          readAudioDuration(file),
          parseId3Tags(file)
        ]);
        return {
          id: resolvedIdsForFiles[idx],
          duration: durationSecs,
          id3
        };
      })
    );

    const enrichedById = new Map(enriched.map((item) => [item.id, item]));
    const applyId3Updates = (track: Track): Track => {
      const match = enrichedById.get(track.id);
      if (!match) return track;
      const { id3 } = match;
      return {
        ...track,
        duration: match.duration,
        title: id3.title || track.title,
        artist: id3.artist || track.artist,
        album: id3.album || track.album,
        genre: id3.genre || track.genre,
        id3Genre: id3.genre,
        bpm: id3.bpm,
        year: id3.year,
        hasId3Tags: id3.hasId3Tags
      };
    };

    setPlaylist((prev) => prev.map(applyId3Updates));

    if (smartAiEnabled) {
      const targetId = isPlaying ? playlist[currentIndex]?.id : resolvedIdsForFiles[0];
      const baseTarget = mergedPlaylist.find((t) => t.id === targetId);
      if (baseTarget) {
        void triggerAiProfiling(applyId3Updates(baseTarget));
      }
    }
  };

  const clearFilters = () => {
    setFilterArtist(null);
    setFilterAlbum(null);
    setFilterFolder(null);
  };

  const workspaceTabs: Array<{ id: WorkspaceTab; label: string; icon: React.ReactNode }> = [
    { id: 'library', label: 'Library', icon: <HardDrive className="w-4 h-4" /> },
    { id: 'equalizer', label: 'Equalizer', icon: <Sliders className="w-4 h-4" /> },
    { id: 'blueprint', label: 'Rust Blueprint', icon: <Code2 className="w-4 h-4" /> }
  ];

  const mobileTabs: Array<{ id: MobileTab; label: string; icon: React.ReactNode }> = [
    { id: 'player', label: 'Player', icon: <Disc className="w-5 h-5" /> },
    { id: 'library', label: 'Library', icon: <HardDrive className="w-5 h-5" /> },
    { id: 'equalizer', label: 'EQ', icon: <Sliders className="w-5 h-5" /> },
    { id: 'blueprint', label: 'Rust', icon: <Code2 className="w-5 h-5" /> }
  ];

  const renderWorkspaceContent = (tab: WorkspaceTab) => {
    if (tab === 'library') {
      return (
        <LibraryPanel
          playlist={playlist}
          currentIndex={currentIndex}
          isPlaying={isPlaying}
          libraryTab={libraryTab}
          searchQuery={searchQuery}
          filterArtist={filterArtist}
          filterAlbum={filterAlbum}
          filterFolder={filterFolder}
          onChangeTab={setLibraryTab}
          onSearchChange={setSearchQuery}
          onFilterArtist={setFilterArtist}
          onFilterAlbum={setFilterAlbum}
          onFilterFolder={setFilterFolder}
          onClearFilters={clearFilters}
          onSelectTrack={handleSelectTrack}
          onToggleFavorite={toggleFavorite}
          onEditTrack={(track, e) => {
            e.stopPropagation();
            setEditingTrack(track);
          }}
          onRemoveTrack={handleRemoveTrack}
          onFileUpload={handleFileUpload}
        />
      );
    }

    if (tab === 'equalizer') {
      return (
        <EqualizerPanel
          dspEnabled={dspEnabled}
          bassBoost={bassBoost}
          autoGainEnabled={autoGainEnabled}
          autoGainDb={autoGainDb}
          crossfadeDuration={crossfadeDuration}
          visualizerTheme={visualizerTheme}
          smartAiEnabled={smartAiEnabled}
          isProfilingAi={isProfilingAi}
          aiStatus={aiStatus}
          eqControlStyle={eqControlStyle}
          band60Hz={band60Hz}
          band250Hz={band250Hz}
          band1kHz={band1kHz}
          band4kHz={band4kHz}
          band16kHz={band16kHz}
          onToggleDsp={setDspEnabled}
          onToggleBassBoost={setBassBoost}
          onToggleAutoGain={setAutoGainEnabled}
          onChangeCrossfade={(secs) => {
            setCrossfadeDuration(secs);
            if (secs === 0) resetCrossfadeUnity();
          }}
          onChangeVisualizerTheme={(theme) => {
            setVisualizerTheme(theme);
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem('dsp_visualizer_theme_v1', theme);
            }
          }}
          onToggleSmartAi={() => {
            const next = !smartAiEnabled;
            setSmartAiEnabled(next);
            if (next) void triggerAiProfiling(currentTrack);
            else setAiStatus(null);
          }}
          onRunAiProfile={() => void triggerAiProfiling(currentTrack, true)}
          onChangeControlStyle={setEqControlStyle}
          onChangeBand={handleBandChange}
          onApplyPreset={applyPreset}
          onReset={resetEQ}
          onZoomKnob={setZoomedKnob}
        />
      );
    }

    return (
      <BlueprintPanel
        sampleRate={sampleRate}
        dspEnabled={dspEnabled}
        bassBoost={bassBoost}
        onToggleSampleRate={() => setSampleRate((s) => (s === '48kHz' ? '96kHz' : '48kHz'))}
      />
    );
  };

  return (
    <div className="min-h-screen cyber-synthwave-bg text-slate-100 flex flex-col">
      <NeonRippleOverlay />
      {/* Persistent Audio Element (src managed imperatively in useEffect) */}
      <audio
        ref={audioRef}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleTimeUpdate}
        onCanPlay={() => {
          if (shouldPlayOnLoadRef.current && audioRef.current && loadedSrcRef.current) {
            shouldPlayOnLoadRef.current = false;
            audioRef.current
              .play()
              .then(() => {
                if (pendingFadeInRef.current > 0) {
                  const fadeIn = pendingFadeInRef.current;
                  pendingFadeInRef.current = 0;
                  triggerCrossfadeIn(fadeIn);
                } else {
                  resetCrossfadeUnity();
                }
                setIsPlaying(true);
              })
              .catch(() => setIsPlaying(false));
          }
        }}
        onError={() => {
          if (!loadedSrcRef.current) return;
          if (!currentTrack.isImported && !fallbackUrls[currentTrack.id]) {
            const fallback = createFallbackWavUrl(
              currentTrack.id,
              currentTrack.genre,
              currentTrack.duration
            );
            setFallbackUrls((prev) => ({ ...prev, [currentTrack.id]: fallback }));
          } else {
            shouldPlayOnLoadRef.current = false;
            setIsPlaying(false);
          }
        }}
      />

      {/* Clean Single-Row Studio Header */}
      <header className="h-14 border-b border-white/[0.08] bg-[#0e141c]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/35 flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-semibold tracking-tight text-white truncate">
              DSP Audio Studio
            </h1>
            <p className="hidden md:block text-[10px] font-mono text-slate-400 truncate">
              Rust + Iced UI Blueprint · {playlist.length} tracks
            </p>
          </div>
        </div>

        {/* Viewport Switcher (Desktop 950px / Mobile 360px Blueprint Preview) */}
        <div className="hidden sm:flex items-center bg-[#090d12] p-1 rounded-lg border border-white/10 text-xs font-mono">
          <button
            type="button"
            onClick={() => setPreviewMode('responsive')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              previewMode === 'responsive'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Auto
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode('desktop')}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              previewMode === 'desktop'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>950px</span>
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode('mobile')}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              previewMode === 'mobile'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>360px</span>
          </button>
        </div>

        {/* Single Primary Action */}
        <label className="h-9 px-3.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shrink-0">
          <Upload className="w-3.5 h-3.5" />
          <span>Import Audio</span>
          <input type="file" accept="audio/*" multiple onChange={handleFileUpload} className="hidden" />
        </label>
      </header>

      {/* Main Studio Canvas */}
      <main className="flex-1 min-h-0 flex items-center justify-center p-2 sm:p-4">
        {isCompactLayout ? (
          /* ================= MOBILE APP SHELL (360x600 Blueprint) ================= */
          <div
            className={`w-full flex flex-col bg-[#111720]/95 backdrop-blur-md border border-white/10 overflow-hidden ${
              previewMode === 'mobile'
                ? 'max-w-[360px] h-[min(600px,calc(100dvh-7.5rem))] rounded-[26px] shadow-2xl'
                : 'max-w-md h-[calc(100dvh-7.5rem)] rounded-2xl'
            }`}
          >
            {/* Mobile Active Screen */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3.5">
              {mobileTab === 'player' ? (
                <PlayerPanel
                  track={currentTrack}
                  trackIndex={currentIndex}
                  totalTracks={playlist.length}
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  duration={duration}
                  volume={volume}
                  isMuted={isMuted}
                  loop={loop}
                  shuffle={shuffle}
                  dspEnabled={dspEnabled}
                  bassBoost={bassBoost}
                  visualizerTheme={visualizerTheme}
                  analyserRef={analyserRef}
                  onTogglePlay={togglePlay}
                  onPrev={handlePrev}
                  onNext={handleNext}
                  onSeek={handleSeek}
                  onVolumeChange={handleVolumeChange}
                  onToggleMute={() => setIsMuted(!isMuted)}
                  onToggleLoop={() => setLoop(!loop)}
                  onToggleShuffle={() => setShuffle(!shuffle)}
                  onToggleFavorite={(id) => toggleFavorite(id)}
                  onZoomVolume={setZoomedKnob}
                  onRelinkTrack={handleRelinkTrack}
                />
              ) : (
                renderWorkspaceContent(mobileTab)
              )}
            </div>

            {/* Smart Mini Player (Visible ONLY when user is NOT on the Player tab) */}
            {mobileTab !== 'player' && (
              <MiniPlayerBar
                track={currentTrack}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                volume={volume}
                isMuted={isMuted}
                compactMode={true}
                onTogglePlay={togglePlay}
                onPrev={handlePrev}
                onNext={handleNext}
                onSeek={handleSeek}
                onVolumeChange={handleVolumeChange}
                onToggleMute={() => setIsMuted(!isMuted)}
                onExpand={() => setMobileTab('player')}
              />
            )}

            {/* Mobile Fixed Bottom Navigation Bar */}
            <nav className="grid grid-cols-4 border-t border-white/[0.08] bg-[#0c1118] shrink-0">
              {mobileTabs.map((tab) => {
                const active = mobileTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMobileTab(tab.id)}
                    className={`h-13 flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                      active ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {active && <span className="absolute top-0 w-8 h-0.5 rounded-full bg-cyan-400" />}
                    {tab.icon}
                    <span className="text-[10px] font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        ) : (
          /* ================= DESKTOP SPLIT WORKSPACE (950x650 Blueprint) ================= */
          <div
            className={`w-full bg-[#111720]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden ${
              previewMode === 'desktop'
                ? 'max-w-[950px] h-[min(650px,calc(100dvh-7.5rem))]'
                : 'max-w-5xl h-[min(650px,calc(100dvh-7.5rem))]'
            }`}
          >
            <div className="flex-1 min-h-0 flex">
              {/* Left Pane: Full Player (hidden cleanly when collapsed to Mini mode) */}
              {!isMiniPlayer && (
                <section className="w-[390px] shrink-0 border-r border-white/[0.08] p-4 sm:p-5 flex flex-col">
                  <PlayerPanel
                    track={currentTrack}
                    trackIndex={currentIndex}
                    totalTracks={playlist.length}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    duration={duration}
                    volume={volume}
                    isMuted={isMuted}
                    loop={loop}
                    shuffle={shuffle}
                    dspEnabled={dspEnabled}
                    bassBoost={bassBoost}
                    visualizerTheme={visualizerTheme}
                    analyserRef={analyserRef}
                    showCollapseButton={true}
                    onTogglePlay={togglePlay}
                    onPrev={handlePrev}
                    onNext={handleNext}
                    onSeek={handleSeek}
                    onVolumeChange={handleVolumeChange}
                    onToggleMute={() => setIsMuted(!isMuted)}
                    onToggleLoop={() => setLoop(!loop)}
                    onToggleShuffle={() => setShuffle(!shuffle)}
                    onToggleFavorite={(id) => toggleFavorite(id)}
                    onZoomVolume={setZoomedKnob}
                    onCollapseMini={() => setIsMiniPlayer(true)}
                    onRelinkTrack={handleRelinkTrack}
                  />
                </section>
              )}

              {/* Right Pane: Tabbed Studio Workspace */}
              <section className="flex-1 min-w-0 flex flex-col">
                <div className="h-12 px-5 border-b border-white/[0.08] flex items-center justify-between gap-2 shrink-0 bg-[#0e141c]/80">
                  <div className="flex items-center gap-1.5">
                    {workspaceTabs.map((tab) => {
                      const active = workspaceTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setWorkspaceTab(tab.id)}
                          className={`h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-2 border transition-colors ${
                            active
                              ? 'bg-cyan-500/15 border-cyan-500/35 text-cyan-300 font-semibold'
                              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {tab.icon}
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <span className="text-[11px] font-mono text-slate-500">
                    {previewMode === 'desktop' ? '950 × 650' : 'Studio Split'}
                  </span>
                </div>

                <div className="flex-1 min-h-0 p-4 sm:p-5 overflow-hidden">
                  {renderWorkspaceContent(workspaceTab)}
                </div>
              </section>
            </div>

            {/* Desktop Mini Player Bar (Shown ONLY when Full Player pane is collapsed) */}
            {isMiniPlayer && (
              <MiniPlayerBar
                track={currentTrack}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                volume={volume}
                isMuted={isMuted}
                compactMode={false}
                onTogglePlay={togglePlay}
                onPrev={handlePrev}
                onNext={handleNext}
                onSeek={handleSeek}
                onVolumeChange={handleVolumeChange}
                onToggleMute={() => setIsMuted(!isMuted)}
                onExpand={() => setIsMiniPlayer(false)}
              />
            )}
          </div>
        )}
      </main>

      {/* Studio Performance HUD Footer */}
      <PerformanceHud
        audioCtxRef={audioCtxRef}
        analyserRef={analyserRef}
        isPlaying={isPlaying}
        dspEnabled={dspEnabled}
        bassBoost={bassBoost}
        autoGainEnabled={autoGainEnabled}
        autoGainDb={autoGainDb}
        sampleRateSetting={sampleRate}
      />

      {/* Double-Tap Precision Knob Wheel */}
      <KnobZoomModal
        target={zoomedKnob}
        onChange={handleZoomedValueChange}
        onClose={() => setZoomedKnob(null)}
      />

      {/* Imported Track Metadata Editor Modal */}
      <EditTrackModal
        track={editingTrack}
        onSave={handleSaveTrackMetadata}
        onClose={() => setEditingTrack(null)}
      />
    </div>
  );
}
