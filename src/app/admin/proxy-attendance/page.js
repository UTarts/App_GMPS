"use client";
import { useState, useEffect } from 'react';
import { useAuth } from "../../../context/AuthContext";
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';

export default function ProxyClassSelector() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return router.push('/');
    
    const fetchStatus = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_attendance_today.php?date=${selectedDate}`);
        const json = await res.json();
        if (json.status === 'success') setData(json);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchStatus();
  }, [selectedDate, user]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900 pb-24">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full"><ChevronLeft size={24} /></button>
          <div>
            <h1 className="font-black text-lg leading-tight">Proxy Selection</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select a class</p>
          </div>
        </div>
        <div className="relative flex items-center bg-gray-100 px-2 py-1.5 rounded-lg shadow-inner">
          <Calendar size={14} className="text-gray-400 absolute left-2 pointer-events-none" />
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
            className="bg-transparent text-xs font-black text-gray-700 outline-none pl-6 pr-2 cursor-pointer" 
          />
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {loading ? (
           <div className="py-20 text-center text-gray-400 font-bold animate-pulse">Loading classes...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data?.classes.map((cls) => {
              const isPending = cls.stats.unmarked === cls.stats.total && cls.stats.total > 0;
              
              return (
                <button 
                  key={cls.class_id}
                  onClick={() => router.push(`/admin/proxy-attendance/take?classId=${cls.class_id}&date=${selectedDate}&className=${cls.class_name}`)}
                  className={`flex flex-col text-left bg-white rounded-3xl p-5 border shadow-sm transition-all active:scale-95 hover:shadow-md ${isPending ? 'border-orange-200' : 'border-gray-100'}`}
                >
                  <div className="flex justify-between items-center w-full mb-2">
                    <h3 className="font-black text-xl">Class {cls.class_name}</h3>
                    <ChevronRight size={20} className="text-gray-300" />
                  </div>
                  
                  {isPending ? (
                    <div className="flex items-center gap-2 text-orange-500 bg-orange-50 px-3 py-1.5 rounded-lg w-fit">
                      <AlertCircle size={14} />
                      <span className="text-[10px] font-black uppercase tracking-wider">Attendance Pending</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg w-fit">
                      <CheckCircle2 size={14} />
                      <span className="text-[10px] font-black uppercase tracking-wider">Taken ({cls.stats.present}P / {cls.stats.absent}A)</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}