"use client";
import { useEffect, useState } from 'react';
import { useAuth } from "../../context/AuthContext";
import { useAppModal } from "../../context/ModalContext"; 
import { motion, AnimatePresence } from 'framer-motion';
import { 
   MapPin, Phone, User, Calendar as CalendarIcon, 
   ChevronRight, X, Settings, CreditCard, CheckSquare, 
   FileSpreadsheet, Printer, Clock, CalendarDays
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from "../../context/SessionContext";
import SessionSwitcher from "../../components/SessionSwitcher";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { showModal } = useAppModal(); 
  const { activeSession } = useSession();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewImage, setViewImage] = useState(null); 

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/student.php`, {
          method: 'POST',
          body: JSON.stringify({ user_id: user?.id, role: user?.role, session: activeSession })
        });
        const json = await res.json();
        if(json.status === 'success') setData(json.data);
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    }
    if (user) fetchData();
  }, [user, activeSession]);

  const p = data?.profile;

  if (loading) return <ProfileSkeleton />;

  return (
    <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] text-gray-800 dark:text-gray-100 font-sans pb-24">
      
      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-5 py-4 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">My Profile</h1>
        <Link href="/settings" className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <Settings size={20} className="text-gray-600 dark:text-gray-300" />
        </Link>
      </div>

      <div className="px-4 mt-6">
        <div className="mb-6 flex justify-center"><SessionSwitcher /></div>

        {/* --- IDENTITY CARD --- */}
        <div className="relative mb-8">
            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-[2rem] p-6 text-white shadow-xl shadow-orange-500/25 relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full border-4 border-white/30 p-1 mb-3 cursor-pointer shadow-lg" 
                         onClick={() => setViewImage(p?.profile_pic ? `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${p.profile_pic}` : null)}>
                        <img 
                            src={p?.profile_pic ? `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${p.profile_pic}` : `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}GMPSimages/default_student.png`} 
                            className="w-full h-full rounded-full object-cover bg-gray-200" 
                            alt="Profile"
                            loading="lazy"
                        />
                    </div>
                    <h2 className="text-2xl font-black leading-tight mb-1">{p?.name}</h2>
                    <p className="text-orange-100 text-xs font-bold tracking-widest uppercase mb-3 opacity-90">Roll No: {p?.roll_no || 'N/A'} • ID: {p?.login_id}</p>
                    
                    <div className="flex gap-2 mb-5">
                        <span className="bg-black/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold border border-white/10 shadow-sm">Class {p?.class_name}</span>
                        <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold border border-white/10 shadow-sm">{p?.admission_year} Batch</span>
                    </div>

                    {/* Class Teacher Bar with Avatar */}
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 w-full border border-white/10 flex items-center justify-between shadow-inner">
                        <div className="flex items-center gap-3">
                            <img 
                                src={p?.teacher_pic ? `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${p.teacher_pic}` : `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}GMPSimages/default_teacher.png`} 
                                className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
                                alt="Class Teacher"
                            />
                            <div className="text-left">
                                <p className="text-[9px] opacity-80 uppercase tracking-widest font-black">Class Teacher</p>
                                <p className="text-sm font-bold leading-tight mt-0.5">{p?.teacher_name}</p>
                            </div>
                        </div>
                        {p?.teacher_contact && (
                            <a href={`tel:${p.teacher_contact}`} className="bg-white text-orange-600 p-2.5 rounded-full shadow-md hover:scale-105 transition-transform active:scale-95">
                                <Phone size={16} fill="currentColor" />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* --- BENTO MENU --- */}
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Academic Hub</h3>
        <div className="grid grid-cols-2 gap-3 mb-6">
            <Link href="/my-attendance" className="bg-white dark:bg-[#151515] p-5 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform text-center">
                <div className="p-3 bg-teal-50 dark:bg-teal-900/20 text-teal-600 rounded-full mb-1"><CheckSquare size={24} /></div>
                <span className="font-black text-sm text-gray-900 dark:text-white leading-none">Attendance</span>
                <span className="text-[10px] font-bold text-gray-400">{data?.stats?.overall_percent}% Overall</span>
            </Link>

            <Link href="/timetable" className="bg-white dark:bg-[#151515] p-5 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform text-center">
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-full mb-1"><Clock size={24} /></div>
                <span className="font-black text-sm text-gray-900 dark:text-white leading-none">Timetable</span>
                <span className="text-[10px] font-bold text-gray-400">Class Schedule</span>
            </Link>

            <Link href="/results" className="bg-white dark:bg-[#151515] p-5 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform text-center">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full mb-1"><FileSpreadsheet size={24} /></div>
                <span className="font-black text-sm text-gray-900 dark:text-white leading-none">Exam Results</span>
                <span className="text-[10px] font-bold text-gray-400">View Subject Marks</span>
            </Link>

            <Link href="/report-cards" className="bg-white dark:bg-[#151515] p-5 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform text-center">
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-full mb-1"><Printer size={24} /></div>
                <span className="font-black text-sm text-gray-900 dark:text-white leading-none">Report Cards</span>
                <span className="text-[10px] font-bold text-gray-400">Download PDF</span>
            </Link>
        </div>

        {/* --- PERSONAL DETAILS --- */}
        <div className="bg-white dark:bg-[#151515] p-5 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Personal Details</h3>
            <div className="space-y-4">
                <InfoRow label="Date of Birth" value={p?.dob} icon={CalendarDays} />
                <InfoRow label="Father's Name" value={p?.father_name} icon={User} />
                <InfoRow label="Mother's Name" value={p?.mother_name} icon={User} />
                <InfoRow label="Contact" value={p?.contact} icon={Phone} />
                <InfoRow label="Aadhar No" value={p?.aadhar_no} icon={CreditCard} />
                <InfoRow label="Address" value={p?.address} icon={MapPin} />
            </div>
        </div>

      </div>

      {/* --- IMAGE LIGHTBOX MODAL --- */}
      <AnimatePresence>
        {viewImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setViewImage(null)}>
            <button onClick={() => setViewImage(null)} className="absolute top-6 right-6 w-10 h-10 bg-white/10 rounded-full text-white flex items-center justify-center z-20"><X size={24} /></button>
            <motion.img initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} src={viewImage} className="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain" onClick={(e) => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function InfoRow({ label, value, icon: Icon }) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5 text-gray-400"><Icon size={16} /></div>
            <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">{label}</p>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-0.5">{value || 'N/A'}</p>
            </div>
        </div>
    );
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] pb-24">
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
         <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded skeleton"></div>
         <div className="h-8 w-8 bg-gray-200 dark:bg-gray-800 rounded-full skeleton"></div>
      </div>
      <div className="px-4 mt-6">
         <div className="h-72 w-full bg-gray-200 dark:bg-gray-800 rounded-[2rem] skeleton mb-8"></div>
         <div className="h-40 w-full bg-gray-200 dark:bg-gray-800 rounded-[1.5rem] skeleton mb-6"></div>
         <div className="h-40 w-full bg-gray-200 dark:bg-gray-800 rounded-[1.5rem] skeleton"></div>
      </div>
    </div>
  )
}