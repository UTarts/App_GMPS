"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff } from 'lucide-react';

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showOnlineMessage, setShowOnlineMessage] = useState(false);

  useEffect(() => {
    // 1. Check initial status
    setIsOnline(navigator.onLine);

    // 2. Define handlers
    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineMessage(true);
      // Hide the "Back Online" message after 3 seconds
      setTimeout(() => setShowOnlineMessage(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOnlineMessage(false);
    };

    // 3. Add listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 4. Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {/* OFFLINE MESSAGE (Stays until connected) */}
      {!isOnline && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-[80px] left-4 right-4 z-[100] flex justify-center pointer-events-none"
        >
          <div className="bg-neutral-900/90 dark:bg-white/90 backdrop-blur-md text-white dark:text-black px-4 py-3 rounded-full shadow-2xl flex items-center gap-3">
            <div className="bg-red-500 rounded-full p-1">
              <WifiOff size={14} className="text-white" />
            </div>
            <span className="text-xs font-bold">You are offline. Check connection.</span>
          </div>
        </motion.div>
      )}

      {/* ONLINE MESSAGE (Shows briefly then hides) */}
      {showOnlineMessage && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-[80px] left-4 right-4 z-[100] flex justify-center pointer-events-none"
        >
          <div className="bg-neutral-900/90 dark:bg-white/90 backdrop-blur-md text-white dark:text-black px-4 py-3 rounded-full shadow-2xl flex items-center gap-3">
            <div className="bg-green-500 rounded-full p-1">
              <Wifi size={14} className="text-white" />
            </div>
            <span className="text-xs font-bold">Back online!</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}