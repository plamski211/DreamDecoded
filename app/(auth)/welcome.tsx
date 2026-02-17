import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FadeInView from '@/components/FadeInView';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, radius, fontSize as fs, lineHeight, SCREEN_PADDING } from '@/lib/theme';
import GlowOrb from '@/components/GlowOrb';
import AlertModal, { type AlertConfig } from '@/components/AlertModal';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { isGoogleAuthAvailable, useGoogleAuth, signInWithGoogleIdToken } from '@/lib/googleAuth';

export default function WelcomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { response, promptAsync } = useGoogleAuth();

  const showAlert = (title: string, message: string) => {
    setAlertConfig({ title, message, buttons: [{ text: 'OK', style: 'default' }] });
    setAlertVisible(true);
  };

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params.id_token;
      if (idToken) {
        setGoogleLoading(true);
        signInWithGoogleIdToken(idToken)
          .then(({ error }) => {
            if (error) showAlert('Google Sign-In Failed', error.message);
          })
          .finally(() => setGoogleLoading(false));
      }
    }
  }, [response]);

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
        {isGoogleAuthAvailable && (
          <>
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
              <Text style={[styles.dividerText, { color: c.textTertiary, fontFamily: theme.fonts.body }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
            </View>
            <GoogleSignInButton onPress={() => promptAsync()} loading={googleLoading} />
          </>
        )}
        <Pressable onPress={() => router.push('/(auth)/sign-in')} style={({ pressed }) => [styles.secondaryBtn, { borderColor: c.border }, pressed && { opacity: 0.7 }]}>
          <Text style={[styles.secondaryBtnText, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>I already have an account</Text>
        </Pressable>
      </FadeInView>
      <AlertModal visible={alertVisible} config={alertConfig} onDismiss={() => setAlertVisible(false)} />
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
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: fs.caption },
  secondaryBtn: { height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  secondaryBtnText: { fontSize: fs.body },
});
