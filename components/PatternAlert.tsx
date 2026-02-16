import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, radius, fontSize as fs, lineHeight } from '@/lib/theme';
import type { PatternAlert as PatternAlertType } from '@/types';

interface PatternAlertProps { alert: PatternAlertType; }

export default function PatternAlertCard({ alert }: PatternAlertProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={[styles.container, { backgroundColor: c.accentSubtle }]}>
      <View style={[styles.leftBorder, { backgroundColor: c.accent }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <AlertCircle size={16} color={c.accent} strokeWidth={2} />
          <Text style={[styles.title, { color: c.text, fontFamily: theme.fonts.heading }]}>{alert.title}</Text>
        </View>
        <Text style={[styles.description, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>
          {alert.description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', borderRadius: radius.md, overflow: 'hidden' },
  leftBorder: { width: 3 },
  content: { flex: 1, padding: spacing.md, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: fs.caption },
  description: { fontSize: fs.caption, lineHeight: fs.caption * lineHeight.normal },
});
