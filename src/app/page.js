"use client";
import { useEffect, useState, useRef } from 'react';
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useAppModal } from "../context/ModalContext"; 
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "../context/SessionContext";
import SessionSwitcher from "../components/SessionSwitcher";
import NotificationSidebar from '../components/NotificationSidebar';
import { 
  Moon, Sun, Bell, BookOpen, Image as ImageIcon, Calendar, 
  Award, Edit3, Users, User, Send, Phone, Mail, MapPin, ArrowRight, Share2, 
  Shield, CheckCircle2, X, Loader2, CreditCard, FileText, Clock, 
  Settings, UserCheck, PenTool, MonitorPlay, PlayCircle, CalendarMinus, 
  Library, Bus, CalendarDays, BarChart3, CalendarRange, 
  Gift, Book, Download, GraduationCap, Megaphone, HelpCircle, 
  Trophy, PhoneCall, NotebookPen, FileSpreadsheet, Activity, Wallet, ExternalLink, 
  MessageSquare, Film, Lock, UploadCloud, LibraryBig
} from 'lucide-react';
import Link from 'next/link';
import BirthdaySection from '../components/BirthdaySection';

export default function Home() {
  const { user } = useAuth();
  const { activeSession } = useSession();
  const { theme, toggleTheme } = useTheme();
  const { showModal } = useAppModal();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [data, setData] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewImage, setViewImage] = useState(null);

  const [suggestion, setSuggestion] = useState("");
  const [sendingSuggestion, setSendingSuggestion] = useState(false);

  // --- MOCK DATA FOR THE CREATIVE BENTO (Will be replaced by API later) ---
  const mockFeeDue = "4,500";
  const mockAttendance = "76%";

  // --- 1. BLOCK INSTALL PROMPT & BROWSER VISUALS ---
  useEffect(() => {
    const handleInstallPrompt = (e) => {
      e.preventDefault();
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, []);

  // --- 2. BACK BUTTON INTERCEPTOR (FIXED EXIT) ---
  const isExiting = useRef(false);

  useEffect(() => {
    window.history.pushState(null, null, window.location.pathname);

    const handlePopState = (event) => {
      if (isExiting.current) return;
      window.history.pushState(null, null, window.location.pathname);
      
      showModal(
        "Exit App?", 
        "Are you sure you want to exit the application?", 
        "danger", 
        () => {
           isExiting.current = true; 
           setTimeout(() => {
             window.history.go(-2);
           }, 10);
        },
        "Exit App",
        "Stay"
      );
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showModal]);

  // --- 3. DATA FETCHING ---
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/home.php`, {
          method: 'POST',
          body: JSON.stringify({ user_id: user?.id, role: user?.role })
        });
        const json = await res.json();

        const wtRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_posts.php?action=get_whats_today_public`);
        const wtJson = await wtRes.json();

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
    if (user) fetchData(); 
  }, [user]);

  // --- 4. SLIDESHOW TIMER ---
  useEffect(() => {
    if (!data?.slides || data.slides.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % data.slides.length);
    }, 4000); 
    return () => clearInterval(timer);
  }, [data?.slides]);

  // --- 5. SHARE FUNCTION ---
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Govind Madhav Public School',
          text: 'Check out our school Website!',
          url: 'https://govindmadhav.com/',
        });
      } catch (error) {
        console.log('Error sharing', error);
      }
    } else {
      showModal("Share", "Share not supported on this browser.", "neutral");
    }
  };

  // --- 6. SUGGESTION SUBMIT FUNCTION ---
  const handleSuggestionSubmit = async (e) => {
    e.preventDefault();
    if (!suggestion.trim()) return;

    setSendingSuggestion(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/submit_feedback.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user?.id, 
          role: user?.role,
          message: suggestion 
        })
      });
      
      const result = await res.json();
      
      if (result.success || result.status === 'success') {
        showModal("Sent!", "Your suggestion has been sent to the admin.", "success");
        setSuggestion(""); 
      } else {
        showModal("Error", "Could not send suggestion. Please try again.", "danger");
      }
    } catch (error) {
      showModal("Error", "Network error. Please check your connection.", "danger");
    } finally {
      setSendingSuggestion(false);
    }
  };

  // --- LOGIC HELPERS ---
  const getCardStyle = () => {
    if (user?.role === 'admin') return "from-slate-800 to-black"; 
    if (user?.role === 'teacher') return "from-indigo-600 to-purple-600"; 
    return "from-orange-500 to-red-500"; 
  };

  const getBadgeText = () => {
    if (user?.role === 'admin') return user?.level == 1 ? 'Super Admin' : 'Admin';
    if (user?.role === 'teacher') {
      if (data?.user_details?.class_name) return data.user_details.class_name;
      return 'Subject Teacher';
    }
    return data?.user_details?.class_name || 'Student';
  };

  const getDisplayName = () => {
    if (!user?.name) return 'User';
    if (user?.role === 'student') return user.name.split(' ')[0]; 
    return user.name.split(' ').slice(0, 2).join(' '); 
  };

  if (loading) return <HomeSkeleton />;

  return (
    <div className="h-screen overflow-y-auto bg-[#F2F6FA] dark:bg-[#0a0a0a] text-gray-800 dark:text-gray-100 font-sans overflow-x-hidden overscroll-none">
      
      {/* --- APP HEADER --- */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-black/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-5 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
            <img 
              src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}GMPSimages/logonew.webp`} 
              alt="GMPS Logo" 
              loading="lazy"
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
           <div 
               onClick={() => setIsNotifOpen(true)}
               className="w-9 h-9 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-all relative cursor-pointer active:scale-95"
            >
               <Bell size={18} />
               <div className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-black" />
            </div>
        </div>
      </div>

      {/* --- GLOBAL SESSION SWITCHER --- */}
      <div className="px-4 mt-2 flex justify-between items-center">
         <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Academic Session</h2>
         <SessionSwitcher />
      </div>
      {/* --- PROFILE CARD --- */}
      <div className="px-4 mt-2 mb-8">
        <div className="relative">
          <div className={`bg-gradient-to-r ${getCardStyle()} rounded-[2.5rem] p-7 text-white shadow-xl flex justify-between items-center relative overflow-hidden min-h-[150px]`}>
              <div className="absolute -left-10 -bottom-20 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex flex-col relative z-10 flex-1 min-w-0 pr-2">
                  <p className="text-white/80 text-[11px] font-bold uppercase tracking-widest mb-0.5">Welcome Back</p>
                  <h2 className={`font-black leading-tight tracking-tight mb-4 ${
                     getDisplayName()?.length > 20 ? 'text-[20px]' :  
                     getDisplayName()?.length > 12 ? 'text-[28px]' :  
                     'text-[35px]'                                    
                  }`}>
                  {getDisplayName()}
                  </h2>
                  <div className="inline-block self-start">
                      <span className="bg-black/20 backdrop-blur-md text-white text-[11px] font-bold px-4 py-2 rounded-full shadow-sm border border-white/10">
                          {getBadgeText()}
                      </span>
                  </div>
              </div>

              <div className="relative z-20 -mr-3 flex-shrink-0"> 
                  <div className="w-28 h-28 rounded-full shadow-none bg-gray-200 overflow-hidden">
                      <img 
                          src={user?.pic ? `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${user.pic}` : `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}GMPSimages/default_user.png`}
                          alt="Profile"
                          loading="lazy"
                          className="w-full h-full object-cover"
                      />
                  </div>
              </div>
          </div>
        </div>
      </div>

      {/* --- HERO SLIDESHOW --- */}
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

      {/* ======================================================== */}
      {/* --- CREATIVE BENTO DASHBOARD (SKETCH INSPIRED) --- */}
      {/* ======================================================== */}
      <div className="px-4 mb-10 mt-2">
         
         {/* ------------------------------------------------ */}
         {/* 1. STUDENT DASHBOARD */}
         {/* ------------------------------------------------ */}
         {(user?.role === 'student' || !user?.role) && (
            <div className="space-y-6">
               
               {/* --- THE CREATIVE 'CORE ESSENTIALS' BENTO --- */}
               <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Core Essentials</h3>
                  <div className="grid grid-cols-2 gap-3 h-[18rem]">
                     
                     {/* 1. Top Wide Card (Work) */}
                     <Link href="/work?source=twa" className="col-span-2 bg-gradient-to-r from-[#A3E635] to-[#84CC16] rounded-[2rem] p-5 flex items-center justify-between shadow-md shadow-lime-500/20 active:scale-95 transition-transform">
                        <div>
                           <h3 className="text-3xl font-black text-white leading-none">Daily Work</h3>
                           <p className="text-lime-100 text-xs font-medium mt-1">Homework & Assignments</p>
                        </div>
                        <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md">
                           <BookOpen size={28} />
                        </div>
                     </Link>

                     {/* 2. Left Tall Card (Fees) */}
                     <Link href="/fees" className="col-span-1 bg-gradient-to-b from-[#FDBA74] to-[#F97316] rounded-[2rem] p-5 flex flex-col justify-between shadow-md shadow-orange-500/20 active:scale-95 transition-transform relative overflow-hidden">
                        <div className="relative z-10 flex flex-col items-center pt-2">
                           <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md shrink-0 mb-3">
                              <CreditCard size={20} />
                           </div>
                           <h3 className="text-[26px] font-black text-white tracking-wide">
                              Fees
                           </h3>
                        </div>
                        <div className="relative z-10 mt-auto text-center bg-white/20 backdrop-blur-sm rounded-xl py-2 px-1 border border-white/20">
                           <p className="text-orange-100 text-[9px] uppercase tracking-widest font-bold mb-0.5">Due</p>
                           <h4 className="text-lg font-black text-white leading-none">₹{mockFeeDue}</h4>
                        </div>
                        <CreditCard className="absolute -bottom-6 -right-6 w-32 h-32 text-white opacity-20 transform -rotate-12 pointer-events-none" />
                     </Link>

                     {/* Right Side Stack */}
                     <div className="col-span-1 flex flex-col gap-3">
                        
                        {/* 3. Perfect Circle Card (Attendance) */}
                        <Link href="/profile" className="flex-1 rounded-[2rem] bg-gradient-to-br from-[#2DD4BF] to-[#0F766E] flex flex-col items-center justify-center shadow-md shadow-teal-500/20 active:scale-95 transition-transform p-4 text-center relative overflow-hidden">
                           <CheckCircle2 size={24} className="text-teal-200 mb-2 relative z-10" />
                           <p className="text-teal-100 text-[11px] uppercase tracking-widest font-bold mb-1 relative z-10">Attendance</p>
                           <h3 className="text-4xl font-black text-white leading-none relative z-10">{mockAttendance}</h3>
                           <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                        </Link>

                        {/* 4. Bottom Rectangle Card (Results) */}
                        <Link href="/results" className="h-[4.5rem] bg-gradient-to-r from-[#22C55E] to-[#15803D] rounded-[1.5rem] p-4 flex items-center justify-center gap-2 shadow-md shadow-green-500/20 active:scale-95 transition-transform">
                           <FileSpreadsheet size={20} className="text-green-200" />
                           <h3 className="text-xl font-black text-white tracking-wide">Results</h3>
                        </Link>
                     </div>

                  </div>
               </div>
               
               {/* --- CAMPUS TOOLS GRID (Untouched Icons as requested) --- */}
               <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pt-3 mb-3 ml-1">Campus Tools</h3>
                  <div className="bg-white dark:bg-[#151515] border border-gray-100 dark:border-gray-800 rounded-[2rem] p-5 shadow-sm">
                     <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                        <ToolAppIcon title="Notices" icon={Bell} link="/events?source=twa" iconColor="text-rose-500" />
                        <ToolAppIcon title="Timetable" icon={Clock} link="/profile" iconColor="text-indigo-500" />
                        <ToolAppIcon title="Video Lect." icon={PlayCircle} link="/virtual-class" iconColor="text-sky-500" />
                        <ToolAppIcon title="Live Class" icon={MonitorPlay} link="/virtual-class" iconColor="text-red-500" />
                        
                        <ToolAppIcon title="Assignments" icon={PenTool} link="/assignments" iconColor="text-teal-500" />
                        <ToolAppIcon title="Syllabus" icon={Book} link="/syllabus" iconColor="text-fuchsia-500" />
                        <ToolAppIcon title="Notes" icon={NotebookPen} link="#" iconColor="text-amber-500" />
                        <ToolAppIcon title="Events" icon={CalendarRange} link="/events?source=twa" iconColor="text-pink-500" />
                        
                        <ToolAppIcon title="Exam Sched." icon={CalendarDays} link="#" iconColor="text-red-500" />
                        <ToolAppIcon title="Library" icon={LibraryBig} link="/library" iconColor="text-blue-600" />
                        <ToolAppIcon title="Transport" icon={Bus} link="#" iconColor="text-slate-600" />
                        <ToolAppIcon title="Apply Leave" icon={CalendarMinus} link="/apply-leave" iconColor="text-purple-500" />
                        
                        <ToolAppIcon title="My Rank" icon={Trophy} link="#" iconColor="text-yellow-500" />
                        <ToolAppIcon title="Downloads" icon={Download} link="#" iconColor="text-gray-500" />
                        <ToolAppIcon title="Calendar" icon={CalendarDays} link="/calendar" iconColor="text-purple-600" />
                        <ToolAppIcon title="Directory" icon={PhoneCall} link="#" iconColor="text-emerald-600" />
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* ------------------------------------------------ */}
         {/* 2. TEACHER DASHBOARD */}
         {/* ------------------------------------------------ */}
         {user?.role === 'teacher' && (
            <div className="space-y-6">
               
               {/* Creative Bento for Teachers */}
               <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Core Essentials</h3>
                  <div className="grid grid-cols-2 gap-3 h-[18rem]">
                     
                     {/* 1. UPLOAD WORK (Full Width) */}
                     <Link href="/work_upload" className="col-span-2 bg-gradient-to-r from-[#818CF8] to-[#4F46E5] rounded-[2rem] p-5 flex items-center justify-between shadow-md active:scale-95 transition-transform">
                        <div>
                           <h3 className="text-3xl font-black text-white leading-none">Upload Work</h3>
                           <p className="text-indigo-100 text-xs font-medium mt-1">Assignments & Study Material</p>
                        </div>
                        <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md">
                           <UploadCloud size={28} />
                        </div>
                     </Link>

                     {/* 2. MY STUDENTS (Tall Card - Locked for Subject Teachers) */}
                     <Link href={user?.assigned_class_id ? "/teacher?tab=my_students" : "#"} 
                           onClick={(e) => { if(!user?.assigned_class_id) e.preventDefault(); }}
                           className={`col-span-1 bg-gradient-to-b from-[#FDA4AF] to-[#E11D48] rounded-[2rem] p-5 flex flex-col justify-between shadow-md relative overflow-hidden ${user?.assigned_class_id ? 'active:scale-95 transition-transform' : 'opacity-70 cursor-not-allowed'}`}>
                        <div className="relative z-10 flex flex-col items-center h-full pt-2">
                           <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md shrink-0"><Users size={20} /></div>
                           <div className="flex-1 flex flex-col items-center justify-center mt-2 text-center">
                               <h3 className="text-2xl font-black text-white tracking-wide leading-tight">My<br/>Students</h3>
                           </div>
                        </div>
                        <Users className="absolute -bottom-6 -right-6 w-32 h-32 text-white opacity-20 transform -rotate-12 pointer-events-none" />
                        
                        {/* Lock Overlay for Subject Teachers */}
                        {!user?.assigned_class_id && (
                            <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center rounded-[2rem]">
                                <Lock className="text-white opacity-80 mb-1" size={28}/>
                                <span className="text-[9px] font-bold text-white uppercase tracking-widest text-center px-2">Class Teachers<br/>Only</span>
                            </div>
                        )}
                     </Link>

                     {/* 3. ATTENDANCE & MARKS (Stacked) */}
                     <div className="col-span-1 flex flex-col gap-3">
                        <Link href="/attendance?source=twa" className="flex-1 rounded-[2rem] bg-gradient-to-br from-[#34D399] to-[#059669] flex flex-col items-center justify-center shadow-md active:scale-95 transition-transform p-4 text-center">
                            <CheckCircle2 size={24} className="text-teal-200 mb-2 relative z-10" />
                           <p className="text-emerald-100 text-[11px] uppercase tracking-widest font-bold mb-1">Register</p>
                           <h3 className="text-2xl font-black text-white leading-none">Attendance</h3>
                        </Link>
                        <Link href="/teacher?tab=marks" className="h-[4.5rem] bg-gradient-to-r from-[#FBBF24] to-[#D97706] rounded-[1.5rem] p-4 flex items-center justify-center shadow-md active:scale-95 transition-transform gap-3">
                           <h3 className="text-lg font-black text-white tracking-wide">Marks Entry</h3>
                           <FileSpreadsheet size={20} className="text-orange-200" />
                        </Link>
                     </div>
                  </div>
               </div>

               {/* Teacher Tools Grid */}
               <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Staff Tools</h3>
                  <div className="bg-white dark:bg-[#151515] border border-gray-100 dark:border-gray-800 rounded-[2rem] p-5 shadow-sm">
                     <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                        {/* Top Row */}
                        <ToolAppIcon title="My Atten." icon={UserCheck} link="/teacher/my-attendance" iconColor="text-green-500" />
                        <ToolAppIcon title="Notices" icon={Bell} link="/events?tab=notices" iconColor="text-rose-500" />
                        <ToolAppIcon title="Events" icon={CalendarRange} link="/events?tab=timeline" iconColor="text-pink-500" />
                        <ToolAppIcon title="Timetable" icon={Clock} link="/teacher?tab=timetable" iconColor="text-indigo-500" />
                        
                        {/* Second Row */}
                        <ToolAppIcon title="Gallery" icon={ImageIcon} link="/gallery" iconColor="text-purple-500" />
                        <ToolAppIcon title="Reels" icon={Film} link="/gallery?tab=reels" iconColor="text-red-500" />
                        <ToolAppIcon title="Apply Leave" icon={CalendarMinus} link="/apply-leave" iconColor="text-orange-500" />
                        <ToolAppIcon title="Ac. Calendar" icon={CalendarDays} link="/calendar" iconColor="text-purple-600" />

                        {/* Third Row */}
                        <ToolAppIcon title="Toppers" icon={Award} link="/teacher?tab=toppers" iconColor="text-amber-500" />
                        <ToolAppIcon title="Report Cards" icon={FileText} link="/teacher?tab=report_cards" iconColor="text-blue-500" />
                        <ToolAppIcon title="Post history" icon={Clock} link="/work_history" iconColor="text-cyan-500" />
                        <ToolAppIcon title="My Profile" icon={User} link="/teacher" iconColor="text-slate-600" />

                        {/* Fourth Row (Future Features) */}
                        <ToolAppIcon title="Syllabus" icon={Book} link="/syllabus" iconColor="text-fuchsia-500" />
                        <ToolAppIcon title="Virtual Class" icon={MonitorPlay} link="/virtual-class" iconColor="text-red-500" />
                        <ToolAppIcon title="Payslips" icon={Wallet} link="#" iconColor="text-emerald-600" />

                        <ToolAppIcon title="Assignments" icon={PenTool} link="/assignments" iconColor="text-teal-500" />
                        <ToolAppIcon title="Library" icon={LibraryBig} link="/library" iconColor="text-blue-600" />
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* ------------------------------------------------ */}
         {/* 3. ADMIN DASHBOARD */}
         {/* ------------------------------------------------ */}
         {user?.role === 'admin' && (
            <div className="space-y-6">
               
               <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Management</h3>
                  <div className="grid grid-cols-2 gap-3 h-[18rem]">
                     
                     {/* UNLOCKED: BROADCAST */}
                     <Link href="/admin/posts" className="col-span-2 bg-gradient-to-r from-[#FCA5A5] to-[#E11D48] rounded-[2rem] p-5 flex items-center justify-between shadow-md active:scale-95 transition-transform">
                        <div>
                           <h3 className="text-3xl font-black text-white leading-none">Broadcast</h3>
                           <p className="text-rose-100 text-xs font-medium mt-1">Post Notices & Updates</p>
                        </div>
                        <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md">
                           <Megaphone size={28} />
                        </div>
                     </Link>

                     {/* UNLOCKED: STUDENTS */}
                     <Link href="/admin?tab=students" className="col-span-1 bg-gradient-to-b from-[#7DD3FC] to-[#0284C7] rounded-[2rem] p-5 flex flex-col justify-between shadow-md active:scale-95 transition-transform relative overflow-hidden">
                        <div className="relative z-10 flex flex-col items-center h-full pt-2">
                           <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md shrink-0"><GraduationCap size={20} /></div>
                           <div className="flex-1 flex items-center justify-center">
                              <h3 className="text-3xl font-black text-white tracking-wide">Students</h3>
                           </div>
                        </div>
                        <GraduationCap className="absolute -bottom-6 -right-6 w-32 h-32 text-white opacity-20 transform -rotate-12 pointer-events-none" />
                     </Link>

                     <div className="col-span-1 flex flex-col gap-3">
                        
                        {/* LOCKED: TEACHERS */}
                        <Link 
                            href={user?.level == 1 ? "/admin?tab=teachers" : "#"} 
                            onClick={(e) => { if(user?.level != 1) { e.preventDefault(); alert("Super Admin Only"); } }}
                            className={`flex-1 rounded-[2rem] bg-gradient-to-br from-[#D8B4FE] to-[#9333EA] flex flex-col items-center justify-center shadow-md p-4 text-center relative overflow-hidden ${user?.level == 1 ? 'active:scale-95 transition-transform' : 'opacity-70 cursor-not-allowed'}`}
                        >
                           <User size={20} className="text-purple-200" />
                           <p className="text-purple-100 text-[11px] uppercase tracking-widest font-bold mb-1 mt-1">Manage Staff</p>
                           <h3 className="text-2xl font-black text-white leading-none">Teachers</h3>
                           {user?.level != 1 && <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center rounded-[2rem]"><Lock size={24} className="text-white opacity-80" /></div>}
                        </Link>
                        
                        {/* LOCKED: FEES */}
                        <Link 
                            href={user?.level == 1 ? "/admin?tab=fees" : "#"} 
                            onClick={(e) => { if(user?.level != 1) { e.preventDefault(); alert("Super Admin Only"); } }}
                            className={`h-[4.5rem] bg-gradient-to-r from-[#6EE7B7] to-[#059669] rounded-[1.5rem] p-4 flex items-center justify-center shadow-md gap-3 relative overflow-hidden ${user?.level == 1 ? 'active:scale-95 transition-transform' : 'opacity-70 cursor-not-allowed'}`}
                        >
                           <div className="w-10 h-10 flex items-center rounded-full justify-center text-white backdrop-blur-md shrink-0">
                              <CreditCard size={20} />
                           </div>
                           <h3 className="text-xl font-black text-white tracking-wide">Fees</h3>
                           {user?.level != 1 && <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center rounded-[1.5rem]"><Lock size={24} className="text-white opacity-80" /></div>}
                        </Link>
                     </div>
                  </div>
               </div>

               {/* Admin Tools Grid */}
               <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Admin Tools</h3>
                  <div className="bg-white dark:bg-[#151515] border border-gray-100 dark:border-gray-800 rounded-[2rem] p-5 shadow-sm">
                     <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                        
                        {/* UNLOCKED TOOL */}
                        <ToolAppIcon title="Settings" icon={Settings} link="/settings" iconColor="text-gray-600" />

                        {/* EXPLICITLY LOCKED TOOLS (Everything else) */}
                        <div onClick={(e) => { if(user?.level != 1) { e.preventDefault(); alert("Super Admin Only"); } }}>
                            <ToolAppIcon title="Events" icon={CalendarRange} link={user?.level == 1 ? "/events?source=twa" : "#"} iconColor={user?.level == 1 ? "text-orange-500" : "text-gray-400"} />
                        </div>
                        <div onClick={(e) => { if(user?.level != 1) { e.preventDefault(); alert("Super Admin Only"); } }}>
                            <ToolAppIcon title="Gallery" icon={ImageIcon} link={user?.level == 1 ? "/gallery?source=twa" : "#"} iconColor={user?.level == 1 ? "text-sky-500" : "text-gray-400"} />
                        </div>
                        <div onClick={(e) => { if(user?.level != 1) { e.preventDefault(); alert("Super Admin Only"); } }}>
                            <ToolAppIcon title="Calendar" icon={CalendarDays} link={user?.level == 1 ? "/calendar" : "#"} iconColor={user?.level == 1 ? "text-purple-600" : "text-gray-400"} />
                        </div>
                        <div onClick={(e) => { if(user?.level != 1) { e.preventDefault(); alert("Super Admin Only"); } }}>
                            <ToolAppIcon title="Syllabus" icon={Book} link={user?.level == 1 ? "/syllabus" : "#"} iconColor={user?.level == 1 ? "text-fuchsia-500" : "text-gray-400"} />
                        </div>
                        <div onClick={(e) => { if(user?.level != 1) { e.preventDefault(); alert("Super Admin Only"); } }}>
                            <ToolAppIcon title="Library" icon={LibraryBig} link={user?.level == 1 ? "/library" : "#"} iconColor={user?.level == 1 ? "text-blue-600" : "text-gray-400"} />
                        </div>
                        <div onClick={(e) => { if(user?.level != 1) { e.preventDefault(); alert("Super Admin Only"); } }}>
                            <ToolAppIcon title="Staff Atten." icon={UserCheck} link={user?.level == 1 ? "/admin/staff-attendance" : "#"} iconColor={user?.level == 1 ? "text-green-500" : "text-gray-400"} />
                        </div>
                        <div onClick={(e) => { if(user?.level != 1) { e.preventDefault(); alert("Super Admin Only"); } }}>
                            <ToolAppIcon title="Suggestions" icon={HelpCircle} link={user?.level == 1 ? "/admin?tab=suggestions" : "#"} iconColor={user?.level == 1 ? "text-pink-500" : "text-gray-400"} />
                        </div>
                        <div onClick={(e) => { if(user?.level != 1) { e.preventDefault(); alert("Super Admin Only"); } }}>
                            <ToolAppIcon title="Reports" icon={Activity} link={user?.level == 1 ? "/admin?tab=reports" : "#"} iconColor={user?.level == 1 ? "text-amber-500" : "text-gray-400"} />
                        </div>
                        <div onClick={(e) => { if(user?.level != 1) { e.preventDefault(); alert("Super Admin Only"); } }}>
                            <ToolAppIcon title="Leave Appr." icon={CalendarMinus} link={user?.level == 1 ? "/admin?tab=leaves" : "#"} iconColor={user?.level == 1 ? "text-red-500" : "text-gray-400"} />
                        </div>
                        <div onClick={(e) => { if(user?.level != 1) { e.preventDefault(); alert("Super Admin Only"); } }}>
                            <ToolAppIcon title="SMS Blast" icon={MessageSquare} link={user?.level == 1 ? "/admin?tab=sms" : "#"} iconColor={user?.level == 1 ? "text-indigo-500" : "text-gray-400"} />
                        </div>
                        <div onClick={(e) => { if(user?.level != 1) { e.preventDefault(); alert("Super Admin Only"); } }}>
                            <ToolAppIcon title="Expenses" icon={CreditCard} link={user?.level == 1 ? "/admin?tab=expenses" : "#"} iconColor={user?.level == 1 ? "text-emerald-600" : "text-gray-400"} />
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         )}
      </div>

      {/* --- WHAT'S TODAY --- */}
      {data?.whatsToday && (
        <div className="px-4 mb-8">
           <div className="bg-white dark:bg-[#151515] p-4 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between relative overflow-hidden">
              <div className="relative z-10 pl-2">
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                 </p>
                 <h2 className="text-2xl font-black text-gray-800 dark:text-white leading-none">
                    What's<br/>
                    <span className="text-indigo-600">Today!</span>
                 </h2>
              </div>

              <div 
                className="w-40 h-40 rounded-2xl overflow-hidden shadow-md border-2 border-white dark:border-gray-700 cursor-pointer active:scale-95 transition-transform"
                onClick={() => setViewImage(`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${data.whatsToday.image_url}`)}
              >
                 <img 
                    src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${data.whatsToday.image_url}`} 
                    className="w-full h-full object-cover" 
                    loading="lazy"
                    alt="Today's Special"
                 />
              </div>
              <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10"></div>
           </div>
        </div>
      )}

      <BirthdaySection />
      {/* --- CLASS TOPPERS --- */}
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
                        src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${top.image_url || 'GMPSimages/default_user.png'}`} 
                        className="w-full h-full rounded-full object-cover border border-white dark:border-[#151515]"
                        loading="lazy"
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

      {/* --- NOTICE BOARD --- */}
      <div className="px-4 mb-8">
         <div className="flex justify-between items-end mb-3 ml-1">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Notice Board</h3>
            <Link href="/events?source=twa" className="text-[10px] font-semibold text-blue-600 flex items-center gap-1">
                View All <ArrowRight size={12} />
            </Link>
         </div>

         <div className="flex flex-col gap-3">
            {data?.announcements?.map((ann, i) => (
                <div key={`ann-${i}`} className="bg-white dark:bg-[#151515] p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-50 dark:border-gray-800 flex gap-4 items-start">
                    {ann.image_url ? (
                        <div className="w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-gray-100">
                            <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${ann.image_url}`} className="w-full h-full object-cover" loading="lazy" alt="Notice" />
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

            {(!data?.announcements?.length && !data?.updates?.length) && (
                <div className="text-center py-6 bg-white dark:bg-[#151515] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                    <p className="text-xs text-gray-400">No new updates right now.</p>
                </div>
            )}
         </div>
      </div>

      {/* --- GALLERY GRID --- */}
      <div className="px-4 mb-8">
         <div className="flex justify-between items-end mb-3 ml-1">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">LATEST MOMENTS</h3>
            <Link href="/gallery?source=twa" className="text-[10px] font-semibold text-blue-600 flex items-center gap-1">
                View All <ArrowRight size={12} />
            </Link>
         </div>

         <div className="grid grid-cols-3 gap-2 h-48">
            <div className="col-span-2 relative rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-800">
               {data?.gallery && data.gallery[0] && (
                  <img 
                    src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${data.gallery[0].image_url}`} 
                    className="w-full h-full object-cover" 
                    loading="lazy"
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
                       loading="lazy"
                       alt="Gallery"
                     />
                  )}
               </div>
               <div className="h-1/2 relative rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-800">
                  {data?.gallery && data.gallery[2] && (
                     <img 
                       src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${data.gallery[2].image_url}`} 
                       className="w-full h-full object-cover" 
                       loading="lazy"
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

      {/* --- ADMIN THOUGHTS --- */}
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
                       loading="lazy"
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
      
      {/* --- FEEDBACK FORM --- */}
      {user?.role === 'student' && (
        <div className="px-4 mb-12">
           <div className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-[1.5rem] p-6 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                   <Send size={18} /> Suggestion Box
                </h3>
                <p className="text-emerald-100 text-xs mb-4 opacity-90">Your voice matters. Let us know how we can improve.</p>
                
                <form className="relative" onSubmit={handleSuggestionSubmit} autoComplete="off">
                   <textarea 
                     className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-sm text-white placeholder-emerald-100/50 focus:outline-none focus:bg-white/20 transition-colors resize-none" 
                     rows="2" 
                     placeholder="Write here..."
                     value={suggestion}
                     onChange={(e) => setSuggestion(e.target.value)}
                     required
                     autoComplete="off"
                   ></textarea>
                   <button 
                      type="submit" 
                      disabled={sendingSuggestion}
                      className="absolute bottom-3 right-3 bg-white text-teal-700 p-2 rounded-lg shadow-sm hover:scale-105 transition-transform disabled:opacity-50"
                   >
                      {sendingSuggestion ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                   </button>
                </form>
              </div>
           </div>
        </div>
      )}

      {/* --- SHARE CARD --- */}
      <div className="px-4 mb-8">
         <div onClick={handleShare} className="bg-indigo-600 rounded-2xl p-4 flex items-center justify-between text-white shadow-lg shadow-indigo-500/20 cursor-pointer active:scale-95 transition-transform">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Share2 size={20} />
               </div>
               <div>
                  <h4 className="font-bold text-sm">Share School Website</h4>
                  <p className="text-[10px] text-indigo-200">Invite friends to GMPS</p>
               </div>
            </div>
            <ArrowRight size={18} className="opacity-70" />
         </div>
      </div>

      {/* --- FOOTER --- */}
      <div className="pt-8 pb-10 text-center border-t border-gray-200 dark:border-gray-800 dark:bg-[#050505]">
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

         <span className="flex items-center text-xs justify-center gap-2 pb-12">
              Designed & Developed by
              <a 
                href="https://www.utarts.in" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1.5"
              >
                <img 
                  src="https://www.utarts.in/images/UTArt_Logo.webp" 
                  alt="UT Arts Logo" 
                  className="h-6 w-6 rounded-full object-cover border border-gray-200"
                />
                UT Arts
                <ExternalLink size={10} />
              </a>
            </span>
      </div>
      <NotificationSidebar 
                isOpen={isNotifOpen} 
                onClose={() => setIsNotifOpen(false)} 
            />

      {/* --- IMAGE LIGHTBOX --- */}
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
              onClick={(e) => e.stopPropagation()} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- ENTERPRISE UI COMPONENT (For Campus Tools Grid) ---
function ToolAppIcon({ title, icon: Icon, link, iconColor }) {
    return (
        <Link href={link} className="flex flex-col items-center gap-2 group active:scale-90 transition-transform">
            <div className="w-[3.5rem] h-[3.5rem] bg-gray-50 dark:bg-[#1a1a1a] rounded-[1.1rem] flex items-center justify-center shadow-sm border border-gray-100/80 dark:border-gray-800 group-hover:shadow-md group-hover:bg-white dark:group-hover:bg-[#222] transition-all">
                <Icon size={24} strokeWidth={1.5} className={`${iconColor} group-hover:scale-110 transition-transform duration-200`} />
            </div>
            <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 text-center tracking-tight leading-tight w-full px-0.5 line-clamp-2">
                {title}
            </span>
        </Link>
    );
}

// --- SKELETON ---
function HomeSkeleton() {
  return (
    <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] p-4 space-y-6">
        <div className="flex justify-between items-center py-2">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 skeleton" />
                <div className="space-y-1">
                    <div className="w-32 h-4 bg-gray-200 dark:bg-gray-800 rounded skeleton" />
                    <div className="w-20 h-2 bg-gray-200 dark:bg-gray-800 rounded skeleton" />
                </div>
            </div>
            <div className="flex gap-2">
                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800 skeleton" />
                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800 skeleton" />
            </div>
        </div>
        <div className="h-40 rounded-[2.5rem] bg-gray-200 dark:bg-gray-800 skeleton w-full" />
        <div className="h-48 rounded-[1.5rem] bg-gray-200 dark:bg-gray-800 skeleton w-full mt-6" />
    </div>
  )
}