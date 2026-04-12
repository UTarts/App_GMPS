"use client";
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Gift, Sparkles, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext'; // Needed to check who is logged in

export default function BirthdaySection() {
  const { user } = useAuth();
  const [birthdays, setBirthdays] = useState([]);
  const [isMyBirthday, setIsMyBirthday] = useState(false);

  useEffect(() => {
    // Pass the user ID to the API so it knows if it's THIS user's birthday
    const userIdQuery = user?.id ? `?user_id=${user.id}` : '';
    
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/birthdays.php${userIdQuery}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setBirthdays(data.todays_birthdays);
          setIsMyBirthday(data.is_my_birthday);
        }
      });
  }, [user]);

  if (birthdays.length === 0) return null;

  const handleDownload = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/download_birthday_card.php?user_id=${user.id}`;
  };

  return (
    <div className="my-6 relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-amber-300 via-orange-400 to-rose-400 p-[2px] shadow-sm">
      <div className="bg-white dark:bg-[#151515] rounded-[1.9rem] p-5 relative overflow-hidden h-full w-full">
        
        {/* Soft Background Accents */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
        
        {/* Sleek Header */}
        <div className="flex items-center gap-2 mb-6 relative z-10">
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm">
            <Gift size={16} />
          </div>
          <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500 tracking-tight">
            Today's Birthdays
          </h2>
          <Sparkles className="text-amber-400 w-4 h-4 animate-pulse ml-auto" />
        </div>
        
        {/* Smaller, Elegant Avatars */}
        <div className="flex flex-wrap items-start justify-center gap-x-6 gap-y-6 relative z-10">
          {birthdays.map((student, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center max-w-[85px]"
            >
              <div className="relative w-14 h-14 mb-2">
                {/* Subtle glowing ring */}
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-400 to-rose-400 rounded-full blur-[6px] opacity-40" />
                <img 
                  src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL.replace('/api', '')}/${student.profile_pic}`} 
                  alt={student.name} 
                  className="relative w-full h-full object-cover rounded-full border-[2px] border-white dark:border-[#151515] shadow-sm" 
                />
                <div className="absolute -top-1.5 -right-1.5 text-lg filter drop-shadow-sm animate-bounce" style={{ animationDuration: '2.5s' }}>
                  🥳
                </div>
              </div>
              
              <h3 className="text-gray-900 dark:text-white text-[11px] font-black text-center leading-tight mb-1 break-words line-clamp-2">
                {student.name}
              </h3>
              <span className="text-[8px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">
                {student.class_name ? `Class ${student.class_name}` : 'Star'}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Live Download Button (ONLY visible to the birthday student) */}
        {isMyBirthday && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 relative z-10"
          >
            <button 
              onClick={handleDownload} 
              className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Download size={16} /> Get Your Birthday Card!
            </button>
          </motion.div>
        )}

      </div>
    </div>
  );
}