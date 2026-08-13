import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyD-XKhMTS78Iw2kQI1SpER6JdRtkK24wP8",
  authDomain: "store-aurli.firebaseapp.com",
  projectId: "store-aurli",
  storageBucket: "store-aurli.firebasestorage.app",
  messagingSenderId: "1033294966598",
  appId: "1:1033294966598:web:9470714a9ee802cbba3f47",
  measurementId: "G-5EQ2ZRS0W7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let analytics = null;
try { analytics = getAnalytics(app); } catch (_) {}

const cloudinaryConfig = {
  cloudName: "dgfcfpl1n",
  uploadPreset: "skyshop_uploads"
};

const firebase = {
  app,
  auth,
  db,
  analytics,
  cloudinaryConfig,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
};

export default firebase;
export {
  app,
  auth,
  db,
  analytics,
  cloudinaryConfig,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
};
