importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBRpOeqWF5caOfu0L3PSWnxUz9yoczspuk",
  authDomain: "gmps-app.firebaseapp.com",
  projectId: "gmps-app",
  storageBucket: "gmps-app.firebasestorage.app",
  messagingSenderId: "118069160830",
  appId: "1:118069160830:web:15d5878ad25298c2bde12f"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  if ('setAppBadge' in navigator) navigator.setAppBadge(1).catch(console.error);
});