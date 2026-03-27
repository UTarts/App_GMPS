import { useEffect, useState } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { firebaseApp } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

const useFcmToken = () => {
  const { user } = useAuth();
  const [token, setToken] = useState(null);
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState('');

  // 1. Token Retrieval Logic
  useEffect(() => {
    const retrieveToken = async () => {
      try {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
          const messaging = getMessaging(firebaseApp);

          // Only check existing permission, DO NOT force prompt on load
          const permission = Notification.permission;
          setNotificationPermissionStatus(permission);

          if (permission === 'granted') {
            // Explicitly register the service worker to prevent Next.js routing bugs
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

            const currentToken = await getToken(messaging, {
              vapidKey: 'BPjffkQmohza3sa3meVAN6F4GebNOim09QCK532rSAbYFq8WeOTKweMXyWA-KLBvl_Qrktl12MSRG8Dj8HaibdM',
              serviceWorkerRegistration: registration
            });

            if (currentToken) {
              setToken(currentToken);
              // Send token to your PHP backend
              if (user?.id) {
                await saveTokenToBackend(currentToken, user);
              }
            } else {
              console.log('No registration token available.');
            }
          }
        }
      } catch (error) {
        console.log('An error occurred while retrieving token:', error);
      }
    };

    retrieveToken();
  }, [user]);

  // 2. Foreground Message Handler (Shows alerts when app is OPEN)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const messaging = getMessaging(firebaseApp);
        const unsubscribe = onMessage(messaging, (payload) => {
          console.log('Message received in foreground: ', payload);
          
          // Force a system notification to appear even if app is open
          if (Notification.permission === 'granted') {
            new Notification(payload.notification.title, {
              body: payload.notification.body,
              icon: '/icon-192.png' // Uses your existing PWA icon
            });
          }
        });
        
        return () => unsubscribe();
      } catch (e) {
        console.log('Foreground messaging init error:', e);
      }
    }
  }, []);

  return { token, notificationPermissionStatus };
};

const saveTokenToBackend = async (token, user) => {
  try {
    const fd = new FormData();
    fd.append('user_id', user.id);
    fd.append('role', user.role);
    fd.append('token', token);
    fd.append('device_info', navigator.userAgent);

    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/save_fcm_token.php`, {
      method: 'POST',
      body: fd
    });
  } catch (e) {
    console.error("Failed to save token", e);
  }
};

export default useFcmToken;