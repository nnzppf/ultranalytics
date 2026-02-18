import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDQ_pdzqlEXZZOhe7poiv-wkgoUNg3Bqag",
  authDomain: "ultranalytics-8582c.firebaseapp.com",
  projectId: "ultranalytics-8582c",
  storageBucket: "ultranalytics-8582c.firebasestorage.app",
  messagingSenderId: "306745766555",
  appId: "1:306745766555:web:aa1cc6556f51dbd75c0c3e"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
