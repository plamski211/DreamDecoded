import { useEffect, useRef, useCallback, useState } from 'react';
import { View, Animated, StyleSheet, Pressable, Alert, Linking, Platform, Easing, Text } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { formatDuration } from '@/lib/dreamAnalysis';
import { startRecording, stopRecording, requestMicrophonePermission } from '@/lib/audio';
import { mediumTap, success as hapticSuccess } from '@/lib/haptics';
import { useAppStore } from '@/lib/store';
import GlowOrb from './GlowOrb';
import BreathingRing from './BreathingRing';

interface MorningCircleProps {
  onDreamRecorded?: (result: { uri: string; duration: number }) => void;
}

export default function MorningCircle({ onDreamRecorded }: MorningCircleProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const isRecording = useAppStore((s) => s.isRecording);
  const isProcessing = useAppStore((s) => s.isProcessing);
  const recordingDuration = useAppStore((s) => s.recordingDuration);
  const setRecording = useAppStore((s) => s.setRecording);
  const setRecordingDuration = useAppStore((s) => s.setRecordingDuration);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioLevel = useRef(new Animated.Value(0)).current;

  const orbSize = isRecording ? 280 : isProcessing ? 180 : 220;

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        const current = useAppStore.getState().recordingDuration;
        setRecordingDuration(current + 1);
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  useEffect(() => {
    if (recordingDuration >= 600) handleTap();
  }, [recordingDuration]);

  const handleTap = useCallback(async () => {
    if (isProcessing) return;
    if (!isRecording) {
      await mediumTap();
      try {
        const permissionResult = await requestMicrophonePermission();
        if (permissionResult === 'blocked') {
          if (Platform.OS === 'web') {
            window.alert('Microphone access is blocked. Please allow microphone access in your browser settings and reload the page.');
          } else {
            Alert.alert('Microphone Access Required', 'Please enable microphone access in Settings to record your dreams.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]);
          }
          return;
        }
        if (permissionResult === 'denied') return;
        await startRecording((level) => {
          Animated.timing(audioLevel, { toValue: level, duration: 100, useNativeDriver: true }).start();
        });
        setRecording(true);
        setRecordingDuration(0);
      } catch {
        if (Platform.OS === 'web') {
          window.alert('Microphone access is needed to record your dream. Please allow it and try again.');
        }
      }
    } else {
      await hapticSuccess();
      setRecording(false);
      Animated.timing(audioLevel, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      try {
        const result = await stopRecording();
        if (result && result.duration >= 3) {
          onDreamRecorded?.(result);
        } else if (result) {
          if (Platform.OS === 'web') {
            window.alert('Recording too short. Please speak for at least 3 seconds.');
          } else {
            Alert.alert('Too Short', 'Please record for at least 3 seconds.');
          }
        }
      } catch {}
    }
  }, [isRecording, isProcessing, onDreamRecorded]);

  return (
    <View style={styles.container}>
      {!isProcessing && (
        <BreathingRing
          size={orbSize + 40}
          color={isRecording ? c.error : c.orbRing}
        />
      )}
      <Pressable onPress={handleTap}>
        <GlowOrb
          size={orbSize}
          breathing={!isProcessing}
          breathingDuration={isRecording ? 1500 : undefined}
          audioLevel={isRecording ? audioLevel : undefined}
        />
      </Pressable>
      {isRecording && (
        <FadeView visible style={styles.timerContainer}>
          <Text style={[styles.timer, { color: c.text, fontFamily: theme.fonts.mono }]}>
            {formatDuration(recordingDuration)}
          </Text>
        </FadeView>
      )}
      {isProcessing && <ProcessingDots />}
    </View>
  );
}

function FadeView({ visible, children, style }: { visible: boolean; children: React.ReactNode; style?: any }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: 300, useNativeDriver: true }).start();
  }, [visible]);
  return <Animated.View style={[{ opacity }, style]}>{children}</Animated.View>;
}

function ProcessingDots() {
  const { theme } = useTheme();
  return (
    <View style={styles.dotsContainer}>
      {[0, 1, 2].map((i) => <ProcessingDot key={i} index={i} color={theme.colors.accent} />)}
    </View>
  );
}

function ProcessingDot({ index, color }: { index: number; color: string }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(index * 200),
        Animated.timing(progress, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(progress, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] });

  return <Animated.View style={[styles.dot, { backgroundColor: color, opacity, transform: [{ scale }] }]} />;
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', height: 340 },
  timerContainer: { position: 'absolute', bottom: 10 },
  timer: { fontSize: 18, letterSpacing: 2 },
  dotsContainer: { flexDirection: 'row', gap: 8, position: 'absolute', bottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
