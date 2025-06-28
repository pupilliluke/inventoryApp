// ✅ Minimal working setup (no async storage, no persistence)
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getDatabase } from 'firebase/database';


const firebaseConfig = {
  apiKey: "AIzaSyB2Qp8spSt3tWzL_u-iVKesHg2XpSvye1Y",
  authDomain: "fireworksapp-8a60e.firebaseapp.com",
  databaseURL: "https://fireworksapp-8a60e-default-rtdb.firebaseio.com",
  projectId: "fireworksapp-8a60e",
  storageBucket: "fireworksapp-8a60e.firebasestorage.app",
  messagingSenderId: "860726320300",
  appId: "1:860726320300:web:bc1fb5097c90152da45309"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const auth = getAuth(app);
// signInAnonymously(auth).catch(console.error);

const db = getDatabase(app);

export { db, auth };


// 4
// Deploy to Firebase Hosting
// You can deploy now or later. To deploy now, open a terminal window, then navigate to or create a root directory for your web app.

// Sign in to Google
// firebase login
// Initiate your project
// Run this command from your app's root directory:

// firebase init
// When you're ready, deploy your web app
// Put your static files (e.g., HTML, CSS, JS) in your app's deploy directory (the default is "public"). Then, run this command from your app's root directory:

// firebase deploy


