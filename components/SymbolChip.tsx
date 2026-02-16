import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, radius, fontSize as fs } from '@/lib/theme';
import type { DreamSymbol } from '@/types';

interface SymbolChipProps { symbol: DreamSymbol; highlighted?: boolean; }

export default function SymbolChip({ symbol, highlighted = false }: SymbolChipProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={[
      styles.container,
      { backgroundColor: c.accentSubtle, borderColor: c.border },
      highlighted && { borderColor: c.streak, backgroundColor: c.accentMuted },
    ]}>
      <Text style={styles.emoji}>{symbol.emoji}</Text>
      <Text style={[styles.name, { color: c.text, fontFamily: theme.fonts.caption }]}>{symbol.name}</Text>
      {symbol.occurrence_count > 1 && (
        <View style={[styles.countBadge, { backgroundColor: c.accent }]}>
          <Text style={[styles.count, { color: c.bg, fontFamily: theme.fonts.caption }]}>{symbol.occurrence_count}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 2,
    borderRadius: radius.full, gap: spacing.xs, borderWidth: 1,
  },
  emoji: { fontSize: 14 },
  name: { fontSize: fs.tiny, textTransform: 'capitalize' },
  countBadge: { borderRadius: radius.full, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  count: { fontSize: fs.micro },
});
