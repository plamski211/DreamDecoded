import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { spacing, radius, fontSize as fs, lineHeight } from '@/lib/theme';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface AlertConfig {
  title: string;
  message?: string;
  buttons: AlertButton[];
}

interface Props {
  visible: boolean;
  config: AlertConfig | null;
  onDismiss: () => void;
}

export default function AlertModal({ visible, config, onDismiss }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  if (!config) return null;

  const cancelBtn = config.buttons.find((b) => b.style === 'cancel');
  const actionBtns = config.buttons.filter((b) => b.style !== 'cancel');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={[styles.overlay, { backgroundColor: c.overlay }]} onPress={onDismiss}>
        <Pressable style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: c.text, fontFamily: theme.fonts.heading }]}>{config.title}</Text>
          {config.message ? (
            <Text style={[styles.message, { color: c.textSecondary, fontFamily: theme.fonts.body }]}>{config.message}</Text>
          ) : null}

          <ScrollView style={styles.buttonScroll} bounces={false} showsVerticalScrollIndicator={false}>
            {actionBtns.map((btn, i) => (
              <Pressable
                key={i}
                onPress={() => { onDismiss(); btn.onPress?.(); }}
                style={({ pressed }) => [
                  styles.button,
                  i < actionBtns.length - 1 && [styles.buttonBorder, { borderBottomColor: c.borderSubtle }],
                  pressed && { backgroundColor: c.card },
                ]}
              >
                <Text style={[styles.buttonText, { color: c.accent, fontFamily: theme.fonts.body }, btn.style === 'destructive' && { color: c.error }]}>
                  {btn.text}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {cancelBtn && (
            <Pressable
              onPress={() => { onDismiss(); cancelBtn.onPress?.(); }}
              style={({ pressed }) => [
                styles.cancelButton,
                { borderTopColor: c.border, backgroundColor: c.bg },
                pressed && { backgroundColor: c.card },
              ]}
            >
              <Text style={[styles.cancelText, { color: c.textTertiary, fontFamily: theme.fonts.body }]}>{cancelBtn.text}</Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  card: { width: '100%', maxWidth: 340, borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  title: { fontSize: fs.subhead, textAlign: 'center', paddingTop: spacing.lg, paddingHorizontal: spacing.lg },
  message: { fontSize: fs.caption, textAlign: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, lineHeight: fs.caption * lineHeight.normal },
  buttonScroll: { maxHeight: 280 },
  button: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, alignItems: 'center' },
  buttonBorder: { borderBottomWidth: 1 },
  buttonText: { fontSize: fs.body },
  cancelButton: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, alignItems: 'center', borderTopWidth: 1 },
  cancelText: { fontSize: fs.body },
});
