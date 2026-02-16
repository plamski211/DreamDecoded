import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, radius, fontSize as fs } from '@/lib/theme';
import type { MoodTag } from '@/types';

interface MoodBadgeProps { mood: MoodTag; compact?: boolean; }

export default function MoodBadge({ mood, compact = false }: MoodBadgeProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={[
      styles.container,
      { borderColor: c.moodPrimary, borderWidth: 1, backgroundColor: c.accentSubtle },
      compact && styles.compact,
    ]}>
      <Text style={[styles.emoji, compact && styles.emojiCompact]}>{mood.emoji}</Text>
      {!compact && (
        <Text style={[styles.label, { color: c.moodPrimary, fontFamily: theme.fonts.caption }]}>
          {mood.mood}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 1,
    borderRadius: radius.full, gap: spacing.xs,
  },
  compact: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  emoji: { fontSize: 14 },
  emojiCompact: { fontSize: 12 },
  label: { fontSize: fs.tiny, textTransform: 'capitalize' },
});
