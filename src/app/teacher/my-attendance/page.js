"use client";
import { useEffect, useState } from 'react';
import { useAuth } from "../../../context/AuthContext";
import { ArrowLeft, Clock, CheckCircle, LogOut, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function TeacherAttendance() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Month/Year Switcher State
  const [date, setDate] = useState(new Date());
  const calMonth = date.getMonth() + 1;
  const calYear = date.getFullYear();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/staff_attendance.php`, {
        method: 'POST', 
        body: JSON.stringify({ 
            action: 'get_my_record', 
            teacher_id: user?.id, 
            month: calMonth, 
            year: calYear 
        })
      });
      const json = await res.json();
      if(json.status === 'success') setData(json.data);
      setLoading(false);
    }
    if (user) fetchData();
  }, [user, calMonth, calYear]);

  // --- HELPER: Calculate Daily Duration ---
  const calculateDuration = (inTime, outTime) => {
      if (!inTime || !outTime) return null;
      const [hIn, mIn] = inTime.split(':').map(Number);
      const [hOut, mOut] = outTime.split(':').map(Number);
      let diff = (hOut * 60 + mOut) - (hIn * 60 + mIn);
      if (diff < 0) return null;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      return `${h}h ${m}m`;
  };

  const formatTime = (timeStr) => {
      if (!timeStr) return '--:--';
      const [h, m] = timeStr.split(':');
      let hours = parseInt(h);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${m} ${ampm}`;
  };

  const changeMonth = (offset) => {
      const newDate = new Date(date);
      newDate.setMonth(newDate.getMonth() + offset);
      setDate(newDate);
  };

  const totalPresent = data.length;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] pb-24 text-gray-800 dark:text-white">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-[#151515]/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft size={20} /></button>
            <h1 className="text-lg font-black tracking-tight">Attendance</h1>
        </div>
        {/* Month Switcher */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-full">
            <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded-full transition-colors"><ChevronLeft size={16}/></button>
            <span className="text-[10px] font-black uppercase w-20 text-center">{date.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
            <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded-full transition-colors"><ChevronRight size={16}/></button>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
              <div className="bg-indigo-600 p-4 rounded-3xl text-white shadow-lg shadow-indigo-500/20">
                  <p className="text-[10px] font-bold opacity-80 uppercase">Days Present</p>
                  <p className="text-2xl font-black">{totalPresent}</p>
              </div>
              <div className="bg-emerald-600 p-4 rounded-3xl text-white shadow-lg shadow-emerald-500/20">
                  <p className="text-[10px] font-bold opacity-80 uppercase">Working Days</p>
                  <p className="text-2xl font-black">{data.length}</p>
              </div>
          </div>

          {loading ? (
              <div className="text-center py-10 opacity-50">Loading...</div>
          ) : data.length === 0 ? (
              <p className="text-center text-gray-500 py-10">No records found for {date.toLocaleString('default', { month: 'long' })}.</p>
          ) : (
              data.map((log, i) => (
                  <div key={i} className="bg-white dark:bg-[#151515] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-4">
                          <div className="bg-gray-100 dark:bg-gray-900 rounded-xl w-12 h-12 flex flex-col items-center justify-center">
                              <span className="text-[10px] font-bold uppercase text-gray-400">{new Date(log.date).toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                              <span className="font-black text-sm">{new Date(log.date).getDate()}</span>
                          </div>
                          <div>
                              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1"><CheckCircle size={10}/> Present</p>
                              {/* Daily Duration */}
                              <p className="font-bold text-sm text-gray-800 dark:text-gray-200">
                                  {calculateDuration(log.punch_in, log.punch_out) || 'In Progress'}
                              </p>
                          </div>
                      </div>
                      
                      <div className="flex gap-4 text-right">
                          <div className="relative">
                              <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-0.5">IN</p>
                              <p className="font-bold text-xs text-gray-900 dark:text-gray-200">{formatTime(log.punch_in)}</p>
                          </div>
                          <div className="border-l border-gray-100 dark:border-gray-800 pl-4">
                              <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-0.5">OUT</p>
                              <p className="font-bold text-xs text-gray-900 dark:text-gray-200">{formatTime(log.punch_out)}</p>
                          </div>
                      </div>
                  </div>
              ))
          )}
      </div>
    </div>
  );
}