"use client";
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useAppModal } from '../../../context/ModalContext';
import {
  ArrowLeft, Search, CreditCard, CheckCircle2, Loader2,
  IndianRupee, Phone, AlertTriangle, Receipt, ChevronDown, ChevronUp
} from 'lucide-react';
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
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const statusBadge = (s) => {
  const map = { paid: 'text-emerald-600 dark:text-emerald-400', partial: 'text-amber-600 dark:text-amber-400', unpaid: 'text-red-500' };
  return <span className={`text-xs font-semibold capitalize ${map[s] || 'text-gray-400'}`}>{s}</span>;
};

export default function CollectFee() {
  const { user } = useAuth();
  const { showModal } = useAppModal();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preloadStudentId = searchParams.get('student_id');

  const [step, setStep] = useState(preloadStudentId ? 2 : 1); // 1=search, 2=select invoices, 3=confirm, 4=done
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [student, setStudent] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().substring(0, 10));
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin' || user.level != 3) { router.replace('/'); return; }
    if (preloadStudentId) loadStudentData(preloadStudentId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const doSearch = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=search_student&q=${encodeURIComponent(query.trim())}`);
    setSearching(false);
    if (json.success) setSearchResults(json.students || []);
  };

  const loadStudentData = async (id) => {
    setLoadingStudent(true);
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=get_student_dues&student_id=${id}`);
    setLoadingStudent(false);
    if (json.success) {
      setStudent(json.student);
      setStudentData(json);
      setStep(2);
      // Pre-select all unpaid/partial invoices
      const unpaid = (json.invoices || []).filter(i => i.status !== 'paid').map(i => i.id);
      setSelectedInvoices(unpaid);
    } else {
      setError(json.message || 'Failed to load student');
    }
  };

  const toggleInvoice = (id) => {
    setSelectedInvoices(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const totalSelected = (studentData?.invoices || [])
    .filter(i => selectedInvoices.includes(i.id))
    .reduce((s, i) => s + (i.total_due - i.total_paid), 0);

  const handleCollect = async () => {
    if (selectedInvoices.length === 0) { setError('Select at least one invoice'); return; }
    if (totalSelected <= 0) { setError('Amount must be greater than 0'); return; }
    setSubmitting(true); setError('');
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=collect_cash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: student.id,
        invoice_ids: selectedInvoices,
        amount_paid: totalSelected,
        payment_mode: paymentMode,
        reference_no: referenceNo,
        payment_date: paymentDate,
        remarks: remarks,
      }),
    });
    setSubmitting(false);
    if (json.success) {
      setReceipt(json);
      setStep(4);
    } else {
      setError(json.message || 'Payment failed');
    }
  };

  // ── STEP 1: Search Student ────────────────────────────────────────────────
  if (step === 1) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3 shadow-sm">
        <Link href="/accountant" className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 active:scale-95 transition-transform">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="text-base font-semibold text-gray-800 dark:text-gray-100">Collect Fee</p>
          <p className="text-xs text-gray-400">Search student first</p>
        </div>
      </div>
      <div className="px-4 pt-4 max-w-lg mx-auto space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-sm">
            <Search size={18} className="text-gray-400 shrink-0" />
            <input
              type="text" value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder="Student name, Roll No..." autoFocus
              className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none"
            />
          </div>
          <button onClick={doSearch} disabled={searching || query.trim().length < 2}
            className="px-5 rounded-2xl bg-emerald-500 text-white text-sm font-semibold shadow-sm active:scale-95 transition-transform disabled:opacity-50">
            {searching ? <Loader2 size={18} className="animate-spin" /> : 'Go'}
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            {searchResults.map(s => (
              <button key={s.id} onClick={() => loadStudentData(s.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 dark:border-gray-800/60 last:border-0 active:bg-emerald-50 dark:active:bg-emerald-900/10 transition-colors text-left">
                <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm shrink-0">
                  {s.name?.[0] || 'S'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{s.name}</p>
                  <p className="text-xs text-gray-400 truncate">{s.class_name} · {s.login_id}</p>
                </div>
                {loadingStudent && <Loader2 size={16} className="animate-spin text-emerald-500 shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── STEP 2: Select Invoices + Payment details ─────────────────────────────
  if (step === 2) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button onClick={() => setStep(1)} className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 active:scale-95 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-gray-800 dark:text-gray-100 truncate">{student?.name}</p>
          <p className="text-xs text-gray-400">{student?.class_name} · {student?.login_id}</p>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-lg mx-auto space-y-4">
        {loadingStudent && <div className="flex justify-center py-10"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>}

        {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3 text-sm text-red-500">{error}</div>}

        {/* Invoices Selection */}
        {(studentData?.invoices || []).filter(i => i.status !== 'paid').length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">Select Invoices to Settle</p>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
              {(studentData?.invoices || []).filter(i => i.status !== 'paid').map(inv => {
                const balance = inv.total_due - inv.total_paid;
                const checked = selectedInvoices.includes(inv.id);
                return (
                  <button key={inv.id} onClick={() => toggleInvoice(inv.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 dark:border-gray-800/60 last:border-0 transition-colors text-left ${checked ? 'bg-emerald-50 dark:bg-emerald-900/10' : ''}`}>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-gray-600'}`}>
                      {checked && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                          {MONTHS[(inv.invoice_month || 1) - 1]} {inv.invoice_year}
                        </p>
                        {statusBadge(inv.status)}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{inv.fee_heads || '—'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{fmt(balance)}</p>
                      <p className="text-[10px] text-gray-400">Due</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Payment Mode */}
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">Payment Details</p>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800">
            {/* Mode */}
            <div className="px-4 py-3 flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400 w-28 shrink-0">Payment Mode</span>
              <div className="flex gap-2 flex-wrap flex-1">
                {['cash','upi','cheque','bank_transfer'].map(m => (
                  <button key={m} onClick={() => setPaymentMode(m)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${paymentMode === m ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                    {m.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </button>
                ))}
              </div>
            </div>
            {/* Date */}
            <div className="px-4 py-3 flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400 w-28 shrink-0">Date</span>
              <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-100 outline-none" />
            </div>
            {/* Reference */}
            {paymentMode !== 'cash' && (
              <div className="px-4 py-3 flex items-center gap-3">
                <span className="text-sm text-gray-500 dark:text-gray-400 w-28 shrink-0">Reference No.</span>
                <input type="text" value={referenceNo} onChange={e => setReferenceNo(e.target.value)}
                  placeholder="UTR / Cheque No." className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none" />
              </div>
            )}
            {/* Remarks */}
            <div className="px-4 py-3 flex items-start gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400 w-28 shrink-0 pt-0.5">Remarks</span>
              <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)}
                placeholder="Optional" className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom: Amount + Collect Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-4 py-4 z-20">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">Total to Collect ({selectedInvoices.length} invoice{selectedInvoices.length !== 1 ? 's' : ''})</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(totalSelected)}</span>
          </div>
          <button onClick={handleCollect} disabled={submitting || totalSelected <= 0 || selectedInvoices.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white py-3.5 rounded-2xl font-semibold shadow-lg active:scale-95 transition-transform disabled:opacity-50">
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
            {submitting ? 'Processing...' : 'Confirm & Collect'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── STEP 4: Success / Receipt ─────────────────────────────────────────────
  if (step === 4) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-6 text-center gap-4">
      <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
        <CheckCircle2 size={40} className="text-emerald-500" />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-800 dark:text-gray-100">Payment Recorded!</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{student?.name} — {fmt(totalSelected)}</p>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 w-full max-w-xs shadow-sm border border-gray-100 dark:border-gray-800 text-left">
        <div className="flex items-center gap-2 mb-2">
          <Receipt size={16} className="text-emerald-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Receipt</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">Receipt No: <span className="font-mono font-semibold text-gray-800 dark:text-gray-100">{receipt?.receipt_no}</span></p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Amount: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt(totalSelected)}</span></p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Mode: <span className="capitalize font-medium text-gray-700 dark:text-gray-200">{paymentMode}</span></p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Date: {paymentDate}</p>
      </div>
      <div className="flex gap-3 w-full max-w-xs">
        <button onClick={() => { setStep(1); setStudent(null); setStudentData(null); setSelectedInvoices([]); setReceipt(null); setQuery(''); setSearchResults([]); }}
          className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold text-sm active:scale-95 transition-transform">
          New Collection
        </button>
        <Link href={`/accountant/ledger/${student?.id}`}
          className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white font-semibold text-sm text-center active:scale-95 transition-transform">
          View Ledger
        </Link>
      </div>
    </div>
  );

  return null;
}
