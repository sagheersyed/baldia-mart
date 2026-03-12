import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

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
export const auth = getAuth(app);
