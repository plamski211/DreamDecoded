import { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Brain, Clock, Globe, Download, Shield, CreditCard, HelpCircle, Info, ChevronRight, LogOut, Flame, Trophy, Moon, Check } from 'lucide-react-native';
import FadeInView from '@/components/FadeInView';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { savePreference, loadPreference } from '@/lib/storage';
import { requestNotificationPermission, scheduleMorningReminder, cancelMorningReminder, getNotificationStatus } from '@/lib/notifications';
import { useTheme } from '@/lib/ThemeContext';
import { themes, spacing, radius, fontSize as fs, SCREEN_PADDING } from '@/lib/theme';
import type { ThemeKey } from '@/lib/theme';
import AlertModal, { type AlertConfig } from '@/components/AlertModal';

type SettingKey = 'notifications' | 'style' | 'reminder' | 'language' | 'export' | 'privacy' | 'subscription' | 'help' | 'about';

const PREFERENCES_SETTINGS: { icon: any; label: string; key: SettingKey }[] = [
  { icon: Bell, label: 'Notifications', key: 'notifications' },
  { icon: Brain, label: 'Interpretation Style', key: 'style' },
  { icon: Clock, label: 'Morning Reminder', key: 'reminder' },
  { icon: Globe, label: 'Voice Language', key: 'language' },
];

const DATA_SETTINGS: { icon: any; label: string; key: SettingKey }[] = [
  { icon: Download, label: 'Export Data', key: 'export' },
  { icon: Shield, label: 'Privacy', key: 'privacy' },
];

const SUPPORT_SETTINGS: { icon: any; label: string; key: SettingKey }[] = [
  { icon: CreditCard, label: 'Manage Subscription', key: 'subscription' },
  { icon: HelpCircle, label: 'Help & Support', key: 'help' },
  { icon: Info, label: 'About', key: 'about' },
];

const THEME_OPTIONS: { key: ThemeKey; name: string }[] = [
  { key: 'void', name: 'Void' },
  { key: 'ink', name: 'Ink' },
  { key: 'dusk', name: 'Dusk' },
  { key: 'frost', name: 'Frost' },
];

function formatReminderTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${(m ?? 0).toString().padStart(2, '0')} ${ampm}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ProfileScreen() {
  const { theme, themeKey, setTheme } = useTheme();
  const c = theme.colors;
  const user = useAppStore((s) => s.user);
  const dreams = useAppStore((s) => s.dreams);
  const setSession = useAppStore((s) => s.setSession);
  const setUser = useAppStore((s) => s.setUser);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);
  const showAlert = useCallback((config: AlertConfig) => { setAlertConfig(config); setAlertVisible(true); }, []);

  const [notifStatus, setNotifStatus] = useState<string>('');
  const [voiceLanguage, setVoiceLanguage] = useState<string>('English');

  useEffect(() => {
    getNotificationStatus().then((status) => setNotifStatus(status === 'granted' ? 'On' : 'Off')).catch(() => setNotifStatus('Off'));
    loadPreference('voice_language').then((lang) => { if (lang) setVoiceLanguage(capitalize(lang)); }).catch(() => {});
  }, []);

  const initials = (user?.name ?? 'D').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  const memberSince = user?.created_at ? format(new Date(user.created_at), 'MMMM yyyy') : '';

  const handleSignOut = () => {
    showAlert({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: async () => { try { await supabase.auth.signOut(); } catch {} setSession(null); setUser(null); } },
      ],
    });
  };

  const getSettingValue = (key: SettingKey): string | null => {
    switch (key) {
      case 'style': return capitalize(user?.interpretation_style ?? 'mixed');
      case 'notifications': return notifStatus || null;
      case 'reminder': return user?.reminder_time ? formatReminderTime(user.reminder_time) : null;
      case 'language': return voiceLanguage;
      case 'export': return dreams.length > 0 ? `${dreams.length} dream${dreams.length !== 1 ? 's' : ''}` : null;
      default: return null;
    }
  };

  const handleSetting = useCallback((key: SettingKey) => {
    switch (key) {
      case 'style': {
        const styleOptions = ['Jungian', 'Modern', 'Spiritual', 'Mixed'] as const;
        showAlert({ title: 'Interpretation Style', message: 'Choose how your dreams are interpreted', buttons: [...styleOptions.map((label) => ({ text: label + (user?.interpretation_style === label.toLowerCase() ? ' (current)' : ''), onPress: () => { const style = label.toLowerCase(); if (user) { setUser({ ...user, interpretation_style: style as any }); savePreference('interpretation_style', style).catch(() => {}); } } })), { text: 'Cancel', style: 'cancel' as const }] });
        break;
      }
      case 'notifications': {
        if (Platform.OS === 'web') { showAlert({ title: 'Notifications', message: 'Push notifications are available on iOS and Android.', buttons: [{ text: 'OK' }] }); return; }
        (async () => { const granted = await requestNotificationPermission(); setNotifStatus(granted ? 'On' : 'Off'); showAlert({ title: 'Notifications', message: granted ? "Notifications are enabled." : 'Notifications are disabled. Enable them in your device settings.', buttons: granted ? [{ text: 'OK' }] : [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openURL('app-settings:') }] }); })();
        break;
      }
      case 'reminder': {
        if (Platform.OS === 'web') { showAlert({ title: 'Morning Reminder', message: 'Push notifications for reminders are available on iOS and Android.', buttons: [{ text: 'OK' }] }); return; }
        const times = [{ label: '6:00 AM', hour: 6, minute: 0 }, { label: '7:00 AM', hour: 7, minute: 0 }, { label: '8:00 AM', hour: 8, minute: 0 }, { label: '9:00 AM', hour: 9, minute: 0 }];
        showAlert({ title: 'Morning Reminder', message: `Current: ${user?.reminder_time ? formatReminderTime(user.reminder_time) : 'Not set'}`, buttons: [...times.map(({ label, hour, minute }) => ({ text: label, onPress: async () => { try { const granted = await requestNotificationPermission(); if (!granted) { showAlert({ title: 'Permission Required', message: 'Enable notifications to set a reminder.', buttons: [{ text: 'OK' }] }); return; } await scheduleMorningReminder(hour, minute); const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`; if (user) { setUser({ ...user, reminder_time: timeStr }); savePreference('reminder_time', timeStr).catch(() => {}); } } catch { showAlert({ title: 'Error', message: 'Could not schedule reminder.', buttons: [{ text: 'OK' }] }); } } })), { text: 'Turn Off', style: 'destructive' as const, onPress: async () => { await cancelMorningReminder(); if (user) setUser({ ...user, reminder_time: '' }); savePreference('reminder_time', '').catch(() => {}); } }, { text: 'Cancel', style: 'cancel' as const }] });
        break;
      }
      case 'language': {
        const languages = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Japanese', 'Korean', 'Chinese'];
        showAlert({ title: 'Voice Language', message: `Current: ${voiceLanguage}`, buttons: [...languages.map((lang) => ({ text: lang + (voiceLanguage === lang ? ' (current)' : ''), onPress: () => { setVoiceLanguage(lang); savePreference('voice_language', lang.toLowerCase()).catch(() => {}); } })), { text: 'Cancel', style: 'cancel' as const }] });
        break;
      }
      case 'export': {
        if (dreams.length === 0) { showAlert({ title: 'No Data', message: 'Record some dreams first to export.', buttons: [{ text: 'OK' }] }); return; }
        const dreamData = JSON.stringify(dreams, null, 2);
        if (Platform.OS === 'web') {
          showAlert({ title: 'Export Data', message: `Export ${dreams.length} dream${dreams.length !== 1 ? 's' : ''} as JSON?`, buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Download', onPress: () => { try { const blob = new Blob([dreamData], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'dreamdecode-export.json'; a.click(); URL.revokeObjectURL(url); } catch {} } }] });
        } else {
          showAlert({ title: 'Export Data', message: `Export ${dreams.length} dream${dreams.length !== 1 ? 's' : ''} as JSON?`, buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Share', onPress: async () => { try { const { shareAsync, isAvailableAsync } = await import('expo-sharing'); const FileSystem = await import('expo-file-system'); const available = await isAvailableAsync(); if (!available) return; const fileUri = FileSystem.documentDirectory + 'dreamdecode-export.json'; await FileSystem.writeAsStringAsync(fileUri, dreamData); await shareAsync(fileUri, { mimeType: 'application/json' }); } catch {} } }] });
        }
        break;
      }
      case 'privacy': { showAlert({ title: 'Privacy', message: 'Your dreams are stored locally on this device only.\n\nNo data leaves your device except when sent to Google Gemini AI for analysis. Audio recordings are processed in memory and not stored on any server.\n\nYou can delete any dream at any time, and use Export Data to back up or move your data.', buttons: [{ text: 'OK' }] }); break; }
      case 'subscription': { showAlert({ title: 'Subscription', message: 'All features are free during the beta period.\n\nThis includes:\n- Unlimited dream recording & analysis\n- AI interpretations & Ask Your Dream\n- Insights, patterns, and weekly reports\n\nEnjoy!', buttons: [{ text: 'Awesome!' }] }); break; }
      case 'help': { showAlert({ title: 'Help & Support', message: 'Need help with DreamDecode?\n\nTips:\n- Speak clearly when recording dreams\n- Record as soon as you wake up\n- The more details, the better the analysis', buttons: [{ text: 'Cancel', style: 'cancel' as const }, { text: 'Send Feedback', onPress: () => { Linking.openURL('mailto:support@dreamdecode.app?subject=DreamDecode%20Feedback').catch(() => {}); } }] }); break; }
      case 'about': { showAlert({ title: 'About DreamDecode', message: 'DreamDecode v1.0.0\n\nRecord, analyze, and understand your dreams using AI.\n\nBuilt with:\n- Expo & React Native\n- Google Gemini AI\n- SQLite for local storage\n\nMade with love for dreamers everywhere.', buttons: [{ text: 'OK' }] }); break; }
    }
  }, [user, dreams, setUser, voiceLanguage, notifStatus, showAlert]);

  const renderSettingsGroup = (
    title: string,
    settings: { icon: any; label: string; key: SettingKey }[],
  ) => (
    <View style={styles.settingsGroup}>
      <Text style={[
        styles.settingsGroupLabel,
        {
          color: c.textTertiary,
          fontFamily: theme.fonts.caption,
          letterSpacing: theme.labelStyle.letterSpacing,
          textTransform: theme.labelStyle.textTransform,
          fontSize: theme.labelStyle.fontSize,
        },
      ]}>
        {title}
      </Text>
      <View style={[styles.settingsCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        {settings.map(({ icon: Icon, label, key }, i) => {
          const value = getSettingValue(key);
          return (
            <Pressable
              key={key}
              onPress={() => handleSetting(key)}
              style={({ pressed }) => [
                styles.settingRow,
                i < settings.length - 1 && [styles.settingBorder, { borderBottomColor: c.borderSubtle }],
                pressed && { opacity: 0.7 },
              ]}
            >
              <Icon size={20} color={c.textSecondary} strokeWidth={1.5} />
              <Text style={[styles.settingLabel, { color: c.text, fontFamily: theme.fonts.body }]}>{label}</Text>
              {value && <Text style={[styles.settingValue, { color: c.textTertiary, fontFamily: theme.fonts.body }]}>{value}</Text>}
              <ChevronRight size={16} color={c.textTertiary} strokeWidth={1.5} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageTitle, { color: c.text, fontFamily: theme.fonts.heading, letterSpacing: theme.headingStyle.letterSpacing }]}>Profile</Text>

        {/* User Info */}
        <FadeInView delay={100} style={styles.userCard}>
          <View style={[styles.avatarRing, { borderColor: c.accent }]}>
            <View style={[styles.avatar, { backgroundColor: c.accent }]}>
              <Text style={[styles.initials, { color: c.bg, fontFamily: theme.fonts.heading }]}>{initials}</Text>
            </View>
          </View>
          <Text style={[styles.name, { color: c.text, fontFamily: theme.fonts.heading }]}>{user?.name ?? 'Dreamer'}</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>
            {dreams.length > 0 ? `${dreams.length} dream${dreams.length !== 1 ? 's' : ''} decoded` : 'Begin your journey'}
          </Text>
          {memberSince ? <Text style={[styles.memberSince, { color: c.textTertiary, fontFamily: theme.fonts.caption }]}>Dreaming since {memberSince}</Text> : null}
        </FadeInView>

        {/* Stats Row */}
        <FadeInView delay={200}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Flame size={20} color={c.streak} strokeWidth={1.5} />
              <Text style={[styles.statNumber, { color: c.text, fontFamily: theme.fonts.heading }]}>{user?.streak_current ?? 0}</Text>
              <Text style={[styles.statLabel, { color: c.textTertiary, fontFamily: theme.fonts.caption, letterSpacing: theme.labelStyle.letterSpacing, textTransform: theme.labelStyle.textTransform, fontSize: theme.labelStyle.fontSize }]}>Current</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Trophy size={20} color={c.streak} strokeWidth={1.5} />
              <Text style={[styles.statNumber, { color: c.text, fontFamily: theme.fonts.heading }]}>{user?.streak_longest ?? 0}</Text>
              <Text style={[styles.statLabel, { color: c.textTertiary, fontFamily: theme.fonts.caption, letterSpacing: theme.labelStyle.letterSpacing, textTransform: theme.labelStyle.textTransform, fontSize: theme.labelStyle.fontSize }]}>Longest</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Moon size={20} color={c.accent} strokeWidth={1.5} />
              <Text style={[styles.statNumber, { color: c.text, fontFamily: theme.fonts.heading }]}>{dreams.length}</Text>
              <Text style={[styles.statLabel, { color: c.textTertiary, fontFamily: theme.fonts.caption, letterSpacing: theme.labelStyle.letterSpacing, textTransform: theme.labelStyle.textTransform, fontSize: theme.labelStyle.fontSize }]}>Total</Text>
            </View>
          </View>
        </FadeInView>

        {/* Theme Switcher */}
        <FadeInView delay={250} style={styles.themeSwitcher}>
          <Text style={[styles.settingsGroupLabel, { color: c.textTertiary, fontFamily: theme.fonts.caption, letterSpacing: theme.labelStyle.letterSpacing, textTransform: theme.labelStyle.textTransform, fontSize: theme.labelStyle.fontSize }]}>Theme</Text>
          <View style={styles.themeOptions}>
            {THEME_OPTIONS.map((opt) => {
              const t = themes[opt.key];
              const isActive = themeKey === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setTheme(opt.key)}
                  style={[
                    styles.themeCard,
                    { backgroundColor: t.colors.bg, borderColor: isActive ? c.accent : c.border },
                    isActive && { borderWidth: 2 },
                  ]}
                >
                  {/* Accent bar at top */}
                  <View style={[styles.themeAccentBar, { backgroundColor: t.colors.accent }]} />
                  <View style={styles.themeCardContent}>
                    <Text style={[styles.themeName, { color: t.colors.text, fontFamily: theme.fonts.caption }]}>{opt.name}</Text>
                    {isActive && <Check size={14} color={c.accent} strokeWidth={2} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </FadeInView>

        {/* Settings Groups */}
        <FadeInView delay={300}>
          {renderSettingsGroup('Preferences', PREFERENCES_SETTINGS)}
          {renderSettingsGroup('Data & Privacy', DATA_SETTINGS)}
          {renderSettingsGroup('Support', SUPPORT_SETTINGS)}
        </FadeInView>

        {/* Sign Out */}
        <FadeInView delay={400}>
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.signOutBtn,
              { borderColor: c.error },
              pressed && { opacity: 0.7 },
            ]}
          >
            <LogOut size={18} color={c.error} strokeWidth={1.5} />
            <Text style={[styles.signOutText, { color: c.error, fontFamily: theme.fonts.body }]}>Sign Out</Text>
          </Pressable>
        </FadeInView>

        <Text style={[styles.version, { color: c.textTertiary, fontFamily: theme.fonts.body }]}>DreamDecode v1.0.0</Text>
      </ScrollView>

      <AlertModal visible={alertVisible} config={alertConfig} onDismiss={() => setAlertVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: SCREEN_PADDING, paddingBottom: spacing.xxxl },
  pageTitle: { fontSize: fs.heading, paddingTop: spacing.md, marginBottom: spacing.lg },

  // User section
  userCard: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.lg },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: fs.title },
  name: { fontSize: fs.subhead, marginTop: spacing.xs },
  subtitle: { fontSize: fs.caption },
  memberSince: { fontSize: fs.tiny },

  // Stats row
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  statNumber: { fontSize: fs.title },
  statLabel: {},

  // Theme switcher
  themeSwitcher: { marginBottom: spacing.lg },
  themeOptions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  themeCard: {
    flex: 1,
    height: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  themeAccentBar: { height: 4 },
  themeCardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  themeName: { fontSize: fs.tiny },

  // Settings groups
  settingsGroup: { marginBottom: spacing.lg },
  settingsGroupLabel: { marginBottom: spacing.sm },
  settingsCard: { borderRadius: radius.lg, borderWidth: 1 },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md + 2, gap: spacing.md },
  settingBorder: { borderBottomWidth: 1 },
  settingLabel: { flex: 1, fontSize: fs.body },
  settingValue: { fontSize: fs.caption },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  signOutText: { fontSize: fs.body },

  // Version
  version: { fontSize: fs.micro, textAlign: 'center', marginTop: spacing.md },
});
