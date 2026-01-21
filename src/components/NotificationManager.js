"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Settings } from 'lucide-react';
import useFcmToken from '../hooks/useFcmToken'; // Ensure this path is correct

export default function NotificationManager() {
  const { notificationPermissionStatus } = useFcmToken(); // Optional: link to your hook if needed
  const [showModal, setShowModal] = useState(false);
  const [permissionState, setPermissionState] = useState('default'); // default, denied, granted

  useEffect(() => {
    // 1. Check current permission status
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const status = Notification.permission;
      setPermissionState(status);

      // 2. If not granted, show our custom modal after a short delay
      if (status !== 'granted') {
        const timer = setTimeout(() => setShowModal(true), 2000); 
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) return;

    // Trigger the native browser prompt
    const permission = await Notification.requestPermission();
    setPermissionState(permission);

    if (permission === 'granted') {
      setShowModal(false);
      // The useFcmToken hook will automatically pick up the token now
      window.location.reload(); // Reload to ensure token is sent fresh
    }
  };

  return (
    <AnimatePresence>
      {showModal && permissionState !== 'granted' && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 left-4 right-4 z-50 flex justify-center"
        >
          <div className="bg-white dark:bg-[#151515] p-5 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-sm relative">
            <button 
              onClick={() => setShowModal(false)} 
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${permissionState === 'denied' ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-600'}`}>
                {permissionState === 'denied' ? <Settings size={24} /> : <Bell size={24} />}
              </div>

              {permissionState === 'denied' ? (
                <>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1">Notifications Blocked</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                    We can't update you about homework or notices because you blocked permissions. 
                    <br/><span className="font-bold mt-2 block">Please reset permissions in your browser settings (Site Settings).</span>
                  </p>
                  <button 
                    onClick={() => setShowModal(false)}
                    className="w-full py-3 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-white rounded-xl font-bold text-xs"
                  >
                    I'll do it later
                  </button>
                </>
              ) : (
                <>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1">Don't Miss Updates!</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                    Allow notifications to get instant alerts for Homework, Exam Results, and Holidays.
                  </p>
                  <button 
                    onClick={handleRequestPermission}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/30 active:scale-95 transition-transform"
                  >
                    Allow Notifications
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}