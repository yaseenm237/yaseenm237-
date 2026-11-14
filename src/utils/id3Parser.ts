export interface ParsedId3Tags {
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: string;
  bpm?: string;
  comment?: string;
  hasId3Tags: boolean;
}

const ID3V1_GENRES: string[] = [
  'Blues', 'Classic Rock', 'Country', 'Dance', 'Disco', 'Funk', 'Grunge', 'Hip-Hop',
  'Jazz', 'Metal', 'New Age', 'Oldies', 'Other', 'Pop', 'R&B', 'Rap', 'Reggae', 'Rock',
  'Techno', 'Industrial', 'Alternative', 'Ska', 'Death Metal', 'Pranks', 'Soundtrack',
  'Euro-Techno', 'Ambient', 'Trip-Hop', 'Vocal', 'Jazz+Funk', 'Fusion', 'Trance',
  'Classical', 'Instrumental', 'Acid', 'House', 'Game', 'Sound Clip', 'Gospel', 'Noise',
  'AlternRock', 'Bass', 'Soul', 'Punk', 'Space', 'Meditative', 'Instrumental Pop',
  'Instrumental Rock', 'Ethnic', 'Gothic', 'Darkwave', 'Techno-Industrial', 'Electronic',
  'Pop-Folk', 'Eurodance', 'Dream', 'Southern Rock', 'Comedy', 'Cult', 'Gangsta',
  'Top 40', 'Christian Rap', 'Pop/Funk', 'Jungle', 'Native American', 'Cabaret',
  'New Wave', 'Psychadelic', 'Rave', 'Showtunes', 'Trailer', 'Lo-Fi', 'Tribal',
  'Acid Punk', 'Acid Jazz', 'Polka', 'Retro', 'Musical', 'Rock & Roll', 'Hard Rock',
  'Folk', 'Folk-Rock', 'National Folk', 'Swing', 'Fast Fusion', 'Bebob', 'Latin',
  'Revival', 'Celtic', 'Bluegrass', 'Avantgarde', 'Gothic Rock', 'Progressive Rock',
  'Psychedelic Rock', 'Symphonic Rock', 'Slow Rock', 'Big Band', 'Chorus', 'Easy Listening',
  'Acoustic', 'Humour', 'Speech', 'Chanson', 'Opera', 'Chamber Music', 'Sonata',
  'Symphony', 'Booty Bass', 'Primus', 'Porn Groove', 'Satire', 'Slow Jam', 'Club',
  'Tango', 'Samba', 'Folklore', 'Ballad', 'Power Ballad', 'Rhythmic Soul', 'Freestyle',
  'Duet', 'Punk Rock', 'Drum Solo', 'A capella', 'Euro-House', 'Dance Hall', 'Goa',
  'Drum & Bass', 'Club-House', 'Hardcore', 'Terror', 'Indie', 'BritPop', 'Negerpunk',
  'Polsk Punk', 'Beat', 'Christian Gangsta Rap', 'Heavy Metal', 'Black Metal',
  'Crossover', 'Contemporary Christian', 'Christian Rock', 'Merengue', 'Salsa',
  'Thrash Metal', 'Anime', 'JPop', 'Synthpop'
];

function decodeSyncSafeInt(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] & 0x7f) << 21) |
    ((bytes[offset + 1] & 0x7f) << 14) |
    ((bytes[offset + 2] & 0x7f) << 7) |
    (bytes[offset + 3] & 0x7f)
  );
}

function decodeUint32BE(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] << 24) >>> 0) +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  );
}

function decodeTextFrame(payload: Uint8Array): string {
  if (payload.length === 0) return '';
  const encoding = payload[0];
  const data = payload.slice(1);

  try {
    if (encoding === 0) {
      return new TextDecoder('iso-8859-1').decode(data).replace(/\0+$/, '').trim();
    }
    if (encoding === 1) {
      // UTF-16 with BOM
      if (data.length >= 2 && data[0] === 0xff && data[1] === 0xfe) {
        return new TextDecoder('utf-16le').decode(data.slice(2)).replace(/\0+$/, '').trim();
      }
      if (data.length >= 2 && data[0] === 0xfe && data[1] === 0xff) {
        return new TextDecoder('utf-16be').decode(data.slice(2)).replace(/\0+$/, '').trim();
      }
      return new TextDecoder('utf-16le').decode(data).replace(/\0+$/, '').trim();
    }
    if (encoding === 2) {
      return new TextDecoder('utf-16be').decode(data).replace(/\0+$/, '').trim();
    }
    return new TextDecoder('utf-8').decode(data).replace(/\0+$/, '').trim();
  } catch {
    return new TextDecoder('utf-8').decode(data).replace(/\0+$/, '').trim();
  }
}

function normalizeId3Genre(raw: string): string {
  const cleaned = raw.trim();
  if (!cleaned) return '';

  // Handle ID3v2 numeric references like "(17)" or "(52)Electronic"
  const parenMatch = cleaned.match(/^\((\d+)\)(.*)$/);
  if (parenMatch) {
    const idx = parseInt(parenMatch[1], 10);
    const trailing = parenMatch[2]?.trim();
    if (trailing) return trailing;
    if (idx >= 0 && idx < ID3V1_GENRES.length) return ID3V1_GENRES[idx];
  }

  if (/^\d+$/.test(cleaned)) {
    const idx = parseInt(cleaned, 10);
    if (idx >= 0 && idx < ID3V1_GENRES.length) return ID3V1_GENRES[idx];
  }

  return cleaned;
}

export async function parseId3Tags(file: File): Promise<ParsedId3Tags> {
  const result: ParsedId3Tags = { hasId3Tags: false };

  try {
    // 1. Parse ID3v2 header at start of file (read up to first 256 KB)
    const headBuf = new Uint8Array(await file.slice(0, 262144).arrayBuffer());
    if (
      headBuf.length >= 10 &&
      headBuf[0] === 0x49 && // 'I'
      headBuf[1] === 0x44 && // 'D'
      headBuf[2] === 0x33    // '3'
    ) {
      const majorVer = headBuf[3];
      const flags = headBuf[5];
      const tagSize = decodeSyncSafeInt(headBuf, 6);
      const tagEnd = Math.min(headBuf.length, 10 + tagSize);

      let offset = 10;
      // Skip extended header if present (bit 6)
      if ((flags & 0x40) !== 0 && offset + 4 <= tagEnd) {
        const extSize =
          majorVer === 4 ? decodeSyncSafeInt(headBuf, offset) : decodeUint32BE(headBuf, offset);
        offset += majorVer === 4 ? extSize : extSize + 4;
      }

      if (majorVer === 3 || majorVer === 4) {
        while (offset + 10 <= tagEnd) {
          const frameId = String.fromCharCode(
            headBuf[offset],
            headBuf[offset + 1],
            headBuf[offset + 2],
            headBuf[offset + 3]
          );
          if (frameId === '\0\0\0\0' || !/^[A-Z0-9]{4}$/.test(frameId)) break;

          const frameSize =
            majorVer === 4
              ? decodeSyncSafeInt(headBuf, offset + 4)
              : decodeUint32BE(headBuf, offset + 4);

          offset += 10;
          if (frameSize <= 0 || offset + frameSize > tagEnd) break;

          const payload = headBuf.slice(offset, offset + frameSize);
          offset += frameSize;

          if (frameId === 'TIT2') {
            const val = decodeTextFrame(payload);
            if (val) {
              result.title = val;
              result.hasId3Tags = true;
            }
          } else if (frameId === 'TPE1') {
            const val = decodeTextFrame(payload);
            if (val) {
              result.artist = val;
              result.hasId3Tags = true;
            }
          } else if (frameId === 'TALB') {
            const val = decodeTextFrame(payload);
            if (val) {
              result.album = val;
              result.hasId3Tags = true;
            }
          } else if (frameId === 'TCON') {
            const val = normalizeId3Genre(decodeTextFrame(payload));
            if (val) {
              result.genre = val;
              result.hasId3Tags = true;
            }
          } else if (frameId === 'TYER' || frameId === 'TDRC') {
            const val = decodeTextFrame(payload);
            if (val) {
              result.year = val;
              result.hasId3Tags = true;
            }
          } else if (frameId === 'TBPM') {
            const val = decodeTextFrame(payload);
            if (val) {
              result.bpm = val;
              result.hasId3Tags = true;
            }
          }
        }
      }
    }

    // 2. Fallback to ID3v1 tail (last 128 bytes) for missing fields
    if (file.size >= 128) {
      const tailBuf = new Uint8Array(await file.slice(file.size - 128).arrayBuffer());
      if (tailBuf[0] === 0x54 && tailBuf[1] === 0x41 && tailBuf[2] === 0x47) {
        const dec = new TextDecoder('iso-8859-1');
        const v1Title = dec.decode(tailBuf.slice(3, 33)).replace(/\0+$/, '').trim();
        const v1Artist = dec.decode(tailBuf.slice(33, 63)).replace(/\0+$/, '').trim();
        const v1Album = dec.decode(tailBuf.slice(63, 93)).replace(/\0+$/, '').trim();
        const v1Year = dec.decode(tailBuf.slice(93, 97)).replace(/\0+$/, '').trim();
        const v1GenreIdx = tailBuf[127];

        if (!result.title && v1Title) {
          result.title = v1Title;
          result.hasId3Tags = true;
        }
        if (!result.artist && v1Artist) {
          result.artist = v1Artist;
          result.hasId3Tags = true;
        }
        if (!result.album && v1Album) {
          result.album = v1Album;
          result.hasId3Tags = true;
        }
        if (!result.year && v1Year) {
          result.year = v1Year;
          result.hasId3Tags = true;
        }
        if (!result.genre && v1GenreIdx < ID3V1_GENRES.length) {
          result.genre = ID3V1_GENRES[v1GenreIdx];
          result.hasId3Tags = true;
        }
      }
    }
  } catch (err) {
    console.warn('ID3 tag read skipped:', err);
  }

  return result;
}
