import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDO9vQxm4Fqlcm7c0vT2kdbdl99XNBRV0s",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ecommerce-ff-ff589.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ecommerce-ff-ff589",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ecommerce-ff-ff589.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "353416003552",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:353416003552:web:0a3fef76cc6b3066293585"
};

// Comprobación de configuración básica
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("Falta la configuración de Firebase. Asegurate de rellenar el fichero .env");
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
