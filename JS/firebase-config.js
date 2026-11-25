import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCAG-mjM-j8xQS18VuqSQzcC1iSYaNPiVU",
  authDomain: "docencia-activa-certus.firebaseapp.com",
  projectId: "docencia-activa-certus",
  storageBucket: "docencia-activa-certus.firebasestorage.app",
  messagingSenderId: "972536389589",
  appId: "1:972536389589:web:52780515f069512a79275c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);