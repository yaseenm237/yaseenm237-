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
    url: '/audio/heavy_bass_2088.wav',
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
    url: '/audio/sub_bass_50hz.wav',
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
  { id: 'oscilloscope', label: 'Oscilloscope', desc: 'Triggered time-domain CRT oscilloscope trace' },
  { id: 'circular', label: 'Radial', desc: 'Radial spectrum ring burst' },
  { id: 'particles', label: 'Particles', desc: 'Beat-reactive 3D depth starfield' }
];

export const RUST_BLUEPRINT_SNIPPET = `// src/state.rs — Rust + Iced 0.13 State & Messages (Desktop 950x650 / Mobile 360x600)
#[derive(Debug, Clone)]
pub struct Track {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub folder_path: String,
    pub duration_secs: f32,
    pub is_favorite: bool,
    pub is_local: bool,
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
    Local,
    Albums,
    Artists,
    Folders,
    Favorites,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VisualizerMode {
    Waterfall,
    Waterfall3D,
    History,
    Bars,
    ParticleBlast,
    Waveform,
    Oscilloscope,
    Radial,
    Particles,
}

#[derive(Debug, Clone)]
pub enum Message {
    TogglePlay,
    NextTrack,
    PrevTrack,
    SelectTrack(usize),
    Seek(f32),
    VolumeChanged(f32),
    ToggleMute,
    SwitchTab(WorkspaceTab),
    SwitchLibraryView(LibraryView),
    ScanLocalFolder,
    EditTrackMetadata { id: String, title: String, artist: String },
    ToggleFavorite(String),
    SelectVisualizer(VisualizerMode),
    StepVisualizer(i8),
    ToggleDSP(bool),
    ToggleBassBoost(bool),
    BandChanged(FrequencyBand, f32),
    ResetEQ,
}`;

export const RUST_VIEW_SNIPPET = `// src/view.rs — Iced Layout Tree (950x650 Split vs 360x600 Mobile Shell)
use iced::widget::{button, column, container, row, scrollable, slider, text, Space};
use iced::{Alignment, Element, Length};

pub fn view(state: &StudioApp, window_width: f32) -> Element<'_, Message> {
    let is_compact = window_width < 900.0;

    let body: Element<'_, Message> = if is_compact {
        // Mobile 360x600: Active Screen + Optional Mini Bar + 4-Tab Bottom Nav
        column![
            container(view_mobile_screen(state))
                .width(Length::Fill)
                .height(Length::Fill)
                .padding(12),
            view_mini_player_if_needed(state),
            view_mobile_bottom_nav(state),
        ]
        .into()
    } else {
        // Desktop 950x650: Left Player Pane (390px) + Right Tabbed Workspace
        row![
            container(view_player_panel(state))
                .width(Length::Fixed(390.0))
                .height(Length::Fill)
                .padding(18)
                .style(theme::panel_divider_right),
            column![
                view_workspace_tabs(state),
                container(view_workspace_content(state))
                    .width(Length::Fill)
                    .height(Length::Fill)
                    .padding(18),
            ]
            .width(Length::Fill)
            .height(Length::Fill),
        ]
        .into()
    };

    column![
        view_header(state),
        container(body)
            .width(Length::Fill)
            .height(Length::Fill)
            .style(theme::shell_surface),
        view_performance_hud(state), // Latency ms + Hardware Sample Rate footer
    ]
    .into()
}`;

export const RUST_THEME_SNIPPET = `// src/theme.rs — Cyber-Obsidian & Cyan Palette Tokens for Iced 0.13
use iced::{Border, Color, Shadow, Vector, widget::container};

pub const BG_VOID: Color        = Color::from_rgb8(0x09, 0x0D, 0x12); // Deep canvas & inner wells
pub const BG_SURFACE: Color     = Color::from_rgb8(0x11, 0x17, 0x20); // Primary shell panels
pub const BG_ELEVATED: Color    = Color::from_rgb8(0x0E, 0x14, 0x1C); // Headers & tab bars
pub const ACCENT_CYAN: Color    = Color::from_rgb8(0x22, 0xD3, 0xEE); // Primary DSP / Active state
pub const ACCENT_AMBER: Color   = Color::from_rgb8(0xF5, 0x9E, 0x0B); // AI EQ / Folder highlights
pub const TEXT_PRIMARY: Color   = Color::from_rgb8(0xF1, 0xF5, 0xF9); // Track titles & readouts
pub const TEXT_MUTED: Color     = Color::from_rgb8(0x94, 0xA3, 0xB8); // Artist / metadata labels
pub const BORDER_SUBTLE: Color  = Color::from_rgba(1.0, 1.0, 1.0, 0.09);

pub fn shell_surface(_theme: &iced::Theme) -> container::Style {
    container::Style {
        background: Some(BG_SURFACE.into()),
        border: Border { color: BORDER_SUBTLE, width: 1.0, radius: 16.0.into() },
        shadow: Shadow { color: Color::from_rgba(0.0, 0.0, 0.0, 0.45), offset: Vector::new(0.0, 12.0), blur_radius: 28.0 },
        ..Default::default()
    }
}

pub fn inner_well(_theme: &iced::Theme) -> container::Style {
    container::Style {
        background: Some(BG_VOID.into()),
        border: Border { color: BORDER_SUBTLE, width: 1.0, radius: 12.0.into() },
        ..Default::default()
    }
}`;

export function formatTime(secs: number): string {
  const safe = Math.max(0, secs || 0);
  const mins = Math.floor(safe / 60);
  const remainSecs = Math.floor(safe % 60);
  return `${mins}:${remainSecs < 10 ? '0' : ''}${remainSecs}`;
}
