import React, { useEffect, useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { Track } from '../types/audio';

interface EditTrackModalProps {
  track: Track | null;
  onSave: (trackId: string, updates: { title: string; artist: string; album: string }) => void;
  onClose: () => void;
}

export const EditTrackModal: React.FC<EditTrackModalProps> = ({
  track,
  onSave,
  onClose
}) => {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');

  useEffect(() => {
    if (track) {
      setTitle(track.title);
      setArtist(track.artist);
      setAlbum(track.album);
    }
  }, [track]);

  useEffect(() => {
    if (!track) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [track, onClose]);

  if (!track) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim() || track.title;
    const cleanArtist = artist.trim() || 'Local SD Card';
    const cleanAlbum = album.trim() || 'Imported Audio';
    onSave(track.id, {
      title: cleanTitle,
      artist: cleanArtist,
      album: cleanAlbum
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#111720] border border-white/12 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative space-y-4"
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-cyan-400" />
            <h3 className="text-base font-semibold text-white">Edit Track Metadata</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close metadata editor"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="edit-track-title" className="text-xs font-mono text-slate-400 block">
              Title
            </label>
            <input
              id="edit-track-title"
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Track title"
              className="w-full h-10 px-3 rounded-xl bg-[#090d12] border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="edit-track-artist" className="text-xs font-mono text-slate-400 block">
              Artist
            </label>
            <input
              id="edit-track-artist"
              type="text"
              required
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Artist name"
              className="w-full h-10 px-3 rounded-xl bg-[#090d12] border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="edit-track-album" className="text-xs font-mono text-slate-400 block">
              Album
            </label>
            <input
              id="edit-track-album"
              type="text"
              value={album}
              onChange={(e) => setAlbum(e.target.value)}
              placeholder="Album name"
              className="w-full h-10 px-3 rounded-xl bg-[#090d12] border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-xl bg-[#090d12] border border-white/10 text-xs font-medium text-slate-300 hover:text-white hover:border-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="h-10 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};
