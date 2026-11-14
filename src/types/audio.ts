export type Genre = 'Synthwave' | 'Cyberpunk' | 'Electro' | 'Ambient' | 'Rock' | 'Vocal' | 'Acoustic' | string;

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  folder: string;
  duration: number;
  url: string;
  coverAccent: string;
  genre: Genre;
  id3Genre?: string;
  bpm?: string;
  year?: string;
  hasId3Tags?: boolean;
  isFavorite?: boolean;
  isImported?: boolean;
  hasAudioData?: boolean;
}

export type VisualizerStyle = 'waterfall' | 'waterfall_3d' | 'history' | 'bars' | 'particle_blast' | 'waveform' | 'oscilloscope' | 'circular' | 'particles';

export type LibraryTab = 'tracks' | 'local' | 'albums' | 'artists' | 'folders' | 'favorites';

export type EqPreset = 'flat' | 'cyber' | 'rock' | 'electronic' | 'vocal' | 'acoustic';

export type EqControlStyle = 'knobs' | 'sliders';

export type PreviewMode = 'responsive' | 'desktop' | 'mobile';

export type WorkspaceTab = 'library' | 'equalizer' | 'blueprint';

export type MobileTab = 'player' | 'library' | 'equalizer' | 'blueprint';

export type KnobId = '60hz' | '250hz' | '1khz' | '4khz' | '16khz' | 'volume';

export interface ZoomedKnobTarget {
  id: KnobId;
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
}

export interface EqSettings {
  band60Hz: number;
  band250Hz: number;
  band1kHz: number;
  band4kHz: number;
  band16kHz: number;
  bassBoost: boolean;
}
