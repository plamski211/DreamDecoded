import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Dream, MoodTag, DreamSymbol } from '@/types';

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

function getModel() {
  if (!GEMINI_KEY) {
    throw new Error(
      'Missing EXPO_PUBLIC_GEMINI_API_KEY in your .env file.\n' +
      'Get a free key at https://aistudio.google.com/apikey'
    );
  }
  const genAI = new GoogleGenerativeAI(GEMINI_KEY);
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

interface DreamAnalysis {
  transcription: string;
  title: string;
  summary: string;
  moods: MoodTag[];
  symbols: Omit<DreamSymbol, 'occurrence_count' | 'first_seen' | 'meaning_full'>[];
  interpretation: string;
}

const MOOD_GRADIENTS: Record<string, readonly [string, string]> = {
  peaceful: ['#5B8DEF', '#7C5CFC'],
  anxious: ['#EF4444', '#F59E0B'],
  joyful: ['#F59E0B', '#F472B6'],
  confused: ['#8B5CF6', '#EC4899'],
  sad: ['#3B82F6', '#6366F1'],
  excited: ['#F472B6', '#F59E0B'],
  fearful: ['#6366F1', '#1E1B4B'],
  neutral: ['#6B7280', '#9CA3AF'],
};

/**
 * Convert a Blob to a base64 string (without the data URL prefix).
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Full dream processing pipeline — sends audio directly to Gemini.
 * One API call: audio → transcription + title + moods + symbols + interpretation.
 */
export async function processDream(
  audioUri: string,
  userId: string,
  interpretationStyle: string,
  recurringSymbols: string[],
  isPremium: boolean,
  voiceLanguage?: string
): Promise<Partial<Dream>> {
  const model = getModel();

  // Fetch the audio blob and convert to base64
  const response = await fetch(audioUri);
  const blob = await response.blob();
  const base64 = await blobToBase64(blob);
  const mimeType = blob.type || 'audio/webm';

  const symbols = recurringSymbols.length
    ? `\nThe user has these recurring symbols from past dreams: ${recurringSymbols.join(', ')}.`
    : '';

  const langInstruction = voiceLanguage && voiceLanguage !== 'english'
    ? `\nRespond in ${voiceLanguage}. The audio may be in ${voiceLanguage} — transcribe it in the original language.`
    : '';

  const prompt = `Listen to this audio recording of someone describing a dream they had. Use a ${interpretationStyle} interpretation approach.${langInstruction}

First transcribe exactly what they said, then analyze the dream.

Return ONLY a JSON object (no markdown, no code fences) with these exact fields:
- "transcription": The full verbatim text of what the person said
- "title": A short, evocative title for the dream (max 6 words)
- "summary": A 2-3 sentence summary of what happened in the dream
- "moods": Array of 1-3 objects with "mood" (one of: peaceful, anxious, joyful, confused, sad, excited, fearful, neutral), "confidence" (0-1), "emoji" (matching emoji)
- "symbols": Array of 1-4 objects with "name" (lowercase, singular — e.g. "rabbit" not "Rabbit" or "rabbits"), "emoji" (matching emoji), "meaning_short" (one sentence meaning). Keep meaningful modifiers that change the symbol's meaning: "chocolate rabbit" and "rabbit" are distinct symbols, but "rabbits" and "rabbit" are the same. If recurring symbols are listed below, reuse those exact names when the same concept appears.
- "interpretation": 2-4 sentence interpretation of the dream's deeper meaning${symbols}`;

  const result = await model.generateContent([
    { inlineData: { mimeType, data: base64 } },
    { text: prompt },
  ]);

  const text = result.response.text();

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Gemini did not return valid JSON');
  }

  const analysis = JSON.parse(jsonMatch[0]) as DreamAnalysis;

  if (!analysis.transcription?.trim()) {
    throw new Error('No speech was detected in the recording. Please try again and speak clearly.');
  }

  // Attach gradient colors to moods
  if (analysis.moods) {
    analysis.moods = analysis.moods.map((m) => ({
      ...m,
      gradient: MOOD_GRADIENTS[m.mood] ?? MOOD_GRADIENTS.neutral,
    }));
  }

  const dream: Partial<Dream> = {
    user_id: userId,
    title: analysis.title,
    transcription: analysis.transcription,
    summary: analysis.summary,
    audio_url: null,
    moods: analysis.moods,
    symbols: analysis.symbols.map((s) => ({
      ...s,
      occurrence_count: 1,
      first_seen: new Date().toISOString(),
      meaning_full: '',
    })),
    interpretation: analysis.interpretation,
    art_url: null,
    is_premium_content: true,
  };

  return dream;
}

/**
 * "Ask Your Dream" — conversational follow-up using Gemini.
 */
export async function askDream(
  _dreamId: string,
  message: string,
  conversationHistory: { role: string; content: string }[],
  dreamContext?: { title?: string; transcription?: string; summary?: string; interpretation?: string | null },
  voiceLanguage?: string
): Promise<string> {
  const model = getModel();

  const langNote = voiceLanguage && voiceLanguage !== 'english'
    ? ` Respond in ${voiceLanguage}.`
    : '';

  const systemContext = dreamContext
    ? `You are a thoughtful dream analyst. Be warm, insightful, and concise (2-4 sentences).${langNote}

Dream context:
- Title: ${dreamContext.title}
- What happened: ${dreamContext.transcription}
- Summary: ${dreamContext.summary}
- Interpretation: ${dreamContext.interpretation ?? 'Not yet interpreted'}

`
    : `You are a thoughtful dream analyst. Be warm, insightful, and concise.${langNote}\n\n`;

  const history = conversationHistory
    .map((m) => `${m.role === 'user' ? 'User' : 'Analyst'}: ${m.content}`)
    .join('\n');

  const prompt = `${systemContext}${history ? `Conversation so far:\n${history}\n\n` : ''}User: ${message}\n\nAnalyst:`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
