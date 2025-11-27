import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase Konsolundan aldığın config objesini buraya yapıştır
const firebaseConfig = {
  apiKey: "AIzaSyCWEDW5IRWKxwXa1y8CltBxwA-PuuidbbQ", // Kendi API Key'inizi buraya yapıştırın
  authDomain: "tarim-gida.firebaseapp.com", 
  projectId: "tarim-gida", 
  storageBucket: "tarim-gida.firebasestorage.app", 
  // DÜZELTME: messagingSenderId tırnak içine alındı (String olmalı)
  messagingSenderId: "909681010758", 
  appId: "1:909681010758:web:8079eb97570326d954c247"
};

// Firebase'i Başlat
const app = initializeApp(firebaseConfig);

// Servisleri Dışa Aktar
export const db = getFirestore(app);
export const auth = getAuth(app);