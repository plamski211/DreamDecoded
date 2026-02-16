import { Platform } from 'react-native';

// expo-notifications is not available on web — lazy-import only on native
async function getNotifications() {
  if (Platform.OS === 'web') return null;
  return await import('expo-notifications');
}

// Set up notification handler on native only
if (Platform.OS !== 'web') {
  import('expo-notifications').then((Notifications) => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }).catch(() => {});
}

export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) return false;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleMorningReminder(hour: number, minute: number) {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const messages = [
    'What did you dream about last night?',
    'Your dreams are waiting to be decoded',
    "Don't let last night's dreams fade away",
  ];

  const body = messages[Math.floor(Math.random() * messages.length)];

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Good morning',
      body,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelMorningReminder() {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function sendDreamProcessedNotification(dreamTitle: string) {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Dream decoded',
      body: `'${dreamTitle}' — tap to see what your dream means`,
      sound: true,
    },
    trigger: null,
  });
}

export async function getNotificationStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  const Notifications = await getNotifications();
  if (!Notifications) return 'denied';

  const { status } = await Notifications.getPermissionsAsync();
  return status as 'granted' | 'denied' | 'undetermined';
}
