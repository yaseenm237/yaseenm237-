import { EqPreset, EqSettings, Track, VisualizerStyle } from '../types/audio';

export const DEFAULT_TRACKS: Track[] = [
  {
    id: '1',
    title: 'Cyberpunk Synthwave Echoes',
    artist: 'Rust Audio Lab',
    album: 'Neon Horizon Vol. 1',
    folder: '/SDCard/Music/Synthwave',
    duration: 24,
    url: '/audio/cyberpunk_synthwave.wav',
    coverAccent: 'from-cyan-600/80 to-slate-900',
    genre: 'Synthwave',
    isFavorite: true
  },
  {
    id: '2',
    title: 'Neon Runner (Night Drive)',
    artist: 'Synthetix 84',
    album: 'Retro Overdrive',
    folder: '/SDCard/Music/Synthwave',
    duration: 24,
    url: '/audio/neon_runner.wav',
    coverAccent: 'from-indigo-600/80 to-slate-900',
    genre: 'Cyberpunk',
    isFavorite: false
  },
  {
    id: '3',
    title: 'Glitch Bitstream Protocol',
    artist: 'Sub-Zero DSP',
    album: 'Binary Core',
    folder: '/SDCard/Music/Electronic',
    duration: 24,
    url: '/audio/glitch_bitstream.wav',
    coverAccent: 'from-emerald-600/80 to-slate-900',
    genre: 'Electro',
    isFavorite: true
  },
  {
    id: '4',
    title: 'Midnight Matrix Ambient',
    artist: 'Neural Phonk',
    album: 'Deep Sleep Frequency',
    folder: '/SDCard/Music/Ambient',
    duration: 24,
    url: '/audio/midnight_matrix.wav',
    coverAccent: 'from-violet-600/80 to-slate-900',
    genre: 'Ambient',
    isFavorite: false
  },
  {
    id: '5',
    title: 'Cyberpunk 2088 Heavy Bass',
    artist: 'Rust Audio Lab',
    album: 'Neon Horizon Vol. 1',
    folder: '/SDCard/Music/Synthwave',
    duration: 24,
    url: '/audio/cyberpunk_synthwave.wav',
    coverAccent: 'from-sky-600/80 to-slate-900',
    genre: 'Cyberpunk',
    isFavorite: true
  },
  {
    id: '6',
    title: 'Sub-Bass Frequency Test 50Hz',
    artist: 'Sub-Zero DSP',
    album: 'Acoustic Calibration',
    folder: '/SDCard/AudioEngine/DSP_Tests',
    duration: 24,
    url: '/audio/glitch_bitstream.wav',
    coverAccent: 'from-amber-600/80 to-slate-900',
    genre: 'Electro',
    isFavorite: false
  }
];

export const EQ_PRESETS: Record<EqPreset, { label: string; values: EqSettings }> = {
  flat: {
    label: 'Flat',
    values: { band60Hz: 0, band250Hz: 0, band1kHz: 0, band4kHz: 0, band16kHz: 0, bassBoost: false }
  },
  cyber: {
    label: 'Synth',
    values: { band60Hz: 6.0, band250Hz: 3.0, band1kHz: -1.0, band4kHz: 3.5, band16kHz: 5.5, bassBoost: true }
  },
  rock: {
    label: 'Rock',
    values: { band60Hz: 4.5, band250Hz: 1.5, band1kHz: -1.5, band4kHz: 3.0, band16kHz: 4.0, bassBoost: true }
  },
  electronic: {
    label: 'Electro',
    values: { band60Hz: 5.5, band250Hz: 2.5, band1kHz: -2.0, band4kHz: 4.0, band16kHz: 6.0, bassBoost: true }
  },
  vocal: {
    label: 'Vocal',
    values: { band60Hz: -2.0, band250Hz: -1.0, band1kHz: 4.5, band4kHz: 3.5, band16kHz: 1.0, bassBoost: false }
  },
  acoustic: {
    label: 'Acoustic',
    values: { band60Hz: 2.0, band250Hz: 1.5, band1kHz: 2.5, band4kHz: 3.0, band16kHz: 3.5, bassBoost: false }
  }
};

export const VISUALIZER_OPTIONS: Array<{ id: VisualizerStyle; label: string; desc: string }> = [
  { id: 'waterfall', label: 'Waterfall', desc: 'Isometric scrolling frequency terrain' },
  { id: 'waterfall_3d', label: '3D Waterfall', desc: '3D frequency landscape with beat-linked neon glow' },
  { id: 'history', label: 'History', desc: 'Fluid decay spectrum with ghost trails and peak hold' },
  { id: 'bars', label: 'Bars', desc: 'Peak-hold hardware frequency spectrum bars' },
  { id: 'particle_blast', label: 'Particle Blast', desc: 'Floating neon particles energized by high-frequency transients' },
  { id: 'waveform', label: 'Wave', desc: 'Real-time oscilloscope waveform trace' },
  { id: 'circular', label: 'Radial', desc: 'Radial spectrum ring burst' },
  { id: 'particles', label: 'Particles', desc: 'Beat-reactive 3D depth starfield' }
];

export const RUST_BLUEPRINT_SNIPPET = `// Rust + Iced State Blueprint (Desktop 950x650 / Mobile 360x600)
#[derive(Debug, Clone)]
pub struct Track {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub folder_path: String,
    pub duration: f32,
    pub is_favorite: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WorkspaceTab {
    Library,
    Equalizer,
    Blueprint,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LibraryView {
    AllSongs,
    Albums,
    Artists,
    SdCardFolders,
    Favorites,
}

#[derive(Debug, Clone)]
pub enum Message {
    TogglePlay,
    SelectTrack(usize),
    SeekPosition(f32),
    VolumeChanged(f32),
    SwitchTab(WorkspaceTab),
    SwitchLibraryView(LibraryView),
    FilterByAlbum(String),
    FilterByArtist(String),
    FilterByFolder(String),
    ToggleFavorite(String),
    ToggleDSP(bool),
    ToggleBassBoost(bool),
    BandChanged(FrequencyBand, f32),
    ResetEQ,
}`;

export function formatTime(secs: number): string {
  const safe = Math.max(0, secs || 0);
  const mins = Math.floor(safe / 60);
  const remainSecs = Math.floor(safe % 60);
  return `${mins}:${remainSecs < 10 ? '0' : ''}${remainSecs}`;
}
