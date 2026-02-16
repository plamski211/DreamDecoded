import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, radius, fontSize as fs, SCREEN_PADDING } from '@/lib/theme';

export default function SignInScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const showError = (title: string, msg: string) => {
    if (Platform.OS === 'web') { window.alert(`${title}\n\n${msg}`); } else { Alert.alert(title, msg); }
  };

  const handleSignIn = async () => {
    if (!email || !password) { showError('Error', 'Please fill in all fields'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) showError('Sign In Failed', error.message);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={c.text} strokeWidth={1.5} />
        </Pressable>
        <View style={styles.content}>
          <Text style={[styles.title, { color: c.text, fontFamily: theme.fonts.heading }]}>Welcome back</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>Sign in to continue your dream journal</Text>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>Email</Text>
              <TextInput style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text, fontFamily: theme.fonts.body }]} placeholder="your@email.com" placeholderTextColor={c.textTertiary} keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={email} onChangeText={setEmail} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>Password</Text>
              <TextInput style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text, fontFamily: theme.fonts.body }]} placeholder="Your password" placeholderTextColor={c.textTertiary} secureTextEntry autoComplete="password" value={password} onChangeText={setPassword} />
            </View>
          </View>
          <Pressable onPress={handleSignIn} disabled={loading} style={({ pressed }) => [pressed && { opacity: 0.8 }]}>
            <View style={[styles.signInBtn, { backgroundColor: c.accent }, loading && { opacity: 0.6 }]}>
              <Text style={[styles.signInBtnText, { color: c.bg, fontFamily: theme.fonts.heading }]}>{loading ? 'Signing in...' : 'Sign In'}</Text>
            </View>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SCREEN_PADDING },
  flex: { flex: 1 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  content: { flex: 1, paddingTop: spacing.xl, gap: spacing.lg },
  title: { fontSize: fs.title },
  subtitle: { fontSize: fs.body, marginTop: -spacing.sm },
  form: { gap: spacing.md, marginTop: spacing.md },
  inputGroup: { gap: spacing.xs },
  label: { fontSize: fs.caption },
  input: { height: 52, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, fontSize: fs.body },
  signInBtn: { height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  signInBtnText: { fontSize: fs.body },
});
