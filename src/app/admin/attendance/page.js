"use client";
import { useState, useEffect } from 'react';
import { useAuth } from "../../../context/AuthContext";
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Users, UserCheck, UserX, AlertCircle, X, Loader2, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MasterAttendance() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [activeTab, setActiveTab] = useState('absent'); 
  
  // New Date Control State (Defaults to Today)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!user || user.role !== 'admin' || parseInt(user.level) > 2) {
      router.push('/');
      return;
    }

    const fetchAttendance = async () => {
      setLoading(true);
      try {
        // Now passing the dynamic date to your updated API
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_attendance_today.php?date=${selectedDate}`);
        const json = await res.json();
        if (json.status === 'success') setData(json);
      } catch (e) {
        console.error("Network error:", e);
      }
      setLoading(false);
    };

    fetchAttendance();
  }, [user, selectedDate]); // Refetches automatically when date changes

  // Date Navigators
  const changeDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const schoolTotal = data?.classes.reduce((acc, c) => acc + c.stats.total, 0) || 0;
  const schoolPresent = data?.classes.reduce((acc, c) => acc + c.stats.present, 0) || 0;
  const schoolAbsent = data?.classes.reduce((acc, c) => acc + c.stats.absent, 0) || 0;

  // Reactively grab the selected class data so it updates live if the date changes while the modal is open
  const activeClassData = data?.classes.find(c => c.class_id === selectedClassId);

  // Reusable Date Switcher Component
  const DateSwitcher = () => (
    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 shadow-inner border border-gray-200 shrink-0">
      <button onClick={() => changeDate(-1)} className="p-1.5 bg-white rounded-lg shadow-sm text-gray-500 hover:text-blue-500 transition-colors active:scale-95"><ChevronLeft size={18}/></button>
      <div className="relative flex items-center bg-white px-2 py-1.5 rounded-lg shadow-sm overflow-hidden">
        <Calendar size={14} className="text-gray-400 absolute left-2 pointer-events-none" />
        <input 
          type="date" 
          value={selectedDate} 
          onChange={(e) => setSelectedDate(e.target.value)} 
          className="bg-transparent text-xs font-black text-gray-700 outline-none pl-6 pr-2 cursor-pointer w-[120px]" 
        />
      </div>
      <button onClick={() => changeDate(1)} className="p-1.5 bg-white rounded-lg shadow-sm text-gray-500 hover:text-blue-500 transition-colors active:scale-95"><ChevronRight size={18}/></button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-gray-900 pb-24 relative">
      
      {/* MAIN HEADER WITH DATE SWITCHER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={24} /></button>
          <div>
            <h1 className="font-black text-lg tracking-tight leading-tight">Attendance</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Master View</p>
          </div>
        </div>
        <DateSwitcher />
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        {loading ? (
           <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
        ) : (
          <>
            {/* OVERVIEW WIDGETS */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border border-gray-100 rounded-[2rem] p-4 sm:p-6 shadow-sm text-center">
                <Users className="mx-auto text-blue-500 mb-2" size={24} />
                <h3 className="text-2xl font-black text-gray-900">{schoolTotal}</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-4 sm:p-6 shadow-sm text-center">
                <UserCheck className="mx-auto text-emerald-500 mb-2" size={24} />
                <h3 className="text-2xl font-black text-emerald-600">{schoolPresent}</h3>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Present</p>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-[2rem] p-4 sm:p-6 shadow-sm text-center">
                <UserX className="mx-auto text-red-500 mb-2" size={24} />
                <h3 className="text-2xl font-black text-red-600">{schoolAbsent}</h3>
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Absent</p>
              </div>
            </div>

            {/* CLASS CARDS */}
            <h2 className="font-black text-gray-900 text-lg pt-4">Class Breakdown</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {data?.classes.map((cls) => {
                const isUnmarked = cls.stats.unmarked === cls.stats.total && cls.stats.total > 0;
                const presentPercent = cls.stats.total > 0 ? (cls.stats.present / cls.stats.total) * 100 : 0;
                
                return (
                  <div 
                    key={cls.class_id} 
                    onClick={() => { setSelectedClassId(cls.class_id); setActiveTab('absent'); }}
                    className={`bg-white rounded-3xl p-5 border cursor-pointer transition-all hover:shadow-md active:scale-95 ${isUnmarked ? 'border-orange-200' : 'border-gray-100'}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-black text-lg text-gray-900">Class {cls.class_name}</h3>
                      <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">{cls.stats.total} Students</span>
                    </div>

                    {isUnmarked ? (
                      <div className="flex items-center gap-2 text-orange-500 bg-orange-50 p-3 rounded-xl border border-orange-100">
                        <AlertCircle size={16} />
                        <span className="text-[10px] font-black uppercase tracking-wider">Not Taken Yet</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm font-black">
                          <span className="text-emerald-500">{cls.stats.present} P</span>
                          <span className="text-red-500">{cls.stats.absent} A</span>
                        </div>
                        <div className="h-2.5 w-full bg-red-100 rounded-full overflow-hidden flex border border-red-200">
                          <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${presentPercent}%` }} />
                        </div>
                        {cls.stats.unmarked > 0 && (
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest text-right">{cls.stats.unmarked} Unmarked</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* ROSTER MODAL */}
      <AnimatePresence>
        {activeClassData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="bg-white w-full sm:max-w-md rounded-t-[2rem] sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
              
              {/* MODAL HEADER WITH DATE SWITCHER */}
              <div className="p-5 border-b border-gray-100 relative shrink-0">
                <button onClick={() => setSelectedClassId(null)} className="absolute top-5 right-5 p-2 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"><X size={18} /></button>
                <h3 className="text-xl font-black text-gray-900 mb-3">Class {activeClassData.class_name}</h3>
                <DateSwitcher />
              </div>

              {/* TABS */}
              <div className="flex p-3 gap-2 shrink-0 bg-gray-50/50 border-b border-gray-100">
                <button onClick={() => setActiveTab('absent')} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${activeTab === 'absent' ? 'bg-red-50 text-red-600 shadow-sm border border-red-100' : 'text-gray-500 hover:bg-gray-100'}`}>Absent ({activeClassData.stats.absent})</button>
                <button onClick={() => setActiveTab('present')} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${activeTab === 'present' ? 'bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100' : 'text-gray-500 hover:bg-gray-100'}`}>Present ({activeClassData.stats.present})</button>
                {activeClassData.stats.unmarked > 0 && (
                  <button onClick={() => setActiveTab('unmarked')} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${activeTab === 'unmarked' ? 'bg-orange-50 text-orange-600 shadow-sm border border-orange-100' : 'text-gray-500 hover:bg-gray-100'}`}>Unmarked ({activeClassData.stats.unmarked})</button>
                )}
              </div>

              {/* STUDENT LIST (Added pb-32 so last name isn't hidden) */}
              <div className="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-2 pb-32">
                {activeClassData.students[activeTab].length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-gray-400 font-bold">No students in this category.</p>
                  </div>
                ) : (
                  activeClassData.students[activeTab].map((student) => (
                    <div key={student.student_id} className="flex items-center gap-4 p-3 rounded-2xl border border-gray-100 bg-white shadow-sm">
                      <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL.replace('/api', '')}/${student.profile_pic}`} className="w-10 h-10 rounded-full object-cover border border-gray-200" alt="avatar" />
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-gray-900">{student.student_name}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Roll No: {student.roll_no}</p>
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activeTab === 'present' ? 'bg-emerald-100 text-emerald-600' : activeTab === 'absent' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                        {activeTab === 'present' ? <UserCheck size={16} /> : activeTab === 'absent' ? <UserX size={16} /> : <AlertCircle size={16} />}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}