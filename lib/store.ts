import { create } from 'zustand';
import type { Dream, User } from '@/types';
import { saveDream, deleteDream } from '@/lib/storage';
import { hasCredentials, upsertDream, deleteDreamRemote } from '@/lib/supabase';

interface AppState {
  // Auth
  user: User | null;
  session: { access_token: string } | null;
  isAuthLoading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: { access_token: string } | null) => void;
  setAuthLoading: (val: boolean) => void;

  // Recording
  isRecording: boolean;
  recordingDuration: number;
  setRecording: (val: boolean) => void;
  setRecordingDuration: (val: number) => void;

  // Processing
  isProcessing: boolean;
  processingDreamId: string | null;
  setProcessing: (val: boolean, dreamId?: string | null) => void;

  // Dreams
  dreams: Dream[];
  setDreams: (dreams: Dream[]) => void;
  addDream: (dream: Dream) => void;
  updateDream: (id: string, updates: Partial<Dream>) => void;
  removeDream: (id: string) => void;

  // Subscription
  isPremium: boolean;
  setIsPremium: (val: boolean) => void;

  // UI
  decodedDream: Dream | null;
  setDecodedDream: (dream: Dream | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Auth — no default user; requires sign-in
  user: null,
  session: null,
  isAuthLoading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setAuthLoading: (isAuthLoading) => set({ isAuthLoading }),

  // Recording
  isRecording: false,
  recordingDuration: 0,
  setRecording: (isRecording) =>
    set({ isRecording, recordingDuration: 0 }),
  setRecordingDuration: (recordingDuration) => set({ recordingDuration }),

  // Processing
  isProcessing: false,
  processingDreamId: null,
  setProcessing: (isProcessing, dreamId = null) =>
    set({ isProcessing, processingDreamId: dreamId }),

  // Dreams
  dreams: [],
  setDreams: (dreams) => set({ dreams }),
  addDream: (dream) => {
    set((state) => ({ dreams: [dream, ...state.dreams] }));
    saveDream(dream).catch(() => {});
    if (hasCredentials) upsertDream(dream).catch(() => {});
  },
  updateDream: (id, updates) => {
    set((state) => {
      const updated = state.dreams.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      );
      const dream = updated.find((d) => d.id === id);
      if (dream) {
        saveDream(dream).catch(() => {});
        if (hasCredentials) upsertDream(dream).catch(() => {});
      }
      return { dreams: updated };
    });
  },
  removeDream: (id) => {
    set((state) => ({ dreams: state.dreams.filter((d) => d.id !== id) }));
    deleteDream(id).catch(() => {});
    if (hasCredentials) deleteDreamRemote(id).catch(() => {});
  },

  // Subscription
  isPremium: true,
  setIsPremium: (isPremium) => set({ isPremium }),

  // UI
  decodedDream: null,
  setDecodedDream: (decodedDream) => set({ decodedDream }),
}));
