import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { format, isToday, isYesterday } from 'date-fns';
import { useTheme } from '@/lib/ThemeContext';
import { getMoodGradient } from '@/lib/dreamAnalysis';
import { spacing, radius, fontSize as fs } from '@/lib/theme';
import type { Dream } from '@/types';
import MoodBadge from './MoodBadge';

interface DreamCardProps { dream: Dream; }

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return `Today at ${format(date, 'h:mm a')}`;
  if (isYesterday(date)) return 'Yesterday';
  const now = new Date();
  if (now.getFullYear() === date.getFullYear()) return format(date, 'MMM d');
  return format(date, 'MMM d, yyyy');
}

export default function DreamCard({ dream }: DreamCardProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;

  const primaryMood = dream.moods[0]?.mood;
  const accentColor = primaryMood ? getMoodGradient(primaryMood)[0] : c.accent;

  return (
    <Pressable
      onPress={() => router.push(`/dream/${dream.id}`)}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: c.card, borderColor: c.border },
        pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
      ]}
    >
      {/* Left mood accent strip */}
      <View style={[styles.accentStrip, { backgroundColor: accentColor }]} />

      <View style={styles.content}>
        <Text
          style={[styles.title, { color: c.text, fontFamily: theme.fonts.heading, letterSpacing: theme.headingStyle.letterSpacing }]}
          numberOfLines={1}
        >
          {dream.title}
        </Text>
        <Text style={[styles.date, { color: c.textTertiary, fontFamily: theme.fonts.caption }]}>
          {formatRelativeDate(dream.created_at)}
        </Text>
        <Text
          style={[styles.preview, { color: c.textSecondary, fontFamily: theme.fonts.body }]}
          numberOfLines={2}
        >
          {dream.summary || dream.transcription}
        </Text>
        {dream.moods.length > 0 && (
          <View style={styles.moods}>
            {dream.moods.slice(0, 3).map((mood, i) => (
              <MoodBadge key={i} mood={mood} compact />
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accentStrip: {
    width: 3,
  },
  content: {
    flex: 1,
    padding: 18,
    gap: 5,
  },
  title: { fontSize: fs.body },
  date: { fontSize: fs.tiny },
  preview: { fontSize: fs.caption, marginTop: 2, lineHeight: fs.caption * 1.45 },
  moods: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm + 2 },
});
