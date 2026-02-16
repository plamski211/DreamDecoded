import { Platform } from 'react-native';
import { Audio } from 'expo-av';

const isWeb = Platform.OS === 'web';

// ---------- Native (iOS / Android) via expo-av ----------

let recording: Audio.Recording | null = null;

// ---------- Web via MediaRecorder ----------

let webStream: MediaStream | null = null;
let webRecorder: MediaRecorder | null = null;
let webChunks: Blob[] = [];
let webStartTime = 0;
let webAudioContext: AudioContext | null = null;
let webAnalyser: AnalyserNode | null = null;
let webMeteringInterval: ReturnType<typeof setInterval> | null = null;

function getWebMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
  if (MediaRecorder.isTypeSupported('audio/ogg')) return 'audio/ogg';
  return '';
}

// ---------- Permission ----------

export async function requestMicrophonePermission(): Promise<'granted' | 'denied' | 'blocked'> {
  console.log('[DreamDecode] requestMicrophonePermission, isWeb:', isWeb, 'Platform.OS:', Platform.OS);

  if (isWeb) {
    // On web, just return granted — the actual browser prompt will
    // happen in startRecording() via getUserMedia
    return 'granted';
  }

  const { status, canAskAgain } = await Audio.requestPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (!canAskAgain) return 'blocked';
  return 'denied';
}

export async function checkMicrophonePermission(): Promise<boolean> {
  if (isWeb) {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return result.state === 'granted';
    } catch {
      return false;
    }
  }

  const { status } = await Audio.getPermissionsAsync();
  return status === 'granted';
}

// ---------- Recording ----------

export async function startRecording(
  onMetering?: (level: number) => void
): Promise<Audio.Recording | void> {
  console.log('[DreamDecode] startRecording, isWeb:', isWeb);

  if (isWeb) {
    webChunks = [];
    console.log('[DreamDecode] Requesting getUserMedia...');
    webStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('[DreamDecode] Got media stream, tracks:', webStream.getAudioTracks().length);

    const mimeType = getWebMimeType();
    console.log('[DreamDecode] Using mimeType:', mimeType || '(browser default)');

    webRecorder = mimeType
      ? new MediaRecorder(webStream, { mimeType })
      : new MediaRecorder(webStream);

    webRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        webChunks.push(e.data);
        console.log('[DreamDecode] Audio chunk received, size:', e.data.size);
      }
    };

    webRecorder.onerror = (e) => {
      console.error('[DreamDecode] MediaRecorder error:', e);
    };

    webRecorder.start(250);
    webStartTime = Date.now();
    console.log('[DreamDecode] MediaRecorder started, state:', webRecorder.state);

    // Web Audio API analyser for audio-level metering
    if (onMetering && webStream) {
      try {
        webAudioContext = new AudioContext();
        const source = webAudioContext.createMediaStreamSource(webStream);
        webAnalyser = webAudioContext.createAnalyser();
        webAnalyser.fftSize = 256;
        source.connect(webAnalyser);

        const dataArray = new Uint8Array(webAnalyser.frequencyBinCount);
        webMeteringInterval = setInterval(() => {
          if (webAnalyser) {
            webAnalyser.getByteFrequencyData(dataArray);
            const avg = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
            onMetering(Math.min(1, avg / 128));
          }
        }, 100);
      } catch (err) {
        console.warn('[DreamDecode] Web metering setup failed:', err);
      }
    }

    return;
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const { recording: newRecording } = await Audio.Recording.createAsync(
    {
      ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
      isMeteringEnabled: true,
    },
    (status) => {
      if (status.isRecording && status.metering !== undefined && onMetering) {
        // Normalize dB (-160..0) to 0..1, using -50..0 as practical voice range
        const normalized = Math.min(1, Math.max(0, (status.metering + 50) / 50));
        onMetering(normalized);
      }
    },
    100
  );

  recording = newRecording;
  return newRecording;
}

export async function stopRecording(): Promise<{ uri: string; duration: number } | null> {
  console.log('[DreamDecode] stopRecording, isWeb:', isWeb);

  if (isWeb) {
    // Clean up web metering
    if (webMeteringInterval) {
      clearInterval(webMeteringInterval);
      webMeteringInterval = null;
    }
    if (webAudioContext) {
      webAudioContext.close().catch(() => {});
      webAudioContext = null;
    }
    webAnalyser = null;

    if (!webRecorder || webRecorder.state === 'inactive') {
      console.warn('[DreamDecode] No active web recorder');
      return null;
    }

    console.log('[DreamDecode] Stopping recorder, chunks so far:', webChunks.length);

    const mimeType = webRecorder.mimeType || 'audio/webm';

    const blob = await new Promise<Blob>((resolve) => {
      webRecorder!.onstop = () => {
        const b = new Blob(webChunks, { type: mimeType });
        console.log('[DreamDecode] Final blob size:', b.size, 'type:', b.type);
        resolve(b);
      };
      webRecorder!.stop();
    });

    webStream?.getTracks().forEach((t) => t.stop());

    const duration = Math.round((Date.now() - webStartTime) / 1000);
    const uri = URL.createObjectURL(blob);

    webRecorder = null;
    webStream = null;
    webChunks = [];

    console.log('[DreamDecode] Recording stopped, duration:', duration, 'uri:', uri);
    return { uri, duration };
  }

  if (!recording) return null;

  // Get status BEFORE stopping — getStatusAsync() is unreliable after unload
  const status = await recording.getStatusAsync();
  const duration = Math.round((status.durationMillis ?? 0) / 1000);

  await recording.stopAndUnloadAsync();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

  const uri = recording.getURI();
  recording = null;

  if (!uri) return null;
  return { uri, duration };
}

export function getActiveRecording(): Audio.Recording | null {
  return recording;
}

export async function playAudio(uri: string): Promise<Audio.Sound> {
  const { sound } = await Audio.Sound.createAsync({ uri });
  await sound.playAsync();
  return sound;
}
