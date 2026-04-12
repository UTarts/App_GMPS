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

messaging.onBackgroundMessage(async (payload) => {
  console.log('Received background message: ', payload);
  
  // Smarter Badging: Add to the existing badge count
  if ('setAppBadge' in navigator) {
    try {
      await navigator.setAppBadge(); 
    } catch (e) {
      console.error('Error setting badge:', e);
    }
  }

  const notificationTitle = payload.notification?.title || 'GMPS Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new update.',
    icon: '/icon-192.png', 
    badge: '/icon-192.png', 
    data: payload.data || { url: '/' } 
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // FIX: Build the absolute URL so the phone knows exactly what app window to open
  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If the app is already open in the background, bring it to the front
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // We use startsWith to catch variations of the URL
        if (client.url.startsWith(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // If the app is fully closed, open a new instance
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});