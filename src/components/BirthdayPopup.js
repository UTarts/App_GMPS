"use client";
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function BirthdayPopup() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    
    // Check if we already showed it today to avoid spamming them every time they click a menu
    const lastShown = localStorage.getItem('gmps_bday_shown');
    const today = new Date().toDateString();
    if (lastShown === today) return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/birthdays.php?user_id=${user.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.is_my_birthday) {
          setShow(true);
          localStorage.setItem('gmps_bday_shown', today);
        }
      });
  }, [user]);

  const handleDownload = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/download_birthday_card.php?user_id=${user.id}`;
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9998]" />
          <motion.div 
            initial={{ scale: 0.5, opacity: 0, y: "-50%", x: "-50%", rotate: -10 }} 
            animate={{ scale: 1, opacity: 1, y: "-50%", x: "-50%", rotate: 0 }} 
            exit={{ scale: 0.8, opacity: 0, y: "-50%", x: "-50%" }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="fixed top-1/2 left-1/2 z-[9999] w-[90%] max-w-sm bg-gradient-to-b from-yellow-100 to-white p-8 rounded-[40px] shadow-2xl text-center border-4 border-yellow-300"
          >
            <button onClick={() => setShow(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 bg-white rounded-full p-2 shadow-sm"><X size={16} /></button>
            
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-3xl font-black text-gray-900 mb-2 font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
              Happy Birthday!
            </h2>
            <p className="text-gray-600 mb-6 font-medium leading-relaxed">
              {user?.name}, we are so glad you are part of the GMPS family. Have an amazing day!
            </p>

            <button onClick={handleDownload} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-black text-sm shadow-[0_10px_20px_rgba(79,70,229,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2">
              <Download size={18} /> Download Your Card
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}