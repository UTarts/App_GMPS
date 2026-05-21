"use client";
import { useEffect, useState, Suspense } from 'react';
import { useAuth } from "../../../../context/AuthContext";
import { useAppModal } from "../../../../context/ModalContext";
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw, Save, AlertCircle, PartyPopper, Bell, BellOff } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

// 1. Rename the main component so we can wrap it
function ProxyAttendanceContent() {
  const { user } = useAuth();
  const { showModal } = useAppModal();
  const router = useRouter();
  
  // 2. Grab EVERYTHING from searchParams now
  const searchParams = useSearchParams();
  const classId = searchParams.get('classId');
  const passedDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const className = searchParams.get('className') || classId;

  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [silentMode, setSilentMode] = useState(true);
  
  const [students, setStudents] = useState([]);
  const [calendarData, setCalendarData] = useState({});
  const [selectedDate, setSelectedDate] = useState(passedDate);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attendanceBuffer, setAttendanceBuffer] = useState({}); 
  const [holidayInfo, setHolidayInfo] = useState(null);

  const [calMonth, setCalMonth] = useState(new Date(passedDate).getMonth()); 
  const [calYear, setCalYear] = useState(new Date(passedDate).getFullYear());

  useEffect(() => {
    if (user?.role === 'admin' && classId) {
        fetchCalendarData();
    } else {
        router.push('/');
    }
  }, [user, classId, calMonth, calYear]);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/attendance_teacher.php`, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'fetch_month_summary', 
                class_id: classId,
                month: calMonth + 1, 
                year: calYear 
            })
        });
        const json = await res.json();
        if(json.status === 'success') setCalendarData(json.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const startAttendanceSession = async (dateToUse = selectedDate, mode = 'taking') => {
    setLoading(true);
    if (dateToUse !== selectedDate) setSelectedDate(dateToUse);

    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/attendance_teacher.php`, {
            method: 'POST',
            body: JSON.stringify({ action: 'fetch_class', class_id: classId, date: dateToUse })
        });
        const json = await res.json();
        if(json.status === 'success') {
            setStudents(json.data);
            setHolidayInfo(json.calendar_info || null);
            const buffer = {};
            json.data.forEach(s => { if(s.status !== 'pending') buffer[s.id] = s.status; });
            setAttendanceBuffer(buffer);
            
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
                teacher_id: user.id, // Records admin ID in DB
                class_id: classId,
                date: selectedDate,
                records: records,
                silent_mode: silentMode // Pass silent mode to backend
            })
        });
        await fetchCalendarData();
        setView('dashboard');
    } catch (e) { console.error("Save failed"); } 
    finally { setLoading(false); }
  };

  const handleSwipe = (status) => {
      if (currentIndex >= students.length) return;
      const s = students[currentIndex];
      setAttendanceBuffer(prev => ({ ...prev, [s.id]: status }));
      setCurrentIndex(prev => prev + 1);
  };

  const renderCalendar = () => {
    // ... Exact same calendar rendering logic from src/app/attendance/page.js ...
    // Note: For brevity in this response, paste the exact renderCalendar() function from your teacher app here.
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDay = new Date(calYear, calMonth, 1).getDay(); 
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} />);
    
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isSelected = dateStr === selectedDate;
        const statusData = calendarData[dateStr];
        const isSunday = new Date(dateStr).getDay() === 0;

        let statusColor = "bg-gray-100";
        if (isSunday) statusColor = "bg-orange-50 text-orange-400";
        else if (statusData?.status === 'holiday') statusColor = "bg-red-100 text-red-600";
        else if (statusData?.status === 'taken') statusColor = "bg-emerald-100 text-emerald-600";
        
        days.push(
            <div 
              key={d} onClick={() => setSelectedDate(dateStr)}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all border-2 ${isSelected ? 'border-purple-500 shadow-md scale-105 z-10' : 'border-transparent'} ${statusColor}`}
            >
                <span className={`text-xs font-bold ${isSunday ? 'opacity-50' : ''}`}>{d}</span>
                {statusData?.status === 'taken' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1"></div>}
            </div>
        );
    }
    return days;
  };

  if (loading && view === 'dashboard') return <div className="flex h-screen items-center justify-center">Loading Data...</div>;

  return (
    <div className="min-h-screen bg-[#F2F6FA] text-gray-800 font-sans pb-24 relative">
      
      {/* PROXY HEADER */}
      <div className="bg-white p-4 sticky top-0 z-40 border-b border-gray-200 shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"><ChevronLeft size={24} /></button>
              <div>
                  <h1 className="text-lg font-black tracking-tight text-purple-600">Proxy Mode</h1>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Class {className}</p>
              </div>
          </div>
          
          {/* SILENT MODE TOGGLE FOR ADMIN */}
          <button 
            onClick={() => setSilentMode(!silentMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors ${silentMode ? 'bg-gray-100 text-gray-500' : 'bg-purple-100 text-purple-700'}`}
          >
              {silentMode ? <><BellOff size={14}/> Silent</> : <><Bell size={14}/> Notify</>}
          </button>
      </div>

      <div className="p-4">
        
        {/* === VIEW 1: DASHBOARD (Calendar + Actions) === */}
        {view === 'dashboard' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                
                <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-gray-100 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={() => { if(calMonth===0){ setCalMonth(11); setCalYear(calYear-1); } else { setCalMonth(calMonth-1); } }}><ChevronLeft size={20} /></button>
                        <h2 className="text-sm font-bold uppercase tracking-widest">{new Date(calYear, calMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                        <button onClick={() => { if(calMonth===11){ setCalMonth(0); setCalYear(calYear+1); } else { setCalMonth(calMonth+1); } }}><ChevronRight size={20} /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                        {['S','M','T','W','T','F','S'].map((d,i) => (<span key={i} className="text-[10px] font-bold text-gray-400">{d}</span>))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {renderCalendar()}
                    </div>
                </div>

                <div className="space-y-4">
                    <button 
                        onClick={() => startAttendanceSession(selectedDate, 'taking')}
                        disabled={holidayInfo?.is_holiday}
                        className={`w-full text-white rounded-2xl p-4 flex items-center justify-between shadow-lg transition-transform active:scale-95 ${holidayInfo?.is_holiday ? 'bg-gray-400 opacity-50' : 'bg-purple-600 shadow-purple-500/30'}`}
                    >
                        <div className="text-left">
                            <h4 className="font-bold text-lg">{calendarData[selectedDate]?.status === 'taken' ? 'Edit Proxy Attendance' : 'Start Proxy Attendance'}</h4>
                            <p className="text-purple-200 text-xs">Swipe mode</p>
                        </div>
                        <div className="bg-white/20 p-2 rounded-full"><ChevronRight /></div>
                    </button>
                    <button onClick={() => setView('edit')} className="w-full bg-white border border-gray-200 text-gray-700 rounded-2xl p-4 font-bold shadow-sm active:scale-95 transition-transform">
                        Manual List View Override
                    </button>
                </div>
            </motion.div>
        )}

        {/* === VIEW 2: TAKING (Card Stack) === */}
        {view === 'taking' && (
            <div className="flex flex-col h-[75vh]">
                <div className="flex justify-between items-center mb-6 px-2">
                    <button onClick={() => setView('dashboard')} className="text-gray-400"><X /></button>
                    <div className="flex-1 mx-4 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-600 transition-all duration-300" style={{ width: `${(currentIndex / students.length) * 100}%` }}></div>
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
                                    className="absolute w-full max-w-sm aspect-[3/4] bg-white rounded-[2rem] shadow-2xl border-2 border-purple-100 flex flex-col items-center justify-center p-6 text-center"
                                >
                                    <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-purple-400 to-pink-500 mb-6 shadow-lg mt-8">
                                        <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${stu.profile_pic || 'GMPSimages/default_student.png'}`} className="w-full h-full rounded-full object-cover border-4 border-white" alt={stu.name} />
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-900 mb-8">{stu.name}</h2>
                                    
                                    {isCurrent && (
                                        <div className="flex gap-4 w-full">
                                            <button onClick={() => handleSwipe('absent')} className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-bold flex flex-col items-center gap-1 active:scale-95"><X size={24} /> ABSENT</button>
                                            <button onClick={() => handleSwipe('present')} className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-bold flex flex-col items-center gap-1 active:scale-95"><Check size={24} /> PRESENT</button>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {currentIndex >= students.length && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-sm bg-white rounded-[2rem] p-6 text-center shadow-xl border-2 border-purple-100">
                            <h2 className="text-xl font-black text-purple-600 mb-2">Proxy Complete!</h2>
                            <p className="text-gray-500 text-sm mb-6 text-balance">The Audit Trail will log you as the recorder. Ensure Silent Mode is {silentMode ? 'ON' : 'OFF'} as desired.</p>
                            <button onClick={() => submitBatch()} className="w-full py-4 bg-purple-600 text-white rounded-xl font-black shadow-lg shadow-purple-500/30">Submit to Database</button>
                        </motion.div>
                    )}
                </div>
                {currentIndex > 0 && currentIndex < students.length && (
                    <button onClick={() => setCurrentIndex(p => p - 1)} className="absolute bottom-4 left-1/2 -translate-x-1/2 p-3 bg-white rounded-full shadow-lg text-gray-500"><RotateCcw size={20} /></button>
                )}
            </div>
        )}

        {/* === VIEW 3: EDIT (List View Override) === */}
        {view === 'edit' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                    <h2 className="font-bold text-sm">Editing Proxy: <span className="text-purple-600">{new Date(selectedDate).toLocaleDateString()}</span></h2>
                    <button onClick={() => submitBatch()} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1"><Save size={14} /> Force Save</button>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
                    {students.map((stu) => {
                        const status = attendanceBuffer[stu.id] || 'pending';
                        return (
                            <div key={stu.id} className="p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-500">{stu.roll_no || '#'}</div>
                                    <p className="text-sm font-bold">{stu.name}</p>
                                </div>
                                <div className="flex bg-gray-100 p-1 rounded-lg">
                                    <button onClick={() => setAttendanceBuffer(p => ({...p, [stu.id]: 'present'}))} className={`p-1.5 rounded-md transition-colors ${status === 'present' ? 'bg-white shadow text-emerald-600' : 'text-gray-400'}`}><Check size={16} /></button>
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
export default function ProxyAttendanceView() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center text-gray-500 font-bold">Loading Proxy Module...</div>}>
            <ProxyAttendanceContent />
        </Suspense>
    );
}