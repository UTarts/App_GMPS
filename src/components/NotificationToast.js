"use client";
import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function NotificationToast({ onOpenSidebar }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [show, setShow] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const checkNew = async () => {
      if (!user?.id) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/get_notifications.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, class_id: user.class_id || 0 })
        });
        const json = await res.json();
        
        if (json.status === 'success' && json.data.length > 0) {
          const latestKnownId = parseInt(localStorage.getItem('gmps_latest_notif_id') || '0', 10);
          const newNotifs = json.data.filter(n => parseInt(n.id, 10) > latestKnownId);
          
          if (newNotifs.length > 0) {
            setUnreadCount(newNotifs.length);
            setShow(true);
            
            // FIX: Instantly update the tracker so these don't trigger a popup again next time
            const highestId = Math.max(...json.data.map(n => parseInt(n.id, 10)));
            localStorage.setItem('gmps_latest_notif_id', highestId.toString());
          }
        }
      } catch (error) {
         // Silently fail if offline
      }
    };

    const timer = setTimeout(checkNew, 3000);
    return () => clearTimeout(timer);
  }, [user]);

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Subtle backdrop to focus attention */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
          />
          
          {/* Centered Modal Design */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: "-50%", x: "-50%" }} 
            animate={{ scale: 1, opacity: 1, y: "-50%", x: "-50%" }} 
            exit={{ scale: 0.9, opacity: 0, y: "-50%", x: "-50%" }}
            className="fixed top-1/2 left-1/2 z-[9999] w-[85%] max-w-sm bg-white dark:bg-[#151515] p-6 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 text-center"
          >
            <button 
              onClick={() => setShow(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-gray-50 dark:bg-gray-800 rounded-full p-1"
            >
              <X size={18} />
            </button>

            <div className="mx-auto w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400">
              <Bell size={28} />
            </div>

            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2 tracking-tight">New Updates!</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              You have <span className="font-bold text-indigo-600 dark:text-indigo-400">{unreadCount}</span> new school notifications.
            </p>

            <button 
              onClick={() => { setShow(false); onOpenSidebar(); }} 
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/30 active:scale-95 transition-all"
            >
              View Notifications
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}