"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from "../../../../context/AuthContext";
import { useAppModal } from "../../../../context/ModalContext";
import { ArrowLeft, Save, ChevronDown, Settings, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const getToken = () => { try { return JSON.parse(localStorage.getItem('gmps_user') || '{}')?.token || ''; } catch { return ''; } };
const safeFetchJson = async (url, options = {}) => {
  try {
    const token = getToken();
    const headers = { ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const res = await fetch(url, { ...options, headers });
    return JSON.parse(await res.text());
  } catch { return { success: false, message: 'Network/server error.' }; }
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
  const [dirtyAmounts, setDirtyAmounts] = useState({});

  useEffect(() => {
    if (!user || user.role !== 'admin') { router.replace('/'); return; }
    loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=get_fee_matrix`);
    setLoading(false);
    
    if (json.success) {
      setClasses(json.classes || []);
      setFeeHeads(json.fee_heads || []);
      const m = {};
      (json.matrix_rows || []).forEach(row => {
        if (!m[row.class_id]) m[row.class_id] = {};
        m[row.class_id][row.fee_head_id] = row.amount;
      });
      setMatrix(m);
      setDirtyAmounts({});
    } else showModal("Error", "Could not load fee matrix.", "danger");
  };

  const handleAmountChange = (classId, headId, value) => setDirtyAmounts(prev => ({ ...prev, [`${classId}_${headId}`]: value }));
  const hasDirtyForClass = (classId) => Object.keys(dirtyAmounts).some(k => k.startsWith(`${classId}_`));

  const saveClassAmounts = async (classId) => {
    const classKeys = Object.keys(dirtyAmounts).filter(k => k.startsWith(`${classId}_`));
    if (classKeys.length === 0) return;
    
    setSaving(true);
    const rows = classKeys.map(key => ({ class_id: classId, fee_head_id: key.split('_')[1], amount: dirtyAmounts[key] || 0 }));
    const fd = new FormData();
    fd.append('action', 'save_fee_amounts');
    fd.append('rows', JSON.stringify(rows));
    
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php`, { method: 'POST', body: fd });
    setSaving(false);
    
    if (json.success) { showModal("Saved!", "Fee amounts updated successfully.", "success"); loadAll(); }
    else showModal("Error", "Save failed.", "danger");
  };

  // SMART FILTER: Exclude Extras, Global Presets, and Transport from the class matrix UI!
  const matrixHeads = feeHeads.filter(h => 
    Number(h.is_extra) === 0 && 
    Number(h.preset_amount) === 0 &&
    !h.name.toLowerCase().includes('transport')
  );

  if (loading) return <MatrixSkeleton />;

  return (
    <div className="min-h-screen pb-28 bg-gray-50 dark:bg-[#0a0a0a] font-sans">
      <div className="sticky top-0 z-50 px-4 py-4 flex items-center justify-between border-b backdrop-blur-xl bg-white/80 dark:bg-black/80 border-gray-100 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <Link href="/accountant/profile" className="p-2 rounded-full bg-gray-100 dark:bg-neutral-800 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white">Fee Matrix</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase">Class-wise Mapping</p>
          </div>
        </div>
        <Link href="/accountant/fees/heads" className="flex items-center gap-2 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-2xl active:scale-95 shadow-md">
          <Settings size={16} /> Setup Heads
        </Link>
      </div>

      <div className="px-4 mt-5 max-w-lg mx-auto space-y-4">
        <div className="bg-white dark:bg-[#151515] border border-gray-100 dark:border-neutral-800 rounded-3xl p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-500 leading-relaxed">
            Configuring <span className="text-emerald-500">{matrixHeads.length} Main Fees</span>. 
            Transport, Extras, and Fees with a Global Preset are automatically hidden from this matrix to save you time.
          </p>
        </div>

        {classes.map(cls => {
          const isOpen = expandedClass === cls.id;
          const isDirty = hasDirtyForClass(cls.id);
          return (
            <div key={cls.id} className="bg-white dark:bg-[#151515] border border-gray-100 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
              <button onClick={() => setExpandedClass(isOpen ? null : cls.id)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-black text-xs">{cls.name?.charAt(0)}</div>
                  <div className="text-left">
                    <h4 className="font-black text-sm text-gray-900 dark:text-white">{cls.name}</h4>
                    <p className="text-[10px] text-gray-400">Click to configure amounts</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isDirty && <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Unsaved</span>}
                  <ChevronDown size={18} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                    <div className="px-4 pb-4 border-t border-gray-100 dark:border-neutral-800 pt-3 space-y-2">
                      {matrixHeads.map(head => {
                        const key = `${cls.id}_${head.id}`;
                        const currentVal = dirtyAmounts[key] !== undefined ? dirtyAmounts[key] : (matrix[cls.id]?.[head.id] ?? '');
                        return (
                          <div key={head.id} className="flex items-center justify-between gap-3">
                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{head.name}</p>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-sm font-bold text-gray-500">₹</span>
                              <input type="number" min="0" value={currentVal} onChange={(e) => handleAmountChange(cls.id, head.id, e.target.value)} placeholder="0" className="w-28 text-right px-3 py-2 text-sm font-black bg-gray-50 dark:bg-neutral-900 border-2 border-gray-200 dark:border-neutral-700 rounded-xl focus:border-emerald-500 outline-none" />
                            </div>
                          </div>
                        );
                      })}
                      {matrixHeads.length > 0 && (
                        <button onClick={() => saveClassAmounts(cls.id)} disabled={saving || !isDirty} className={`w-full mt-3 py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2 active:scale-95 transition-all ${isDirty ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 dark:bg-neutral-800 text-gray-400'}`}>
                          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {isDirty ? 'Save Changes' : 'All Saved'}
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
    </div>
  );
}

function MatrixSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] p-4 space-y-4 animate-pulse">
      <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-3xl w-full"></div>
      <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-3xl w-full"></div>
      {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-3xl w-full"></div>)}
    </div>
  );
}