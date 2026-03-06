"use client";
import { useEffect, useState } from 'react';
import { useAuth } from "../../context/AuthContext";
import { useSession } from "../../context/SessionContext";
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function MyAttendance() {
  const { user } = useAuth();
  const { activeSession } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  useEffect(() => {
    async function fetchData() {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/student.php`, {
        method: 'POST', body: JSON.stringify({ user_id: user?.id, role: user?.role, session: activeSession })
      });
      const json = await res.json();
      if(json.status === 'success') setData(json.data);
      setLoading(false);
    }
    if (user) fetchData();
  }, [user, activeSession]);

  const renderCalendar = () => {
      const daysCount = getDaysInMonth(calMonth, calYear);
      const firstDay = getFirstDayOfMonth(calMonth, calYear);
      const days = [];
      for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} />);
      for (let d = 1; d <= daysCount; d++) {
          const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const status = data?.attendance_map?.[dateStr]; 
          const isSunday = new Date(calYear, calMonth, d).getDay() === 0;
          const isToday = dateStr === new Date().toISOString().split('T')[0];

          let bgColor = "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300";
          if (status === 'present') bgColor = "bg-green-100 text-green-700 border border-green-200";
          else if (status === 'absent') bgColor = "bg-red-100 text-red-700 border border-red-200";
          else if (status === 'holiday') bgColor = "bg-yellow-100 text-yellow-700 border border-yellow-200";
          else if (isSunday) bgColor = "bg-gray-100 text-gray-400 opacity-50 dark:bg-gray-900";
          if (isToday) bgColor += " ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-[#151515]";

          days.push(<div key={d} className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold ${bgColor}`}>{d}</div>);
      }
      return days;
  };

  const getMonthlyStats = () => {
      let p = 0, total = 0;
      const daysCount = getDaysInMonth(calMonth, calYear);
      for(let d=1; d<=daysCount; d++) {
          const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const status = data?.attendance_map?.[dateStr];
          if (status === 'present') { p++; total++; }
          else if (status === 'absent') { total++; }
      }
      return { p, total, pct: total > 0 ? Math.round((p/total)*100) : 0 };
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Loading...</div>;
  const currentStats = getMonthlyStats();

  return (
    <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] pb-24">
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-4 flex items-center gap-4">
        <Link href="/profile" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft size={20} className="dark:text-white" /></Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">My Attendance</h1>
      </div>
      <div className="p-4 mt-2 space-y-6">
        <div className="bg-white dark:bg-[#151515] p-5 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => { if(calMonth===0){ setCalMonth(11); setCalYear(calYear-1); } else { setCalMonth(calMonth-1); } }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full dark:text-white"><ChevronLeft size={20}/></button>
                <h3 className="text-sm font-bold uppercase tracking-widest dark:text-white">{new Date(calYear, calMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                <button onClick={() => { if(calMonth===11){ setCalMonth(0); setCalYear(calYear+1); } else { setCalMonth(calMonth+1); } }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full dark:text-white"><ChevronRight size={20}/></button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                {['S','M','T','W','T','F','S'].map((d,i) => (<span key={i} className="text-[10px] font-bold text-gray-400">{d}</span>))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">{renderCalendar()}</div>
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-bold text-gray-500">Monthly Attendance</span>
                    <span className="text-sm font-black text-blue-600 dark:text-blue-400">{currentStats.p} / {currentStats.total} Days</span>
                </div>
                <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${currentStats.pct}%` }}></div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}