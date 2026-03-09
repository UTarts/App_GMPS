"use client";
import { useEffect, useState } from 'react';
import { Bell, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationToast({ onOpenSidebar }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const checkNew = async () => {
      const dbRequest = indexedDB.open('GMPS_DB', 1);
      dbRequest.onsuccess = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('notifications')) return;
        const countRequest = db.transaction('notifications').objectStore('notifications').count();
        countRequest.onsuccess = () => {
          if (countRequest.result > 0) {
            setUnreadCount(countRequest.result);
            setShow(true);
          }
        };
      };
    };
    // Check after a 2-second delay for better UX
    setTimeout(checkNew, 2000);
  }, []);

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
          <button onClick={() => { onOpenSidebar(); setShow(false); }} className="bg-white text-blue-600 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1">
            View <ArrowRight size={14} />
          </button>
          <button onClick={() => setShow(false)} className="p-1 opacity-50"><X size={16} /></button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}