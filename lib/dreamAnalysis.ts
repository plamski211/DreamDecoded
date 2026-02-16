import type { ThemeKey } from './theme';
import type { MoodName } from '@/types';

// Mood gradients are fixed across all themes — they represent the emotion itself
const MOOD_GRADIENTS: Record<MoodName, readonly [string, string]> = {
  peaceful: ['#5B8DEF', '#38BDF8'],
  anxious:  ['#F472B6', '#EF4444'],
  joyful:   ['#F4A261', '#FBBF24'],
  confused: ['#C084FC', '#7C5CFC'],
  sad:      ['#5B8DEF', '#6366F1'],
  excited:  ['#F4A261', '#F472B6'],
  fearful:  ['#EF4444', '#7C3AED'],
  neutral:  ['#6B7280', '#9CA3AF'],
};

const MOOD_EMOJI: Record<MoodName, string> = {
  peaceful: '\u{1F60C}',
  anxious:  '\u{1F630}',
  joyful:   '\u{1F60A}',
  confused: '\u{1F914}',
  sad:      '\u{1F622}',
  excited:  '\u{1F929}',
  fearful:  '\u{1F628}',
  neutral:  '\u{1F610}',
};

export const MOOD_CONFIG: Record<
  MoodName,
  { emoji: string; gradient: readonly [string, string] }
> = Object.fromEntries(
  (Object.keys(MOOD_GRADIENTS) as MoodName[]).map((m) => [
    m,
    { emoji: MOOD_EMOJI[m], gradient: MOOD_GRADIENTS[m] },
  ])
) as any;

export function getMoodGradient(mood: string): readonly [string, string] {
  const key = mood.toLowerCase() as MoodName;
  return MOOD_GRADIENTS[key] ?? MOOD_GRADIENTS.neutral;
}

export function getMoodEmoji(mood: string): string {
  const key = mood.toLowerCase() as MoodName;
  return MOOD_EMOJI[key] ?? MOOD_EMOJI.neutral;
}

/**
 * Theme-aware greeting.
 */
export function getGreeting(themeKey: ThemeKey, userName?: string): string {
  const hour = new Date().getHours();

  const greetings: Record<ThemeKey, Record<string, string>> = {
    void: {
      morning:   userName ? `${userName}.` : 'Good morning.',
      afternoon: userName ? `${userName}.` : 'Afternoon.',
      evening:   userName ? `${userName}.` : 'Evening.',
      night:     "Can't sleep?",
    },
    ink: {
      morning:   'What did you dream?',
      afternoon: 'Close your eyes and remember.',
      evening:   'The dreams are waiting.',
      night:     'Tell me what you saw.',
    },
    dusk: {
      morning:   userName ? `Morning, ${userName}` : 'Good morning',
      afternoon: 'Afternoon, dreamer',
      evening:   'Evening, dreamer',
      night:     'The night is listening',
    },
    frost: {
      morning:   'Good morning',
      afternoon: 'Good afternoon',
      evening:   'Good evening',
      night:     'Still awake?',
    },
  };

  const period =
    hour >= 5 && hour < 12 ? 'morning' :
    hour >= 12 && hour < 17 ? 'afternoon' :
    hour >= 17 && hour < 21 ? 'evening' :
    'night';

  return greetings[themeKey][period];
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
