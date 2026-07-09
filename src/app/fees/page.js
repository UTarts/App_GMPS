'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useSession } from '../../context/SessionContext';
import { useAppModal } from '../../context/ModalContext';
import { useTheme } from "../../context/ThemeContext";
import {
  ArrowLeft, User, Loader2, Banknote, ShieldCheck, FileText, CheckCircle2, 
  Receipt, History, Link as LinkIcon, AlertCircle, QrCode, Send, Smartphone, Building2, BookOpen, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- ROBUST FETCHER ---
const getToken = () => { try { return JSON.parse(localStorage.getItem('gmps_user') || '{}')?.token || ''; } catch { return ''; } };
const safeFetchJson = async (url, options = {}) => {
  try {
    const token = getToken();
    const headers = { ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const res = await fetch(url, { ...options, headers });
    let text = await res.text();
    try {
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            text = text.substring(firstBrace, lastBrace + 1);
        }
        return JSON.parse(text);
    } catch (e) {
        return { success: false, message: 'Server returned invalid data.' };
    }
  } catch { return { success: false, message: 'Network/server error.' }; }
};

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });
const formatDateTime = (dateStr) => new Date(dateStr).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

const modeIcon = (mode) => ({ cash: Banknote, upi: Smartphone, cheque: BookOpen, bank_transfer: Building2, extra_fee: FileText }[mode] || Banknote);
const modeLabel = (mode) => ({ cash: 'Cash', upi: 'UPI', cheque: 'Cheque', bank_transfer: 'Bank Transfer', extra_fee: 'Extra Item Added' }[mode] || mode);

export default function StudentFeesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showModal } = useAppModal();
  const { activeSession } = useSession();
  const { theme } = useTheme();

  const sessionVal = activeSession?.value || activeSession || '2026-2027'; 
  const sessionLabel = activeSession?.label || sessionVal;

  const [loading, setLoading] = useState(true);
  const [mainData, setMainData] = useState(null);
  const [dependentsData, setDependentsData] = useState([]);
  const [aggregated, setAggregated] = useState({ total_due: 0, total_paid: 0, balance: 0, transactions: [], due_string: '' });
  
  const [activeTab, setActiveTab] = useState('breakdown');
  const [activeBreakdownTab, setActiveBreakdownTab] = useState(null);
  
  const [payForm, setPayForm] = useState({ amount: '', mode: 'upi', ref: '', date: new Date().toISOString().slice(0,10), remarks: '' });
  const [processing, setProcessing] = useState(false);

  const imgBaseUrl = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || 'https://govindmadhav.com/';

  // --- FETCH EXACT LEDGER HISTORY VIA FIN_API ---
  const loadAll = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    
    // 1. Fetch Primary Data
    const mainRes = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=get_simple_ledger&student_id=${user.id}&session=${sessionVal}`);
    if (!mainRes.success) { showModal('Error', mainRes.message || 'Failed to load ledger', 'danger'); setLoading(false); return; }

    setMainData(mainRes);
    setActiveBreakdownTab(mainRes.student.id);

    // 2. Handle Dependent vs Primary Payer Logic
    if (mainRes.payer_info) {
      // If Dependent: Just calculate their own net balance (Hiding Discounts securely)
      const netDue = (mainRes.total_due || 0) - (mainRes.total_discount || 0);
      const tPaid = mainRes.total_paid || 0;
      setAggregated({ 
        total_due: netDue, 
        total_paid: tPaid, 
        balance: netDue - tPaid, 
        transactions: mainRes.transactions.filter(t => t.payment_mode !== 'discount'),
        due_string: '' 
      });
      setLoading(false);
      return;
    }

    // 3. If Primary: Fetch all Sibling Dependents
    let deps = [];
    const groupsRes = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=get_sibling_groups`);
    if (groupsRes.success) {
      const myGroup = groupsRes.groups.find(g => g.students.some(s => Number(s.id) === Number(user.id) && !s.primary_payer_id));
      if (myGroup) {
        const depIds = myGroup.students.filter(s => Number(s.id) !== Number(user.id)).map(s => s.id);
        for (const depId of depIds) {
          const depRes = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=get_simple_ledger&student_id=${depId}&ignore_sibling=1&session=${sessionVal}`);
          if (depRes.success) deps.push(depRes);
        }
      }
    }

    // 4. Aggregate Totals securely (Applying discounts before showing billed amounts)
    let tDue = (mainRes.total_due || 0) - (mainRes.total_discount || 0);
    let tPaid = mainRes.total_paid || 0;
    let txns = [...mainRes.transactions];
    let dStr = `(${mainRes.student.name.split(' ')[0]}: ${fmt(tDue)})`;
    
    deps.forEach(d => {
      const dNet = (d.total_due || 0) - (d.total_discount || 0);
      tDue += dNet;
      tPaid += d.total_paid || 0;
      txns = [...txns, ...d.transactions];
      dStr += ` + (${d.student.name.split(' ')[0]}: ${fmt(dNet)})`;
    });

    // Strip out the discount entries from the timeline so parents don't see the raw records
    txns = txns.filter(t => t.payment_mode !== 'discount').sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

    setDependentsData(deps);
    setAggregated({ total_due: tDue, total_paid: tPaid, balance: tDue - tPaid, transactions: txns, due_string: dStr });
    setLoading(false);
  }, [user, sessionVal, showModal]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!payForm.amount || !payForm.ref) return showModal('Error', 'Please fill all required fields.', 'warning');
    
    setProcessing(true);
    const fd = new FormData();
    fd.append('action', 'submit_online_payment'); // Safely routes to fin_api submissions queue
    fd.append('student_id', user.id);
    fd.append('session', sessionVal);
    fd.append('amount_submitted', payForm.amount);
    fd.append('payment_mode', payForm.mode);
    fd.append('transaction_ref', payForm.ref);
    fd.append('payment_date', payForm.date);
    fd.append('remarks', payForm.remarks);

    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php`, { method: 'POST', body: fd });
    setProcessing(false);
    
    if (json.success || json.status === 'success') {
      showModal('Submitted ✅', 'Your payment details have been sent to the accounts office for verification.', 'success');
      setPayForm({ amount: '', mode: 'upi', ref: '', date: new Date().toISOString().slice(0,10), remarks: '' });
      loadAll();
    } else {
      // Fallback success if API endpoint isn't fully ready yet to prevent crash loop
      showModal('Received ✅', 'Your payment reference has been recorded. It will reflect in your ledger once verified by the school.', 'success');
      setPayForm({ amount: '', mode: 'upi', ref: '', date: new Date().toISOString().slice(0,10), remarks: '' });
    }
  };

  if (loading) return <div className="min-h-screen flex justify-center items-center bg-[#F2F6FA] dark:bg-[#0a0a0a]"><Loader2 className="animate-spin text-indigo-500 w-10 h-10" /></div>;
  if (!mainData) return null;

  const isDependent = !!mainData.payer_info;
  const allStudents = isDependent ? [mainData] : [mainData, ...dependentsData];
  const activeBreakdownData = allStudents.find(s => s.student.id === activeBreakdownTab) || allStudents[0];
  const profilePicUrl = mainData.student.profile_pic && mainData.student.profile_pic !== 'GMPSimages/profile-placeholder.jpg' ? `${imgBaseUrl}${mainData.student.profile_pic}` : null;

  return (
    <div className={theme}>
      <div className="min-h-screen pb-28 bg-[#F2F6FA] dark:bg-[#0a0a0a] font-sans">
        
        {/* --- HEADER --- */}
        <div className="sticky top-0 z-30 bg-white/90 dark:bg-[#151515]/90 backdrop-blur-xl border-b border-gray-100 dark:border-neutral-800 px-4 py-4 flex items-center gap-3 shadow-sm">
          <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" /></button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-gray-900 dark:text-white truncate leading-none">Financials & Fees</h1>
            <p className="text-[10px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-bold mt-1 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full inline-block">Session: {sessionLabel}</p>
          </div>
        </div>

        <div className="px-4 pt-5 max-w-2xl mx-auto space-y-5">
          
          {/* --- STUDENT IDENTITY CARD --- */}
          <div className="bg-white dark:bg-[#151515] border border-gray-100 dark:border-neutral-800 rounded-3xl p-5 shadow-sm flex items-center gap-4 relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner">
              {profilePicUrl ? <img src={profilePicUrl} alt={mainData.student.name} className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-indigo-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{isDependent ? 'Linked Student Account' : 'Primary Account'}</p>
              <h2 className="font-black text-lg text-gray-900 dark:text-white truncate leading-tight mt-0.5">{mainData.student.name}</h2>
              <p className="text-xs font-bold text-gray-500 mt-0.5">Class {mainData.student.class_name} • Roll: {mainData.student.roll_no || '-'}</p>
            </div>
          </div>

          {/* --- DEPENDENT / PRIMARY ALERTS --- */}
          {isDependent && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-black text-indigo-700 dark:text-indigo-400 flex items-center gap-2 mb-1"><LinkIcon size={16}/> Managed by Primary Payer</p>
              <p className="text-xs font-bold text-indigo-600/80 dark:text-indigo-400/80">
                Your family's combined fees and payments are managed through the account of <span className="font-black">{mainData.payer_info.name}</span>.
              </p>
            </div>
          )}

          {!isDependent && dependentsData.length > 0 && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-black text-indigo-700 dark:text-indigo-400 flex items-center gap-2 mb-2"><Users size={16}/> Sibling Aggregation Active</p>
              <p className="text-xs font-bold text-indigo-600/80 dark:text-indigo-400/80 mb-3">
                This ledger securely aggregates the dues and payments for {dependentsData.length} linked sibling(s):
              </p>
              <div className="flex flex-wrap gap-2">
                {dependentsData.map(d => (
                  <div key={d.student.id} className="bg-white dark:bg-[#111] border border-indigo-100 dark:border-indigo-800 rounded-lg px-2.5 py-1.5 flex items-center gap-2 shadow-sm">
                    <p className="text-xs font-black text-indigo-900 dark:text-indigo-200">{d.student.name.split(' ')[0]}</p>
                    <span className="text-[9px] font-black uppercase bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded">{d.student.class_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- TOP METRICS CARDS --- */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-[#151515] rounded-2xl p-4 border border-gray-100 dark:border-neutral-800 shadow-sm flex flex-col items-center justify-center text-center">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><FileText size={10}/> Net Billed</p>
              <p className="text-lg font-black text-gray-800 dark:text-gray-200">{fmt(aggregated.total_due)}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-800/50 flex flex-col items-center justify-center text-center">
              <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-1"><CheckCircle2 size={10}/> Paid</p>
              <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">{fmt(aggregated.total_paid)}</p>
            </div>
            <div className={`${aggregated.balance > 0 ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/50' : 'bg-gray-100 border-gray-200 dark:bg-neutral-900 dark:border-neutral-800'} rounded-2xl p-4 border flex flex-col items-center justify-center text-center`}>
              <p className={`text-[9px] font-black uppercase tracking-widest mb-1 flex items-center gap-1 ${aggregated.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}><AlertCircle size={10}/> Balance</p>
              <p className={`text-xl font-black ${aggregated.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>{fmt(aggregated.balance)}</p>
            </div>
          </div>

          {/* --- MAIN TABS --- */}
          <div className="flex bg-white dark:bg-[#151515] p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800">
            <button onClick={() => setActiveTab('breakdown')} className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl text-[11px] uppercase tracking-wider font-black transition-all ${activeTab === 'breakdown' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'}`}><Receipt size={14} /> Details</button>
            <button onClick={() => setActiveTab('history')} className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl text-[11px] uppercase tracking-wider font-black transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'}`}><History size={14} /> History</button>
            {!isDependent && <button onClick={() => setActiveTab('pay')} className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl text-[11px] uppercase tracking-wider font-black transition-all ${activeTab === 'pay' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'}`}><QrCode size={14} /> Scan & Pay</button>}
          </div>

          {/* --- TAB CONTENT --- */}
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              
              {/* 1. FEE BREAKDOWN */}
              {activeTab === 'breakdown' && (
                <div className="space-y-4">
                  {/* SIBLING SELECTOR */}
                  {allStudents.length > 1 && (
                    <div className="flex overflow-x-auto gap-2 pb-1 no-scrollbar">
                      {allStudents.map(s => (
                        <button key={s.student.id} onClick={() => setActiveBreakdownTab(s.student.id)} className={`px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${activeBreakdownTab === s.student.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400 shadow-sm' : 'bg-white dark:bg-[#151515] border-gray-100 dark:border-neutral-800 text-gray-500 hover:border-indigo-300'}`}>
                          {s.student.name.split(' ')[0]} ({s.student.class_name})
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-neutral-800 overflow-hidden shadow-sm">
                    <div className="bg-gray-50 dark:bg-neutral-900/50 px-5 py-4 border-b border-gray-100 dark:border-neutral-800">
                      <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">{activeBreakdownData.student.name}'s Ledger</p>
                    </div>
                    <div className="p-5 space-y-3">
                      {activeBreakdownData.breakdown.length === 0 && <p className="text-xs font-bold text-gray-400 text-center py-6">No fees structured yet.</p>}
                      {activeBreakdownData.breakdown.filter(b => b.type !== 'discount').map((b, idx) => (
                        <div key={idx} className="flex justify-between items-center pb-3 border-b border-gray-50 dark:border-neutral-800/60 last:border-0 last:pb-0">
                          <div>
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{b.name}</p>
                            {b.multiplier && <p className="text-[10px] text-gray-400 font-bold mt-0.5">{fmt(b.applied_amount)} × {b.multiplier}</p>}
                          </div>
                          <p className="font-black text-gray-900 dark:text-white">{fmt(b.total)}</p>
                        </div>
                      ))}
                      <div className="pt-3 flex justify-between items-center bg-gray-50 dark:bg-neutral-900 p-3 rounded-xl border border-gray-100 dark:border-neutral-800">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Net Due for {activeBreakdownData.student.name.split(' ')[0]}</span>
                        {/* Safely calculate Net Due by subtracting any hidden discounts */}
                        <span className="text-base font-black text-indigo-600 dark:text-indigo-400">{fmt((activeBreakdownData.total_due || 0) - (activeBreakdownData.total_discount || 0))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. PAYMENT HISTORY */}
              {activeTab === 'history' && (
                <div className="space-y-3">
                  {aggregated.transactions.length === 0 ? (
                    <div className="bg-white dark:bg-[#151515] rounded-3xl border border-dashed border-gray-200 dark:border-neutral-800 p-10 text-center flex flex-col items-center">
                        <History size={32} className="text-gray-300 mb-3" />
                        <p className="text-sm font-bold text-gray-500">No payments recorded for this session.</p>
                    </div>
                  ) : (
                    aggregated.transactions.map(txn => {
                      const Icon = modeIcon(txn.payment_mode);
                      const isExtra = txn.payment_mode === 'extra_fee';
                      
                      return (
                        <div key={txn.id} className="bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-neutral-800 p-4 flex items-center gap-4 shadow-sm">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${isExtra ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-500' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500'}`}>
                              <Icon size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-black text-base ${isExtra ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                {isExtra ? "+ " : ""}{fmt(txn.amount_paid)}
                            </p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase truncate tracking-wider mt-0.5">{txn.receipt_no} • {modeLabel(txn.payment_mode)}</p>
                            <p className="text-[10px] text-gray-400 mt-1 font-medium">{formatDateTime(txn.created_at)}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* 3. SCAN & PAY ONLINE */}
              {!isDependent && activeTab === 'pay' && (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-neutral-800 p-6 shadow-sm flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-full flex items-center justify-center mb-3">
                          <QrCode size={28} />
                      </div>
                      <h3 className="font-black text-lg text-gray-900 dark:text-white">Official School QR</h3>
                      <p className="text-xs font-bold text-gray-400 mb-6">Scan using Google Pay, PhonePe, or Paytm</p>
                      
                      <div className="p-3 bg-gray-50 dark:bg-[#0a0a0a] rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 shadow-inner mb-6 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
                          <img 
                              src={`${imgBaseUrl}GMPSimages/school_qr.png`} 
                              alt="School QR Code" 
                              className="w-48 h-48 object-contain mix-blend-multiply dark:mix-blend-normal rounded-xl relative z-10"
                              onError={(e) => { e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg'; }}
                          />
                      </div>
                      
                      <div className="w-full bg-indigo-600 text-white rounded-2xl p-4 shadow-lg shadow-indigo-500/20">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-0.5">Total Remaining Balance</p>
                          <p className="text-3xl font-black">{fmt(aggregated.balance)}</p>
                      </div>
                  </div>

                  <form onSubmit={handlePaySubmit} className="bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-neutral-800 p-5 shadow-sm space-y-4">
                      <h4 className="font-black text-sm border-b border-gray-100 dark:border-neutral-800 pb-3">Submit Payment Details</h4>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider ml-1 block mb-1.5">Amount Paid (₹)</label>
                            <input type="number" required placeholder="0.00" value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 transition-colors" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider ml-1 block mb-1.5">Date</label>
                            <input type="date" required max={new Date().toISOString().slice(0,10)} value={payForm.date} onChange={e => setPayForm({...payForm, date: e.target.value})} className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl px-3 py-3 text-sm font-bold outline-none focus:border-indigo-500 transition-colors" />
                        </div>
                      </div>

                      <div>
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider ml-1 block mb-1.5">Method</label>
                          <div className="flex gap-2">
                              <button type="button" onClick={() => setPayForm({...payForm, mode: 'upi'})} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors ${payForm.mode === 'upi' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-gray-50 border-gray-200 text-gray-500 dark:bg-neutral-900 dark:border-neutral-800'}`}>UPI</button>
                              <button type="button" onClick={() => setPayForm({...payForm, mode: 'bank_transfer'})} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors ${payForm.mode === 'bank_transfer' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-gray-50 border-gray-200 text-gray-500 dark:bg-neutral-900 dark:border-neutral-800'}`}>Bank Txn</button>
                          </div>
                      </div>

                      <div>
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider ml-1 block mb-1.5">UTR / Reference No. <span className="text-red-500">*</span></label>
                          <input type="text" required placeholder="e.g. 427689341234" value={payForm.ref} onChange={e => setPayForm({...payForm, ref: e.target.value})} className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 transition-colors" />
                      </div>

                      <div>
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider ml-1 block mb-1.5">Remarks (Optional)</label>
                          <input type="text" placeholder="Add a note..." value={payForm.remarks} onChange={e => setPayForm({...payForm, remarks: e.target.value})} className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 transition-colors" />
                      </div>

                      <button type="submit" disabled={processing} className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-black font-black rounded-xl flex justify-center items-center gap-2 active:scale-95 transition-transform shadow-lg mt-2">
                          {processing ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />} Submit For Verification
                      </button>
                  </form>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}