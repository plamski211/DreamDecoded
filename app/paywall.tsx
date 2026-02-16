import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Mic, Brain, Palette, MessageCircle, TrendingUp, FileText } from 'lucide-react-native';
import FadeInView from '@/components/FadeInView';
import { purchasePackage, restorePurchases } from '@/lib/subscription';
import { useAppStore } from '@/lib/store';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, radius, fontSize as fs, SCREEN_PADDING } from '@/lib/theme';

const FEATURES = [
  { icon: Mic, label: 'Unlimited dream recordings' },
  { icon: Brain, label: 'Deep AI interpretations' },
  { icon: Palette, label: 'AI-generated dream art' },
  { icon: MessageCircle, label: 'Ask Your Dream conversations' },
  { icon: TrendingUp, label: 'Pattern detection & alerts' },
  { icon: FileText, label: 'Weekly dream reports' },
];

type Plan = 'monthly' | 'annual';

export default function PaywallScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;
  const setIsPremium = useAppStore((s) => s.setIsPremium);
  const [selectedPlan, setSelectedPlan] = useState<Plan>('annual');
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const packageId = selectedPlan === 'annual' ? 'annual' : 'monthly';
      const success = await purchasePackage(packageId);
      if (success) { setIsPremium(true); router.back(); }
    } catch { Alert.alert('Error', 'Purchase failed. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const success = await restorePurchases();
      if (success) { setIsPremium(true); router.back(); }
      else { Alert.alert('No Purchases Found', 'We could not find any previous purchases.'); }
    } catch { Alert.alert('Error', 'Could not restore purchases.'); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <Pressable onPress={() => router.back()} style={styles.closeBtn}><X size={24} color={c.textSecondary} strokeWidth={1.5} /></Pressable>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FadeInView delay={100} style={styles.titleArea}>
          <View style={[styles.titleBadge, { backgroundColor: c.accent }]}>
            <Text style={[styles.titleText, { color: c.bg, fontFamily: theme.fonts.heading }]}>DreamDecode Premium</Text>
          </View>
          <Text style={[styles.subtitle, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>Unlock the full power of your dream journal</Text>
        </FadeInView>

        <FadeInView delay={200} style={styles.featureList}>
          {FEATURES.map(({ icon: Icon, label }, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: c.accentMuted }]}><Icon size={18} color={c.accent} strokeWidth={1.5} /></View>
              <Text style={[styles.featureLabel, { color: c.text, fontFamily: theme.fonts.body }]}>{label}</Text>
            </View>
          ))}
        </FadeInView>

        <FadeInView delay={300} style={styles.plans}>
          <Pressable onPress={() => setSelectedPlan('annual')} style={[styles.planCard, { borderColor: c.border, backgroundColor: c.surface }, selectedPlan === 'annual' && { borderColor: c.accent }]}>
            {selectedPlan === 'annual' && <View style={[styles.saveBadge, { backgroundColor: c.streak }]}><Text style={[styles.saveText, { color: c.bg, fontFamily: theme.fonts.body }]}>SAVE 40%</Text></View>}
            <View style={styles.planInfo}>
              <Text style={[styles.planName, { color: c.text, fontFamily: theme.fonts.heading }]}>Annual</Text>
              <Text style={[styles.planPrice, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>$49.99/year</Text>
              <Text style={[styles.planPer, { color: c.textTertiary, fontFamily: theme.fonts.body }]}>$4.17/month</Text>
            </View>
            <View style={[styles.radioOuter, { borderColor: c.textTertiary }, selectedPlan === 'annual' && { borderColor: c.accent }]}>
              {selectedPlan === 'annual' && <View style={[styles.radioInner, { backgroundColor: c.accent }]} />}
            </View>
          </Pressable>
          <Pressable onPress={() => setSelectedPlan('monthly')} style={[styles.planCard, { borderColor: c.border, backgroundColor: c.surface }, selectedPlan === 'monthly' && { borderColor: c.accent }]}>
            <View style={styles.planInfo}>
              <Text style={[styles.planName, { color: c.text, fontFamily: theme.fonts.heading }]}>Monthly</Text>
              <Text style={[styles.planPrice, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>$6.99/month</Text>
            </View>
            <View style={[styles.radioOuter, { borderColor: c.textTertiary }, selectedPlan === 'monthly' && { borderColor: c.accent }]}>
              {selectedPlan === 'monthly' && <View style={[styles.radioInner, { backgroundColor: c.accent }]} />}
            </View>
          </Pressable>
        </FadeInView>

        <FadeInView delay={400} style={styles.ctaArea}>
          <Pressable onPress={handlePurchase} disabled={loading} style={({ pressed }) => [pressed && { opacity: 0.8 }]}>
            <View style={[styles.ctaBtn, { backgroundColor: c.accent }, loading && { opacity: 0.6 }]}>
              <Text style={[styles.ctaText, { color: c.bg, fontFamily: theme.fonts.heading }]}>{loading ? 'Processing...' : 'Start Free Trial — 7 days free'}</Text>
            </View>
          </Pressable>
          <Pressable onPress={handleRestore} disabled={loading}><Text style={[styles.restoreText, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>Restore Purchases</Text></Pressable>
          <Text style={[styles.legalText, { color: c.textTertiary, fontFamily: theme.fonts.body }]}>Cancel anytime. Terms of Service · Privacy Policy</Text>
        </FadeInView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  closeBtn: { position: 'absolute', top: 60, right: SCREEN_PADDING, zIndex: 10, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: SCREEN_PADDING, paddingTop: spacing.xxxl, paddingBottom: spacing.xxxl },
  titleArea: { alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  titleBadge: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md },
  titleText: { fontSize: fs.heading },
  subtitle: { fontSize: fs.body, textAlign: 'center' },
  featureList: { gap: spacing.md, marginBottom: spacing.xl },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  featureLabel: { fontSize: fs.body },
  plans: { gap: spacing.md, marginBottom: spacing.xl },
  planCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.lg, borderWidth: 1.5 },
  saveBadge: { position: 'absolute', top: -10, right: spacing.md, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  saveText: { fontSize: fs.micro, fontWeight: '700' },
  planInfo: { flex: 1, gap: 2 },
  planName: { fontSize: fs.body },
  planPrice: { fontSize: fs.caption },
  planPer: { fontSize: fs.tiny },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  ctaArea: { gap: spacing.md, alignItems: 'center' },
  ctaBtn: { height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', width: '100%' },
  ctaText: { fontSize: fs.body },
  restoreText: { fontSize: fs.caption },
  legalText: { fontSize: fs.tiny, textAlign: 'center', marginTop: spacing.sm },
});
