"use client";
import { useEffect, useState } from 'react';
import { useAuth } from "../../../context/AuthContext";
import { ArrowLeft, Clock, CheckCircle, LogOut } from 'lucide-react';
import Link from 'next/link';

export default function TeacherAttendance() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Default to current month
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/staff_attendance.php`, {
        method: 'POST', body: JSON.stringify({ action: 'get_my_record', teacher_id: user?.id, month: calMonth, year: calYear })
      });
      const json = await res.json();
      if(json.status === 'success') setData(json.data);
      setLoading(false);
    }
    if (user) fetchData();
  }, [user, calMonth, calYear]);

  // Formatting helpers
  const formatTime = (timeStr) => {
      if (!timeStr) return '--:--';
      const [h, m] = timeStr.split(':');
      let hours = parseInt(h);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${m} ${ampm}`;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] pb-24 text-gray-800 dark:text-white">
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-4 flex items-center gap-4">
        <button onClick={() => window.history.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-black tracking-tight">My Attendance</h1>
      </div>
      
      <div className="p-4 mt-2 space-y-4">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-[1.5rem] text-white shadow-lg">
              <h2 className="font-bold text-lg mb-1">Punch Log</h2>
              <p className="text-blue-100 text-xs">Your biometric punch-in history</p>
          </div>

          {loading ? <p className="text-center py-10">Loading...</p> : data.length === 0 ? <p className="text-center text-gray-500 py-10">No records found for this month.</p> : (
              data.map((log, i) => (
                  <div key={i} className="bg-white dark:bg-[#151515] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
                      <div>
                          <p className="font-bold text-sm">{new Date(log.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                          <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Present</span>
                      </div>
                      <div className="flex gap-4 text-right">
                          <div>
                              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-0.5 flex items-center justify-end gap-1"><Clock size={10}/> IN</p>
                              <p className="font-bold text-sm text-gray-900 dark:text-gray-200">{formatTime(log.punch_in)}</p>
                          </div>
                          <div className="border-l border-gray-200 dark:border-gray-800 pl-4">
                              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-0.5 flex items-center justify-end gap-1"><LogOut size={10}/> OUT</p>
                              <p className="font-bold text-sm text-gray-900 dark:text-gray-200">{formatTime(log.punch_out)}</p>
                          </div>
                      </div>
                  </div>
              ))
          )}
      </div>
    </div>
  );
}