"use client";
import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Clock, ShieldAlert, Filter, Save, X, Calendar as CalIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

// Helper to get local date string, bypassing the UTC offset bug
const getLocalISODate = (d) => {
    const date = new Date(d);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().split('T')[0];
};

export default function AdminStaffTracker() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getLocalISODate(new Date()));
  
  const [activeTab, setActiveTab] = useState('teacher'); 
  const [filter, setFilter] = useState('all'); 
  
  const [editModal, setEditModal] = useState(null);
  const [userHistory, setUserHistory] = useState([]);

  useEffect(() => { fetchLiveTracker(); }, [selectedDate]);

  const fetchLiveTracker = async () => {
    setLoading(true);
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/staff_attendance.php`, {
            method: 'POST', body: JSON.stringify({ action: 'get_admin_live', date: selectedDate })
        });
        const json = await res.json();
        
        if (json.status === 'success') {
            setData(json.data);
        } else {
            alert("Database Error: " + json.message); // This will catch the 500 error!
            console.error(json.message);
        }
    } catch (e) {
        console.error("Network failure", e);
    }
    setLoading(false);
  };

  const changeDate = (days) => {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + days);
      setSelectedDate(getLocalISODate(d));
  };

  const openEditModal = async (staff) => {
    setEditModal(staff);
    const [year, month] = selectedDate.split('-');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/staff_attendance.php`, {
      method: 'POST', body: JSON.stringify({ action: 'get_user_month', uid: `${staff.type}_${staff.id}`, month, year })
    });
    const json = await res.json();
    if(json.status === 'success') setUserHistory(json.data);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = { 
        action: 'admin_edit_attendance', 
        uid: `${editModal.type}_${editModal.id}`, 
        date: selectedDate,
        punch_in: formData.get('punch_in') || '',
        punch_out: formData.get('punch_out') || '',
        status: formData.get('status') 
    };
    
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/staff_attendance.php`, { method: 'POST', body: JSON.stringify(body) });
    setEditModal(null);
    fetchLiveTracker();
  };

  const formatTime = (timeStr) => {
      if (!timeStr) return '--:--';
      const [h, m] = timeStr.split(':');
      let hours = parseInt(h);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${m} ${ampm}`;
  };

  const getStatusColor = (status) => {
      switch(status) {
          case 'present': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200';
          case 'absent': return 'text-rose-500 bg-rose-50 dark:bg-rose-900/20 border-rose-200';
          case 'halfday': return 'text-amber-500 bg-amber-50 dark:bg-amber-900/20 border-amber-200';
          case 'leave': return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-200';
          default: return 'text-gray-500 bg-gray-50 dark:bg-neutral-800 border-gray-200';
      }
  };

  const filteredData = data.filter(s => s.type === activeTab && (filter === 'all' || s.calculated_status === filter));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 font-sans text-gray-900 dark:text-gray-100">
      
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-100 dark:border-neutral-800 px-4 py-4 flex items-center gap-4">
        <Link href="/admin" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors shrink-0"><ArrowLeft size={20} /></Link>
        <div className="flex-1 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
                <h1 className="text-lg font-black tracking-tight leading-none">Attendance Monitor</h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">Live Shift Tracking</p>
            </div>
            {/* LEFT / RIGHT DATE SWITCHER */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-neutral-800 rounded-xl p-1 shrink-0 w-max">
                <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white dark:hover:bg-neutral-700 rounded-lg transition-colors"><ChevronLeft size={16}/></button>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-transparent text-xs font-black text-indigo-600 outline-none w-28 text-center" />
                <button onClick={() => changeDate(1)} className="p-2 hover:bg-white dark:hover:bg-neutral-700 rounded-lg transition-colors"><ChevronRight size={16}/></button>
            </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-6 space-y-4">
        
        {/* TABS & FILTERS */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex gap-2 bg-white dark:bg-[#151515] p-1.5 rounded-2xl border border-gray-100 dark:border-neutral-800 shadow-sm w-full sm:w-auto">
                <button onClick={() => setActiveTab('teacher')} className={`flex-1 sm:w-32 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'teacher' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-neutral-900'}`}>Teachers</button>
                <button onClick={() => setActiveTab('staff')} className={`flex-1 sm:w-32 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'staff' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-neutral-900'}`}>Other Staff</button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 sm:pb-0">
                <Filter size={16} className="text-gray-400 shrink-0" />
                {['all', 'present', 'halfday', 'absent', 'leave'].map(f => (
                    <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${filter === f ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-black dark:border-white' : 'bg-white dark:bg-[#151515] text-gray-500 border-gray-100 dark:border-neutral-800 hover:bg-gray-50'}`}>
                        {f}
                    </button>
                ))}
            </div>
        </div>

        {/* STAFF LIST */}
        <div className="space-y-3 pb-10">
            {loading ? <p className="text-center py-10 text-xs font-bold text-gray-400 flex items-center justify-center gap-2"><Clock size={16} className="animate-spin"/> Syncing Biometrics...</p> : 
             filteredData.length === 0 ? <p className="text-center py-10 text-xs font-bold text-gray-400">No records match this filter.</p> :
             filteredData.map(s => {
                const shiftPct = Math.min(100, (s.hours_worked / s.shift_hours) * 100);
                
                return (
                 <div key={s.id} onClick={() => openEditModal(s)} className="bg-white dark:bg-[#151515] p-4 rounded-3xl border border-gray-100 dark:border-neutral-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800 cursor-pointer transition-colors group">
                    <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                            <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${s.profile_pic}`} className="w-14 h-14 rounded-full object-cover border-2 border-gray-50 dark:border-neutral-800" />
                            {s.is_override === 1 && <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white p-1 rounded-full"><ShieldAlert size={10} /></div>}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <h4 className="font-black text-sm truncate">{s.name}</h4>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Shift: {formatTime(s.shift_start)} - {formatTime(s.shift_end)}</p>
                            
                            <div className="flex items-center gap-3 mt-2">
                                <div className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${getStatusColor(s.calculated_status)}`}>
                                    {s.calculated_status}
                                </div>
                                <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1"><Clock size={12}/> {s.hours_worked} / {s.shift_hours} Hrs</span>
                            </div>
                        </div>

                        <div className="text-right shrink-0">
                            <div className="bg-gray-50 dark:bg-neutral-900 rounded-xl p-2 px-3 border border-gray-100 dark:border-neutral-800">
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">IN <span className="text-indigo-600 dark:text-indigo-400 ml-1">{formatTime(s.punch_in)}</span></p>
                                <p className="text-[10px] font-black text-gray-400 uppercase">OUT <span className="text-indigo-600 dark:text-indigo-400 ml-1">{formatTime(s.punch_out)}</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-1000 ${shiftPct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${shiftPct}%` }}></div>
                        </div>
                        <span className="text-[9px] font-bold text-gray-400 w-8 text-right">{shiftPct.toFixed(0)}%</span>
                    </div>
                 </div>
             )})}
        </div>
      </div>

      {/* GOD MODE MODAL */}
      {editModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleEditSave} className="bg-white dark:bg-[#151515] w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative">
            <button type="button" onClick={() => setEditModal(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 dark:hover:text-white"><X size={20}/></button>
            
            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-neutral-800 pb-4">
                <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${editModal.profile_pic}`} className="w-12 h-12 rounded-full object-cover" />
                <div>
                    <h2 className="font-black leading-tight">{editModal.name}</h2>
                    <p className="text-[10px] font-bold uppercase text-indigo-500">{new Date(selectedDate).toLocaleDateString('en-GB', { dateStyle: 'full' })}</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Manual IN</label>
                        <input name="punch_in" type="time" defaultValue={editModal.punch_in} className="w-full p-3 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl outline-none font-bold text-sm" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Manual OUT</label>
                        <input name="punch_out" type="time" defaultValue={editModal.punch_out} className="w-full p-3 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl outline-none font-bold text-sm" />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Override Status</label>
                    <select name="status" defaultValue={editModal.calculated_status} className="w-full p-3 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl outline-none font-black text-sm uppercase tracking-widest text-indigo-600">
                        <option value="present">Present (Full Day)</option>
                        <option value="halfday">Half Day</option>
                        <option value="absent">Absent</option>
                        <option value="leave">On Leave</option>
                    </select>
                </div>

                <button type="submit" className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                    <Save size={18}/> Force Update Log
                </button>
            </div>

            {/* MINI HISTORY SUMMARY */}
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-neutral-800">
                <h4 className="text-[10px] font-bold uppercase text-gray-400 mb-3 flex items-center gap-1"><CalIcon size={12}/> Month Summary</h4>
                <div className="flex flex-wrap gap-1.5">
                    {userHistory.map((h, i) => (
                        <div key={i} title={`${h.date}: ${h.status}`} className={`w-3.5 h-3.5 rounded-sm ${h.status === 'present' ? 'bg-emerald-400' : h.status === 'halfday' ? 'bg-amber-400' : h.status === 'leave' ? 'bg-blue-400' : 'bg-rose-400'}`}></div>
                    ))}
                    {userHistory.length === 0 && <span className="text-xs text-gray-500 font-bold">No history available for this month.</span>}
                </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}