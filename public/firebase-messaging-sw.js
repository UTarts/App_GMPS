// --- 1. INDEXED DB HELPER (Saves to in-app history) ---
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
    
    request.onerror = () => resolve(); 
  });
}

// --- 2. HIJACK THE PUSH EVENT ---
// This must be declared before Firebase is imported to run first
self.addEventListener('push', function(event) {
  // KILL SWITCH: Stops Firebase SDK from creating a duplicate notification
  event.stopImmediatePropagation();

  const payload = event.data ? event.data.json() : {};
  const title = payload.notification?.title || payload.data?.title || 'GMPS Update';
  const body = payload.notification?.body || payload.data?.body || '';
  const url = payload.data?.url || '/';

  // Save to the in-app history
  saveMessageToDB(title, body, url);

  if ('setAppBadge' in navigator) {
    navigator.setAppBadge(1).catch(console.error);
  }

  // We manually draw EXACTLY ONE native notification
  const options = {
    body: body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: url }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// --- 3. HIJACK THE CLICK EVENT ---
self.addEventListener('notificationclick', function(event) {
  // KILL SWITCH: Stops Firebase's default handler from causing the "Processing" crash
  event.stopImmediatePropagation(); 
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus().then(c => c.navigate(urlToOpen));
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// --- 4. FIREBASE INITIALIZATION (Kept for token compatibility) ---
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