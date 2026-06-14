"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from "../../../../context/AuthContext";
import { useAppModal } from "../../../../context/ModalContext";
import {
  ArrowLeft, Plus, Trash2, Edit3, Save, X,
  ChevronDown, Settings, Loader2, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const getToken = () => {
  try { return JSON.parse(localStorage.getItem('gmps_user') || '{}')?.token || ''; }
  catch { return ''; }
};

const safeFetchJson = async (url, options = {}) => {
  try {
    const token = getToken();
    const headers = {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(url, { ...options, headers });
    const text = await res.text();
    return JSON.parse(text);
  } catch (err) {
    return { success: false, message: 'Network/server error.' };
  }
};

export default function FeeMatrixPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showModal } = useAppModal();

  const [classes, setClasses] = useState([]);
  const [feeHeads, setFeeHeads] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedClass, setExpandedClass] = useState(null);
  const [headModal, setHeadModal] = useState(false);
  const [headForm, setHeadForm] = useState({ id: null, name: '', frequency: 'yearly', is_optional: 0 });
  const [dirtyAmounts, setDirtyAmounts] = useState({});

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin' || Number(user.level) !== 3) {
      router.replace('/');
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const json = await safeFetchJson(
        `${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=get_fee_matrix`
      );
      if (json.success) {
        setClasses(json.classes || []);
        setFeeHeads(json.fee_heads || []);
        const m = {};
        (json.matrix_rows || []).forEach(row => {
          if (!m[row.class_id]) m[row.class_id] = {};
          m[row.class_id][row.fee_head_id] = row.amount;
        });
        setMatrix(m);
      } else {
        showModal("Error", json.message || "Could not load fee matrix.", "danger");
      }
    } catch {
      showModal("Error", "Failed to load data.", "danger");
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (classId, headId, value) => {
    setDirtyAmounts(prev => ({ ...prev, [`${classId}_${headId}`]: value }));
  };

  const saveClassAmounts = async (classId) => {
    const classKeys = Object.keys(dirtyAmounts).filter(k => k.startsWith(`${classId}_`));
    if (classKeys.length === 0) return;
    setSaving(true);
    try {
      const rows = classKeys.map(key => {
        const headId = key.split('_')[1];
        return { class_id: classId, fee_head_id: headId, amount: dirtyAmounts[key] };
      });
      const fd = new FormData();
      fd.append('action', 'save_fee_amounts');
      fd.append('rows', JSON.stringify(rows));
      const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php`, {
        method: 'POST', body: fd
      });
      if (json.success) {
        const newMatrix = { ...matrix };
        classKeys.forEach(key => {
          const headId = key.split('_')[1];
          if (!newMatrix[classId]) newMatrix[classId] = {};
          newMatrix[classId][headId] = dirtyAmounts[key];
        });
        setMatrix(newMatrix);
        const remaining = { ...dirtyAmounts };
        classKeys.forEach(k => delete remaining[k]);
        setDirtyAmounts(remaining);
        showModal("Saved!", "Fee amounts updated successfully.", "success");
      } else {
        showModal("Error", json.message || "Save failed.", "danger");
      }
    } finally {
      setSaving(false);
    }
  };

  const openAddHead = () => {
    setHeadForm({ id: null, name: '', frequency: 'yearly', is_optional: 0 });
    setHeadModal(true);
  };

  const openEditHead = (head) => {
    setHeadForm({ id: head.id, name: head.name, frequency: head.frequency, is_optional: head.is_optional });
    setHeadModal(true);
  };

  const saveHead = async () => {
    if (!headForm.name.trim()) { showModal("Validation", "Fee head name is required.", "danger"); return; }
    setSaving(true);
    const fd = new FormData();
    fd.append('action', headForm.id ? 'update_fee_head' : 'add_fee_head');
    fd.append('name', headForm.name.trim());
    fd.append('frequency', headForm.frequency);
    fd.append('is_optional', headForm.is_optional);
    if (headForm.id) fd.append('id', headForm.id);
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php`, {
      method: 'POST', body: fd
    });
    setSaving(false);
    if (json.success) {
      showModal("Done!", headForm.id ? "Fee head updated." : "Fee head added.", "success");
      setHeadModal(false);
      loadAll();
    } else {
      showModal("Error", json.message || "Failed.", "danger");
    }
  };

  const confirmDeleteHead = (head) => {
    showModal(
      "Delete Fee Head?",
      `Deleting "${head.name}" will remove all amounts linked to it. This cannot be undone.`,
      "danger",
      () => deleteHead(head.id)
    );
  };

  const deleteHead = async (id) => {
    const fd = new FormData();
    fd.append('action', 'delete_fee_head');
    fd.append('id', id);
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php`, {
      method: 'POST', body: fd
    });
    if (json.success) { showModal("Deleted", "Fee head removed.", "success"); loadAll(); }
    else showModal("Error", json.message || "Delete failed.", "danger");
  };

  const hasDirtyForClass = (classId) =>
    Object.keys(dirtyAmounts).some(k => k.startsWith(`${classId}_`));

  const frequencyBadge = (f) => {
    const map = {
      monthly: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      termly: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      yearly: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    };
    return map[f] || 'bg-gray-100 text-gray-600';
  };

  if (loading) return <MatrixSkeleton />;

  return (
    <div className="min-h-screen pb-28 bg-gray-50 dark:bg-[#0a0a0a] font-sans text-gray-800 dark:text-gray-100">

      {/* HEADER */}
      <div className="sticky top-0 z-50 px-4 py-4 flex items-center justify-between border-b backdrop-blur-xl bg-white/80 dark:bg-black/80 border-gray-100 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <Link href="/accountant/profile" className="p-2 rounded-full bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h2 className="text-lg font-black">Fee Structure</h2>
            <p className="text-[10px] opacity-60">Class-wise fee matrix</p>
          </div>
        </div>
        <button
          onClick={openAddHead}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-2xl active:scale-95 transition-all shadow-md"
        >
          <Plus size={16} /> Add Fee Head
        </button>
      </div>

      <div className="px-4 mt-5 max-w-lg mx-auto space-y-4">

        {/* FEE HEADS OVERVIEW */}
        <div className="bg-white dark:bg-[#151515] border border-gray-100 dark:border-neutral-800 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Settings size={16} />
            </div>
            <h3 className="font-black text-sm text-gray-900 dark:text-white">Fee Heads ({feeHeads.length})</h3>
          </div>
          {feeHeads.length === 0 ? (
            <p className="text-center text-gray-400 text-xs py-4">No fee heads yet. Add one above.</p>
          ) : (
            <div className="space-y-2">
              {feeHeads.map(head => (
                <div key={head.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-900 rounded-2xl">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${frequencyBadge(head.frequency)}`}>
                      {head.frequency}
                    </span>
                    <span className="text-sm font-bold text-gray-800 dark:text-white truncate">{head.name}</span>
                    {Number(head.is_optional) === 1 && (
                      <span className="text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">Optional</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button onClick={() => openEditHead(head)} className="p-1.5 rounded-xl text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => confirmDeleteHead(head)} className="p-1.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CLASS ACCORDION */}
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1 pt-2">
          Class-wise Amounts
        </h3>

        {classes.length === 0 && (
          <p className="text-center text-gray-400 text-xs py-6">No classes found.</p>
        )}

        {classes.map(cls => {
          const isOpen = expandedClass === cls.id;
          const isDirty = hasDirtyForClass(cls.id);
          return (
            <div key={cls.id} className="bg-white dark:bg-[#151515] border border-gray-100 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
              <button
                onClick={() => setExpandedClass(isOpen ? null : cls.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-black text-xs">
                    {cls.name?.charAt(0)}
                  </div>
                  <div className="text-left">
                    <h4 className="font-black text-sm text-gray-900 dark:text-white">{cls.name}</h4>
                    <p className="text-[10px] text-gray-400">{feeHeads.length} fee head{feeHeads.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isDirty && (
                    <span className="text-[9px] font-black bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">
                      Unsaved
                    </span>
                  )}
                  <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="px-4 pb-4 border-t border-gray-100 dark:border-neutral-800 pt-3 space-y-2">
                      {feeHeads.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-3">Add fee heads first.</p>
                      ) : (
                        feeHeads.map(head => {
                          const key = `${cls.id}_${head.id}`;
                          const currentVal = dirtyAmounts[key] !== undefined
                            ? dirtyAmounts[key]
                            : (matrix[cls.id]?.[head.id] ?? '');
                          return (
                            <div key={head.id} className="flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{head.name}</p>
                                <span className={`text-[9px] font-bold uppercase inline-block px-1.5 py-0.5 rounded-md mt-0.5 ${frequencyBadge(head.frequency)}`}>
                                  {head.frequency}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-sm font-bold text-gray-500">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={currentVal}
                                  onChange={(e) => handleAmountChange(cls.id, head.id, e.target.value)}
                                  placeholder="0"
                                  className="w-28 text-right px-3 py-2 text-sm font-black text-gray-900 dark:text-white bg-gray-50 dark:bg-neutral-900 border-2 border-gray-200 dark:border-neutral-700 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                      {feeHeads.length > 0 && (
                        <button
                          onClick={() => saveClassAmounts(cls.id)}
                          disabled={saving || !isDirty}
                          className={`w-full mt-3 py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95 ${
                            isDirty
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md'
                              : 'bg-gray-100 dark:bg-neutral-800 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          {isDirty ? 'Save Changes' : 'All Saved'}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* FEE HEAD MODAL */}
      <AnimatePresence>
        {headModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setHeadModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-white dark:bg-[#1a1a1a] rounded-t-[2rem] p-6 pb-10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  {headForm.id ? 'Edit Fee Head' : 'Add Fee Head'}
                </h3>
                <button onClick={() => setHeadModal(false)} className="p-2 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-500">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Fee Head Name</label>
                  <input
                    type="text"
                    value={headForm.name}
                    onChange={(e) => setHeadForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Tuition Fee, Transport Fee..."
                    className="w-full px-4 py-3.5 bg-gray-50 dark:bg-neutral-900 border-2 border-gray-200 dark:border-neutral-700 rounded-2xl text-sm font-bold text-gray-800 dark:text-white placeholder-gray-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Frequency</label>
                  <select
                    value={headForm.frequency}
                    onChange={(e) => setHeadForm(p => ({ ...p, frequency: e.target.value }))}
                    className="w-full px-4 py-3.5 bg-gray-50 dark:bg-neutral-900 border-2 border-gray-200 dark:border-neutral-700 rounded-2xl text-sm font-bold text-gray-800 dark:text-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="termly">Termly (Quarterly)</option>
                    <option value="yearly">Yearly (One-time)</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setHeadForm(p => ({ ...p, is_optional: Number(p.is_optional) === 1 ? 0 : 1 }))}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 transition-all ${
                    Number(headForm.is_optional) === 1
                      ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-400 text-amber-700 dark:text-amber-400'
                      : 'bg-gray-50 dark:bg-neutral-900 border-gray-200 dark:border-neutral-700 text-gray-500'
                  }`}
                >
                  <span className="text-sm font-bold">Mark as Optional Fee</span>
                  <div className={`w-10 h-5 rounded-full transition-all relative ${Number(headForm.is_optional) === 1 ? 'bg-amber-500' : 'bg-gray-300 dark:bg-neutral-600'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${Number(headForm.is_optional) === 1 ? 'left-5' : 'left-0.5'}`}></div>
                  </div>
                </button>
                <button
                  onClick={saveHead}
                  disabled={saving}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  {headForm.id ? 'Update Fee Head' : 'Add Fee Head'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MatrixSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] p-4 space-y-4 animate-pulse">
      <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-3xl w-full"></div>
      <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-3xl w-full"></div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-3xl w-full"></div>
      ))}
    </div>
  );
}