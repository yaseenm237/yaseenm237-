import { DEFAULT_TRACKS } from '../data/tracks';
import { Track } from '../types/audio';

const STORAGE_KEY = 'dsp_audio_studio_library_v1';
const MAX_DATA_URL_BYTES = 2_500_000;

interface StoredLibraryPayload {
  version: 1;
  favoriteDefaultIds: string[];
  importedTracks: Track[];
}

export function loadSavedLibrary(): Track[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_TRACKS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TRACKS;

    const parsed = JSON.parse(raw) as Partial<StoredLibraryPayload>;
    const hasSavedFavs = Array.isArray(parsed.favoriteDefaultIds);
    const favSet = new Set(hasSavedFavs ? parsed.favoriteDefaultIds : []);

    const defaults = DEFAULT_TRACKS.map((track) => ({
      ...track,
      isFavorite: hasSavedFavs ? favSet.has(track.id) : track.isFavorite
    }));

    const imported = Array.isArray(parsed.importedTracks)
      ? parsed.importedTracks
          .filter((t): t is Track => Boolean(t && t.id && t.title))
          .map((t) => {
            const hasPersistableUrl = typeof t.url === 'string' && t.url.startsWith('data:audio/');
            return {
              ...t,
              isImported: true,
              url: hasPersistableUrl ? t.url : '',
              hasAudioData: hasPersistableUrl
            };
          })
      : [];

    return [...defaults, ...imported];
  } catch (err) {
    console.warn('Failed to load saved library from localStorage:', err);
    return DEFAULT_TRACKS;
  }
}

export function saveLibraryToStorage(playlist: Track[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  const defaultIds = new Set(DEFAULT_TRACKS.map((t) => t.id));
  const favoriteDefaultIds = playlist
    .filter((t) => defaultIds.has(t.id) && t.isFavorite)
    .map((t) => t.id);

  const importedTracks: Track[] = playlist
    .filter((t) => !defaultIds.has(t.id) || t.isImported)
    .map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album,
      folder: t.folder,
      duration: t.duration,
      url: t.url.startsWith('data:audio/') ? t.url : '',
      coverAccent: t.coverAccent,
      genre: t.genre,
      isFavorite: Boolean(t.isFavorite),
      isImported: true,
      hasAudioData: t.url.startsWith('data:audio/')
    }));

  const payload: StoredLibraryPayload = {
    version: 1,
    favoriteDefaultIds,
    importedTracks
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    // Handle QuotaExceededError cleanly by stripping heavy audio payloads while keeping track metadata
    console.warn('localStorage quota reached; saving imported track metadata only.', err);
    try {
      const metadataOnly: StoredLibraryPayload = {
        version: 1,
        favoriteDefaultIds,
        importedTracks: importedTracks.map((t) => ({
          ...t,
          url: '',
          hasAudioData: false
        }))
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(metadataOnly));
    } catch (innerErr) {
      console.warn('Failed to persist track metadata to localStorage:', innerErr);
    }
  }
}

export async function readImportedAudioFile(file: File): Promise<{
  duration: number;
  persistableUrl: string | null;
}> {
  const objectUrl = URL.createObjectURL(file);

  const duration = await new Promise<number>((resolve) => {
    const probe = new Audio();
    const cleanup = () => {
      probe.removeAttribute('src');
      probe.load();
    };
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      const d = Number.isFinite(probe.duration) && probe.duration > 0 ? Math.round(probe.duration) : 180;
      cleanup();
      resolve(d);
    };
    probe.onerror = () => {
      cleanup();
      resolve(180);
    };
    probe.src = objectUrl;
  });

  URL.revokeObjectURL(objectUrl);

  let persistableUrl: string | null = null;
  if (file.size <= MAX_DATA_URL_BYTES) {
    persistableUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(typeof reader.result === 'string' ? reader.result : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  return { duration, persistableUrl };
}
