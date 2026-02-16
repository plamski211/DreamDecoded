import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FadeInView from '@/components/FadeInView';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, radius, fontSize as fs, lineHeight, SCREEN_PADDING } from '@/lib/theme';
import GlowOrb from '@/components/GlowOrb';

export default function WelcomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={styles.content}>
        <FadeInView delay={200} style={styles.orbArea}>
          <GlowOrb size={160} breathingDuration={4000} />
        </FadeInView>
        <FadeInView delay={400} style={styles.branding}>
          <Text style={[styles.title, { color: c.text, fontFamily: theme.fonts.heading, letterSpacing: theme.headingStyle.letterSpacing }]}>DreamDecode</Text>
          <Text style={[styles.tagline, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>
            Your dreams are trying to tell you something
          </Text>
        </FadeInView>
      </View>
      <FadeInView delay={600} style={styles.buttons}>
        <Pressable onPress={() => router.push('/(auth)/sign-up')} style={({ pressed }) => [pressed && { opacity: 0.8 }]}>
          <View style={[styles.primaryBtn, { backgroundColor: c.accent }]}>
            <Text style={[styles.primaryBtnText, { color: c.bg, fontFamily: theme.fonts.heading }]}>Get Started</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => router.push('/(auth)/sign-in')} style={({ pressed }) => [styles.secondaryBtn, { borderColor: c.border }, pressed && { opacity: 0.7 }]}>
          <Text style={[styles.secondaryBtnText, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>I already have an account</Text>
        </Pressable>
      </FadeInView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SCREEN_PADDING },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  orbArea: { marginBottom: spacing.xxl },
  branding: { alignItems: 'center', gap: spacing.md },
  title: { fontSize: fs.hero },
  tagline: { fontSize: fs.subhead, textAlign: 'center', lineHeight: fs.subhead * lineHeight.relaxed, maxWidth: 280 },
  buttons: { gap: spacing.md, paddingBottom: spacing.xl },
  primaryBtn: { height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { fontSize: fs.body },
  secondaryBtn: { height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  secondaryBtnText: { fontSize: fs.body },
});
