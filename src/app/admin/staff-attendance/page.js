"use client";
import { useEffect, useState } from 'react';
import { ArrowLeft, Clock, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminStaffTracker() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchLiveTracker();
    // Auto-refresh every 30 seconds for live monitoring
    const interval = setInterval(fetchLiveTracker, 30000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  const fetchLiveTracker = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/staff_attendance.php`, {
      method: 'POST', body: JSON.stringify({ action: 'get_admin_live', date: selectedDate })
    });
    const json = await res.json();
    if(json.status === 'success') setData(json.data);
    setLoading(false);
  };

  const formatTime = (timeStr) => {
      if (!timeStr) return '--:--';
      const [h, m] = timeStr.split(':');
      let hours = parseInt(h);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${m} ${ampm}`;
  };

  return (
    <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] pb-24 text-gray-800 dark:text-white">
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-4 flex items-center gap-4">
        <Link href="/admin" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft size={20} /></Link>
        <div>
            <h1 className="text-lg font-black tracking-tight leading-none">Live Monitor</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">Staff Biometric Feed</p>
        </div>
      </div>
      
      <div className="p-4 mt-2 space-y-4">
          <input 
            type="date" 
            value={selectedDate} 
            onChange={e => setSelectedDate(e.target.value)} 
            className="w-full bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 p-4 rounded-xl font-bold outline-none dark:text-white focus:border-blue-500"
          />

          {loading ? <p className="text-center py-10">Loading Monitor...</p> : (
              data.map((staff) => (
                  <div key={staff.id} className="bg-white dark:bg-[#151515] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
                      <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${staff.profile_pic || 'GMPSimages/default_teacher.png'}`} className="w-12 h-12 rounded-full object-cover bg-gray-100" />
                      <div className="flex-1">
                          <h4 className="font-bold text-sm">{staff.name}</h4>
                          <div className="flex items-center gap-1 mt-1">
                              {staff.punch_in ? <CheckCircle size={12} className="text-green-500"/> : <XCircle size={12} className="text-red-500"/>}
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${staff.punch_in ? 'text-green-500' : 'text-red-500'}`}>
                                  {staff.punch_in ? 'Present' : 'Absent'}
                              </span>
                          </div>
                      </div>
                      <div className="text-right">
                          <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-0.5"><span className="text-green-500">IN:</span> {formatTime(staff.punch_in)}</p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-widest"><span className="text-orange-500">OUT:</span> {formatTime(staff.punch_out)}</p>
                      </div>
                  </div>
              ))
          )}
      </div>
    </div>
  );
}