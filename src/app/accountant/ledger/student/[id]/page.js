"use client";
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useAppModal } from '../../../../../../context/ModalContext';
import {
  ArrowLeft, User, Phone, BookOpen, Wallet, AlertCircle,
  CheckCircle2, Clock, TrendingDown, Receipt, ChevronDown,
  ChevronUp, CreditCard, BadgeCheck, XCircle, RefreshCw,
  Loader2, IndianRupee, CalendarDays, History, Banknote,
  ShieldCheck, FileText, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getToken = () => {
  try { return JSON.parse(localStorage.getItem('gmps_user') || '{}')?.token || ''; }
  catch { return ''; }
};

const safeFetchJson = async (url, options = {}) => {
  try {
    const token = localStorage.getItem('token');
    const headers = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };
    const res = await fetch(url, { ...options, headers });
    let text = await res.text();
    try {
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) text = text.substring(firstBrace, lastBrace + 1);
      return JSON.parse(text);
    } catch (e) {
      console.error("API returned non-JSON:", text);
      return { success: false, message: 'Server error.' };
    }
  } catch (err) {
    console.error("Network Error:", err);
    return { success: false, message: 'Network error.' };
  }
};

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const statusConfig = {
  paid:    { label: 'Paid',    bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', icon: CheckCircle2 },
  partial: { label: 'Partial', bg: 'bg-amber-100 dark:bg-amber-900/30',    text: 'text-amber-700 dark:text-amber-400',    icon: Clock },
  unpaid:  { label: 'Unpaid',  bg: 'bg-red-100 dark:bg-red-900/30',        text: 'text-red-700 dark:text-red-400',        icon: AlertCircle },
};

const modeIcon = (mode) => {
  const icons = { cash: Banknote, upi: CreditCard, cheque: FileText, bank_transfer: ShieldCheck };
  return icons[mode] || CreditCard;
};

const modeLabel = (mode) => ({
  cash: 'Cash', upi: 'UPI', cheque: 'Cheque', bank_transfer: 'Bank Transfer'
}[mode] || mode);

export default function StudentFinancePage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { showModal } = useAppModal();
  const studentId = params?.id;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('invoices'); // invoices | transactions | arrears
  const [expandedInvoice, setExpandedInvoice] = useState(null);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin') { router.replace('/'); return; }
    if (studentId) loadData();
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
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 size={28} className="text-emerald-500 animate-spin mx-auto" />
        <p className="text-sm text-gray-400 dark:text-zinc-500">Loading ledger…</p>
      </div>
    </div>
  );

  if (!data) return null;

  const { student, invoices = [], transactions = [], arrears = [], summary = {} } = data;
  const balance = summary.balance || 0;
  const grandTotal = summary.grand_total || 0;
  const totalArrears = summary.arrears || 0;

  const unpaidInvoices = invoices.filter(i => i.status !== 'paid');
  const paidInvoices = invoices.filter(i => i.status === 'paid');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 pb-28">

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-lg border-b border-gray-100 dark:border-zinc-800">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-gray-900 dark:text-white truncate">{student.name}</h1>
            <p className="text-xs text-gray-400 dark:text-zinc-500 truncate">{student.class_name} · {student.login_id || `ID: ${student.id}`}</p>
          </div>
          <button
            onClick={loadData}
            className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 dark:text-zinc-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 transition-colors"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-4 space-y-4">

        {/* ── Student Info Card ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-800/60 rounded-2xl p-4 border border-gray-100 dark:border-zinc-700/50 flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {student.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white">{student.name}</p>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{student.father_name && `S/D/O ${student.father_name} · `}{student.class_name}</p>
          </div>
          {student.contact && (
            <a href={`tel:${student.contact}`} className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-xl">
              <Phone size={12} />{student.contact}
            </a>
          )}
        </motion.div>

        {/* ── Summary Cards ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 gap-3"
        >
          {/* Grand Total Due */}
          <div className={`rounded-2xl p-4 col-span-2 ${grandTotal > 0 ? 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-100 dark:border-red-900/30' : 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-900/30'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">Grand Total Outstanding</p>
                <p className={`text-2xl font-bold mt-1 ${grandTotal > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {fmt(grandTotal)}
                </p>
                {totalArrears > 0 && (
                  <p className="text-xs text-orange-500 dark:text-orange-400 mt-1 flex items-center gap-1">
                    <AlertTriangle size={10} />Includes {fmt(totalArrears)} arrears
                  </p>
                )}
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${grandTotal > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
                {grandTotal > 0
                  ? <TrendingDown size={22} className="text-red-500 dark:text-red-400" />
                  : <BadgeCheck size={22} className="text-emerald-500 dark:text-emerald-400" />
                }
              </div>
            </div>
          </div>

          {/* This Session Due */}
          <div className="rounded-2xl p-4 bg-white dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-700/50">
            <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">Session Due</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{fmt(balance)}</p>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">{unpaidInvoices.length} unpaid invoice{unpaidInvoices.length !== 1 ? 's' : ''}</p>
          </div>

          {/* Total Paid */}
          <div className="rounded-2xl p-4 bg-white dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-700/50">
            <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">Total Paid</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">{fmt(summary.total_paid)}</p>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">{transactions.length} transaction{transactions.length !== 1 ? 's' : ''}</p>
          </div>
        </motion.div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-gray-100 dark:bg-zinc-800 p-1 rounded-2xl">
          {[
            { id: 'invoices', label: 'Invoices', count: invoices.length },
            { id: 'transactions', label: 'Payments', count: transactions.length },
            { id: 'arrears', label: 'Arrears', count: arrears.length, alert: totalArrears > 0 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300'
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab.alert ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' :
                activeTab === tab.id ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                'bg-gray-200 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400'
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <AnimatePresence mode="wait">

          {/* INVOICES TAB */}
          {activeTab === 'invoices' && (
            <motion.div key="invoices" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="space-y-2">
              {invoices.length === 0 ? (
                <div className="text-center py-10">
                  <FileText size={28} className="text-gray-200 dark:text-zinc-700 mx-auto mb-2" />
                  <p className="text-sm text-gray-400 dark:text-zinc-500">No invoices for this session</p>
                </div>
              ) : invoices.map((inv, i) => {
                const st = statusConfig[inv.status] || statusConfig.unpaid;
                const Icon = st.icon;
                const isExpanded = expandedInvoice === inv.id;
                const balanceDue = inv.total_due - inv.total_paid;

                return (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-white dark:bg-zinc-800/60 rounded-2xl border border-gray-100 dark:border-zinc-700/50 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedInvoice(isExpanded ? null : inv.id)}
                      className="w-full flex items-center gap-3 p-4 text-left"
                    >
                      {/* Month badge */}
                      <div className="w-11 h-11 rounded-xl bg-gray-50 dark:bg-zinc-700/50 flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-gray-700 dark:text-zinc-300 leading-tight">{MONTH_NAMES[inv.invoice_month]}</span>
                        <span className="text-xs text-gray-400 dark:text-zinc-500">{inv.invoice_year}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">
                            {MONTH_NAMES[inv.invoice_month]} {inv.invoice_year}
                          </p>
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                            <Icon size={10} />{st.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5 truncate">{inv.fee_heads || 'Various fees'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(inv.total_due)}</p>
                        {balanceDue > 0 && (
                          <p className="text-xs text-red-500 dark:text-red-400">{fmt(balanceDue)} due</p>
                        )}
                      </div>
                      {isExpanded ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 border-t border-gray-50 dark:border-zinc-700/50 pt-3 space-y-2">
                            <div className="grid grid-cols-3 gap-3 text-center">
                              <div className="bg-gray-50 dark:bg-zinc-700/30 rounded-xl p-3">
                                <p className="text-xs text-gray-400 dark:text-zinc-500">Total Due</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{fmt(inv.total_due)}</p>
                              </div>
                              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3">
                                <p className="text-xs text-emerald-600 dark:text-emerald-400">Paid</p>
                                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-1">{fmt(inv.total_paid)}</p>
                              </div>
                              <div className={`rounded-xl p-3 ${balanceDue > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-zinc-700/30'}`}>
                                <p className={`text-xs ${balanceDue > 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-zinc-500'}`}>Balance</p>
                                <p className={`text-sm font-bold mt-1 ${balanceDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-zinc-400'}`}>{fmt(balanceDue)}</p>
                              </div>
                            </div>
                            {/* Progress bar */}
                            <div className="bg-gray-100 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (inv.total_paid / inv.total_due) * 100)}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                              />
                            </div>
                            <p className="text-xs text-gray-400 dark:text-zinc-500 text-right">
                              {Math.round((inv.total_paid / inv.total_due) * 100)}% paid
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* TRANSACTIONS TAB */}
          {activeTab === 'transactions' && (
            <motion.div key="transactions" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="space-y-2">
              {transactions.length === 0 ? (
                <div className="text-center py-10">
                  <Receipt size={28} className="text-gray-200 dark:text-zinc-700 mx-auto mb-2" />
                  <p className="text-sm text-gray-400 dark:text-zinc-500">No payments recorded yet</p>
                </div>
              ) : transactions.map((txn, i) => {
                const MIcon = modeIcon(txn.payment_mode);
                return (
                  <motion.div
                    key={txn.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-white dark:bg-zinc-800/60 rounded-2xl p-4 border border-gray-100 dark:border-zinc-700/50 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                      <MIcon size={18} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white font-mono">{txn.receipt_no}</p>
                        <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                          {modeLabel(txn.payment_mode)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                        {new Date(txn.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {txn.collected_by_name && ` · By ${txn.collected_by_name}`}
                      </p>
                      {txn.reference_no && (
                        <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5 font-mono">Ref: {txn.reference_no}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(txn.amount_paid)}</p>
                      <span className="text-xs text-emerald-500 dark:text-emerald-500 flex items-center gap-0.5 justify-end mt-0.5">
                        <CheckCircle2 size={10} />Verified
                      </span>
                    </div>
                  </motion.div>
                );
              })}

              {/* Transactions total */}
              {transactions.length > 0 && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IndianRupee size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Total Collected</span>
                  </div>
                  <span className="font-bold text-lg text-emerald-700 dark:text-emerald-300">{fmt(summary.total_paid)}</span>
                </div>
              )}
            </motion.div>
          )}

          {/* ARREARS TAB */}
          {activeTab === 'arrears' && (
            <motion.div key="arrears" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="space-y-2">
              {arrears.length === 0 ? (
                <div className="text-center py-10">
                  <BadgeCheck size={28} className="text-emerald-300 dark:text-emerald-700 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-600 dark:text-zinc-400">No Arrears</p>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">All previous sessions are cleared</p>
                </div>
              ) : (
                <>
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-4 border border-orange-100 dark:border-orange-900/30 flex items-center gap-3">
                    <AlertTriangle size={20} className="text-orange-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">Arrears Pending</p>
                      <p className="text-xs text-orange-500 dark:text-orange-400 mt-0.5">{fmt(totalArrears)} from previous session(s)</p>
                    </div>
                  </div>

                  {arrears.map((arr, i) => (
                    <motion.div
                      key={arr.session}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="bg-white dark:bg-zinc-800/60 rounded-2xl p-4 border border-gray-100 dark:border-zinc-700/50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <CalendarDays size={14} className="text-gray-400 dark:text-zinc-500" />
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">Session {arr.session}</span>
                        </div>
                        <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-medium px-2 py-0.5 rounded-full">Unpaid</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-gray-50 dark:bg-zinc-700/30 rounded-xl p-2.5">
                          <p className="text-xs text-gray-400 dark:text-zinc-500">Total Due</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{fmt(arr.total_due)}</p>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-2.5">
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">Paid</p>
                          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-1">{fmt(arr.total_paid)}</p>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-2.5">
                          <p className="text-xs text-orange-500 dark:text-orange-400">Pending</p>
                          <p className="text-sm font-bold text-orange-600 dark:text-orange-400 mt-1">{fmt(arr.amount_pending)}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Quick Action ── */}
        {grandTotal > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-xl px-4"
          >
            <button
              onClick={() => router.push(`/accountant/collect?student_id=${studentId}`)}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/30 transition-all duration-200 active:scale-[0.98]"
            >
              <Wallet size={18} />
              Collect Payment · {fmt(grandTotal)} Due
            </button>
          </motion.div>
        )}

      </div>
    </div>
  );
}
