import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FadeInView from '@/components/FadeInView';
import Button from '@/components/Button';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, fontSize as fs, lineHeight, SCREEN_PADDING } from '@/lib/theme';
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
        <FadeInView delay={200} variant="bloom" style={styles.orbArea}>
          <GlowOrb size={160} breathingDuration={4000} />
        </FadeInView>
        <FadeInView delay={400} variant="fade" style={styles.branding}>
          <Text style={[styles.title, { color: c.text, fontFamily: theme.fonts.heading, letterSpacing: theme.headingStyle.letterSpacing }]}>DreamDecode</Text>
          <Text style={[styles.tagline, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>
            Your dreams are trying to tell you something
          </Text>
        </FadeInView>
      </View>
      <FadeInView delay={600} variant="slide" style={styles.buttons}>
        <Button title="Get Started" onPress={() => router.push('/(auth)/sign-up')} />
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
        <Button
          title="I already have an account"
          onPress={() => router.push('/(auth)/sign-in')}
          variant="secondary"
        />
      </FadeInView>
      <AlertModal visible={alertVisible} config={alertConfig} onDismiss={() => setAlertVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SCREEN_PADDING },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  orbArea: { marginBottom: spacing.xxl },
  branding: { alignItems: 'center', gap: spacing.lg },
  title: { fontSize: fs.hero },
  tagline: { fontSize: fs.subhead, textAlign: 'center', lineHeight: fs.subhead * lineHeight.relaxed, maxWidth: 280 },
  buttons: { gap: spacing.md, paddingBottom: spacing.xl },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: fs.caption },
});
