import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_PRESETS = ['flat', 'cyber', 'rock', 'electronic', 'vocal', 'acoustic'] as const;
type EqPreset = (typeof VALID_PRESETS)[number];

interface ProfilerRequestBody {
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  id3Genre?: string;
  bpm?: string;
  year?: string;
  folder?: string;
}

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    })
  : null;

function fallbackRuleMatch(tags: ProfilerRequestBody): {
  preset: EqPreset;
  detectedGenre: string;
  reason: string;
} {
  const haystack = `${tags.id3Genre || ''} ${tags.genre || ''} ${tags.title || ''} ${tags.artist || ''} ${tags.album || ''}`.toLowerCase();

  if (/(synthwave|cyberpunk|retrowave|outrun|darkwave|vaporwave|synthpop|cyber)/.test(haystack)) {
    return {
      preset: 'cyber',
      detectedGenre: tags.id3Genre || tags.genre || 'Synthwave',
      reason: 'Matched Synthwave/Cyberpunk ID3 profile -> Synth (Cyber) preset'
    };
  }
  if (/(electro|electronic|edm|techno|house|trance|dubstep|drum & bass|dnb|glitch|bass|club|rave|dance)/.test(haystack)) {
    return {
      preset: 'electronic',
      detectedGenre: tags.id3Genre || tags.genre || 'Electronic',
      reason: 'Matched Electronic/Bass ID3 profile -> Electro preset'
    };
  }
  if (/(rock|metal|punk|grunge|alternative|indie|hard rock|classic rock|guitar)/.test(haystack)) {
    return {
      preset: 'rock',
      detectedGenre: tags.id3Genre || tags.genre || 'Rock',
      reason: 'Matched Rock/Guitar ID3 profile -> Rock preset'
    };
  }
  if (/(vocal|pop|r&b|rap|hip-hop|hip hop|soul|speech|podcast|a capella|ballad)/.test(haystack)) {
    return {
      preset: 'vocal',
      detectedGenre: tags.id3Genre || tags.genre || 'Vocal',
      reason: 'Matched Vocal/Pop ID3 profile -> Vocal preset'
    };
  }
  if (/(acoustic|ambient|jazz|classical|folk|chill|lo-fi|lofi|instrumental|piano|new age)/.test(haystack)) {
    return {
      preset: 'acoustic',
      detectedGenre: tags.id3Genre || tags.genre || 'Acoustic / Ambient',
      reason: 'Matched Acoustic/Ambient ID3 profile -> Acoustic preset'
    };
  }

  return {
    preset: 'flat',
    detectedGenre: tags.id3Genre || tags.genre || 'Balanced',
    reason: 'Balanced neutral EQ selected for general audio profile'
  };
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '256kb' }));

  app.post('/api/smart-genre-profiler', async (req, res) => {
    const body = (req.body || {}) as ProfilerRequestBody;

    if (!ai) {
      return res.json({
        ...fallbackRuleMatch(body),
        source: 'id3-heuristic'
      });
    }

    try {
      const tagSummary = [
        `Title: ${body.title || 'Unknown'}`,
        `Artist: ${body.artist || 'Unknown'}`,
        `Album: ${body.album || 'Unknown'}`,
        `ID3 TCON/Genre Tag: ${body.id3Genre || body.genre || 'Not specified'}`,
        body.bpm ? `BPM: ${body.bpm}` : null,
        body.year ? `Year: ${body.year}` : null,
        body.folder ? `Folder: ${body.folder}` : null
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Analyze these audio track ID3 metadata tags and select the single best matching EQ preset from the allowed list:
Available EQ presets:
- "cyber": Synthwave, Cyberpunk, Retrowave, Outrun, Darkwave, Vaporwave, 80s Synth
- "electronic": EDM, Electro, Techno, House, Dubstep, Drum & Bass, Glitch, Trance, Sub-Bass
- "rock": Rock, Hard Rock, Metal, Punk, Grunge, Alternative, Indie
- "vocal": Vocal, Pop, R&B, Hip-Hop, Rap, Speech, Podcast, Ballad
- "acoustic": Acoustic, Ambient, Jazz, Classical, Folk, Lo-Fi, Instrumental, Chill
- "flat": Neutral / Unclassifiable / Reference calibration

Track ID3 Tags:
${tagSummary}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are an expert audio mastering engineer. Classify the track genre from its ID3 tags and map it strictly to one of the six EQ presets: flat, cyber, rock, electronic, vocal, acoustic.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedGenre: {
                type: Type.STRING,
                description: 'Concise genre label inferred from the ID3 tags.'
              },
              preset: {
                type: Type.STRING,
                description: 'Must be exactly one of: flat, cyber, rock, electronic, vocal, acoustic.'
              },
              reason: {
                type: Type.STRING,
                description: 'Short 1-sentence mastering rationale explaining why this EQ preset fits the ID3 tags.'
              }
            },
            required: ['detectedGenre', 'preset', 'reason']
          }
        }
      });

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson) as {
        detectedGenre?: string;
        preset?: string;
        reason?: string;
      };

      const normalizedPreset = VALID_PRESETS.includes(parsed.preset as EqPreset)
        ? (parsed.preset as EqPreset)
        : fallbackRuleMatch(body).preset;

      return res.json({
        detectedGenre: parsed.detectedGenre || body.id3Genre || body.genre || 'Analyzed',
        preset: normalizedPreset,
        reason: parsed.reason || `AI mapped track ID3 profile to ${normalizedPreset} EQ`,
        source: 'gemini-ai'
      });
    } catch (err) {
      console.error('Smart Genre Profiler Gemini error:', err);
      const fallback = fallbackRuleMatch(body);
      return res.status(200).json({
        ...fallback,
        source: 'id3-heuristic',
        warning: err instanceof Error ? err.message : 'AI profiler fallback applied'
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`DSP Audio Studio server running on http://0.0.0.0:${port}`);
  });
}

startServer();
