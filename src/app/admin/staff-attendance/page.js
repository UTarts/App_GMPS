"use client";
import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import Link from 'next/link';

export default function AdminStaffTracker() {
  const [data, setData] = useState([]);
  const [activeTab, setActiveTab] = useState('teacher');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { fetchLiveTracker(); }, [selectedDate]);

  const fetchLiveTracker = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/staff_attendance.php`, {
      method: 'POST', body: JSON.stringify({ action: 'get_admin_live', date: selectedDate })
    });
    const json = await res.json();
    if(json.status === 'success') setData(json.data);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = { action: 'admin_edit_attendance', uid: `${selectedStaff.type}_${selectedStaff.id}`, ...Object.fromEntries(formData) };
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/staff_attendance.php`, { method: 'POST', body: JSON.stringify(body) });
    setSelectedStaff(null);
    fetchLiveTracker();
  };

  return (
    <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] pb-24 text-gray-800 dark:text-white">
      <div className="sticky top-0 bg-white/90 p-4 border-b flex items-center gap-4">
        <Link href="/admin"><ArrowLeft size={20} /></Link>
        <h1 className="font-black">Live Monitor</h1>
      </div>

      {/* TABS */}
      <div className="flex gap-2 p-4">
        <button onClick={() => setActiveTab('teacher')} className={`flex-1 py-2 rounded-xl text-[10px] font-black ${activeTab === 'teacher' ? 'bg-blue-600 text-white' : 'bg-white'}`}>TEACHERS</button>
        <button onClick={() => setActiveTab('staff')} className={`flex-1 py-2 rounded-xl text-[10px] font-black ${activeTab === 'staff' ? 'bg-blue-600 text-white' : 'bg-white'}`}>OTHER STAFF</button>
      </div>

      <div className="px-4 space-y-3">
        {data.filter(s => s.type === activeTab).map((s) => (
          <div key={`${s.type}_${s.id}`} onClick={() => setSelectedStaff(s)} className="bg-white p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:shadow-md">
            <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${s.profile_pic}`} className="w-12 h-12 rounded-full object-cover" />
            <div className="flex-1">
              <p className="font-bold text-sm">{s.name}</p>
              <p className="text-[10px] font-black uppercase text-gray-400">{s.status || 'Not Punched'}</p>
            </div>
          </div>
        ))}
      </div>

      {/* MASTER ATTENDANCE MODAL */}
      {selectedStaff && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleEdit} className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <h2 className="font-black mb-4">Edit {selectedStaff.name}</h2>
            <input type="hidden" name="date" value={selectedDate} />
            <label className="text-[10px] font-bold uppercase">Punch IN</label>
            <input name="punch_in" type="time" defaultValue={selectedStaff.punch_in} className="w-full p-3 bg-gray-100 rounded-xl mb-3" />
            <label className="text-[10px] font-bold uppercase">Punch OUT</label>
            <input name="punch_out" type="time" defaultValue={selectedStaff.punch_out} className="w-full p-3 bg-gray-100 rounded-xl mb-3" />
            <select name="status" defaultValue={selectedStaff.status} className="w-full p-3 bg-gray-100 rounded-xl mb-6 font-bold">
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="halfday">Half Day</option>
              <option value="leave">On Leave</option>
            </select>
            <div className="flex gap-3">
              <button type="button" onClick={() => setSelectedStaff(null)} className="flex-1 py-3 font-bold">Cancel</button>
              <button className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black flex items-center justify-center gap-2">
                <Save size={16}/> Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}