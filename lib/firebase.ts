// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase Konsolundan aldığın config objesini buraya yapıştır
const firebaseConfig = {
  apiKey: "AIzaSyCWEDW5IRWKxwXa1y8CltBxwA-PuuidbbQ",
  authDomain: "tarim-gida.firebaseapp.com",
  projectId: "tarim-gida",
  storageBucket: "tarim-gida.firebasestorage.app",
  messagingSenderId: "909681010758",
  appId: "1:909681010758:web:8079eb97570326d954c247",
};

// Uygulama zaten initialize edildiyse tekrar etmeyelim (Next.js için güvenli)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Servisleri dışa aktar
export const db = getFirestore(app);
export const auth = getAuth(app);
export { app };
