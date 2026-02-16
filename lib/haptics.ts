import * as Haptics from 'expo-haptics';

export function lightTap() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function mediumTap() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function heavyTap() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

export function success() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function warning() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

export function error() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

export function selectionChanged() {
  Haptics.selectionAsync();
}
