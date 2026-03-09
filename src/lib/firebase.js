import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
    apiKey: "AIzaSyBRpOeqWF5caOfu0L3PSWnxUz9yoczspuk",
    authDomain: "gmps-app.firebaseapp.com",
    projectId: "gmps-app",
    storageBucket: "gmps-app.firebasestorage.app",
    messagingSenderId: "118069160830",
    appId: "1:118069160830:web:15d5878ad25298c2bde12f"
};

const app = initializeApp(firebaseConfig);
export const firebaseApp = app;
export const messaging = typeof window !== "undefined" ? getMessaging(app) : null;