import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User as FirebaseUser
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  writeBatch,
  increment,
  runTransaction,
} from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
};

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ---------------------------------------------------------------------------
// App Check (istege bagli)
//
// Veriyi koruyan sey Firestore KURALLARIDIR; App Check ondan ayri bir katmandir
// ve API anahtarinin baska sitelerden kullanilip kotani tuketmesini engeller.
//
// Asagidaki kod, firebase-applet-config.json icindeki recaptchaSiteKey alani
// DOLU ise kendiliginden devreye girer; bos ise hicbir sey yapmaz. Yani bu
// dosyayi degistirmeden, yalnizca config'e anahtari yazarak acabilirsin.
//
// Kurulum sirasi (bu sira onemli):
//   1. reCAPTCHA Enterprise anahtarini Google Cloud Console'da olustur
//      (Security -> reCAPTCHA -> Create key, tur: Website, skor tabanli)
//   2. Ayni SITE ANAHTARINI hem Firebase App Check ekranina hem de
//      firebase-applet-config.json -> recaptchaSiteKey alanina yaz
//   3. Derle + deploy et (istemci artik token uretir)
//   4. Konsolda once MONITOR modunda birak, trafigin dustugunu gormeden
//      ENFORCE'a GECME. Enforce'a erken gecersen giris ve tum veri
//      istekleri reddedilir.
// ---------------------------------------------------------------------------
const appCheckSiteKey = (firebaseConfigData as any).recaptchaSiteKey || '';
// 'enterprise' (varsayilan, yeni Firebase projeleri) veya 'v3'
const appCheckProvider = ((firebaseConfigData as any).recaptchaProvider || 'enterprise') as
  | 'enterprise'
  | 'v3';

if (appCheckSiteKey) {
  // Dinamik import: anahtar yoksa bu modul pakete hic girmez.
  import('firebase/app-check')
    .then(({ initializeAppCheck, ReCaptchaV3Provider, ReCaptchaEnterpriseProvider }) => {
      const provider =
        appCheckProvider === 'v3'
          ? new ReCaptchaV3Provider(appCheckSiteKey)
          : new ReCaptchaEnterpriseProvider(appCheckSiteKey);

      initializeAppCheck(app, {
        provider,
        isTokenAutoRefreshEnabled: true,
      });
      console.info(`[SIATEK] App Check etkin (${appCheckProvider}).`);
    })
    .catch((err) => {
      // App Check baslatilamazsa uygulama CALISMAYA DEVAM ETMELI.
      console.warn('[SIATEK] App Check baslatilamadi:', err);
    });
}

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Firestore with offline persistence (IndexedDB)
// persistentLocalCache + multipleTabManager: tabs share the same cache
const databaseId = firebaseConfigData.firestoreDatabaseId || '(default)';
const firestoreSettings = {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
};
export const db = (() => {
  try {
    return databaseId && databaseId !== '(default)'
      ? initializeFirestore(app, firestoreSettings, databaseId)
      : initializeFirestore(app, firestoreSettings);
  } catch {
    // Already initialized (e.g. HMR / fast refresh) — reuse existing instance
    const { getFirestore } = require('firebase/firestore');
    return databaseId && databaseId !== '(default)'
      ? getFirestore(app, databaseId)
      : getFirestore(app);
  }
})();

export {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  writeBatch,
  increment,
  runTransaction,
};
export type { FirebaseUser };
