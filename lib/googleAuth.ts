import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';

if (Platform.OS === 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';

export const isGoogleAuthAvailable = GOOGLE_WEB_CLIENT_ID.length > 0;

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
  });

  return { request, response, promptAsync };
}

export async function signInWithGoogleIdToken(idToken: string) {
  return supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
}
