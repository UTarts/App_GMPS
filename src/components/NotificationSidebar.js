"use client";
import { useEffect, useState } from 'react';
import { X, Bell, Trash2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { getMessaging, onMessage } from 'firebase/messaging';
import { firebaseApp } from '../lib/firebase'; 

export default function NotificationSidebar({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [newMsgToast, setNewMsgToast] = useState(null);
  const router = useRouter();

  // --- HELPER: Merge DB notifications with LocalStorage ---
  const syncWithBackgroundDB = async () => {
    try {
      const dbRequest = indexedDB.open('GMPS_DB', 1);
      
      dbRequest.onsuccess = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('notifications')) return;

        const tx = db.transaction('notifications', 'readwrite');
        const store = tx.objectStore('notifications');
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
          const bgMessages = getAllRequest.result;
          if (bgMessages.length > 0) {
            // 1. Get current LocalStorage
            const currentLocal = JSON.parse(localStorage.getItem('gmps_notifications') || '[]');
            
            // 2. Merge (Avoid duplicates by timestamp/content)
            const merged = [...bgMessages, ...currentLocal].filter((v, i, a) => 
              a.findIndex(t => (t.timestamp === v.timestamp && t.title === v.title)) === i
            ).sort((a,b) => b.timestamp - a.timestamp); // Sort Newest First

            // 3. Update State & LocalStorage
            setNotifications(merged);
            localStorage.setItem('gmps_notifications', JSON.stringify(merged));

            // 4. Clear DB (Since we moved them to LocalStorage)
            store.clear();
          }
        };
      };
    } catch (e) {
      console.error("DB Sync Error:", e);
    }
  };

  // 1. Load Data & Sync on Mount
  useEffect(() => {
    // Load initial local data
    const saved = localStorage.getItem('gmps_notifications');
    if (saved) setNotifications(JSON.parse(saved));

    // Check for missed background messages
    if (typeof window !== 'undefined') {
      syncWithBackgroundDB();
    }
  }, [isOpen]); // Re-sync every time sidebar opens

  // 2. Listen for FOREGROUND Messages
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const messaging = getMessaging(firebaseApp);
        const unsubscribe = onMessage(messaging, (payload) => {
          const newNotif = {
            id: Date.now(),
            title: payload.notification.title,
            body: payload.notification.body,
            url: payload.data?.url || '/',
            date: new Date().toLocaleDateString('en-IN'),
            timestamp: Date.now()
          };
          
          setNotifications(prev => {
            const updated = [newNotif, ...prev];
            localStorage.setItem('gmps_notifications', JSON.stringify(updated));
            return updated;
          });

          setNewMsgToast({ title: newNotif.title, body: newNotif.body });
          setTimeout(() => setNewMsgToast(null), 4000);
        });
        return () => unsubscribe();
      } catch (e) { console.log("FCM Error", e); }
    }
  }, []);

  // 3. Delete Actions
  const deleteOne = (timestamp) => {
    const updated = notifications.filter(n => n.timestamp !== timestamp);
    setNotifications(updated);
    localStorage.setItem('gmps_notifications', JSON.stringify(updated));
  };

  const clearAll = () => {
    setNotifications([]);
    localStorage.removeItem('gmps_notifications');
  };

  return (
    <>
      {/* Toast Popup */}
      <AnimatePresence>
        {newMsgToast && !isOpen && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none"
          >
            <div onClick={onClose} className="bg-white dark:bg-[#202020] border border-gray-200 dark:border-gray-800 shadow-2xl rounded-2xl p-4 w-full max-w-sm flex items-start gap-3 pointer-events-auto cursor-pointer">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full shrink-0">
                <Bell size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">New Notification</h4>
                <p className="text-xs text-gray-600 dark:text-gray-300 truncate font-medium">{newMsgToast.title}</p>
                <p className="text-[10px] text-gray-400 truncate">{newMsgToast.body}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setNewMsgToast(null); }} className="text-gray-400"><X size={16} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 right-0 h-full w-[85%] max-w-md bg-white dark:bg-[#151515] shadow-2xl z-[70] flex flex-col">
              
              <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white/50 dark:bg-black/50 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <Bell className="text-blue-600" size={20} />
                  <h2 className="font-bold text-lg dark:text-white">Notifications</h2>
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{notifications.length}</span>
                </div>
                <div className="flex items-center gap-3">
                  {notifications.length > 0 && <button onClick={clearAll} className="text-xs text-red-500 font-medium hover:underline">Clear All</button>}
                  <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"><X size={18} className="dark:text-white" /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Bell size={48} className="mb-3 opacity-20" />
                    <p className="text-sm">No new notifications</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <motion.div layout key={n.timestamp} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-gray-50 dark:bg-[#202020] p-4 rounded-2xl relative group border border-gray-100 dark:border-gray-800">
                      <button onClick={() => deleteOne(n.timestamp)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>
                      <div onClick={() => { router.push(n.url); onClose(); }} className="cursor-pointer">
                        <div className="flex justify-between items-start mb-1 pr-6">
                          <h4 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">{n.title}</h4>
                          <span className="text-[10px] text-gray-400 shrink-0">{n.date}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 mb-2">{n.body}</p>
                        {n.url !== '/' && <div className="flex items-center gap-1 text-[10px] text-blue-600 font-medium">Open <ExternalLink size={10} /></div>}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}