'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useAppModal } from '../../../context/ModalContext';
import { ArrowLeft, Loader2, Phone, Link as LinkIcon, UserCheck, Search, Save, Plus, X, User, Crown, Unlink, Sparkles } from 'lucide-react';
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
  
  const [filterQuery, setFilterQuery] = useState('');
  
  const [dirtyUpdates, setDirtyUpdates] = useState({});
  const [saving, setSaving] = useState(false);

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
      setLocalGroups([...(json.groups || []), ...(json.suggested_groups || [])]);
      setDirtyUpdates({});
    }
  };

  // ─── POWER ACTIONS ───
  
  const createNewFamily = () => {
      setLocalGroups(prev => [
          { contact: 'New Custom Family', students: [], is_suggested: false, is_new: true },
          ...prev
      ]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const makePrimary = (groupIdx, studentId) => {
      const currentGroup = localGroups[groupIdx];
      
      // Update Dirty State
      const updates = { ...dirtyUpdates };
      currentGroup.students.forEach(s => { updates[s.id] = s.id === studentId ? 0 : studentId; });
      setDirtyUpdates(updates);

      // Update UI State
      setLocalGroups(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          const group = next[groupIdx];
          
          const primary = group.students.find(s => s.id === studentId);
          const others = group.students.filter(s => s.id !== studentId);
          group.students = [primary, ...others]; // Push new primary to top
          
          group.students.forEach(s => { s.primary_payer_id = s.id === studentId ? null : studentId; });
          return next;
      });
  };

  const unlinkStudent = (groupIdx, studentId) => {
      setDirtyUpdates(prev => ({ ...prev, [studentId]: 0 }));
      setLocalGroups(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          next[groupIdx].students = next[groupIdx].students.filter(s => s.id !== studentId);
          return next;
      });
  };

  const establishSuggestedFamily = (groupIdx) => {
      const group = localGroups[groupIdx];
      const primaryId = group.students[0].id;
      
      const updates = { ...dirtyUpdates };
      group.students.forEach((s, i) => { if (i !== 0) updates[s.id] = primaryId; });
      setDirtyUpdates(updates);

      setLocalGroups(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          next[groupIdx].is_suggested = false;
          next[groupIdx].students.forEach((s, i) => { s.primary_payer_id = i === 0 ? null : primaryId; });
          return next;
      });
  };

  const confirmAddStudent = (student) => {
      const group = localGroups[addModal.groupIndex];
      const primaryId = group.students.length > 0 ? group.students[0].id : student.id;

      if (primaryId !== student.id) {
          setDirtyUpdates(prev => ({ ...prev, [student.id]: primaryId }));
      } else {
          setDirtyUpdates(prev => ({ ...prev, [student.id]: 0 })); 
      }

      setLocalGroups(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          next[addModal.groupIndex].students.push({
              id: student.id,
              name: student.name,
              class_name: student.class_name,
              father_name: student.father_name,
              primary_payer_id: primaryId === student.id ? null : primaryId,
              is_manual_addition: true
          });
          return next;
      });
      
      setAddModal({ show: false, groupIndex: null, query: '', results: [], searching: false });
  };

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
      showModal('Saved!', 'Family hierarchies have been updated securely.', 'success');
      loadGroups(); 
    } else {
      showModal('Error', 'Failed to save changes.', 'danger');
    }
  };

  // ─── SEARCH ───
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

  const filteredGroups = localGroups.filter(g => 
    String(g.contact || '').includes(filterQuery) || 
    g.students.some(s => String(s.name || '').toLowerCase().includes(filterQuery.toLowerCase()))
  );

  const dirtyCount = Object.keys(dirtyUpdates).length;

  if (loading) return <div className="min-h-screen flex justify-center items-center"><Loader2 className="animate-spin text-emerald-500 w-10 h-10" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-28 font-sans">
      
      {/* HEADER */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-neutral-800 px-4 py-4 flex items-center gap-3 shadow-sm">
        <Link href="/accountant/profile" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black text-gray-900 dark:text-white leading-none">Family Manager</h1>
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-1">Aggregated Fee Groups</p>
        </div>
      </div>

      {/* FLOATING SAVE BANNER */}
      <AnimatePresence>
        {dirtyCount > 0 && (
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className="sticky top-[73px] z-20 px-4 py-3 bg-indigo-600 shadow-lg border-b border-indigo-700 flex items-center justify-between">
            <span className="text-sm font-black text-white">{dirtyCount} Unsaved Change{dirtyCount !== 1 && 's'}</span>
            <button onClick={handleSaveAll} disabled={saving} className="bg-white text-indigo-700 px-5 py-2 rounded-xl text-xs font-black shadow-md flex items-center gap-2 active:scale-95 transition-all">
              {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} {saving ? 'Saving...' : 'Publish to Server'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-3xl mx-auto px-4 pt-6 space-y-6">
        
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input type="text" value={filterQuery} onChange={(e) => setFilterQuery(e.target.value)} placeholder="Search name or mobile..." className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-neutral-800 shadow-sm text-sm font-bold outline-none focus:border-indigo-500 transition-colors" />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
            <button onClick={createNewFamily} className="bg-indigo-600 text-white px-6 py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-transform">
                <Sparkles size={18} /> New Family
            </button>
        </div>

        {filteredGroups.length === 0 ? (
           <p className="text-center text-sm font-bold text-gray-400 py-10">No families found matching your search.</p>
        ) : (
          filteredGroups.map((group, groupIdx) => {
            const actualGroupIndex = localGroups.findIndex(g => g.contact === group.contact && g.is_suggested === group.is_suggested);
            
            // Hide entirely empty or single-student groups unless it's a brand new custom group being built
            if (group.students.length <= 1 && !group.is_new) return null;

            return (
              <div key={groupIdx} className={`rounded-3xl border shadow-sm overflow-hidden transition-all ${group.is_suggested ? 'bg-white dark:bg-[#151515] border-amber-200 dark:border-amber-900/30' : 'bg-white dark:bg-[#151515] border-gray-100 dark:border-neutral-800'}`}>
                
                {/* Header */}
                <div className={`px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${group.is_suggested ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30' : 'bg-gray-50/50 dark:bg-neutral-900/50 border-gray-100 dark:border-neutral-800'}`}>
                  <div>
                      <div className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white">
                        <Phone size={14} className={group.is_suggested ? 'text-amber-500' : 'text-indigo-500'}/> {group.contact}
                      </div>
                      {group.is_suggested && <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mt-1">Suggested Match (Not linked yet)</p>}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {group.is_suggested && (
                        <button onClick={() => establishSuggestedFamily(actualGroupIndex)} className="text-[10px] font-black uppercase tracking-widest bg-amber-500 text-white px-4 py-2 rounded-xl active:scale-95 transition-transform shadow-md">
                            Establish Family
                        </button>
                    )}
                    <button onClick={() => setAddModal({ show: true, groupIndex: actualGroupIndex, query: '', results: [], searching: false })} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-colors ${group.is_suggested ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
                      <Plus size={14} /> Add Sibling
                    </button>
                  </div>
                </div>
                
                {/* Students */}
                <div className="p-4 space-y-3">
                  {group.students.length === 0 && <p className="text-xs font-bold text-gray-400 text-center py-4 border-2 border-dashed border-gray-100 dark:border-neutral-800 rounded-2xl">Empty Family. Click "Add Sibling" above.</p>}
                  
                  {group.students.map((student, sIdx) => {
                    const isPrimary = student.primary_payer_id === null; 
                    const isLinkedTo = group.students.find(s => s.id === student.primary_payer_id);

                    return (
                      <div key={student.id} className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border-2 transition-all ${isPrimary && !group.is_suggested ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10' : 'border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900'}`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-black text-sm text-gray-900 dark:text-white">{student.name}</p>
                            <span className="text-[10px] font-black uppercase bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-md">{student.class_name}</span>
                          </div>
                          
                          {group.is_suggested ? (
                              <p className="text-[10px] font-black text-gray-400 mt-1 uppercase tracking-widest">Independent Account</p>
                          ) : isPrimary ? (
                              <p className="text-[10px] font-black text-indigo-600 mt-1 flex items-center gap-1 uppercase tracking-widest"><Crown size={12}/> Primary Payer Account</p>
                          ) : (
                              <p className="text-[10px] font-black text-gray-500 mt-1 flex items-center gap-1 uppercase tracking-widest"><LinkIcon size={10}/> Pays to: {isLinkedTo?.name || 'Unknown'}</p>
                          )}
                        </div>

                        {!group.is_suggested && (
                            <div className="flex items-center gap-2 shrink-0">
                            {isPrimary ? null : (
                                <>
                                    <button onClick={() => makePrimary(actualGroupIndex, student.id)} className="text-[10px] font-black text-gray-600 bg-white dark:bg-[#151515] border border-gray-200 dark:border-neutral-700 px-3 py-2 rounded-xl hover:border-indigo-500 hover:text-indigo-600 transition-colors flex items-center gap-1">
                                        <Crown size={12}/> Make Primary
                                    </button>
                                    <button onClick={() => unlinkStudent(actualGroupIndex, student.id)} className="text-[10px] font-black text-red-500 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 px-3 py-2 rounded-xl hover:bg-red-500 hover:text-white transition-colors flex items-center gap-1">
                                        <Unlink size={12}/> Unlink
                                    </button>
                                </>
                            )}
                            </div>
                        )}
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
                  <h3 className="text-lg font-black leading-tight">Add Sibling</h3>
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">Search Global Database</p>
                </div>
                <button onClick={() => setAddModal({ show: false, groupIndex: null, query: '', results: [], searching: false })} className="p-2 bg-gray-100 dark:bg-neutral-800 rounded-full text-gray-500 hover:scale-95 transition-transform"><X size={16}/></button>
              </div>
              
              <div className="p-5 shrink-0">
                <div className="relative">
                  <input type="text" value={addModal.query} onChange={handleAddSearch} placeholder="Search by student name..." autoFocus className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-gray-50 dark:bg-neutral-900 border-2 border-gray-100 dark:border-neutral-800 text-sm font-bold outline-none focus:border-indigo-500 transition-colors" />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2">
                {addModal.searching ? (
                  <div className="flex justify-center py-8"><Loader2 className="animate-spin text-indigo-500" size={24}/></div>
                ) : addModal.results.length === 0 && addModal.query.length >= 2 ? (
                  <p className="text-center text-xs font-bold text-gray-500 py-8">No students found.</p>
                ) : (
                  addModal.results.map(s => (
                    <div key={s.id} className="p-3 border border-gray-100 dark:border-neutral-800 rounded-xl flex items-center justify-between hover:border-indigo-300 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-neutral-800 rounded-full flex items-center justify-center shrink-0"><User size={16} className="text-gray-500"/></div>
                        <div>
                          <p className="text-sm font-black text-gray-900 dark:text-white leading-tight">{s.name}</p>
                          <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mt-0.5">{s.class_name} • S/o {s.father_name}</p>
                        </div>
                      </div>
                      <button onClick={() => confirmAddStudent(s)} className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-xl transition-colors">
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