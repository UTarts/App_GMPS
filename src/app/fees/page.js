"use client";
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useAppModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, CheckCircle2, AlertCircle, Clock, CreditCard,
  ChevronRight, Receipt, Send, X, Loader2, RefreshCw,
  IndianRupee, CalendarDays, FileText, BadgeCheck, Ban,
  ArrowLeft, Smartphone, Building2, BookOpen
} from 'lucide-react';
import { feeApi } from '../../lib/finApi';

const MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmt(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusPill({ status }) {
  const styles = {
    paid:     'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    partial:  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    unpaid:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    pending:  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    verified: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  };
  const icons = {
    paid: <CheckCircle2 size={11} />, partial: <Clock size={11} />,
    unpaid: <AlertCircle size={11} />, pending: <Clock size={11} />,
    verified: <BadgeCheck size={11} />, rejected: <Ban size={11} />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {icons[status]}{status}
    </span>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="grid grid-cols-3 gap-3">
        {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-200 dark:bg-gray-700" />)}
      </div>
      {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-200 dark:bg-gray-700" />)}
    </div>
  );
}

// ── Pay Online Modal ──────────────────────────────────────────────────────────
function PayModal({ selectedInvoices, onClose, onSuccess, token, showModal }) {
  const [form, setForm] = useState({
    payment_mode: 'upi',
    transaction_ref: '',
    payment_date: new Date().toISOString().slice(0,10),
    remarks: ''
  });
  const [loading, setLoading] = useState(false);
  const total = selectedInvoices.reduce((s, i) => s + (parseFloat(i.total_due) - parseFloat(i.total_paid)), 0);

  const modeIcons = { upi: <Smartphone size={16}/>, bank_transfer: <Building2 size={16}/>, cheque: <BookOpen size={16}/> };
  const modeLabels = { upi: 'UPI / PhonePe / GPay', bank_transfer: 'Bank Transfer / NEFT', cheque: 'Cheque' };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.transaction_ref.trim()) return showModal("Required", "Please enter the transaction reference number.", "danger");
    setLoading(true);
    try {
      const res = await feeApi.submitPayment(token, {
        invoice_ids: selectedInvoices.map(i => i.id),
        amount_submitted: total,
        ...form
      });
      showModal("Submitted! ✅", res.message || "Payment submitted. Accountant will verify within 1-2 days.", "success");
      onSuccess();
    } catch (e) {
      showModal("Error", e.message, "danger");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-0"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mx-auto -mt-2" />

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Submit Payment</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><X size={18} className="text-gray-500" /></button>
        </div>

        {/* Amount summary */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white">
          <p className="text-sm opacity-80">Total Amount to Pay</p>
          <p className="text-3xl font-bold mt-1">{fmt(total)}</p>
          <p className="text-xs opacity-70 mt-1">{selectedInvoices.length} invoice{selectedInvoices.length > 1 ? 's' : ''} selected</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment mode selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Payment Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(modeLabels).map(([k, v]) => (
                <button
                  key={k} type="button"
                  onClick={() => setForm(f => ({ ...f, payment_mode: k }))}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition-all
                    ${form.payment_mode === k
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'}`}
                >
                  {modeIcons[k]}
                  <span className="text-center leading-tight">{v}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Ref number */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              {form.payment_mode === 'cheque' ? 'Cheque Number' : 'UTR / Transaction ID'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text" required value={form.transaction_ref}
              onChange={e => setForm(f => ({ ...f, transaction_ref: e.target.value }))}
              placeholder={form.payment_mode === 'cheque' ? 'e.g. 123456' : 'e.g. 427689341234'}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 outline-none placeholder:text-gray-400"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Payment Date <span className="text-red-500">*</span></label>
            <input
              type="date" required value={form.payment_date}
              max={new Date().toISOString().slice(0,10)}
              onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 outline-none"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Remarks (optional)</label>
            <textarea
              value={form.remarks} rows={2}
              onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
              placeholder="Any notes for the accountant…"
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 outline-none resize-none placeholder:text-gray-400"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {loading ? 'Submitting…' : `Submit — ${fmt(total)}`}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN FEES PAGE
// ══════════════════════════════════════════════════════════════
export default function FeesPage() {
  const { user } = useAuth();
  const token = user?.token;
  const { theme } = useTheme();
  const { showModal } = useAppModal();

  const [tab, setTab] = useState('dues');
  const [duesData, setDuesData] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [showPayModal, setShowPayModal] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [duesRes, rcptRes] = await Promise.all([
        feeApi.getMyDues(token),
        feeApi.getMyReceipts(token),
      ]);
      setDuesData(duesRes);
      setReceipts(rcptRes.receipts || []);
    } catch (e) {
      if (!silent) showModal("Error", e.message || "Failed to load fee data.", "danger");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, showModal]);

  useEffect(() => { if (token) load(); }, [token, load]);

  function toggleInvoice(inv) {
    if (inv.status === 'paid') return;
    setSelectedInvoices(prev =>
      prev.find(i => i.id === inv.id) ? prev.filter(i => i.id !== inv.id) : [...prev, inv]
    );
  }

  const selectedTotal = selectedInvoices.reduce((s, i) => s + (parseFloat(i.total_due) - parseFloat(i.total_paid)), 0);
  const { invoices = [], pending_submissions = [], summary = {} } = duesData || {};

  if (loading) return (
    <div className={theme}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Skeleton />
      </div>
    </div>
  );

  return (
    <div className={theme}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">

        {/* ── Header ── */}
        <div className="bg-white dark:bg-gray-900 px-4 pt-4 pb-0 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Fee Management</h1>
              <p className="text-xs text-gray-400 mt-0.5">Session 2025–26</p>
            </div>
            <button
              onClick={() => load(true)}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Summary Strip */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Total Billed', val: summary.total_due, icon: <IndianRupee size={14}/>, color: 'text-gray-700 dark:text-gray-200', bg: 'bg-gray-100 dark:bg-gray-800' },
              { label: 'Paid', val: summary.total_paid, icon: <CheckCircle2 size={14}/>, color: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/30' },
              { label: 'Due', val: summary.balance, icon: <AlertCircle size={14}/>, color: summary.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400', bg: summary.balance > 0 ? 'bg-red-50 dark:bg-red-900/30' : 'bg-green-50 dark:bg-green-900/30' },
            ].map(c => (
              <div key={c.label} className={`${c.bg} rounded-2xl p-3`}>
                <div className={`flex items-center gap-1 ${c.color} mb-1`}>{c.icon}<span className="text-[10px] font-medium">{c.label}</span></div>
                <p className={`text-sm font-bold ${c.color}`}>{fmt(c.val)}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-0">
            {[
              { id: 'dues', label: 'Invoices', icon: <FileText size={14}/> },
              { id: 'receipts', label: 'Receipts', icon: <Receipt size={14}/> },
            ].map(t => (
              <button
                key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 flex-1 py-2.5 text-sm font-semibold border-b-2 transition-colors
                  ${tab === t.id
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600'}`}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Pending Submissions Banner ── */}
        <AnimatePresence>
          {pending_submissions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="mx-4 mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-blue-600 dark:text-blue-400" />
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Payment Under Verification</p>
              </div>
              {pending_submissions.map(sub => (
                <div key={sub.id} className="flex items-center justify-between text-sm py-1">
                  <span className="text-blue-600 dark:text-blue-400 text-xs">{sub.payment_mode?.toUpperCase()} · {sub.transaction_ref}</span>
                  <span className="font-bold text-blue-700 dark:text-blue-300">{fmt(sub.amount_submitted)}</span>
                </div>
              ))}
              <p className="text-xs text-blue-400 mt-1">Awaiting accountant verification • 1–2 business days</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════ TAB: INVOICES ══════════ */}
        {tab === 'dues' && (
          <div className="px-4 mt-4 space-y-3">
            {invoices.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet size={28} className="text-gray-400" />
                </div>
                <p className="font-semibold text-gray-700 dark:text-gray-300">No invoices yet</p>
                <p className="text-sm text-gray-400 mt-1">Invoices will appear once generated by your school</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Tap an invoice to select it for payment
                </p>
                {invoices.map((inv, idx) => {
                  const balance = parseFloat(inv.total_due) - parseFloat(inv.total_paid);
                  const isSelected = !!selectedInvoices.find(i => i.id === inv.id);
                  const pct = parseFloat(inv.total_due) > 0
                    ? Math.min(100, Math.round((parseFloat(inv.total_paid) / parseFloat(inv.total_due)) * 100)) : 0;
                  return (
                    <motion.div
                      key={inv.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      onClick={() => toggleInvoice(inv)}
                      className={`rounded-2xl p-4 border-2 transition-all cursor-pointer select-none
                        ${inv.status === 'paid'
                          ? 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 opacity-60 cursor-default'
                          : isSelected
                          ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 shadow-md'
                          : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-200 dark:hover:border-gray-700'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {/* Checkbox */}
                          {inv.status !== 'paid' && (
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                              ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-300 dark:border-gray-600'}`}>
                              {isSelected && <CheckCircle2 size={12} className="text-white" fill="white"/>}
                            </div>
                          )}
                          {inv.status === 'paid' && <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />}
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">
                              {MONTHS[inv.invoice_month]} {inv.invoice_year}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">{inv.fee_heads || 'Monthly Fee'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <StatusPill status={inv.status} />
                          <p className="text-base font-bold text-gray-900 dark:text-white mt-1">{fmt(inv.total_due)}</p>
                          {balance > 0 && inv.status !== 'paid' && (
                            <p className="text-xs text-red-500">Due: {fmt(balance)}</p>
                          )}
                        </div>
                      </div>
                      {inv.status !== 'paid' && (
                        <div className="mt-3">
                          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, delay: idx * 0.04 + 0.2 }}
                              className="h-full bg-gradient-to-r from-orange-400 to-red-400 rounded-full"
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{fmt(inv.total_paid)} paid · {pct}%</p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* ══════════ TAB: RECEIPTS ══════════ */}
        {tab === 'receipts' && (
          <div className="px-4 mt-4 space-y-3">
            {receipts.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Receipt size={28} className="text-gray-400" />
                </div>
                <p className="font-semibold text-gray-700 dark:text-gray-300">No receipts yet</p>
                <p className="text-sm text-gray-400 mt-1">Verified payments will appear here</p>
              </div>
            ) : receipts.map((r, idx) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <BadgeCheck size={18} className="text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-mono text-xs font-bold text-gray-800 dark:text-gray-200">{r.receipt_no}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{fmtDate(r.payment_date)}</p>
                      {r.collected_by_name && <p className="text-xs text-gray-400">{r.collected_by_name}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white">{fmt(r.amount_paid)}</p>
                    <p className="text-xs text-gray-400 capitalize mt-0.5">{(r.payment_mode || '').replace('_', ' ')}</p>
                  </div>
                </div>
                {r.reference_no && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1.5 font-mono">
                    Ref: {r.reference_no}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* ── Sticky Pay Button ── */}
        <AnimatePresence>
          {selectedInvoices.length > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shadow-2xl z-40"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-500">{selectedInvoices.length} invoice{selectedInvoices.length > 1 ? 's' : ''} selected</p>
                  <p className="font-bold text-gray-900 dark:text-white">{fmt(selectedTotal)}</p>
                </div>
                <button
                  onClick={() => setSelectedInvoices([])}
                  className="text-xs text-gray-400 flex items-center gap-1 hover:text-gray-600"
                >
                  <X size={12} /> Clear
                </button>
              </div>
              <button
                onClick={() => setShowPayModal(true)}
                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Send size={16} />
                Submit Payment — {fmt(selectedTotal)}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Pay Modal ── */}
        <AnimatePresence>
          {showPayModal && (
            <PayModal
              selectedInvoices={selectedInvoices}
              token={token}
              showModal={showModal}
              onClose={() => setShowPayModal(false)}
              onSuccess={() => {
                setShowPayModal(false);
                setSelectedInvoices([]);
                load(true);
                setTab('receipts');
              }}
            />
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
