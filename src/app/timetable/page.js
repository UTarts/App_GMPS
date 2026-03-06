"use client";
import { useEffect, useState } from 'react';
import { useAuth } from "../../context/AuthContext";
import { useSession } from "../../context/SessionContext";
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';

export default function Timetable() {
  const { user } = useAuth();
  const { activeSession } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const [selectedDay, setSelectedDay] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long' }));

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

  if (loading) return <div className="p-10 text-center text-gray-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] pb-24">
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-4 flex items-center gap-4">
        <Link href="/profile" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft size={20} className="dark:text-white" /></Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Timetable</h1>
      </div>
      <div className="p-4 mt-2">
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar mb-2">
            {daysOfWeek.map(day => (
                <button key={day} onClick={() => setSelectedDay(day)} className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all ${selectedDay === day ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white' : 'bg-white dark:bg-[#151515] text-gray-500 border-gray-200 dark:border-gray-800'}`}>
                    {day.substring(0,3)}
                </button>
            ))}
        </div>
        <div className="bg-white dark:bg-[#151515] rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden min-h-[300px]">
            <div className="p-4 bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-sm font-bold text-gray-800 dark:text-white">{selectedDay}'s Schedule</h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {data?.timetable?.[selectedDay] ? (
                    data.timetable[selectedDay].map((p, i) => (
                        <div key={i} className="p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-sm">{p.period}</div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">{p.subject}</h4>
                                <p className="text-[10px] text-gray-500">Period {p.period}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400"><CalendarIcon size={32} className="mb-2 opacity-50"/><p className="text-xs">No classes scheduled.</p></div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}