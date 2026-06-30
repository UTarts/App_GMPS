"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useAppModal } from '../../../context/ModalContext';
import { ArrowLeft, CheckCircle2, Loader2, Users, Bus, GraduationCap, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

const getToken = () => { try { return JSON.parse(localStorage.getItem('gmps_user') || '{}')?.token || ''; } catch { return ''; } };
const safeFetchJson = async (url, options = {}) => {
  try {
    const token = getToken();
    const headers = { ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const res = await fetch(url, { ...options, headers });
    return JSON.parse(await res.text());
  } catch { return { success: false, message: 'Network error.' }; }
};

export default function StudentMapping() {
  const { user } = useAuth();
  const router = useRouter();
  const { showModal } = useAppModal();

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') { router.replace('/'); return; }
    loadClasses();
  }, [user]);

  const loadClasses = async () => {
    setLoading(true);
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=get_dashboard_stats`);
    setLoading(false);
    if (json.success) setClasses(json.class_data || []);
  };

  const loadStudents = async (classObj) => {
    if (!classObj.class_id) {
      showModal('Error', 'Class ID missing. Please ensure backend is updated.', 'danger');
      return;
    }
    setSelectedClass(classObj);
    setLoadingStudents(true);
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=get_students_mapping&class_id=${classObj.class_id}`);
    setLoadingStudents(false);
    
    if (json.success) {
      setStudents(json.students || []);
    } else {
      showModal('Error', json.message || 'Failed to load students.', 'danger');
    }
  };

  const handleToggle = (id, field, val) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  const saveMapping = async () => {
    setSaving(true);
    const fd = new FormData();
    fd.append('action', 'save_students_mapping');
    fd.append('updates', JSON.stringify(students));
    
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php`, { method: 'POST', body: fd });
    setSaving(false);
    
    if (json.success) {
      showModal('Saved!', `Settings for ${selectedClass.class_name} updated successfully.`, 'success');
    } else {
      showModal('Error', json.message || 'Failed to save', 'danger');
    }
  };

  if (loading && !selectedClass) {
    return <div className="min-h-screen flex justify-center items-center bg-gray-50 dark:bg-[#0a0a0a]"><Loader2 className="animate-spin text-emerald-500 w-10 h-10" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-28 font-sans">
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-neutral-800 px-4 py-4 flex items-center gap-3">
        <Link href="/accountant/profile" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <div>
          <h1 className="text-base font-black text-gray-900 dark:text-white">Fee Logic Mapping</h1>
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Old/New • Transport • Waivers</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6">
        {!selectedClass ? (
          <>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {classes.map((c, i) => (
                <button key={i} onClick={() => loadStudents(c)} className="bg-white dark:bg-[#151515] p-5 rounded-3xl border border-gray-100 dark:border-neutral-800 shadow-sm text-left hover:border-emerald-400 dark:hover:border-emerald-500 transition-all group">
                  <p className="text-xl font-black text-gray-900 dark:text-white group-hover:text-emerald-500">{c.class_name}</p>
                  <p className="text-xs text-gray-500 font-bold mt-2 flex items-center gap-1.5 bg-gray-50 dark:bg-neutral-900 w-max px-2 py-1 rounded-md"><Users size={12}/> {c.student_count} Students</p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => { setSelectedClass(null); setStudents([]); }} className="text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 bg-white dark:bg-[#151515] px-3 py-2 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800">
                <ArrowLeft size={14}/> Back
              </button>
              <button onClick={saveMapping} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-black shadow-md flex items-center gap-2 active:scale-95 transition-all">
                {saving ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>} Save {selectedClass.class_name}
              </button>
            </div>

            <div className="bg-white dark:bg-[#151515] border border-gray-100 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 dark:bg-neutral-900/50 p-4 border-b border-gray-100 dark:border-neutral-800">
                <p className="text-sm font-black text-gray-900 dark:text-white">Mapping: {selectedClass.class_name}</p>
              </div>
              
              {loadingStudents ? (
                <div className="p-16 flex justify-center"><Loader2 className="animate-spin text-emerald-500" size={32}/></div>
              ) : students.length === 0 ? (
                <div className="p-10 text-center text-sm font-bold text-gray-500">No active students found in this class.</div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-neutral-800/50">
                  {students.map(s => (
                    <div key={s.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-neutral-900/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-900 dark:text-white truncate">{s.name}</p>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">{s.login_id} • S/D/O {s.father_name}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Old/New Toggle */}
                        <button onClick={() => handleToggle(s.id, 'is_new_admission', Number(s.is_new_admission) === 1 ? 0 : 1)} 
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black transition-colors border ${Number(s.is_new_admission) === 1 ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800/50 dark:text-purple-400' : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-400'}`}>
                          <GraduationCap size={14}/> {Number(s.is_new_admission) === 1 ? 'New Admission' : 'Old Student'}
                        </button>
                        
                        {/* Transport Toggle */}
                        <button onClick={() => handleToggle(s.id, 'uses_transport', Number(s.uses_transport) === 1 ? 0 : 1)} 
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black transition-colors border ${Number(s.uses_transport) === 1 ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-400' : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-400'}`}>
                          <Bus size={14}/> {Number(s.uses_transport) === 1 ? 'Transport ON' : 'Transport OFF'}
                        </button>
                        
                        {/* Waiver Dropdown */}
                        <div className="relative">
                          <select value={s.fee_waiver_type} onChange={(e) => handleToggle(s.id, 'fee_waiver_type', e.target.value)} 
                            className={`outline-none px-3 py-2 rounded-xl text-[10px] font-black transition-colors border appearance-none cursor-pointer pr-8 ${s.fee_waiver_type === 'staff' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50 dark:text-amber-400' : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-400'}`}>
                            <option value="none">No Waiver</option>
                            <option value="staff">Staff Kid (100% Waived)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}