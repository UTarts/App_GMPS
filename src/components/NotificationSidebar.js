"use client";
import { useEffect, useState } from 'react';
import { X, Bell, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext'; 

export default function NotificationSidebar({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [deletedIds, setDeletedIds] = useState([]);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const storedDeleted = JSON.parse(localStorage.getItem('gmps_deleted_notifs') || '[]');
    setDeletedIds(storedDeleted);

    if (isOpen && user?.id) {
      fetchNotifications();
    }
  }, [isOpen, user]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/get_notifications.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, class_id: user.class_id || 0 })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setNotifications(json.data);
        if (json.data.length > 0) {
          localStorage.setItem('gmps_latest_notif_id', json.data[0].id.toString());
        }
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  const deleteOne = (id) => {
    const updated = [...deletedIds, id];
    setDeletedIds(updated);
    localStorage.setItem('gmps_deleted_notifs', JSON.stringify(updated));
  };

  const clearAll = () => {
    const allIds = notifications.map(n => n.id);
    const updated = [...new Set([...deletedIds, ...allIds])];
    setDeletedIds(updated);
    localStorage.setItem('gmps_deleted_notifs', JSON.stringify(updated));
  };

  const displayableNotifications = notifications.filter(n => !deletedIds.includes(n.id));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with ultra-high z-index */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" />
          
          {/* Sidebar changed to 70% width and ultra-high z-index */}
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed top-0 right-0 w-[85%] max-w-sm h-full bg-white dark:bg-[#151515] shadow-2xl z-[9999] flex flex-col border-l border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-50 dark:bg-indigo-500/10 p-2.5 rounded-xl"><Bell size={20} className="text-indigo-600 dark:text-indigo-400" /></div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Updates</h2>
              </div>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded-full transition-colors"><X size={18} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {displayableNotifications.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-48 text-center px-4">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-[#202020] rounded-full flex items-center justify-center mb-4"><Bell size={24} className="text-gray-300 dark:text-gray-600" /></div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">All caught up!</p>
                    <p className="text-xs text-gray-500">No new notifications.</p>
                  </motion.div>
                ) : (
                  displayableNotifications.map((n) => (
                    <motion.div layout key={n.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-gray-50 dark:bg-[#202020] p-4 rounded-2xl relative group border border-gray-100 dark:border-gray-800">
                      <button onClick={() => deleteOne(n.id)} className="absolute top-3 right-3 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>
                      <div onClick={() => { router.push(n.url); onClose(); }} className="cursor-pointer">
                        <div className="flex justify-between items-start mb-1 pr-6">
                          <h4 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">{n.title}</h4>
                          <span className="text-[10px] text-gray-400 shrink-0">{n.date}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">{n.body}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
            {displayableNotifications.length > 0 && (
              <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                <button onClick={clearAll} className="w-full py-3.5 bg-gray-50 hover:bg-red-50 dark:bg-[#202020] dark:hover:bg-red-500/10 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors">
                  <Trash2 size={16} /> Clear History
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}