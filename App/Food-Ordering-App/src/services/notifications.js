import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Only run on native (push not supported on web)
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Request notification permission and return Expo Push Token.
 * Returns null on web or if permission denied / token unavailable.
 */
export async function registerForPushNotificationsAsync() {
  if (!isNative) return null;

  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    if (finalStatus !== 'granted') {
      console.warn('Push permission not granted');
      return null;
    }
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const tokenResult = await Notifications.getExpoPushTokenAsync({
      projectId: projectId || undefined,
    });
    return tokenResult?.data ?? null;
  } catch (e) {
    console.warn('Failed to get Expo Push Token:', e);
    return null;
  }
}
