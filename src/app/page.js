"use client";
import { useEffect, useState } from 'react';
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Moon, Sun, Bell, BookOpen, Image as ImageIcon, Calendar, 
  Award, Edit3, Users, Send, Phone, Mail, MapPin, ArrowRight, Share2, Shield, CheckCircle2, X 
} from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [data, setData] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewImage, setViewImage] = useState(null);

  // 1. Fetch Data
  useEffect(() => {
    async function fetchData() {
      try {
        // A. Fetch Standard Home Data
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/home.php`, {
          method: 'POST',
          body: JSON.stringify({ user_id: user?.id, role: user?.role })
        });
        const json = await res.json();

        // B. Fetch "What's Today" Poster (NEW LOGIC)
        const wtRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_posts.php?action=get_whats_today_public`);
        const wtJson = await wtRes.json();

        // C. Combine Data
        if(json.status === 'success') {
            const combinedData = { ...json.data };
            if (wtJson.status === 'success') {
                combinedData.whatsToday = wtJson.data;
            }
            setData(combinedData);
        }
      } catch (e) {
        console.error("API Error", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  // 2. Slideshow Timer
  useEffect(() => {
    if (!data?.slides || data.slides.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % data.slides.length);
    }, 4000); 
    return () => clearInterval(timer);
  }, [data?.slides]);

  // 3. Share Function
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Govind Madhav Public School',
          text: 'Check out our school app!',
          url: window.location.origin,
        });
      } catch (error) {
        console.log('Error sharing', error);
      }
    } else {
      alert("Share not supported on this browser.");
    }
  };

  // --- LOGIC HELPERS ---
  
  // A. Profile Card Color based on Role
  const getCardStyle = () => {
    if (user?.role === 'admin') return "from-slate-800 to-black"; // Dark for Admin
    if (user?.role === 'teacher') return "from-indigo-600 to-purple-600"; // Purple for Teacher
    return "from-orange-500 to-amber-500"; // Orange for Student
  };

  // B. Badge Text Logic
  const getBadgeText = () => {
    if (user?.role === 'admin') {
      return user?.level == 1 ? 'Super Admin' : 'Admin';
    }
    if (user?.role === 'teacher') {
      // If API returned a class name, they are a class teacher
      if (data?.user_details?.class_name) return data.user_details.class_name;
      return 'Subject Teacher';
    }
    // Students
    return data?.user_details?.class_name || 'Student';
  };

  // C. Name Display (Honorifics for Staff)
  const getDisplayName = () => {
    if (!user?.name) return 'User';
    if (user?.role === 'student') return user.name.split(' ')[0]; // Just First Name
    return user.name.split(' ').slice(0, 2).join(' '); // "Mr. Sharma"
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#F2F6FA] dark:bg-[#0a0a0a]">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] text-gray-800 dark:text-gray-100 font-sans overflow-x-hidden">
      
      {/* --- 1. APP HEADER --- */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-5 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
            <img 
              src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}GMPSimages/logonew.webp`} 
              alt="GMPS Logo" 
              className="h-10 w-10 rounded-full object-contain border border-gray-100 dark:border-gray-800 shadow-sm"
            />
            <div className="flex flex-col">
                <h1 className="text-[16px] font-black leading-none text-gray-900 dark:text-white tracking-tight">GOVIND MADHAV</h1>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Public School</span>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
           <button onClick={toggleTheme} className="w-9 h-9 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-yellow-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
             {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
           </button>
           <button className="w-9 h-9 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative">
             <Bell size={18} />
             <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-black"></span>
           </button>
        </div>
      </div>

      {/* --- 2. DYNAMIC PROFILE CARD  --- */}
      <div className="px-4 mt-6 mb-8">
        <div className="relative">
          <div className={`bg-gradient-to-r ${getCardStyle()} rounded-[2.5rem] p-7 text-white shadow-xl flex justify-between items-center relative overflow-hidden min-h-[150px]`}>
              
              {/* Background Blur */}
              <div className="absolute -left-10 -bottom-20 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* Text Info */}
              <div className="flex flex-col relative z-10 flex-1 min-w-0 pr-2">
                  <p className="text-white/80 text-[11px] font-bold uppercase tracking-widest mb-0.5">Welcome Back</p>
                  <h2 className={`font-black leading-tight tracking-tight mb-4 ${
                     getDisplayName()?.length > 20 ? 'text-[20px]' :  
                     getDisplayName()?.length > 12 ? 'text-[28px]' :  
                     'text-[35px]'                                    
                  }`}>
                  {getDisplayName()}
                  </h2>
                  
                  {/* Designation Badge */}
                  <div className="inline-block self-start">
                      <span className="bg-black/20 backdrop-blur-md text-white text-[11px] font-bold px-4 py-2 rounded-full shadow-sm border border-white/10">
                          {getBadgeText()}
                      </span>
                  </div>
              </div>

              {/* Profile Picture Inside Card */}
              <div className="relative z-20 -mr-3 flex-shrink-0"> 
                  <div className="w-28 h-28 rounded-full shadow-none bg-gray-200 overflow-hidden">
                      <img 
                          src={user?.pic ? `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${user.pic}` : `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}GMPSimages/default_student.png`}
                          alt="Profile"
                          className="w-full h-full object-cover"
                      />
                  </div>
              </div>
          </div>
        </div>
      </div>

      {/* --- 3. HERO SLIDESHOW --- */}
      <div className="px-4 mb-8">
        <div className="w-full h-48 rounded-[1.5rem] overflow-hidden shadow-md relative bg-gray-200 dark:bg-gray-800">
          <AnimatePresence mode='wait'>
            {data?.slides && data.slides.length > 0 ? (
              <motion.img
                key={currentSlide}
                src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${data.slides[currentSlide].img_url}`}
                alt="Slide"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-xs">Loading Slides...</div>
            )}
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
             <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                <p className="text-white font-semibold text-[10px] tracking-wide uppercase">✨ Inspiring Excellence</p>
             </div>
          </div>
        </div>
      </div>

      {/* --- 4. NEW: WHAT'S TODAY SECTION --- */}
      {data?.whatsToday && (
        <div className="px-4 mb-8">
           <div className="bg-white dark:bg-[#151515] p-4 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between relative overflow-hidden">
              
              {/* Left Side: Date & Text */}
              <div className="relative z-10 pl-2">
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                 </p>
                 <h2 className="text-2xl font-black text-gray-800 dark:text-white leading-none">
                    What's<br/>
                    <span className="text-indigo-600">Today!</span>
                 </h2>
              </div>

              {/* Right Side: The Poster Image */}
              <div 
                className="w-40 h-40 rounded-2xl overflow-hidden shadow-md border-2 border-white dark:border-gray-700 cursor-pointer active:scale-95 transition-transform"
                onClick={() => setViewImage(`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${data.whatsToday.image_url}`)}
              >
                 <img 
                    src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${data.whatsToday.image_url}`} 
                    className="w-full h-full object-cover" 
                    alt="Today's Special"
                 />
              </div>

              {/* Decorative Blur */}
              <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10"></div>
           </div>
        </div>
      )}

      {/* --- 5. DASHBOARD (Big Blue Card + Rectangles) --- */}
      <div className="px-4 mb-8">
         <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Quick Access</h3>
         
         <div className="flex flex-col gap-3">
            
            {/* BIG BLUE CARD (Logic for Admin Added) */}
            <motion.div whileTap={{ scale: 0.98 }}>
              {/* Link Destination Logic */}
              <Link 
                href={
                    user?.role === 'admin' ? "/admin/posts" : 
                    user?.role === 'teacher' ? "/teacher-posts?source=twa" : 
                    "/work?source=twa"
                }
                className="block w-full bg-[#3B82F6] rounded-[2rem] p-6 text-white shadow-xl shadow-blue-500/25 relative overflow-hidden group"
              >
                 <div className="relative z-10 flex items-center justify-between">
                    <div>
                       <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 border border-white/10">
                         {/* Icon Logic */}
                         {user?.role === 'admin' ? <Shield size={20} /> : 
                          user?.role === 'teacher' ? <Edit3 size={20} /> : 
                          <BookOpen size={20} />}
                       </div>
                       
                       {/* Title Logic */}
                       <h4 className="text-xl font-bold">
                           {user?.role === 'admin' ? 'Post Update' : 
                            user?.role === 'teacher' ? 'Create Post' : 
                            'Daily Work'}
                       </h4>
                       
                       {/* Subtitle Logic */}
                       <p className="text-blue-100 text-xs mt-1 opacity-90">
                           {user?.role === 'admin' ? 'Post an update' : 
                            user?.role === 'teacher' ? 'Update HW & Notices' : 
                            'Check homework & classwork'}
                       </p>
                    </div>
                    <div className="opacity-20 absolute -right-4 bottom-[-10px]">
                        <BookOpen size={100} />
                    </div>
                 </div>
              </Link>
            </motion.div>

            {/* TWO RECTANGULAR CARDS */}
            <div className="grid grid-cols-2 gap-3">
                <Link href="/gallery?source=twa" className="bg-white dark:bg-[#151515] p-4 rounded-[1.5rem] shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between h-32 relative overflow-hidden">
                   <div className="w-9 h-9 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 flex items-center justify-center">
                      <ImageIcon size={18} />
                   </div>
                   <div>
                      <h4 className="font-bold text-base text-gray-900 dark:text-white leading-none mb-1">Gallery</h4>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">Campus life</p>
                   </div>
                </Link>

                <Link href="/events?source=twa" className="bg-white dark:bg-[#151515] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between h-32 relative overflow-hidden">
                   <div className="w-9 h-9 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 flex items-center justify-center">
                      <Calendar size={18} />
                   </div>
                   <div>
                      <h4 className="font-bold text-base text-gray-900 dark:text-white leading-none mb-1">Updates</h4>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">Notices</p>
                   </div>
                </Link>
            </div>
         </div>
      </div>

      {/* --- 6. CLASS TOPPERS (HIDDEN FOR SUBJECT TEACHERS & ADMINS) --- */}
      {/* Only show if: show_toppers is true (Student/ClassTeacher) AND user is NOT Admin */}
      {data?.show_toppers && user?.role !== 'admin' && data?.toppers?.length > 0 && (
        <div className="mb-8 px-4">
           <div className="flex justify-between items-center mb-3 ml-1">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Class Toppers</h3>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-500 px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 border border-yellow-100 dark:border-yellow-900/30">
                 <Award size={12} /> TOP 3
              </div>
           </div>
           
           <div className="grid grid-cols-3 gap-2">
              {data.toppers.map((top, i) => (
                 <div key={i} className="bg-white dark:bg-[#151515] p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center relative">
                    <div className={`absolute top-0 right-0 w-8 h-8 rounded-bl-2xl flex items-center justify-center font-bold text-white text-xs ${
                              i === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' : 
                              i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' : 
                              'bg-gradient-to-br from-orange-400 to-orange-600'
                        }`}>
                              {i + 1}
                        </div>

                    <div className="mt-1 w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-gray-100 to-gray-300 dark:from-gray-700 dark:to-gray-800 mb-2">
                      <img 
                        src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${top.image_url || 'GMPSimages/default_student.png'}`} 
                        className="w-full h-full rounded-full object-cover border border-white dark:border-[#151515]"
                        alt={top.student_name}
                      />
                    </div>
                    
                    <p className="text-[10px] font-bold text-gray-800 dark:text-white leading-tight line-clamp-2 min-h-[2.5em] w-full break-words">
                        {top.student_name}
                    </p>
                    
                    <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold mt-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                       {top.percentage}%
                    </span>
                 </div>
              ))}
           </div>
        </div>
      )}

      {/* --- 7. NOTICE BOARD (Clean & Modern) --- */}
      <div className="px-4 mb-8">
         <div className="flex justify-between items-end mb-3 ml-1">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Notice Board</h3>
            <Link href="/events?source=twa" className="text-[10px] font-semibold text-blue-600 flex items-center gap-1">
                View All <ArrowRight size={12} />
            </Link>
         </div>

         <div className="flex flex-col gap-3">
            {/* ANNOUNCEMENTS */}
            {data?.announcements?.map((ann, i) => (
                <div key={`ann-${i}`} className="bg-white dark:bg-[#151515] p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-50 dark:border-gray-800 flex gap-4 items-start">
                    {ann.image_url ? (
                        <div className="w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-gray-100">
                            <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${ann.image_url}`} className="w-full h-full object-cover" alt="Notice" />
                        </div>
                    ) : (
                       <div className="w-14 h-14 shrink-0 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500">
                          <Bell size={20} />
                       </div>
                    )}
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                           <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-1">{ann.title}</h4>
                           <span className="text-[9px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">NOTICE</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{ann.content}</p>
                    </div>
                </div>
            ))}

            {/* DAILY UPDATES */}
            {data?.updates?.map((upd, i) => (
                <div key={`upd-${i}`} className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 p-4 rounded-2xl border border-green-100 dark:border-green-900/20 flex gap-3 items-center">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-600">
                        <CheckCircle2 size={16} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight line-clamp-2">{upd.update_text}</p>
                    </div>
                </div>
            ))}

            {(!data?.announcements?.length && !data?.updates?.length) && (
                <div className="text-center py-6 bg-white dark:bg-[#151515] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                    <p className="text-xs text-gray-400">No new updates right now.</p>
                </div>
            )}
         </div>
      </div>

      {/* --- 8. BENTO GALLERY GRID --- */}
      <div className="px-4 mb-8">
         <div className="flex justify-between items-end mb-3 ml-1">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">LATEST MOMENTS</h3>
            <Link href="/gallery?source=twa" className="text-[10px] font-semibold text-blue-600 flex items-center gap-1">
                View All <ArrowRight size={12} />
            </Link>
         </div>

         {/* 1 Main + 2 Side Images Layout */}
         <div className="grid grid-cols-3 gap-2 h-48">
            <div className="col-span-2 relative rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-800">
               {data?.gallery && data.gallery[0] && (
                  <img 
                    src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${data.gallery[0].image_url}`} 
                    className="w-full h-full object-cover" 
                    alt="Gallery"
                  />
               )}
            </div>
            
            <div className="col-span-1 flex flex-col gap-2">
               <div className="h-1/2 relative rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-800">
                  {data?.gallery && data.gallery[1] && (
                     <img 
                       src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${data.gallery[1].image_url}`} 
                       className="w-full h-full object-cover" 
                       alt="Gallery"
                     />
                  )}
               </div>
               <div className="h-1/2 relative rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-800">
                  {data?.gallery && data.gallery[2] && (
                     <img 
                       src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${data.gallery[2].image_url}`} 
                       className="w-full h-full object-cover" 
                       alt="Gallery"
                     />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                     <span className="text-white text-xs font-bold">+ More</span>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* --- 9. ADMIN THOUGHTS --- */}
      <div className="mb-10 px-4">
         <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Administration</h3>
         <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
            {data?.thoughts && data.thoughts.map((th, i) => (
               <div key={i} className="min-w-[260px] bg-[#1a1a1a] p-5 rounded-3xl text-white shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-5 -mt-5"></div>
                  
                  <div className="flex items-center gap-3 mb-3 relative z-10">
                     <img 
                       src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${th.image_url}`} 
                       className="w-10 h-10 rounded-full object-cover border border-white/20"
                       alt={th.name}
                     />
                     <div>
                        <h4 className="font-bold text-sm text-white leading-tight">{th.name}</h4>
                        <p className="text-[10px] text-blue-400 uppercase font-bold tracking-wider">{th.position}</p>
                     </div>
                  </div>
                  <p className="text-xs text-gray-300 italic leading-relaxed opacity-90 relative z-10">"{th.quote}"</p>
               </div>
            ))}
         </div>
      </div>
      
      {/* --- 10. FEEDBACK FORM (Student Only) --- */}
      {user?.role === 'student' && (
        <div className="px-4 mb-12">
           <div className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-[1.5rem] p-6 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                   <Send size={18} /> Suggestion Box
                </h3>
                <p className="text-emerald-100 text-xs mb-4 opacity-90">Your voice matters. Let us know how we can improve.</p>
                
                <form className="relative">
                   <textarea 
                     className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-sm text-white placeholder-emerald-100/50 focus:outline-none focus:bg-white/20 transition-colors resize-none" 
                     rows="2" 
                     placeholder="Write here..."
                   ></textarea>
                   <button className="absolute bottom-3 right-3 bg-white text-teal-700 p-2 rounded-lg shadow-sm hover:scale-105 transition-transform">
                      <Send size={16} />
                   </button>
                </form>
              </div>
           </div>
        </div>
      )}

      {/* --- 11. SHARE CARD --- */}
      <div className="px-4 mb-8">
         <div onClick={handleShare} className="bg-indigo-600 rounded-2xl p-4 flex items-center justify-between text-white shadow-lg shadow-indigo-500/20 cursor-pointer active:scale-95 transition-transform">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Share2 size={20} />
               </div>
               <div>
                  <h4 className="font-bold text-sm">Share App</h4>
                  <p className="text-[10px] text-indigo-200">Invite friends to GMPS</p>
               </div>
            </div>
            <ArrowRight size={18} className="opacity-70" />
         </div>
      </div>

      {/* --- 12. FOOTER --- */}
      <div className="pt-8 pb-10 text-center border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#050505]">
         <div className="flex justify-center gap-6 mb-6">
            {data?.contacts?.phone && (
               <a href={`tel:${data.contacts.phone}`} className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center text-green-600 shadow-sm border border-green-100 dark:border-green-900/30">
                  <Phone size={18} />
               </a>
            )}
            {data?.contacts?.email && (
               <a href={`mailto:${data.contacts.email}`} className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500 shadow-sm border border-red-100 dark:border-red-900/30">
                  <Mail size={18} />
               </a>
            )}
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-500 shadow-sm border border-blue-100 dark:border-blue-900/30">
               <MapPin size={18} />
            </div>
         </div>
         
         <div className="mb-6 px-10">
            <h2 className="font-bold text-gray-900 dark:text-white text-sm">Govind Madhav Public School</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Gondey, Pratapgarh, U.P.</p>
         </div>

         <a href="https://www.utarts.in" target="_blank" rel="noopener noreferrer" className="inline-block hover:opacity-80 transition-opacity">
            <img 
                src="https://utarts.in/images/poweredbyutarts.webp" 
                alt="Powered by UT Arts" 
                className="h-6 w-auto mx-auto mb-1" 
            />
            <span className="text-[9px] text-gray-400 tracking-wider font-medium">visit www.utarts.in</span>
         </a>
      </div>

{/* --- IMAGE LIGHTBOX MODAL --- */}
<AnimatePresence>
        {viewImage && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setViewImage(null)}
          >
            <button 
              onClick={() => setViewImage(null)}
              className="absolute top-6 right-6 w-10 h-10 bg-white/10 rounded-full text-white flex items-center justify-center z-20"
            >
              <X size={24} />
            </button>
            
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={viewImage}
              className="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}