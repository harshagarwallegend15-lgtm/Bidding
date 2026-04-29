// Firebase Configuration
// This connects your app to a shared cloud database so
// auctions sync across ALL laptops in real-time.
//
// ── SETUP INSTRUCTIONS ──
// 1. Go to https://console.firebase.google.com/
// 2. Click "Create a project" → name it "SealedAuction" → Continue
// 3. Disable Google Analytics (optional) → Create Project
// 4. In left sidebar, click "Build" → "Realtime Database"
// 5. Click "Create Database" → choose location → Start in TEST MODE → Enable
// 6. Go to Project Settings (gear icon ⚙️) → scroll down to "Your apps"
// 7. Click the web icon </> → name it "web" → Register
// 8. Copy the firebaseConfig values below and replace the placeholders

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, push, update, remove } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBslV9VU1x0gHj5Ri5h5oIIgcQeSjfAeSs",
  authDomain: "sealedauction.firebaseapp.com",
  databaseURL: "https://sealedauction-default-rtdb.firebaseio.com",
  projectId: "sealedauction",
  storageBucket: "sealedauction.firebasestorage.app",
  messagingSenderId: "765841405156",
  appId: "1:765841405156:web:5973d18554e6f7c75c68f1",
  measurementId: "G-LFGZ6K967L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ── Database References ──
const auctionsRef = ref(db, 'auctions');
const usersRef = ref(db, 'users');

// ══════ NORMALIZE (Firebase drops empty arrays) ══════
const normalizeAuction = (a) => ({
  ...a,
  participants: Array.isArray(a.participants) ? a.participants : [],
  bids: Array.isArray(a.bids) ? a.bids : [],
  results: Array.isArray(a.results) ? a.results : [],
  losers: Array.isArray(a.losers) ? a.losers : [],
});

// ══════ AUCTION OPERATIONS ══════

// Save all auctions to Firebase
export const saveAuctionsToCloud = async (auctions) => {
  try {
    const data = {};
    auctions.forEach(a => { data[a.id] = a; });
    await set(auctionsRef, data);
  } catch (e) {
    console.error('Firebase save error:', e);
  }
};

// Save a single auction
export const saveOneAuction = async (auction) => {
  try {
    const aRef = ref(db, `auctions/${auction.id}`);
    await set(aRef, auction);
  } catch (e) {
    console.error('Firebase save single auction error:', e);
  }
};

// Update a single auction
export const updateOneAuction = async (auctionId, updates) => {
  try {
    const aRef = ref(db, `auctions/${auctionId}`);
    await update(aRef, updates);
  } catch (e) {
    console.error('Firebase update error:', e);
  }
};

// Delete a single auction
export const deleteOneAuction = async (auctionId) => {
  try {
    const aRef = ref(db, `auctions/${auctionId}`);
    await remove(aRef);
  } catch (e) {
    console.error('Firebase delete error:', e);
  }
};

// Load all auctions once
export const loadAuctionsFromCloud = async () => {
  try {
    const snapshot = await get(auctionsRef);
    if (snapshot.exists()) {
      return Object.values(snapshot.val()).map(normalizeAuction);
    }
  } catch (e) {
    console.error('Firebase load error:', e);
  }
  return [];
};

// Listen to auctions in real-time (fires callback on every change)
export const listenToAuctions = (callback) => {
  return onValue(auctionsRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(Object.values(snapshot.val()).map(normalizeAuction));
    } else {
      callback([]);
    }
  });
};

// ══════ USER OPERATIONS ══════

export const saveUsersToCloud = async (users) => {
  try {
    const data = {};
    users.forEach(u => { data[u.name.toLowerCase().replace(/\s+/g, '_')] = u; });
    await set(usersRef, data);
  } catch (e) {
    console.error('Firebase save users error:', e);
  }
};

export const loadUsersFromCloud = async () => {
  try {
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
      return Object.values(snapshot.val());
    }
  } catch (e) {
    console.error('Firebase load users error:', e);
  }
  return [];
};

export const listenToUsers = (callback) => {
  return onValue(usersRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(Object.values(snapshot.val()));
    } else {
      callback([]);
    }
  });
};

// Check if Firebase is configured (not using placeholder keys)
export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey !== 'YOUR_API_KEY';
};

export { db };
