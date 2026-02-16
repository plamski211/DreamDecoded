import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Sparkles } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, radius, fontSize as fs } from '@/lib/theme';

interface DreamArtCardProps { artUrl: string | null; onGenerate?: () => void; isPremium?: boolean; }

export default function DreamArtCard({ artUrl, onGenerate, isPremium }: DreamArtCardProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  if (artUrl) {
    return (
      <View style={[styles.container, { borderColor: c.border }]}>
        <Image source={{ uri: artUrl }} style={styles.image} contentFit="cover" transition={300} />
      </View>
    );
  }

  return (
    <View style={[styles.placeholder, { backgroundColor: c.card, borderColor: c.border }]}>
      <Sparkles size={32} color={c.accent} strokeWidth={1.5} />
      <Text style={[styles.placeholderText, { color: c.textTertiary, fontFamily: theme.fonts.heading }]}>Dream Art</Text>
      {onGenerate && (
        <Pressable onPress={onGenerate} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
          <View style={[styles.generateBtn, { backgroundColor: c.accent }]}>
            <Sparkles size={14} color={c.bg} strokeWidth={2} />
            <Text style={[styles.generateText, { color: c.bg, fontFamily: theme.fonts.caption }]}>
              {isPremium ? 'Generate Dream Art' : 'Premium Feature'}
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 240, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1 },
  image: { width: '100%', height: '100%' },
  placeholder: { height: 240, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, gap: spacing.sm },
  placeholderText: { fontSize: fs.subhead },
  generateBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderRadius: radius.full, marginTop: spacing.sm },
  generateText: { fontSize: fs.caption },
});
