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
  console.log('Received background message: ', payload);
  
  // Set the app badge if supported
  if ('setAppBadge' in navigator) navigator.setAppBadge(1).catch(console.error);

  // Explicitly command the browser to show the visual notification
  const notificationTitle = payload.notification?.title || 'GMPS Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new update.',
    icon: '/icon-192.png', // Uses your existing PWA icon
    data: payload.data || {} // Passes any extra data (like URLs) for clicks
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Optional but recommended: Handle what happens when a user clicks the notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If the app is already open, focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});