"use client";
import { useEffect, useState } from 'react';
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  RotateCcw, Save, Users, AlertCircle, Edit3, AlertTriangle, ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AttendancePage() {
  const { user } = useAuth();
  const router = useRouter();
  
  // --- STATE MANAGEMENT ---
  const [view, setView] = useState('dashboard'); // 'dashboard', 'taking', 'history', 'edit'
  const [loading, setLoading] = useState(false);
  
  // Data State
  const [students, setStudents] = useState([]);
  const [calendarData, setCalendarData] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Taking State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attendanceBuffer, setAttendanceBuffer] = useState({}); 

  // Calendar Navigation
  const [calMonth, setCalMonth] = useState(new Date().getMonth()); 
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  // --- MODAL STATE ---
  const [modalConfig, setModalConfig] = useState({
    isOpen: false, title: "", message: "", type: "neutral", onConfirm: null
  });

  // --- INITIAL LOAD ---
  useEffect(() => {
    if (user?.role === 'teacher' && user?.assigned_class_id) {
        fetchCalendarData();
    }
  }, [user, calMonth, calYear]);

  // --- API CALLS ---

  const fetchCalendarData = async () => {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/attendance_teacher.php`, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'fetch_month_summary', 
                class_id: user.assigned_class_id,
                month: calMonth + 1, 
                year: calYear 
            })
        });
        const json = await res.json();
        if(json.status === 'success') setCalendarData(json.data);
    } catch (e) { console.error(e); }
  };

  const startAttendanceSession = async (dateToUse = selectedDate, mode = 'taking') => {
    setLoading(true);
    // Ensure date is updated in state if passed explicitly
    if (dateToUse !== selectedDate) setSelectedDate(dateToUse);

    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/attendance_teacher.php`, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'fetch_class', 
                class_id: user.assigned_class_id,
                date: dateToUse 
            })
        });
        const json = await res.json();
        if(json.status === 'success') {
            setStudents(json.data);
            
            const buffer = {};
            json.data.forEach(s => {
                if(s.status !== 'pending') buffer[s.id] = s.status;
            });
            setAttendanceBuffer(buffer);

            // If taking new attendance, find first pending. If editing, start at 0.
            if (mode === 'taking') {
                const firstPending = json.data.findIndex(s => s.status === 'pending');
                setCurrentIndex(firstPending !== -1 ? firstPending : 0);
            }
            
            setView(mode);
        }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const submitBatch = async (statusOverride = null) => {
    setLoading(true);
    const records = students.map(s => ({
        student_id: s.id,
        status: statusOverride || attendanceBuffer[s.id] || 'absent' 
    })).filter(r => r.status !== 'pending');

    try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/attendance_teacher.php`, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'save_batch',
                teacher_id: user.id,
                class_id: user.assigned_class_id,
                date: selectedDate,
                records: records
            })
        });
        await fetchCalendarData();
        setView('dashboard');
    } catch (e) { console.error("Save failed"); } 
    finally { setLoading(false); }
  };

  // --- ACTIONS ---

  const requestMarkHoliday = () => {
      setModalConfig({
          isOpen: true,
          title: "Mark as Holiday?",
          message: `Are you sure you want to mark ${new Date(selectedDate).toLocaleDateString()} as a Holiday? This will override any attendance taken.`,
          type: "danger",
          onConfirm: executeMarkHoliday
      });
  };

  const executeMarkHoliday = async () => {
      setLoading(true);
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/attendance_teacher.php`, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'mark_holiday',
                teacher_id: user.id,
                class_id: user.assigned_class_id,
                date: selectedDate
            })
        });
        await fetchCalendarData();
      } catch (e) { console.error("Error marking holiday"); }
      finally { 
          setLoading(false); 
          setModalConfig(prev => ({ ...prev, isOpen: false })); 
      }
  };

  const handleSwipe = (status) => {
      if (currentIndex >= students.length) return;
      const s = students[currentIndex];
      setAttendanceBuffer(prev => ({ ...prev, [s.id]: status }));
      setCurrentIndex(prev => prev + 1);
  };

  const undoSwipe = () => {
      if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  // --- RENDER HELPERS ---

  const renderCalendar = () => {
      const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
      const firstDay = new Date(calYear, calMonth, 1).getDay(); 
      
      const days = [];
      for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} />);
      
      for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          const isToday = dateStr === new Date().toISOString().split('T')[0];
          const isSelected = dateStr === selectedDate;
          const statusData = calendarData[dateStr];
          const isSunday = new Date(dateStr).getDay() === 0;

          let statusColor = "bg-gray-100 dark:bg-gray-800";
          if (isSunday) statusColor = "bg-orange-50 dark:bg-orange-900/10 text-orange-400";
          else if (statusData?.status === 'holiday') statusColor = "bg-red-100 dark:bg-red-900/30 text-red-600";
          else if (statusData?.status === 'taken') statusColor = "bg-green-100 dark:bg-green-900/30 text-green-600";
          
          days.push(
              <div 
                key={d} 
                onClick={() => setSelectedDate(dateStr)}
                className={`
                    aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all border-2
                    ${isSelected ? 'border-blue-500 shadow-md scale-105 z-10' : 'border-transparent'}
                    ${statusColor}
                    ${isToday && !statusData ? 'ring-2 ring-blue-400 ring-offset-2 animate-pulse' : ''}
                `}
              >
                  <span className={`text-xs font-bold ${isSunday ? 'opacity-50' : ''}`}>{d}</span>
                  {statusData?.status === 'taken' && <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1"></div>}
                  {statusData?.status === 'holiday' && <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1"></div>}
              </div>
          );
      }
      return days;
  };

  const renderHistoryList = () => {
    // 1. Get all dates in current month
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const historyItems = [];

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const data = calendarData[dateStr];
        
        // Only show items that have data (Taken or Holiday)
        if (data && (data.status === 'taken' || data.status === 'holiday')) {
            const dateObj = new Date(dateStr);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            const niceDate = `${d} ${dateObj.toLocaleDateString('en-US', { month: 'short' })}`;
            
            // Calculate Stats
            const present = data.stats?.present || 0;
            const absent = data.stats?.absent || 0;
            const total = present + absent;

            historyItems.push(
                <motion.div 
                    key={dateStr}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => startAttendanceSession(dateStr, 'edit')}
                    className="bg-white dark:bg-[#151515] p-4 rounded-[1.5rem] shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between cursor-pointer mb-3"
                >
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center font-bold ${
                            data.status === 'holiday' 
                            ? 'bg-red-50 text-red-600' 
                            : 'bg-blue-50 text-blue-600'
                        }`}>
                            <span className="text-sm leading-none">{d}</span>
                            <span className="text-[9px] uppercase">{dateObj.toLocaleDateString('en-US', { month: 'short' })}</span>
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white text-sm">{dayName}</h4>
                            <p className="text-[11px] text-gray-500 font-medium">
                                {data.status === 'holiday' ? 'Holiday Declared' : 'Attendance Taken'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {data.status !== 'holiday' && (
                            <div className="text-right">
                                <span className="text-lg font-black text-gray-800 dark:text-white block leading-none">
                                    {present}<span className="text-gray-400 text-xs">/{total}</span>
                                </span>
                                <span className="text-[9px] font-bold text-green-500 uppercase">Present</span>
                            </div>
                        )}
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                            <ChevronRight size={16} />
                        </div>
                    </div>
                </motion.div>
            );
        }
    }

    if (historyItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <CalendarIcon size={48} className="mb-2 text-gray-300"/>
                <p className="text-sm font-bold text-gray-400">No history for this month</p>
            </div>
        );
    }

    // Sort by date descending (newest first)
    return historyItems.reverse();
  };

  if (!user || user.role !== 'teacher' || !user.assigned_class_id) {
      return <div className="flex h-screen items-center justify-center text-gray-500">Access Denied</div>;
  }

  return (
    <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] text-gray-800 dark:text-gray-100 font-sans pb-24 relative">
      
      {/* --- CUSTOM APP MODAL --- */}
      <AnimatePresence>
        {modalConfig.isOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white dark:bg-[#151515] rounded-[2rem] p-6 shadow-2xl w-full max-w-sm border border-gray-100 dark:border-gray-800"
                >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                        modalConfig.type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                        {modalConfig.type === 'danger' ? <AlertTriangle size={24} /> : <AlertCircle size={24} />}
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{modalConfig.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                        {modalConfig.message}
                    </p>
                    
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                            className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={modalConfig.onConfirm}
                            className={`flex-1 py-3 text-white rounded-xl font-bold text-sm shadow-lg ${
                                modalConfig.type === 'danger' ? 'bg-red-600 shadow-red-500/30' : 'bg-blue-600 shadow-blue-500/30'
                            }`}
                        >
                            Confirm
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div className="bg-white dark:bg-[#151515] p-4 sticky top-0 z-40 border-b border-gray-100 dark:border-gray-800 shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-3">
              <Link href="/?source=twa" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <ChevronLeft size={24} />
              </Link>
              <div>
                  <h1 className="text-lg font-black tracking-tight leading-none">Attendance</h1>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{user.assigned_class_name}</p>
              </div>
          </div>
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <button onClick={() => setView('dashboard')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${view === 'dashboard' ? 'bg-white dark:bg-black shadow-sm text-blue-600' : 'text-gray-500'}`}>Daily</button>
              <button onClick={() => setView('history')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${view === 'history' ? 'bg-white dark:bg-black shadow-sm text-blue-600' : 'text-gray-500'}`}>History</button>
          </div>
      </div>

      <div className="p-4">
        
        {/* === VIEW 1: DASHBOARD (Calendar + Actions) === */}
        {view === 'dashboard' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                
                {/* CALENDAR WIDGET */}
                <div className="bg-white dark:bg-[#151515] rounded-[1.5rem] p-5 shadow-sm border border-gray-100 dark:border-gray-800 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={() => { 
                            if(calMonth===0){ setCalMonth(11); setCalYear(calYear-1); } else { setCalMonth(calMonth-1); }
                        }}><ChevronLeft size={20} /></button>
                        <h2 className="text-sm font-bold uppercase tracking-widest">
                            {new Date(calYear, calMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h2>
                        <button onClick={() => { 
                            if(calMonth===11){ setCalMonth(0); setCalYear(calYear+1); } else { setCalMonth(calMonth+1); }
                        }}><ChevronRight size={20} /></button>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                        {['S','M','T','W','T','F','S'].map((d,i) => (
                            <span key={i} className="text-[10px] font-bold text-gray-400">{d}</span>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {renderCalendar()}
                    </div>
                </div>

                {/* SELECTED DAY ACTIONS */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-bold">
                            {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </h3>
                        {calendarData[selectedDate]?.status === 'taken' ? (
                            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                <Check size={12} /> Completed
                            </span>
                        ) : (
                            <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded-full">Pending</span>
                        )}
                    </div>

                    <button 
                        onClick={() => startAttendanceSession(selectedDate, 'taking')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-blue-500/30 transition-transform active:scale-95"
                    >
                        <div className="text-left">
                            <h4 className="font-bold text-lg">
                                {calendarData[selectedDate]?.status === 'taken' ? 'Edit Attendance' : 'Start Attendance'}
                            </h4>
                            <p className="text-blue-200 text-xs">Swipe mode</p>
                        </div>
                        <div className="bg-white/20 p-2 rounded-full"><ChevronRight /></div>
                    </button>

                    <button 
                        onClick={requestMarkHoliday}
                        className="w-full bg-white dark:bg-[#151515] border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-2xl p-4 flex items-center justify-center gap-2 font-bold shadow-sm active:scale-95 transition-transform"
                    >
                        <AlertCircle size={18} /> Mark as Holiday
                    </button>
                </div>
            </motion.div>
        )}

        {/* === VIEW 2: TAKING (Card Stack) === */}
        {view === 'taking' && (
            <div className="flex flex-col h-[75vh]">
                
                <div className="flex justify-between items-center mb-6 px-2">
                    <button onClick={() => setView('dashboard')} className="text-gray-400"><X /></button>
                    <div className="flex-1 mx-4 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${(currentIndex / students.length) * 100}%` }}></div>
                    </div>
                    <span className="text-xs font-bold text-gray-400">{currentIndex + 1}/{students.length}</span>
                </div>

                <div className="flex-1 relative flex items-center justify-center">
                    <AnimatePresence>
                        {students.slice(currentIndex, currentIndex + 2).reverse().map((stu, i, arr) => {
                            const isCurrent = i === arr.length - 1; 
                            if (!stu) return null;

                            return (
                                <motion.div
                                    key={stu.id}
                                    initial={isCurrent ? { scale: 0.9, y: 20, opacity: 0 } : {}}
                                    animate={isCurrent ? { scale: 1, y: 0, opacity: 1, zIndex: 10 } : { scale: 0.9, y: 40, opacity: 0.6, zIndex: 5 }}
                                    exit={{ x: attendanceBuffer[stu.id] === 'present' ? 200 : -200, opacity: 0, rotate: attendanceBuffer[stu.id] === 'present' ? 20 : -20 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                    className="absolute w-full max-w-sm aspect-[3/4] bg-white dark:bg-[#151515] rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center p-6 text-center"
                                >
                                    <div className="absolute top-6 left-6 text-left">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Roll No</p>
                                        <p className="text-4xl font-black text-blue-600 dark:text-blue-400 leading-none">{stu.roll_no || '?'}</p>
                                    </div>

                                    <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-blue-400 to-purple-500 mb-6 shadow-lg mt-8">
                                        <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${stu.profile_pic || 'GMPSimages/default_student.png'}`} className="w-full h-full rounded-full object-cover border-4 border-white dark:border-[#151515]" />
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1">{stu.name}</h2>
                                    <div className="mb-8">
                                        <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                            Student ID: {stu.login_id}
                                        </span>
                                    </div>

                                    {isCurrent && (
                                        <div className="flex gap-4 w-full">
                                            <button onClick={() => handleSwipe('absent')} className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-bold flex flex-col items-center gap-1 active:scale-95 transition-transform"><X size={24} /> ABSENT</button>
                                            <button onClick={() => handleSwipe('present')} className="flex-1 py-4 bg-green-50 text-green-600 rounded-2xl font-bold flex flex-col items-center gap-1 active:scale-95 transition-transform"><Check size={24} /> PRESENT</button>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {currentIndex >= students.length && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-sm bg-white dark:bg-[#151515] rounded-[2rem] p-6 text-center shadow-xl">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><Check size={32} /></div>
                            <h2 className="text-xl font-bold mb-2">All Done!</h2>
                            <p className="text-gray-500 text-sm mb-6">Review the list before submitting.</p>
                            <button onClick={() => setView('edit')} className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold mb-3">Review List</button>
                            <button onClick={() => submitBatch()} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30">Submit Attendance</button>
                        </motion.div>
                    )}
                </div>

                {currentIndex > 0 && currentIndex < students.length && (
                    <button onClick={undoSwipe} className="absolute bottom-4 left-1/2 -translate-x-1/2 p-3 bg-white dark:bg-[#222] rounded-full shadow-lg text-gray-500"><RotateCcw size={20} /></button>
                )}
            </div>
        )}

        {/* === VIEW 3: HISTORY LIST (Redesigned) === */}
        {view === 'history' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                
                {/* Month Navigator for History */}
                <div className="flex justify-between items-center mb-6 bg-gray-200 dark:bg-[#1a1a1a] p-3 rounded-xl">
                    <button onClick={() => { 
                        if(calMonth===0){ setCalMonth(11); setCalYear(calYear-1); } else { setCalMonth(calMonth-1); }
                    }}><ChevronLeft size={20} /></button>
                    <h2 className="text-sm font-bold uppercase tracking-widest">
                        {new Date(calYear, calMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={() => { 
                        if(calMonth===11){ setCalMonth(0); setCalYear(calYear+1); } else { setCalMonth(calMonth+1); }
                    }}><ChevronRight size={20} /></button>
                </div>

                {/* The List */}
                <div className="space-y-1">
                    {renderHistoryList()}
                </div>
            </motion.div>
        )}

        {/* === VIEW 4: EDIT / REVIEW === */}
        {view === 'edit' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                
                <div className="flex justify-between items-center mb-4 bg-white dark:bg-[#151515] p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                    <h2 className="font-bold text-sm">
                        Editing: <span className="text-blue-600">{new Date(selectedDate).toLocaleDateString()}</span>
                    </h2>
                    <button onClick={() => submitBatch()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1">
                        <Save size={14} /> Save
                    </button>
                </div>

                <div className="bg-white dark:bg-[#151515] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                    {students.map((stu) => {
                        const status = attendanceBuffer[stu.id] || 'pending';
                        
                        return (
                            <div key={stu.id} className="p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-xs text-gray-500">
                                        {stu.roll_no || '#'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">{stu.name}</p>
                                        <p className="text-[10px] text-gray-400">ID: {stu.login_id}</p>
                                    </div>
                                </div>
                                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                                    <button onClick={() => setAttendanceBuffer(p => ({...p, [stu.id]: 'present'}))} className={`p-1.5 rounded-md transition-colors ${status === 'present' ? 'bg-white shadow text-green-600' : 'text-gray-400'}`}><Check size={16} /></button>
                                    <button onClick={() => setAttendanceBuffer(p => ({...p, [stu.id]: 'absent'}))} className={`p-1.5 rounded-md transition-colors ${status === 'absent' ? 'bg-white shadow text-red-600' : 'text-gray-400'}`}><X size={16} /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </motion.div>
        )}

      </div>
    </div>
  );
}