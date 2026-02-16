export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  streak_current: number;
  streak_longest: number;
  last_dream_date: string | null;
  subscription_tier: 'free' | 'premium';
  interpretation_style: 'jungian' | 'modern' | 'spiritual' | 'mixed';
  reminder_time: string;
  onboarding_completed: boolean;
}

export interface MoodTag {
  mood: string;
  confidence: number;
  emoji: string;
  gradient: readonly [string, string];
}

export interface DreamSymbol {
  name: string;
  emoji: string;
  occurrence_count: number;
  first_seen: string;
  meaning_short: string;
  meaning_full: string;
}

export interface Dream {
  id: string;
  user_id: string;
  created_at: string;
  title: string;
  transcription: string;
  summary: string;
  audio_url: string;
  audio_duration_seconds: number;
  moods: MoodTag[];
  symbols: DreamSymbol[];
  interpretation: string | null;
  art_url: string | null;
  art_style: string | null;
  is_premium_content: boolean;
}

export interface DreamConversation {
  id: string;
  dream_id: string;
  messages: ConversationMessage[];
  created_at: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface WeeklyReport {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  dream_count: number;
  dominant_mood: MoodTag;
  recurring_symbols: DreamSymbol[];
  ai_summary: string;
  dream_health_score: number;
  shareable_image_url: string | null;
}

export interface PatternAlert {
  id: string;
  user_id: string;
  type: 'recurring_symbol' | 'mood_shift' | 'frequency_change' | 'new_pattern';
  title: string;
  description: string;
  related_dream_ids: string[];
  created_at: string;
  is_read: boolean;
}

export type MoodName =
  | 'peaceful'
  | 'anxious'
  | 'joyful'
  | 'confused'
  | 'sad'
  | 'excited'
  | 'fearful'
  | 'neutral';
