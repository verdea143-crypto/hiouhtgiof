import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const hardcodedConfig = {
  apiKey: "AIzaSyC0AQ1DaWuRcn7DUYbCkHPhqdSp14chcBs",
  authDomain: "betflow-fe16f.firebaseapp.com",
  projectId: "betflow-fe16f",
  storageBucket: "betflow-fe16f.firebasestorage.app",
  messagingSenderId: "967619664166",
  appId: "1:967619664166:web:dee34b0d840b496fdc89e7"
};

const getFirebaseConfig = () => {
  try {
    const configStr = localStorage.getItem('firebase_config');
    if (configStr) {
      const config = JSON.parse(configStr);
      // Validate config has minimal required fields
      if (config && config.apiKey && config.projectId) {
        return config;
      }
    }
  } catch (e) {
    console.error('Error reading Firebase config from localStorage:', e);
  }
  return hardcodedConfig;
};

const config = getFirebaseConfig();

export const app = config
  ? (getApps().length > 0 ? getApp() : initializeApp(config))
  : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
