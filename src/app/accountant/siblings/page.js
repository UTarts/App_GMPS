'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useAppModal } from '../../../context/ModalContext';
import { ArrowLeft, Loader2, Phone, Link as LinkIcon, UserCheck, AlertCircle, Search, Save, Plus, X, User } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const getToken = () => { try { return JSON.parse(localStorage.getItem('gmps_user') || '{}')?.token || ''; } catch { return ''; } };
const safeFetchJson = async (url, options = {}) => {
  try {
    const token = getToken();
    const headers = { ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const res = await fetch(url, { ...options, headers });
    return JSON.parse(await res.text());
  } catch { return { success: false, message: 'Network error.' }; }
};

export default function SiblingManager() {
  const { user } = useAuth();
  const router = useRouter();
  const { showModal } = useAppModal();

  const [localGroups, setLocalGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter State
  const [filterQuery, setFilterQuery] = useState('');
  
  // Bulk Save State
  const [dirtyUpdates, setDirtyUpdates] = useState({});
  const [saving, setSaving] = useState(false);

  // Manual Add Modal State
  const [addModal, setAddModal] = useState({ show: false, groupIndex: null, query: '', results: [], searching: false });
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') { router.replace('/'); return; }
    loadGroups();
  }, [user]);

  const loadGroups = async () => {
    setLoading(true);
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=get_sibling_groups`);
    setLoading(false);
    if (json.success) {
      setLocalGroups(json.groups || []);
      setDirtyUpdates({});
    }
  };

  // ─── LOCAL STATE UPDATES ───
  const setPrimaryPayer = (groupIndex, studentId, payerId) => {
    setLocalGroups(prev => {
      const next = [...prev];
      const sIdx = next[groupIndex].students.findIndex(s => s.id === studentId);
      if (sIdx > -1) next[groupIndex].students[sIdx].primary_payer_id = payerId > 0 ? payerId : null;
      return next;
    });
    setDirtyUpdates(prev => ({ ...prev, [studentId]: payerId }));
  };

  // ─── BULK SAVE ACTION ───
  const handleSaveAll = async () => {
    const updates = Object.entries(dirtyUpdates).map(([student_id, payer_id]) => ({ student_id, payer_id }));
    if (updates.length === 0) return;

    setSaving(true);
    const fd = new FormData();
    fd.append('action', 'save_sibling_payers_bulk');
    fd.append('updates', JSON.stringify(updates));
    
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php`, { method: 'POST', body: fd });
    setSaving(false);

    if (json.success) {
      showModal('Saved!', 'All sibling links have been updated successfully.', 'success');
      loadGroups(); // Reload fresh from server
    } else {
      showModal('Error', 'Failed to save changes.', 'danger');
    }
  };

  // ─── MANUAL ADD SEARCH ───
  const handleAddSearch = (e) => {
    const q = e.target.value;
    setAddModal(p => ({ ...p, query: q }));
    clearTimeout(debounceRef.current);
    if (q.length >= 2) {
      debounceRef.current = setTimeout(async () => {
        setAddModal(p => ({ ...p, searching: true }));
        const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=search_student&q=${encodeURIComponent(q)}`);
        setAddModal(p => ({ ...p, searching: false, results: json.success ? json.students : [] }));
      }, 400);
    } else {
      setAddModal(p => ({ ...p, results: [], searching: false }));
    }
  };

  const confirmAddStudent = (student) => {
    const group = localGroups[addModal.groupIndex];
    const oldestPayerId = group.students[0].id;

    // Append visually to the local group
    setLocalGroups(prev => {
      const next = [...prev];
      next[addModal.groupIndex].students.push({
        id: student.id,
        name: student.name,
        class_name: student.class_name,
        primary_payer_id: oldestPayerId,
        is_manual_addition: true 
      });
      return next;
    });

    // Mark as dirty
    setDirtyUpdates(prev => ({ ...prev, [student.id]: oldestPayerId }));
    setAddModal({ show: false, groupIndex: null, query: '', results: [], searching: false });
  };

  // ─── FILTERING ───
  const filteredGroups = localGroups.filter(g => 
    String(g.contact || '').includes(filterQuery) || 
    g.students.some(s => String(s.name || '').toLowerCase().includes(filterQuery.toLowerCase()))
  );

  const dirtyCount = Object.keys(dirtyUpdates).length;

  if (loading) return <div className="min-h-screen flex justify-center items-center"><Loader2 className="animate-spin text-emerald-500 w-10 h-10" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-28 font-sans">
      
      {/* HEADER */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-neutral-800 px-4 py-4 flex items-center gap-3">
        <Link href="/accountant/profile" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-black text-gray-900 dark:text-white">Sibling Manager</h1>
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Group Family Accounts</p>
        </div>
      </div>

      {/* FLOATING SAVE BANNER */}
      <AnimatePresence>
        {dirtyCount > 0 && (
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className="sticky top-[73px] z-20 px-4 py-3 bg-emerald-500 shadow-lg border-b border-emerald-600 flex items-center justify-between">
            <span className="text-sm font-black text-white">{dirtyCount} Unsaved Change{dirtyCount !== 1 && 's'}</span>
            <button onClick={handleSaveAll} disabled={saving} className="bg-white text-emerald-600 px-5 py-2 rounded-xl text-xs font-black shadow-md flex items-center gap-2 active:scale-95 transition-all">
              {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} {saving ? 'Saving...' : 'Save All'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-3xl mx-auto px-4 pt-6 space-y-5">
        
        {/* Search Bar */}
        <div className="relative">
          <input type="text" value={filterQuery} onChange={(e) => setFilterQuery(e.target.value)} placeholder="Search by student name or contact number..." className="w-full pl-12 pr-4 py-4 rounded-[2rem] bg-white dark:bg-[#151515] border border-gray-100 dark:border-neutral-800 shadow-sm text-sm font-bold outline-none focus:border-emerald-500 transition-colors" />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>


        {filteredGroups.length === 0 ? (
           <p className="text-center text-sm font-bold text-gray-400 py-10">No families found matching your search.</p>
        ) : (
          filteredGroups.map((group, groupIdx) => {
            const actualGroupIndex = localGroups.findIndex(g => g.contact === group.contact);

            return (
              <div key={groupIdx} className="bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-neutral-800 shadow-sm overflow-hidden">
                <div className="bg-gray-50 dark:bg-neutral-900/50 px-5 py-3 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-black text-gray-700 dark:text-gray-300">
                    <Phone size={14} className="text-emerald-500"/> {group.contact}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{group.students.length} Students</span>
                    <button onClick={() => setAddModal({ show: true, groupIndex: actualGroupIndex, query: '', results: [], searching: false })} className="w-8 h-8 flex items-center justify-center bg-emerald-100 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-xl transition-colors">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="p-5 space-y-4">
                  {group.students.map((student, sIdx) => {
                    const isPrimary = student.primary_payer_id === null; 
                    const isLinkedTo = group.students.find(s => s.id === student.primary_payer_id);

                    return (
                      <div key={student.id} className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border-2 transition-all ${isPrimary ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10' : 'border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/30'}`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-black text-sm text-gray-900 dark:text-white">{student.name}</p>
                            <span className="text-[10px] font-black uppercase bg-gray-200 dark:bg-neutral-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-md">{student.class_name}</span>
                            {student.is_manual_addition && <span className="text-[9px] font-black uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md">Manually Added</span>}
                          </div>
                          {isPrimary ? (
                            <p className="text-[10px] font-black text-emerald-600 mt-1 flex items-center gap-1"><UserCheck size={12}/> Primary Payer Account</p>
                          ) : (
                            <p className="text-[10px] font-black text-amber-600 mt-1 flex items-center gap-1"><LinkIcon size={12}/> Fees transferred to: {isLinkedTo?.name || 'Unknown'}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isPrimary ? (
                            sIdx !== 0 && (
                              <button onClick={() => setPrimaryPayer(actualGroupIndex, student.id, group.students[0].id)} className="text-[10px] font-black bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 px-3 py-2 rounded-xl hover:border-emerald-500 transition-colors">
                                Link to {group.students[0].name}
                              </button>
                            )
                          ) : (
                            <button onClick={() => setPrimaryPayer(actualGroupIndex, student.id, 0)} className="text-[10px] font-black bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 px-3 py-2 rounded-xl hover:border-red-500 text-red-500 transition-colors">
                              Unlink Account
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MANUAL ADD MODAL */}
      <AnimatePresence>
        {addModal.show && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-5 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-lg font-black">Add Sibling</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Search Global Database</p>
                </div>
                <button onClick={() => setAddModal({ show: false, groupIndex: null, query: '', results: [], searching: false })} className="p-2 bg-gray-100 dark:bg-neutral-800 rounded-full text-gray-500"><X size={16}/></button>
              </div>
              
              <div className="p-5 shrink-0">
                <div className="relative">
                  <input type="text" value={addModal.query} onChange={handleAddSearch} placeholder="Search by student name..." autoFocus className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50 dark:bg-neutral-900 border-2 border-gray-100 dark:border-neutral-800 text-sm font-bold outline-none focus:border-emerald-500" />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2">
                {addModal.searching ? (
                  <div className="flex justify-center py-6"><Loader2 className="animate-spin text-emerald-500" size={24}/></div>
                ) : addModal.results.length === 0 && addModal.query.length >= 2 ? (
                  <p className="text-center text-xs font-bold text-gray-500 py-6">No students found.</p>
                ) : (
                  addModal.results.map(s => (
                    <div key={s.id} className="p-3 border border-gray-100 dark:border-neutral-800 rounded-xl flex items-center justify-between hover:border-emerald-300 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 dark:bg-neutral-800 rounded-full flex items-center justify-center"><User size={14} className="text-gray-500"/></div>
                        <div>
                          <p className="text-sm font-black text-gray-900 dark:text-white">{s.name}</p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase">{s.class_name} • S/D/O {s.father_name}</p>
                        </div>
                      </div>
                      <button onClick={() => confirmAddStudent(s)} className="text-[10px] font-black bg-emerald-100 text-emerald-600 hover:bg-emerald-500 hover:text-white px-3 py-1.5 rounded-lg transition-colors">
                        Add
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}