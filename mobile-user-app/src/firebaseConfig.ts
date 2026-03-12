import { initializeApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDR-k8YuBanoicD6D4AoVL34iwBpFq-548",
  authDomain: "roshaab-app.firebaseapp.com",
  projectId: "roshaab-app",
  storageBucket: "roshaab-app.firebasestorage.app",
  messagingSenderId: "279104998475",
  appId: "1:279104998475:web:41f0956a9039dbd3a051ce",
  measurementId: "G-G5WVWZ1Z5Z"
};

const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence for React Native
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
