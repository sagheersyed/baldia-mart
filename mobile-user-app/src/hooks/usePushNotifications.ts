import { useState, useEffect, useRef } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { usersApi } from '../api/api';

const isExpoGo = 
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient || 
  (Constants as any).appOwnership === 'expo';

// Only set handler if not in Expo Go (to avoid crash on Android SDK 53+)
if (!isExpoGo) {
  try {
    const Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.warn('Failed to set notification handler:', e);
  }
}

export const usePushNotifications = (userToken: string | null) => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const notificationListener = useRef<any>(undefined);
  const responseListener = useRef<any>(undefined);

  useEffect(() => {
    if (userToken) {
      if (isExpoGo) {
        console.warn('Push Notifications (Remote) are not supported in Expo Go for SDK 53+. Use a development build to test notifications.');
        return;
      }

      const Notifications = require('expo-notifications');

      registerForPushNotificationsAsync().then(token => {
        if (token) {
          setFcmToken(token);
          // Send to backend
          usersApi.updateMe({ fcmToken: token }).catch(err => {
            console.error('Failed to send FCM token to backend:', err);
          });
        }
      });

      notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
        console.log('Notification received:', notification);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
        console.log('Notification response:', response);
      });

      return () => {
        if (notificationListener.current) {
          notificationListener.current.remove();
        }
        if (responseListener.current) {
          responseListener.current.remove();
        }
      };
    }
  }, [userToken]);

  return { fcmToken };
};

async function registerForPushNotificationsAsync() {
  if (isExpoGo) return undefined;

  const Notifications = require('expo-notifications');
  const Device = require('expo-device');

  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    try {
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      token = deviceToken.data;
    } catch (e) {
      console.log('Error getting device push token, trying expo token as fallback:', e);
      try {
        const expoToken = await Notifications.getExpoPushTokenAsync({
            projectId: Constants.expoConfig?.extra?.eas?.projectId,
        });
        token = expoToken.data;
      } catch (e2) {
          console.error('Failed to get any push token:', e2);
      }
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
