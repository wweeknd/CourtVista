
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD0rs2Bk-gWcGVMi1QLTZF76A8IsRVFWBY",
    authDomain: "courtvista-c553a.firebaseapp.com",
    projectId: "courtvista-c553a",
    storageBucket: "courtvista-c553a.firebasestorage.app",
    messagingSenderId: "716251911038",
    appId: "1:716251911038:web:0743cf5ce17c2259c8d92f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);