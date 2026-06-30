"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from "../../../../context/AuthContext";
import { useAppModal } from "../../../../context/ModalContext";
import {
  ArrowLeft, Plus, Trash2, Edit3, Save, X,
  ToggleLeft, ToggleRight, Loader2, Tag,
  CalendarDays, RefreshCw, Zap, ListChecks
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
  } catch {
    return { success: false, message: 'Network/server error.' };
  }
};

const TYPE_META = {
  monthly:  { label: 'Monthly',  icon: RefreshCw,    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',    dot: 'bg-blue-500' },
  yearly:   { label: 'Yearly',   icon: CalendarDays, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' },
  one_time: { label: 'One-time', icon: Zap,          color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' },
};

const EMPTY_FORM = { id: null, name: '', type: 'monthly', is_extra: 0, preset_amount: '' };

export default function FeeHeadsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showModal } = useAppModal();

  const [heads, setHeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filter, setFilter] = useState('all'); 

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin' || Number(user.level) !== 3) {
      router.replace('/');
      return;
    }
    loadHeads();
  }, [user]);

  const loadHeads = async () => {
    setLoading(true);
    const json = await safeFetchJson(
      `${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=get_fee_heads_all`
    );
    setLoading(false);
    if (json.success) {
      setHeads(json.fee_heads || []);
    } else {
      showModal('Error', json.message || 'Could not load fee heads.', 'danger');
    }
  };

  const openAdd = () => { setForm(EMPTY_FORM); setShowForm(true); };
  
  const openEdit = (h) => { 
    setForm({ 
      id: h.id, 
      name: h.name, 
      type: h.type, 
      is_extra: Number(h.is_extra) || 0, 
      preset_amount: h.preset_amount || '' 
    }); 
    setShowForm(true); 
  };
  
  const closeForm = () => { setShowForm(false); setForm(EMPTY_FORM); };

  const saveHead = async () => {
    if (!form.name.trim()) {
      showModal('Validation', 'Fee head name is required.', 'danger');
      return;
    }
    setSaving(true);
    const fd = new FormData();
    fd.append('action', form.id ? 'update_fee_head' : 'add_fee_head');
    fd.append('name', form.name.trim());
    fd.append('type', form.is_extra ? 'one_time' : form.type); // Enforce one_time for extras
    fd.append('is_extra', form.is_extra ? 1 : 0);
    fd.append('preset_amount', form.preset_amount || 0);

    if (form.id) fd.append('id', form.id);
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php`, {
      method: 'POST', body: fd,
    });
    setSaving(false);
    if (json.success) {
      showModal('Done!', form.id ? 'Fee head updated.' : 'New fee head added.', 'success');
      closeForm();
      loadHeads();
    } else {
      showModal('Error', json.message || 'Save failed.', 'danger');
    }
  };

  const toggleActive = async (head) => {
    const fd = new FormData();
    fd.append('action', 'toggle_fee_head');
    fd.append('id', head.id);
    fd.append('is_active', head.is_active ? 0 : 1);
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php`, {
      method: 'POST', body: fd,
    });
    if (json.success) {
      setHeads(prev => prev.map(h => h.id === head.id ? { ...h, is_active: h.is_active ? 0 : 1 } : h));
    } else {
      showModal('Error', json.message || 'Could not update.', 'danger');
    }
  };

  const confirmDelete = (head) => {
    showModal(
      'Delete Fee Head?',
      `Deleting "${head.name}" will also remove all class-wise amounts and invoice line items linked to it. This cannot be undone.`,
      'danger',
      () => deleteHead(head.id)
    );
  };

  const deleteHead = async (id) => {
    const fd = new FormData();
    fd.append('action', 'delete_fee_head');
    fd.append('id', id);
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php`, {
      method: 'POST', body: fd,
    });
    if (json.success) {
      showModal('Deleted', 'Fee head removed.', 'success');
      setHeads(prev => prev.filter(h => h.id !== id));
    } else {
      showModal('Error', json.message || 'Delete failed.', 'danger');
    }
  };

  const filtered = heads.filter(h => {
    if (filter === 'inactive') return !h.is_active;
    if (filter === 'all') return true;
    if (filter === 'main') return h.is_active && Number(h.is_extra) === 0;
    if (filter === 'extra') return h.is_active && Number(h.is_extra) === 1;
    return h.type === filter && h.is_active;
  });

  const counts = {
    all: heads.length,
    main: heads.filter(h => h.is_active && Number(h.is_extra) === 0).length,
    extra: heads.filter(h => h.is_active && Number(h.is_extra) === 1).length,
    monthly: heads.filter(h => h.type === 'monthly' && h.is_active).length,
    yearly: heads.filter(h => h.type === 'yearly' && h.is_active).length,
    one_time: heads.filter(h => h.type === 'one_time' && h.is_active).length,
    inactive: heads.filter(h => !h.is_active).length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
        <Link href="/accountant/fees/matrix" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate">Fee Heads</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Manage fee categories & types</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors"
        >
          <Plus size={16} />
          <span>New Head</span>
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { key: 'all', label: `All (${counts.all})` },
            { key: 'main', label: `Main (${counts.main})` },
            { key: 'extra', label: `Extras (${counts.extra})` },
            { key: 'monthly', label: `Monthly (${counts.monthly})` },
            { key: 'yearly', label: `Yearly (${counts.yearly})` },
            { key: 'one_time', label: `One-time (${counts.one_time})` },
            { key: 'inactive', label: `Inactive (${counts.inactive})` },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                filter === f.key
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-emerald-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(TYPE_META).map(([key, meta]) => {
            const Icon = meta.icon;
            const active = heads.filter(h => h.type === key && h.is_active).length;
            const total = heads.filter(h => h.type === key).length;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-2xl p-3 text-left border transition-all ${
                  filter === key
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-emerald-300'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${meta.color}`}>
                  <Icon size={14} />
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{active}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{meta.label}</p>
                {total > active && (
                  <p className="text-xs text-gray-400 dark:text-gray-600">{total - active} inactive</p>
                )}
              </button>
            );
          })}
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 size={28} className="animate-spin text-emerald-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading fee heads...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <ListChecks size={24} className="text-gray-400" />
            </div>
            <p className="font-medium text-gray-700 dark:text-gray-300">No fee heads found</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 max-w-xs">
              {filter === 'all' ? 'Add your first fee head to get started.' : `No ${filter} fee heads ${filter === 'inactive' ? '' : 'are active'}.`}
            </p>
            {filter === 'all' && (
              <button onClick={openAdd} className="mt-2 flex items-center gap-1.5 bg-emerald-600 text-white text-sm px-4 py-2 rounded-xl">
                <Plus size={15} /> Add Fee Head
              </button>
            )}
          </div>
        ) : (
          <motion.div layout className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filtered.map((head) => {
                const meta = TYPE_META[head.type] || TYPE_META.monthly;
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={head.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className={`bg-white dark:bg-gray-900 rounded-2xl border px-4 py-3 flex items-center gap-3 transition-all ${
                      head.is_active
                        ? 'border-gray-100 dark:border-gray-800'
                        : 'border-dashed border-gray-200 dark:border-gray-700 opacity-60'
                    }`}
                  >
                    {/* Type icon */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                      <Icon size={16} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-semibold truncate ${head.is_active ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600 line-through'}`}>
                          {head.name}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${meta.color}`}>
                          {meta.label}
                        </span>

                        {/* Extra & Preset Badges */}
                        {Number(head.is_extra) === 1 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
                            Extra Item
                          </span>
                        )}
                        {Number(head.preset_amount) > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">
                            Preset: ₹{head.preset_amount}
                          </span>
                        )}

                        {!head.is_active && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        ID #{head.id} · {head.is_active ? 'Active' : 'Disabled — won\'t appear in invoices'}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleActive(head)}
                        title={head.is_active ? 'Disable this fee head' : 'Enable this fee head'}
                        className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        {head.is_active
                          ? <ToggleRight size={20} className="text-emerald-500" />
                          : <ToggleLeft size={20} className="text-gray-400" />
                        }
                      </button>
                      <button
                        onClick={() => openEdit(head)}
                        title="Edit"
                        className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Edit3 size={16} className="text-gray-500 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={() => confirmDelete(head)}
                        title="Delete"
                        className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 size={16} className="text-red-400" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Info box */}
        {!loading && heads.length > 0 && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-4 text-xs text-amber-700 dark:text-amber-400 space-y-1">
            <p className="font-semibold flex items-center gap-1.5"><Tag size={13} /> How fee heads work</p>
            <p>• <strong>Monthly</strong> heads appear in every monthly invoice (e.g. Tuition Fee).</p>
            <p>• <strong>Yearly</strong> heads appear once per session (e.g. Exam Fee).</p>
            <p>• <strong>One-time</strong> heads are charged once per student (e.g. Admission Fee).</p>
            <p>• <strong>Extras</strong> (like Tie, Belt) do not auto-calculate into the matrix.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) closeForm(); }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Tag size={16} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    {form.id ? 'Edit Fee Head' : 'New Fee Head'}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {form.id ? 'Update name or type' : 'Define a new fee category'}
                  </p>
                </div>
                <button onClick={closeForm} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Extra Item Toggle - Moved to top for better flow */}
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      const isExtra = form.is_extra ? 0 : 1;
                      setForm(p => ({ ...p, is_extra: isExtra, type: isExtra ? 'one_time' : p.type }));
                    }}
                    className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${
                      form.is_extra 
                        ? 'bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-400' 
                        : 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="text-left">
                      <span className="text-sm font-semibold">This is an "Extra" item</span>
                      <p className="text-xs opacity-80 mt-0.5">e.g., Tie, Belt (Manual, no billing cycle)</p>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-all ${form.is_extra ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.is_extra ? 'left-5' : 'left-0.5'}`}></div>
                    </div>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Fee Head Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && saveHead()}
                    placeholder="e.g. Tuition Fee, Transport Fee, Tie…"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                {/* SMART UX: Completely hide Billing Type if it is an Extra */}
                {!form.is_extra && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Billing Type *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(TYPE_META).map(([key, meta]) => {
                        const Icon = meta.icon;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setForm(p => ({ ...p, type: key }))}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                              form.type === key
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-emerald-300'
                            }`}
                          >
                            <Icon size={18} />
                            <span className="text-xs font-medium">{meta.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Global Preset Amount (₹) - Optional</label>
                  <input
                    type="number"
                    value={form.preset_amount}
                    onChange={e => setForm(p => ({ ...p, preset_amount: e.target.value }))}
                    placeholder="Leave blank to set per-class in matrix"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1">If set, this amount applies to all classes globally automatically.</p>
                </div>

              </div>

              <div className="px-5 pb-5 flex gap-2">
                <button
                  onClick={closeForm}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveHead}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {form.id ? 'Update' : 'Add Head'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}