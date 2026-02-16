import { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, radius, fontSize as fs, SCREEN_PADDING } from '@/lib/theme';
import { askDream } from '@/lib/ai';
import { useAppStore } from '@/lib/store';
import AskBubble, { TypingIndicator } from '@/components/AskBubble';
import type { ConversationMessage } from '@/types';

const SUGGESTED_QUESTIONS = [
  'What does this dream mean?',
  'Why did I see this symbol?',
  'How does this relate to my life?',
  'What emotion is this dream processing?',
];

export default function AskDreamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;
  const dreams = useAppStore((s) => s.dreams);
  const user = useAppStore((s) => s.user);
  const dream = dreams.find((d) => d.id === id);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !id || isTyping) return;
    const userMsg: ConversationMessage = { role: 'user', content: text.trim(), timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    try {
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const voiceLanguage = user?.voice_language || undefined;
      const response = await askDream(id, text.trim(), history, { title: dream?.title, transcription: dream?.transcription, summary: dream?.summary, interpretation: dream?.interpretation }, voiceLanguage);
      const aiMsg: ConversationMessage = { role: 'assistant', content: response, timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errorMsg: ConversationMessage = { role: 'assistant', content: "I couldn't process that right now. Please try again.", timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, errorMsg]);
    } finally { setIsTyping(false); }
  }, [id, messages, isTyping]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { borderBottomColor: c.borderSubtle }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}><ArrowLeft size={24} color={c.text} strokeWidth={1.5} /></Pressable>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, { color: c.text, fontFamily: theme.fonts.heading }]}>Ask Your Dream</Text>
          {dream && <Text style={[styles.subtitle, { color: c.textTertiary, fontFamily: theme.fonts.body }]} numberOfLines={1}>{dream.title}</Text>}
        </View>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex} keyboardVerticalOffset={8}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => <AskBubble message={item} />}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={[styles.emptyChatText, { color: c.textTertiary, fontFamily: theme.fonts.body }]}>Ask anything about your dream</Text>
              <View style={styles.suggestions}>
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <Pressable key={i} onPress={() => sendMessage(q)} style={({ pressed }) => [styles.suggestionPill, { backgroundColor: c.surface, borderColor: c.border }, pressed && { opacity: 0.7 }]}>
                    <Text style={[styles.suggestionText, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>{q}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
          ListFooterComponent={isTyping ? <TypingIndicator /> : null}
        />
        <View style={[styles.inputBar, { borderTopColor: c.borderSubtle }]}>
          <TextInput
            style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text, fontFamily: theme.fonts.body }]}
            placeholder="Ask about your dream..."
            placeholderTextColor={c.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <Pressable onPress={() => sendMessage(input)} disabled={!input.trim() || isTyping} style={[styles.sendBtn, { backgroundColor: c.accent }, (!input.trim() || isTyping) && { opacity: 0.4 }]}>
            <Send size={18} color={c.bg} strokeWidth={2} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_PADDING, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  headerTitle: { flex: 1, gap: 2 },
  title: { fontSize: fs.body },
  subtitle: { fontSize: fs.tiny },
  messageList: { paddingHorizontal: SCREEN_PADDING, paddingVertical: spacing.md, flexGrow: 1 },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxxl, gap: spacing.lg },
  emptyChatText: { fontSize: fs.body },
  suggestions: { gap: spacing.sm, alignItems: 'center' },
  suggestionPill: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  suggestionText: { fontSize: fs.caption },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: SCREEN_PADDING, paddingVertical: spacing.sm, borderTopWidth: 1, gap: spacing.sm },
  input: { flex: 1, minHeight: 44, maxHeight: 100, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, fontSize: fs.body },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
