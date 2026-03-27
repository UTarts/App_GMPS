"use client";
import { useEffect, useState } from 'react';
import { Bell, ArrowRight } from 'lucide-react';
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
          // Compare database IDs with the highest ID saved locally
          const latestKnownId = parseInt(localStorage.getItem('gmps_latest_notif_id') || '0', 10);
          const newNotifs = json.data.filter(n => parseInt(n.id, 10) > latestKnownId);
          
          if (newNotifs.length > 0) {
            setUnreadCount(newNotifs.length);
            setShow(true);
          }
        }
      } catch (error) {
         // Silently fail if offline
      }
    };

    // Check for new notifications 3 seconds after opening the app
    const timer = setTimeout(checkNew, 3000);
    return () => clearTimeout(timer);
  }, [user]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
        className="fixed bottom-24 left-4 right-4 z-50 bg-blue-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full"><Bell size={18} /></div>
          <div>
            <p className="text-sm font-bold">New Updates Available</p>
            <p className="text-[10px] opacity-90">You have {unreadCount} unread school notifications.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { onOpenSidebar(); setShow(false); }} className="bg-white text-blue-600 px-4 py-2 rounded-xl text-xs font-bold shadow-lg active:scale-95 flex items-center gap-1">
            View <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}