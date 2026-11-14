import React from 'react';
import {
  ChevronRight,
  Disc3,
  Folder,
  FolderOpen,
  FolderPlus,
  HardDrive,
  Heart,
  Music,
  Pencil,
  Search,
  Trash2,
  Upload,
  User,
  X
} from 'lucide-react';
import { LibraryTab, Track } from '../types/audio';
import { formatTime } from '../data/tracks';

interface LibraryPanelProps {
  playlist: Track[];
  currentIndex: number;
  isPlaying: boolean;
  libraryTab: LibraryTab;
  searchQuery: string;
  filterArtist: string | null;
  filterAlbum: string | null;
  filterFolder: string | null;
  onChangeTab: (tab: LibraryTab) => void;
  onSearchChange: (q: string) => void;
  onFilterArtist: (artist: string | null) => void;
  onFilterAlbum: (album: string | null) => void;
  onFilterFolder: (folder: string | null) => void;
  onClearFilters: () => void;
  onSelectTrack: (index: number) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onEditTrack?: (track: Track, e: React.MouseEvent) => void;
  onRemoveTrack?: (id: string, e: React.MouseEvent) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const LibraryPanel: React.FC<LibraryPanelProps> = ({
  playlist,
  currentIndex,
  isPlaying,
  libraryTab,
  searchQuery,
  filterArtist,
  filterAlbum,
  filterFolder,
  onChangeTab,
  onSearchChange,
  onFilterArtist,
  onFilterAlbum,
  onFilterFolder,
  onClearFilters,
  onSelectTrack,
  onToggleFavorite,
  onEditTrack,
  onRemoveTrack,
  onFileUpload
}) => {
  const uniqueArtists = Array.from(new Set(playlist.map((t) => t.artist)));
  const uniqueAlbums = Array.from(new Set(playlist.map((t) => t.album)));
  const uniqueFolders = Array.from(new Set(playlist.map((t) => t.folder)));
  const favoriteCount = playlist.filter((t) => t.isFavorite).length;
  const localCount = playlist.filter((t) => t.isImported).length;

  const filteredTracks = playlist.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.album.toLowerCase().includes(q);
    const matchesArtist = filterArtist ? t.artist === filterArtist : true;
    const matchesAlbum = filterAlbum ? t.album === filterAlbum : true;
    const matchesFolder = filterFolder ? t.folder === filterFolder : true;
    const matchesFav = libraryTab === 'favorites' ? Boolean(t.isFavorite) : true;
    const matchesLocal = libraryTab === 'local' ? Boolean(t.isImported) : true;
    return matchesSearch && matchesArtist && matchesAlbum && matchesFolder && matchesFav && matchesLocal;
  });

  const folderInputAttrs = {
    webkitdirectory: '',
    directory: ''
  } as React.InputHTMLAttributes<HTMLInputElement>;

  const tabs: Array<{ id: LibraryTab; label: string; count: number; icon: React.ReactNode }> = [
    { id: 'tracks', label: 'All Songs', count: playlist.length, icon: <Music className="w-3.5 h-3.5" /> },
    { id: 'local', label: 'Local', count: localCount, icon: <HardDrive className="w-3.5 h-3.5" /> },
    { id: 'albums', label: 'Albums', count: uniqueAlbums.length, icon: <Disc3 className="w-3.5 h-3.5" /> },
    { id: 'artists', label: 'Artists', count: uniqueArtists.length, icon: <User className="w-3.5 h-3.5" /> },
    { id: 'folders', label: 'Folders', count: uniqueFolders.length, icon: <FolderOpen className="w-3.5 h-3.5" /> },
    { id: 'favorites', label: 'Favorites', count: favoriteCount, icon: <Heart className="w-3.5 h-3.5" /> }
  ];

  const activeFilter = filterArtist || filterAlbum || filterFolder;

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Search + Active Filter */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search songs, artists, albums..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-10 pl-9 pr-8 rounded-xl bg-[#090d12] border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <label
          title="Scan an entire local music folder for all audio files"
          className="h-10 px-3 rounded-xl bg-[#090d12] border border-white/10 hover:border-cyan-400/50 text-xs font-medium text-slate-200 hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
        >
          <FolderPlus className="w-4 h-4 text-cyan-400" />
          <span>Scan Folder</span>
          <input
            type="file"
            multiple
            accept="audio/*"
            onChange={onFileUpload}
            className="hidden"
            {...folderInputAttrs}
          />
        </label>

        {activeFilter && (
          <button
            type="button"
            onClick={onClearFilters}
            className="h-9 px-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center gap-1.5 hover:bg-cyan-500/15 transition-colors shrink-0"
          >
            <span className="truncate max-w-[140px]">{activeFilter}</span>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category Sub-Tabs */}
      <div className="flex items-center gap-1 border-b border-white/[0.08] pb-2.5 overflow-x-auto no-scrollbar shrink-0">
        {tabs.map((tab) => {
          const isActive = libraryTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onChangeTab(tab.id);
                onClearFilters();
              }}
              className={`h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span className={`font-mono tabular-nums text-[11px] ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-0.5">
        {(libraryTab === 'tracks' || libraryTab === 'local' || libraryTab === 'favorites') && (
          <div className="divide-y divide-white/[0.06]">
            {filteredTracks.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <p className="text-sm text-slate-400">
                  {libraryTab === 'favorites'
                    ? 'No favorite tracks yet. Tap the heart icon on any song.'
                    : libraryTab === 'local'
                    ? 'No local device songs loaded yet. Scan a music folder or pick audio files.'
                    : 'No matching audio files found on SD card.'}
                </p>
                {libraryTab !== 'favorites' && (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <label className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs font-medium text-cyan-300 cursor-pointer transition-colors">
                      <FolderPlus className="w-4 h-4" />
                      <span>Scan Local Folder</span>
                      <input
                        type="file"
                        multiple
                        accept="audio/*"
                        onChange={onFileUpload}
                        className="hidden"
                        {...folderInputAttrs}
                      />
                    </label>
                    <label className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white cursor-pointer transition-colors">
                      <Upload className="w-4 h-4 text-cyan-400" />
                      <span>Pick Audio Files</span>
                      <input type="file" accept="audio/*" multiple onChange={onFileUpload} className="hidden" />
                    </label>
                  </div>
                )}
              </div>
            ) : (
              filteredTracks.map((track) => {
                const actualIdx = playlist.findIndex((p) => p.id === track.id);
                const isCurrent = currentIndex === actualIdx;
                return (
                  <div
                    key={track.id}
                    data-interactive="true"
                    onClick={() => onSelectTrack(actualIdx)}
                    className={`py-2.5 px-2.5 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-2.5 ${
                      isCurrent
                        ? 'bg-cyan-500/10'
                        : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-lg bg-gradient-to-br ${track.coverAccent} border border-white/10 flex items-center justify-center text-xs font-mono font-semibold text-white shrink-0`}
                      >
                        {isCurrent && isPlaying ? (
                          <Music className="w-4 h-4 text-cyan-300" />
                        ) : (
                          actualIdx + 1
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${isCurrent ? 'text-cyan-300' : 'text-white'}`}>
                          {track.title}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {track.artist} · {track.album}
                          {track.isImported && <span className="text-cyan-400/80"> · Local</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      {track.isImported && onEditTrack && (
                        <button
                          type="button"
                          onClick={(e) => onEditTrack(track, e)}
                          title="Edit track metadata"
                          aria-label={`Edit ${track.title}`}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-cyan-300 hover:bg-white/5 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {track.isImported && onRemoveTrack && (
                        <button
                          type="button"
                          onClick={(e) => onRemoveTrack(track.id, e)}
                          title="Remove imported track"
                          aria-label={`Remove ${track.title}`}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => onToggleFavorite(track.id, e)}
                        aria-label={track.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Heart className={`w-4 h-4 ${track.isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </button>
                      <span className="text-xs font-mono tabular-nums text-slate-400 w-10 text-right">
                        {formatTime(track.duration)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {libraryTab === 'albums' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            {uniqueAlbums.map((album) => {
              const albumTracks = playlist.filter((t) => t.album === album);
              const coverAccent = albumTracks[0]?.coverAccent || 'from-cyan-600/80 to-slate-900';
              return (
                <button
                  key={album}
                  type="button"
                  onClick={() => {
                    onFilterAlbum(album);
                    onChangeTab('tracks');
                  }}
                  className="text-left p-2.5 rounded-xl bg-[#090d12] border border-white/10 hover:border-cyan-400/50 transition-colors group"
                >
                  <div className={`w-full h-20 rounded-lg bg-gradient-to-br ${coverAccent} border border-white/10 flex items-center justify-center mb-2 relative`}>
                    <Disc3 className="w-8 h-8 text-white/80 group-hover:rotate-45 transition-transform duration-300" />
                    <span className="absolute bottom-1.5 right-2 text-[10px] font-mono text-slate-200 bg-black/50 px-1.5 py-0.5 rounded">
                      {albumTracks.length}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-white truncate">{album}</p>
                  <p className="text-[11px] text-slate-400 truncate">{albumTracks[0]?.artist}</p>
                </button>
              );
            })}
          </div>
        )}

        {libraryTab === 'artists' && (
          <div className="divide-y divide-white/[0.06]">
            {uniqueArtists.map((artist) => {
              const artistTracks = playlist.filter((t) => t.artist === artist);
              return (
                <button
                  key={artist}
                  type="button"
                  onClick={() => {
                    onFilterArtist(artist);
                    onChangeTab('tracks');
                  }}
                  className="w-full py-3 px-2.5 rounded-xl hover:bg-white/[0.04] transition-colors flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{artist}</p>
                      <p className="text-xs text-slate-400 font-mono">
                        {artistTracks.length} {artistTracks.length === 1 ? 'track' : 'tracks'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                </button>
              );
            })}
          </div>
        )}

        {libraryTab === 'folders' && (
          <div className="space-y-1.5">
            <div className="px-3 py-2 rounded-lg bg-[#090d12] border border-white/[0.08] text-xs font-mono text-slate-400">
              Mounted: /storage/sdcard0 · FAT32
            </div>
            <div className="divide-y divide-white/[0.06]">
              {uniqueFolders.map((folder) => {
                const folderTracks = playlist.filter((t) => t.folder === folder);
                return (
                  <button
                    key={folder}
                    type="button"
                    onClick={() => {
                      onFilterFolder(folder);
                      onChangeTab('tracks');
                    }}
                    className="w-full py-3 px-2.5 rounded-xl hover:bg-white/[0.04] transition-colors flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                        <Folder className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-mono font-medium text-white truncate">{folder}</p>
                        <p className="text-[11px] text-slate-400">
                          {folderTracks.length} {folderTracks.length === 1 ? 'file' : 'files'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
