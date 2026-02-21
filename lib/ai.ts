import { supabase } from '@/lib/supabase';
import type { Dream, MoodTag, DreamSymbol } from '@/types';

interface DreamAnalysis {
  transcription: string;
  title: string;
  summary: string;
  moods: MoodTag[];
  symbols: Omit<DreamSymbol, 'occurrence_count' | 'first_seen' | 'meaning_full'>[];
  interpretation: string;
}

/**
 * Converts any raw/technical error message into something safe to show a user.
 * Messages already written for users (from our edge functions) pass through unchanged.
 */
function friendlyError(raw: string | undefined): string {
  if (!raw) return 'Something went wrong. Please try again.';
  const lower = raw.toLowerCase();
  // Network / connectivity issues
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('network request failed')) {
    return 'Connection issue. Please check your internet and try again.';
  }
  // Supabase client wrapper message — the real detail was already extracted separately
  if (lower.includes('non-2xx') || lower.includes('edge function')) {
    return 'Something went wrong. Please try again.';
  }
  // Any residual quota / auth leak that somehow bypassed the edge function sanitizer
  if (lower.includes('quota') || lower.includes('rate limit') || lower.includes('resource has been exhausted')) {
    return "We're receiving a lot of requests right now. Please wait a moment and try again.";
  }
  if (lower.includes('api key') || lower.includes('invalid key') || lower.includes('unauthorized')) {
    return 'Our service is temporarily unavailable. Please try again later.';
  }
  // Return the message as-is — it was written by us and is already user-friendly
  return raw;
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
 * Full dream processing pipeline — routes audio through a Supabase Edge Function
 * so the Gemini API key is never exposed in the client bundle.
 */
export async function processDream(
  audioUri: string,
  userId: string,
  interpretationStyle: string,
  recurringSymbols: string[],
  isPremium: boolean,
  voiceLanguage?: string
): Promise<Partial<Dream>> {
  const response = await fetch(audioUri);
  const blob = await response.blob();
  const audioBase64 = await blobToBase64(blob);
  const mimeType = blob.type || 'audio/webm';

  const { data, error } = await supabase.functions.invoke('process-dream', {
    body: {
      audioBase64,
      mimeType,
      interpretationStyle,
      recurringSymbols,
      voiceLanguage,
    },
  });

  if (error) {
    // Try to extract the real error body from the FunctionsHttpError context
    let detail = data?.error ?? data?.message;
    if (!detail && (error as any).context) {
      try {
        const body = await (error as any).context.json();
        detail = body?.error ?? body?.message;
      } catch {}
    }
    throw new Error(friendlyError(detail || error.message));
  }

  if (data?.error) {
    throw new Error(friendlyError(data.error));
  }

  const analysis = data as DreamAnalysis;

  if (!analysis.transcription?.trim()) {
    throw new Error('No speech was detected in the recording. Please try again and speak clearly.');
  }

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
 * "Ask Your Dream" — routes through a Supabase Edge Function
 * so the Gemini API key is never exposed in the client bundle.
 */
export async function askDream(
  _dreamId: string,
  message: string,
  conversationHistory: { role: string; content: string }[],
  dreamContext?: {
    title?: string;
    transcription?: string;
    summary?: string;
    interpretation?: string | null;
  },
  voiceLanguage?: string
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ask-dream', {
    body: {
      message,
      conversation_history: conversationHistory,
      dream_context: dreamContext,
      voice_language: voiceLanguage,
    },
  });

  if (error) {
    let detail = data?.error ?? data?.message;
    if (!detail && (error as any).context) {
      try {
        const body = await (error as any).context.json();
        detail = body?.error ?? body?.message;
      } catch {}
    }
    throw new Error(friendlyError(detail || error.message));
  }

  if (data?.error) {
    throw new Error(friendlyError(data.error));
  }

  return data?.response ?? '';
}
