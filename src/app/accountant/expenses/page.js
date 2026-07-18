'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useAppModal } from '../../../context/ModalContext';
import {
  ArrowLeft, Loader2, Plus, Receipt, TrendingDown, Calendar, FileText, X, CheckCircle2, Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Robust fetcher
const getToken = () => { try { return JSON.parse(localStorage.getItem('gmps_user') || '{}')?.token || ''; } catch { return ''; } };
const safeFetchJson = async (url, options = {}) => {
  try {
    const token = getToken();
    const headers = { ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const res = await fetch(url, { ...options, headers });
    return JSON.parse(await res.text());
  } catch { return { success: false, message: 'Network/server error.' }; }
};

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });
const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function ExpensesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showModal } = useAppModal();

  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState({ total: 0, this_month: 0, today: 0 });
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState({ title: '', amount: '', remarks: '', expense_date: new Date().toISOString().slice(0,10) });

  const loadData = useCallback(async () => {
    setLoading(true);
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=get_expenses`);
    if (json.success) {
        setExpenses(json.expenses || []);
        setStats(json.stats || { total: 0, this_month: 0, today: 0 });
    } else {
        showModal('Error', json.message || 'Failed to load expenses', 'danger');
    }
    setLoading(false);
  }, [showModal]);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.amount || Number(form.amount) <= 0) return showModal('Error', 'Valid Title and Amount are required', 'warning');
    
    setProcessing(true);
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_expense', ...form })
    });
    setProcessing(false);

    if (json.success) {
      showModal('Success', 'Expense logged securely!', 'success');
      setShowAddModal(false);
      setForm({ title: '', amount: '', remarks: '', expense_date: new Date().toISOString().slice(0,10) });
      loadData();
    } else {
      showModal('Error', json.message || 'Failed to log expense', 'danger');
    }
  };

  if (loading && expenses.length === 0) return <div className="min-h-screen flex justify-center items-center bg-[#F2F6FA] dark:bg-[#0a0a0a]"><Loader2 className="animate-spin text-rose-500 w-10 h-10" /></div>;

  return (
    <div className="min-h-screen pb-28 bg-[#F2F6FA] dark:bg-[#0a0a0a] font-sans text-gray-900 dark:text-white">
      
      {/* HEADER */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-[#151515]/90 backdrop-blur-xl border-b border-gray-100 dark:border-neutral-800 px-4 py-4 flex items-center gap-3 shadow-sm">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black truncate leading-none">General Expenses</h1>
          <p className="text-[10px] uppercase tracking-widest text-rose-500 font-bold mt-1 bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded-full inline-block">Outflow Tracker</p>
        </div>
      </div>

      <div className="px-4 pt-5 max-w-3xl mx-auto space-y-5">
        
        {/* ACTION BUTTON */}
        <button onClick={() => setShowAddModal(true)} className="w-full py-4 bg-rose-600 text-white rounded-[2rem] font-black text-lg flex items-center justify-center gap-2 shadow-lg shadow-rose-500/30 active:scale-95 transition-transform">
            <Plus size={24} /> Log New Expense
        </button>

        {/* STATS STRIP */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-[#151515] rounded-3xl p-4 border border-gray-100 dark:border-neutral-800 shadow-sm flex flex-col items-center justify-center text-center">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">Today</p>
            <p className="text-lg font-black text-rose-500">{fmt(stats.today)}</p>
          </div>
          <div className="bg-white dark:bg-[#151515] rounded-3xl p-4 border border-gray-100 dark:border-neutral-800 shadow-sm flex flex-col items-center justify-center text-center">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">This Month</p>
            <p className="text-lg font-black text-rose-600 dark:text-rose-400">{fmt(stats.this_month)}</p>
          </div>
          <div className="bg-rose-50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-800/50 rounded-3xl p-4 border flex flex-col items-center justify-center text-center">
            <p className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1 flex items-center gap-1">Total (Yr)</p>
            <p className="text-xl font-black text-rose-700 dark:text-rose-300">{fmt(stats.total)}</p>
          </div>
        </div>

        {/* HISTORY LIST */}
        <div className="bg-white dark:bg-[#151515] rounded-[2rem] border border-gray-100 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 dark:border-neutral-800/60 bg-gray-50/50 dark:bg-neutral-900/50 flex items-center gap-2">
                <TrendingDown size={16} className="text-rose-500" />
                <h2 className="text-xs font-black uppercase tracking-widest text-gray-500">Expense History Log</h2>
            </div>
            
            <div className="p-4 space-y-3">
                {expenses.length === 0 ? (
                    <div className="text-center py-10">
                        <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm font-bold text-gray-400">No expenses logged yet.</p>
                    </div>
                ) : (
                    expenses.map(exp => (
                        <div key={exp.id} className="bg-gray-50 dark:bg-neutral-900 rounded-2xl p-4 flex items-center gap-4 border border-gray-100 dark:border-neutral-800">
                            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-500 flex items-center justify-center shrink-0">
                                <Receipt size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-base truncate text-gray-900 dark:text-white">{exp.title}</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">{formatDate(exp.expense_date)} • By {exp.created_by_name || 'Admin'}</p>
                                {exp.remarks && <p className="text-xs text-gray-600 dark:text-gray-400 font-medium italic mt-1 line-clamp-1">"{exp.remarks}"</p>}
                            </div>
                            <div className="shrink-0 text-right">
                                <p className="font-black text-rose-600 dark:text-rose-400 text-lg">{fmt(exp.amount)}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>

      {/* --- ADD EXPENSE MODAL --- */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="w-full max-w-md bg-white dark:bg-[#1a1a1a] p-6 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl relative">
              <button onClick={() => setShowAddModal(false)} className="absolute top-5 right-5 p-2 bg-gray-100 dark:bg-neutral-800 rounded-full hover:scale-95 transition-transform"><X size={16} className="text-gray-500"/></button>
              
              <div className="mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center"><TrendingDown size={20} /></div>
                  <div>
                    <h3 className="text-lg font-black leading-tight">Log Expense</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Register money out</p>
                  </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider ml-1 block mb-1.5">Expense Title / Category <span className="text-rose-500">*</span></label>
                    <input type="text" required placeholder="e.g. Electricity Bill, Chalks..." value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:border-rose-500 transition-colors" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider ml-1 block mb-1.5">Amount (₹) <span className="text-rose-500">*</span></label>
                        <input type="number" required placeholder="0.00" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:border-rose-500 transition-colors" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider ml-1 block mb-1.5">Date</label>
                        <input type="date" required value={form.expense_date} onChange={e => setForm({...form, expense_date: e.target.value})} className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl px-3 py-3.5 text-sm font-bold outline-none focus:border-rose-500 transition-colors" />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider ml-1 block mb-1.5">Remarks (Optional)</label>
                    <input type="text" placeholder="Add a note or bill number..." value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:border-rose-500 transition-colors" />
                </div>

                <button type="submit" disabled={processing} className="w-full py-4 bg-rose-600 text-white font-black rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg mt-2">
                    {processing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} Save Record
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}