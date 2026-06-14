'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import { useAppModal } from '../../../../context/ModalContext';
import {
  ArrowLeft, User, CheckCircle2, Clock, AlertCircle, TrendingDown,
  Receipt, ChevronDown, ChevronUp, CreditCard, RefreshCw, Loader2,
  History, Banknote, ShieldCheck, FileText, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getToken = () => {
  try { return JSON.parse(localStorage.getItem('gmps_user') || '{}')?.token || ''; }
  catch { return ''; }
};

const safeFetchJson = async (url, options = {}) => {
  try {
    const token = getToken();
    const headers = { ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const res = await fetch(url, { ...options, headers });
    return JSON.parse(await res.text());
  } catch { return { success: false, message: 'Network/server error.' }; }
};

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });
const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const statusConfig = {
  paid:    { label: 'Paid',    bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', icon: CheckCircle2 },
  partial: { label: 'Partial', bg: 'bg-amber-100 dark:bg-amber-900/30',    text: 'text-amber-700 dark:text-amber-400',    icon: Clock },
  unpaid:  { label: 'Unpaid',  bg: 'bg-red-100 dark:bg-red-900/30',        text: 'text-red-700 dark:text-red-400',        icon: AlertCircle },
};

const modeIcon  = (mode) => ({ cash: Banknote, upi: CreditCard, cheque: FileText, bank_transfer: ShieldCheck }[mode] || CreditCard);
const modeLabel = (mode) => ({ cash: 'Cash', upi: 'UPI', cheque: 'Cheque', bank_transfer: 'Bank Transfer' }[mode] || mode);

export default function StudentFinancePage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showModal } = useAppModal();

  // ID comes from query param: /accountant/ledger/student?id=123
  const studentId = searchParams.get('id');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('invoices');
  const [expandedInvoice, setExpandedInvoice] = useState(null);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin') { router.replace('/'); return; }
    if (!studentId) { router.replace('/accountant/ledger'); return; }
    loadData();
  }, [user, studentId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const json = await safeFetchJson(
      `${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=get_student_dues&student_id=${studentId}`
    );
    setLoading(false);
    if (json.success) setData(json);
    else showModal('Error', json.message || 'Could not load student data.', 'danger');
  }, [studentId, showModal]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <span className="text-sm font-medium">Loading ledger…</span>
      </div>
    </div>
  );

  if (!data) return null;

  const { student, summary, invoices = [], transactions = [], arrears = [] } = data;
  const grandTotal     = (summary?.balance_due || 0) + (summary?.total_arrears || 0);
  const totalArrears   = summary?.total_arrears || 0;
  const balance        = summary?.balance_due   || 0;
  const unpaidInvoices = invoices.filter(i => i.status !== 'paid');

  const tabs = [
    { key: 'invoices',     label: 'Invoices', icon: Receipt,      count: invoices.length },
    { key: 'transactions', label: 'Payments', icon: History,      count: transactions.length },
    { key: 'arrears',      label: 'Arrears',  icon: TrendingDown, count: arrears.length, warn: totalArrears > 0 },
  ];

  return (
    <div className="min-h-screen pb-28 bg-gray-50 dark:bg-zinc-950 font-sans">

      {/* HEADER */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 dark:text-zinc-500 truncate">
            {student.class_name} · {student.login_id || `ID: ${student.id}`}
          </p>
          <h1 className="text-base font-bold text-gray-800 dark:text-white truncate">{student.name}</h1>
        </div>
        <button onClick={loadData} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="px-4 pt-4 space-y-4 max-w-2xl mx-auto">

        {/* STUDENT CARD */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-gray-100 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <User className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-gray-800 dark:text-white">{student.name}</p>
              <p className="text-xs text-gray-400 dark:text-zinc-500">
                {student.father_name && `S/D/O ${student.father_name} · `}{student.class_name}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-gray-50 dark:bg-zinc-800/50 p-3">
              <p className="text-xs text-gray-400 dark:text-zinc-500 mb-1">Grand Total Outstanding</p>
              <p className={`text-xl font-bold tabular-nums ${grandTotal > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {fmt(grandTotal)}
              </p>
            </div>
            {totalArrears > 0 && (
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 p-3 border border-amber-100 dark:border-amber-800/30">
                <p className="text-xs text-amber-500 dark:text-amber-400 mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Arrears
                </p>
                <p className="text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{fmt(totalArrears)}</p>
              </div>
            )}
            <div className="rounded-2xl bg-gray-50 dark:bg-zinc-800/50 p-3">
              <p className="text-xs text-gray-400 dark:text-zinc-500 mb-1">Session Due</p>
              <p className={`text-lg font-bold tabular-nums ${balance > 0 ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {fmt(balance)}
              </p>
              <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">
                {unpaidInvoices.length} unpaid invoice{unpaidInvoices.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 dark:bg-zinc-800/50 p-3">
              <p className="text-xs text-gray-400 dark:text-zinc-500 mb-1">Total Paid</p>
              <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{fmt(summary.total_paid)}</p>
              <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">
                {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-2xl text-xs font-semibold transition-all ${
                  active ? 'bg-emerald-600 text-white shadow-md' : 'bg-white dark:bg-zinc-900 text-gray-500 dark:text-zinc-400 border border-gray-100 dark:border-zinc-800'
                }`}>
                <div className="relative">
                  <Icon className="w-4 h-4" />
                  {tab.warn && !active && <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />}
                </div>
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-gray-100 dark:bg-zinc-800'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* TAB CONTENT */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>

            {/* INVOICES */}
            {activeTab === 'invoices' && (
              <div className="space-y-3">
                {invoices.length === 0 && <div className="text-center py-12 text-gray-400 dark:text-zinc-500 text-sm">No invoices for this session</div>}
                {invoices.map(inv => {
                  const cfg = statusConfig[inv.status] || statusConfig.unpaid;
                  const StatusIcon = cfg.icon;
                  const isOpen = expandedInvoice === inv.id;
                  const balanceDue = (inv.total_due || 0) - (inv.total_paid || 0);
                  const pct = inv.total_due > 0 ? Math.round((inv.total_paid / inv.total_due) * 100) : 0;
                  return (
                    <div key={inv.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-sm">
                      <button onClick={() => setExpandedInvoice(isOpen ? null : inv.id)} className="w-full p-4 flex items-center gap-3 text-left">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-800 dark:text-white text-sm">{MONTH_NAMES[inv.month]} {inv.year}</p>
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>
                              <StatusIcon className="w-3 h-3" /> {cfg.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-zinc-500">
                            <span>Due <span className="font-semibold text-gray-700 dark:text-gray-200">{fmt(inv.total_due)}</span></span>
                            <span>Paid <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt(inv.total_paid)}</span></span>
                            <span className={balanceDue > 0 ? 'text-red-500' : ''}>Bal <span className={`font-semibold ${balanceDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}>{fmt(balanceDue)}</span></span>
                          </div>
                          <div className="mt-2 h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">{pct}% paid</p>
                        </div>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                            <div className="border-t border-gray-100 dark:border-zinc-800 p-4 space-y-2">
                              {(inv.line_items || []).map((item, i) => (
                                <div key={i} className="flex justify-between items-center text-sm">
                                  <span className="text-gray-600 dark:text-gray-300">{item.fee_head_name}</span>
                                  <span className="font-semibold text-gray-800 dark:text-white tabular-nums">{fmt(item.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TRANSACTIONS */}
            {activeTab === 'transactions' && (
              <div className="space-y-3">
                {transactions.length === 0 && <div className="text-center py-12 text-gray-400 dark:text-zinc-500 text-sm">No payments recorded yet</div>}
                {transactions.map(txn => {
                  const ModeIcon = modeIcon(txn.payment_mode);
                  return (
                    <div key={txn.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-4 flex items-center gap-3 shadow-sm">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                        <ModeIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-800 dark:text-white">{txn.receipt_no}</p>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 rounded-full">{modeLabel(txn.payment_mode)}</span>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                          {new Date(txn.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {txn.collected_by_name && ` · By ${txn.collected_by_name}`}
                        </p>
                        {txn.reference_no && <p className="text-xs text-gray-400 dark:text-zinc-500">Ref: {txn.reference_no}</p>}
                      </div>
                      <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums flex-shrink-0">{fmt(txn.amount_paid)}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ARREARS */}
            {activeTab === 'arrears' && (
              <div className="space-y-3">
                {arrears.length === 0 ? (
                  <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 p-8 text-center shadow-sm">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                    <p className="font-semibold text-gray-700 dark:text-gray-200">No Arrears</p>
                    <p className="text-sm text-gray-400 dark:text-zinc-500 mt-1">All previous sessions are cleared</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/30 p-4 flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Arrears Pending</p>
                        <p className="text-xs text-amber-600 dark:text-amber-500">{fmt(totalArrears)} from previous session(s)</p>
                      </div>
                    </div>
                    {arrears.map((arr, i) => (
                      <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-4 shadow-sm">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">{arr.session_label || `Session ${arr.session_id}`}</p>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-xl bg-gray-50 dark:bg-zinc-800/50 p-2">
                            <p className="text-xs text-gray-400 dark:text-zinc-500">Total Due</p>
                            <p className="text-sm font-bold tabular-nums text-gray-700 dark:text-gray-200">{fmt(arr.total_due)}</p>
                          </div>
                          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-2">
                            <p className="text-xs text-emerald-500">Paid</p>
                            <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{fmt(arr.total_paid)}</p>
                          </div>
                          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-2">
                            <p className="text-xs text-red-400">Pending</p>
                            <p className="text-sm font-bold tabular-nums text-red-600 dark:text-red-400">{fmt(arr.amount_pending)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
