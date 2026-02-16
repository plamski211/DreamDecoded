import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, radius, fontSize as fs, lineHeight, SCREEN_PADDING } from '@/lib/theme';

export default function SignUpScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const showError = (title: string, msg: string) => {
    if (Platform.OS === 'web') { window.alert(`${title}\n\n${msg}`); } else { Alert.alert(title, msg); }
  };

  const handleSignUp = async () => {
    if (!name || !email || !password) { showError('Error', 'Please fill in all fields'); return; }
    if (password.length < 8) { showError('Error', 'Password must be at least 8 characters'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    setLoading(false);
    if (error) showError('Sign Up Failed', error.message);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color={c.text} strokeWidth={1.5} />
          </Pressable>
          <View style={styles.content}>
            <Text style={[styles.title, { color: c.text, fontFamily: theme.fonts.heading }]}>Create account</Text>
            <Text style={[styles.subtitle, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>Start your dream journal today</Text>
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>Name</Text>
                <TextInput style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text, fontFamily: theme.fonts.body }]} placeholder="Your name" placeholderTextColor={c.textTertiary} autoCapitalize="words" autoComplete="name" value={name} onChangeText={setName} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>Email</Text>
                <TextInput style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text, fontFamily: theme.fonts.body }]} placeholder="your@email.com" placeholderTextColor={c.textTertiary} keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={email} onChangeText={setEmail} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>Password</Text>
                <TextInput style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text, fontFamily: theme.fonts.body }]} placeholder="At least 8 characters" placeholderTextColor={c.textTertiary} secureTextEntry autoComplete="new-password" value={password} onChangeText={setPassword} />
              </View>
            </View>
            <Pressable onPress={handleSignUp} disabled={loading} style={({ pressed }) => [pressed && { opacity: 0.8 }]}>
              <View style={[styles.signUpBtn, { backgroundColor: c.accent }, loading && { opacity: 0.6 }]}>
                <Text style={[styles.signUpBtnText, { color: c.bg, fontFamily: theme.fonts.heading }]}>{loading ? 'Creating account...' : 'Create Account'}</Text>
              </View>
            </Pressable>
            <Text style={[styles.terms, { color: c.textTertiary, fontFamily: theme.fonts.body }]}>By creating an account, you agree to our Terms of Service and Privacy Policy</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SCREEN_PADDING },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  content: { flex: 1, paddingTop: spacing.xl, gap: spacing.lg },
  title: { fontSize: fs.title },
  subtitle: { fontSize: fs.body, marginTop: -spacing.sm },
  form: { gap: spacing.md, marginTop: spacing.md },
  inputGroup: { gap: spacing.xs },
  label: { fontSize: fs.caption },
  input: { height: 52, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, fontSize: fs.body },
  signUpBtn: { height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  signUpBtnText: { fontSize: fs.body },
  terms: { fontSize: fs.tiny, textAlign: 'center', lineHeight: fs.tiny * lineHeight.relaxed },
});
