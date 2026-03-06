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

// --- 1. INDEXED DB HELPER (To Save Background Msgs) ---
function saveMessageToDB(title, body, url) {
  return new Promise((resolve) => {
    const request = indexedDB.open('GMPS_DB', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('notifications')) {
        db.createObjectStore('notifications', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const tx = db.transaction('notifications', 'readwrite');
      const store = tx.objectStore('notifications');
      
      store.add({
        title: title,
        body: body,
        url: url || '/',
        date: new Date().toLocaleDateString('en-IN'),
        timestamp: Date.now()
      });

      tx.oncomplete = () => { db.close(); resolve(); };
    };
    
    request.onerror = () => resolve(); // Fail silently
  });
}

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background Message:', payload);
  
  const title = payload.notification.title;
  const body = payload.notification.body;
  const url = payload.data?.url || '/';

  // 1. Save to Database
  saveMessageToDB(title, body, url);

  // 2. Set the App Badge (The Red Dot)
  if ('setAppBadge' in navigator) {
    // We set it to 1 for now; in the next update, we can make it a dynamic count
    navigator.setAppBadge(1).catch((error) => {
      console.error('Failed to set app badge:', error);
    });
  }

  // 3. Show Notification
  const notificationOptions = {
    body: body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: url }
  };

  self.registration.showNotification(title, notificationOptions);
});

// --- 3. HANDLE CLICK (Opens App) ---
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If app is already open, focus it
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus().then(c => c.navigate(urlToOpen));
        }
      }
      // If closed, open new
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});