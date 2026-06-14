"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useAppModal } from '../../../context/ModalContext';
import { ArrowLeft, Plus, Wallet, Trash2, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const safeFetchJson = async (url, options = {}) => {
  try {
    const res = await fetch(url, options);
    let text = await res.text();
    try {
      const f = text.indexOf('{'), l = text.lastIndexOf('}');
      if (f !== -1 && l !== -1) text = text.substring(f, l + 1);
      return JSON.parse(text);
    } catch { return { success: false, message: 'Server error.' }; }
  } catch { return { success: false, message: 'Network error.' }; }
};

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const CATEGORIES = ['Stationery','Maintenance','Salary','Utilities','Events','Transport','Other'];

const emptyForm = { title: '', amount: '', category: 'Other', date: new Date().toISOString().substring(0, 10), remarks: '' };

export default function Expenses() {
  const { user } = useAuth();
  const { showModal } = useAppModal();
  const router = useRouter();

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin' || user.level != 3) { router.replace('/'); return; }
    loadExpenses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadExpenses = async () => {
    setLoading(true);
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=get_expenses`);
    setLoading(false);
    if (json.success) {
      setExpenses(json.expenses || []);
      setTotal(json.total || 0);
    } else setError(json.message || 'Failed to load expenses');
  };

  const handleAdd = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) { setError('Enter a valid amount'); return; }
    setSaving(true); setError('');
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=add_expense`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    setSaving(false);
    if (json.success) { setShowForm(false); setForm(emptyForm); loadExpenses(); }
    else setError(json.message || 'Failed to save expense');
  };

  const handleDelete = (exp) => {
    showModal('Delete Expense', `Delete "${exp.title}" (${fmt(exp.amount)})? This cannot be undone.`, 'danger', async () => {
      const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=delete_expense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: exp.id }),
      });
      if (json.success) loadExpenses();
      else setError(json.message || 'Delete failed');
    });
  };

  const CAT_COLORS = {
    Stationery: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    Salary:      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    Utilities:   'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    Events:      'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    Transport:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    Other:       'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3 shadow-sm">
        <Link href="/accountant" className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 active:scale-95 transition-transform">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <p className="text-base font-semibold text-gray-800 dark:text-gray-100">School Expenses</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Log and track school expenditure</p>
        </div>
        <button onClick={() => { setShowForm(true); setError(''); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold active:scale-95 transition-transform shadow-sm">
          <Plus size={16} />
          Add
        </button>
      </div>

      <div className="px-4 pt-4 max-w-lg mx-auto space-y-4">
        {/* Total Card */}
        {!loading && (
          <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-4 text-white shadow-md">
            <p className="text-rose-100 text-xs mb-0.5">Total Expenses (This Session)</p>
            <p className="text-2xl font-bold">{fmt(total)}</p>
            <p className="text-rose-200 text-sm mt-1">{expenses.length} entries</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3 flex gap-2 items-start">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Add Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-emerald-200 dark:border-emerald-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">New Expense</p>
              <button onClick={() => setShowForm(false)} className="text-xs text-gray-400">Cancel</button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Title *</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Chalk and Duster" autoFocus
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-emerald-400 dark:focus:border-emerald-600 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Amount (₹) *</label>
                  <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00" min="0"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 outline-none focus:border-emerald-400 dark:focus:border-emerald-600 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 outline-none focus:border-emerald-400 dark:focus:border-emerald-600 transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, category: c }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${form.category === c ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Remarks</label>
                <input type="text" value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                  placeholder="Optional notes"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-emerald-400 dark:focus:border-emerald-600 transition-colors" />
              </div>
              <button onClick={handleAdd} disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white py-3 rounded-xl font-semibold text-sm active:scale-95 transition-transform disabled:opacity-50 shadow-sm">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {saving ? 'Saving...' : 'Save Expense'}
              </button>
            </div>
          </div>
        )}

        {/* Expense List */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <Wallet size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No expenses logged yet</p>
            <p className="text-xs mt-1">Tap + Add to record a school expense</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            {expenses.map((exp) => (
              <div key={exp.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 dark:border-gray-800/60 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{exp.title}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${CAT_COLORS[exp.category] || CAT_COLORS.Other}`}>{exp.category}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{exp.date}{exp.remarks ? ` · ${exp.remarks}` : ''}</p>
                </div>
                <p className="text-sm font-bold text-rose-500 shrink-0">{fmt(exp.amount)}</p>
                <button onClick={() => handleDelete(exp)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800 active:scale-95 transition-all shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
