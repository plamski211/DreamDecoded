import { View, Text, StyleSheet } from 'react-native';
import { Moon } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, radius, fontSize as fs, lineHeight } from '@/lib/theme';
import type { ConversationMessage } from '@/types';

interface AskBubbleProps { message: ConversationMessage; }

export default function AskBubble({ message }: AskBubbleProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={[styles.userBubble, { backgroundColor: c.accent }]}>
          <Text style={[styles.userText, { color: c.bg, fontFamily: theme.fonts.body }]}>{message.content}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.aiRow}>
      <View style={[styles.avatar, { backgroundColor: c.card, borderColor: c.border }]}>
        <Moon size={14} color={c.accent} strokeWidth={2} />
      </View>
      <View style={[styles.aiBubble, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.aiText, { color: c.text, fontFamily: theme.fonts.body }]}>{message.content}</Text>
      </View>
    </View>
  );
}

export function TypingIndicator() {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={styles.aiRow}>
      <View style={[styles.avatar, { backgroundColor: c.card, borderColor: c.border }]}>
        <Moon size={14} color={c.accent} strokeWidth={2} />
      </View>
      <View style={[styles.aiBubble, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.dotsRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.typingDot, { backgroundColor: c.textTertiary }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.sm },
  userBubble: { maxWidth: '80%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderRadius: radius.lg, borderBottomRightRadius: spacing.xs },
  userText: { fontSize: fs.body, lineHeight: fs.body * lineHeight.normal },
  aiRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.sm },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  aiBubble: { maxWidth: '75%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderRadius: radius.lg, borderBottomLeftRadius: spacing.xs, borderWidth: 1 },
  aiText: { fontSize: fs.body, lineHeight: fs.body * lineHeight.normal },
  dotsRow: { flexDirection: 'row', gap: 4, paddingVertical: 4 },
  typingDot: { width: 6, height: 6, borderRadius: 3 },
});
