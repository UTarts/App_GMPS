import { useEffect, useState } from 'react';
import { getMessaging, getToken } from 'firebase/messaging';
import { firebaseApp } from '../lib/firebase'; // We will create this next
import { useAuth } from '../context/AuthContext';

const useFcmToken = () => {
  const { user } = useAuth();
  const [token, setToken] = useState(null);
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState('');

  useEffect(() => {
    const retrieveToken = async () => {
      try {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
          const messaging = getMessaging(firebaseApp);

          // 1. Request Permission
          const permission = await Notification.requestPermission();
          setNotificationPermissionStatus(permission);

          if (permission === 'granted') {
            // 2. Get Token
            const currentToken = await getToken(messaging, {
              vapidKey: 'BPjffkQmohza3sa3meVAN6F4GebNOim09QCK532rSAbYFq8WeOTKweMXyWA-KLBvl_Qrktl12MSRG8Dj8HaibdM'
            });

            if (currentToken) {
              setToken(currentToken);
              // 3. Send to Backend
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