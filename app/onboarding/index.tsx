import { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, FlatList, ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { selectionChanged } from '@/lib/haptics';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, radius, fontSize as fs, lineHeight, SCREEN_PADDING } from '@/lib/theme';
import GlowOrb from '@/components/GlowOrb';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const viewabilityConfig = { viewAreaCoveragePercentThreshold: 50 };
const getItemLayout = (_: unknown, index: number) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index });

const STEPS = [
  { title: 'Your dreams are trying to tell you something', subtitle: 'DreamDecode uses AI to reveal the hidden meanings in your dreams', orbSize: 160 },
  { title: 'Wake up. Tap. Speak.', subtitle: 'Record your dream right when you wake up — while the details are still fresh', orbSize: 140 },
  { title: 'Discover what your subconscious knows', subtitle: 'Track patterns, recurring symbols, and emotional trends over time', orbSize: 150 },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const [currentStep, setCurrentStep] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]) { const newIndex = viewableItems[0].index ?? 0; setCurrentStep(newIndex); selectionChanged(); }
  }).current;

  const handleFinish = async () => {
    if (user) {
      const { error } = await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id);
      if (error) console.warn('Failed to update onboarding status:', error.message);
      setUser({ ...user, onboarding_completed: true });
    }
    router.replace('/(tabs)');
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) { flatListRef.current?.scrollToIndex({ index: currentStep + 1, animated: true }); }
    else { handleFinish(); }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <FlatList
        ref={flatListRef}
        data={STEPS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        renderItem={({ item }) => (
          <View style={styles.step}>
            <View style={styles.orbArea}><GlowOrb size={item.orbSize} breathingDuration={3500} /></View>
            <View style={styles.textArea}>
              <Text style={[styles.stepTitle, { color: c.text, fontFamily: theme.fonts.heading, letterSpacing: theme.headingStyle.letterSpacing }]}>{item.title}</Text>
              <Text style={[styles.stepSubtitle, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>{item.subtitle}</Text>
            </View>
          </View>
        )}
        keyExtractor={(_, i) => i.toString()}
      />
      <View style={styles.footer}>
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: c.textTertiary, opacity: 0.3 }, currentStep === i && { backgroundColor: c.accent, opacity: 1, width: 24 }]} />
          ))}
        </View>
        <Pressable onPress={handleNext} style={({ pressed }) => [pressed && { opacity: 0.8 }]}>
          <View style={[styles.ctaBtn, { backgroundColor: c.accent }]}>
            <Text style={[styles.ctaText, { color: c.bg, fontFamily: theme.fonts.heading }]}>{currentStep === STEPS.length - 1 ? 'Start Dreaming' : 'Continue'}</Text>
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  step: { width: SCREEN_WIDTH, flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SCREEN_PADDING + spacing.md },
  orbArea: { marginBottom: spacing.xxl },
  textArea: { alignItems: 'center', gap: spacing.md },
  stepTitle: { fontSize: fs.title, textAlign: 'center', lineHeight: fs.title * lineHeight.tight },
  stepSubtitle: { fontSize: fs.body, textAlign: 'center', lineHeight: fs.body * lineHeight.relaxed, maxWidth: 300 },
  footer: { paddingHorizontal: SCREEN_PADDING, paddingBottom: spacing.xl, gap: spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  ctaBtn: { height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: fs.body },
});
