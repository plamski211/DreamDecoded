import { Platform } from 'react-native';

/**
 * Wrapper around the browser's Web Speech API.
 * stop() is async — it waits for the browser to deliver final results
 * before returning the transcript.
 */

let recognition: any = null;
let finalTranscript = '';
let interimTranscript = '';
let listening = false;
let stopResolver: ((text: string) => void) | null = null;

function getSpeechRecognition(): any {
  if (Platform.OS !== 'web') return null;
  const w = globalThis as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isSupported(): boolean {
  return getSpeechRecognition() !== null;
}

export function start(lang = 'en-US'): boolean {
  const SpeechRecognition = getSpeechRecognition();
  if (!SpeechRecognition) return false;

  finalTranscript = '';
  interimTranscript = '';
  listening = true;
  stopResolver = null;

  recognition = new SpeechRecognition();
  recognition.lang = lang;
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event: any) => {
    interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const text = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += (finalTranscript ? ' ' : '') + text.trim();
      } else {
        interimTranscript += text;
      }
    }
  };

  recognition.onend = () => {
    if (listening) {
      // Auto-restart — browser stops after silence timeout
      try {
        recognition.start();
      } catch {
        // Already started or disposed
      }
    } else if (stopResolver) {
      // We're stopping — deliver the final transcript
      const result = (finalTranscript + (interimTranscript ? ' ' + interimTranscript.trim() : '')).trim();
      finalTranscript = '';
      interimTranscript = '';
      recognition = null;
      stopResolver(result);
      stopResolver = null;
    }
  };

  recognition.onerror = (event: any) => {
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      console.warn('[DreamDecode] Speech recognition error:', event.error);
    }
  };

  try {
    recognition.start();
    console.log('[DreamDecode] Speech recognition started');
    return true;
  } catch (err) {
    console.warn('[DreamDecode] Speech recognition failed to start:', err);
    return false;
  }
}

export function stop(): Promise<string> {
  listening = false;

  if (!recognition) {
    const result = finalTranscript.trim();
    finalTranscript = '';
    interimTranscript = '';
    return Promise.resolve(result);
  }

  return new Promise<string>((resolve) => {
    // Set a timeout in case onend never fires
    const timeout = setTimeout(() => {
      const result = (finalTranscript + (interimTranscript ? ' ' + interimTranscript.trim() : '')).trim();
      finalTranscript = '';
      interimTranscript = '';
      recognition = null;
      stopResolver = null;
      resolve(result);
    }, 2000);

    stopResolver = (text: string) => {
      clearTimeout(timeout);
      resolve(text);
    };

    try {
      recognition.stop();
    } catch {
      clearTimeout(timeout);
      const result = finalTranscript.trim();
      finalTranscript = '';
      interimTranscript = '';
      recognition = null;
      stopResolver = null;
      resolve(result);
    }
  });
}

export function getInterimTranscript(): string {
  return finalTranscript + (interimTranscript ? ' ' + interimTranscript : '');
}
