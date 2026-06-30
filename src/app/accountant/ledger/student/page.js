'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import { useAppModal } from '../../../../context/ModalContext';
import {
  ArrowLeft, User, Loader2, Banknote, ShieldCheck, FileText, Plus, Tag, CheckCircle2, 
  Printer, Receipt, History, Link as LinkIcon, AlertCircle, Bus, Edit3, X
} from 'lucide-react';
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

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });
const formatDateTime = (dateStr) => new Date(dateStr).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

const modeIcon = (mode) => ({ cash: Banknote, upi: Banknote, cheque: FileText, bank_transfer: ShieldCheck, extra_fee: Plus, discount: Tag }[mode] || Banknote);
const modeLabel = (mode) => ({ cash: 'Cash', upi: 'UPI', cheque: 'Cheque', bank_transfer: 'Bank Transfer', extra_fee: 'Extra Item Added', discount: 'Discount Granted' }[mode] || mode);

export default function SmartStudentLedger() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showModal } = useAppModal();
  const studentId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  
  const [mainData, setMainData] = useState(null);
  const [dependentsData, setDependentsData] = useState([]);
  const [aggregated, setAggregated] = useState({ total_due: 0, total_paid: 0, total_discount: 0, balance: 0, transactions: [], due_string: '' });
  
  const [activeTab, setActiveTab] = useState('collect');
  const [activeBreakdownTab, setActiveBreakdownTab] = useState(null);
  
  const [payForm, setPayForm] = useState({ amount: '', mode: 'cash', ref: '', remarks: '' });
  const [processing, setProcessing] = useState(false);
  const [modals, setModals] = useState({ extra: false, discount: false });
  const [editModal, setEditModal] = useState({ show: false, txn: null, amount: '', remarks: '', reason: '' });
  const [historyModal, setHistoryModal] = useState({ show: false, logs: [] });
  
  const [targetStudentId, setTargetStudentId] = useState('');
  const [extraForm, setExtraForm] = useState({ fee_head_id: '', amount: '' });
  const [discountForm, setDiscountForm] = useState({ amount: '', reason: '' });
  const [receiptData, setReceiptData] = useState(null);

  const imgBaseUrl = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || 'https://govindmadhav.com/';

  const loadAll = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    
    const mainRes = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=get_simple_ledger&student_id=${studentId}`);
    if (!mainRes.success) { showModal('Error', mainRes.message, 'danger'); setLoading(false); return; }

    setMainData(mainRes);
    setTargetStudentId(mainRes.student.id);
    setActiveBreakdownTab(mainRes.student.id);

    // If it's a dependent, we stop searching for more siblings to save time
    if (mainRes.payer_info) {
      setAggregated({ total_due: mainRes.total_due, total_paid: mainRes.total_paid, total_discount: mainRes.total_discount, balance: mainRes.balance, transactions: mainRes.transactions, due_string: '' });
      setLoading(false);
      return;
    }

    let deps = [];
    const groupsRes = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=get_sibling_groups`);
    if (groupsRes.success) {
      // FIX: Strict Number comparison so "50" matches 50
      const myGroup = groupsRes.groups.find(g => g.students.some(s => Number(s.id) === Number(studentId) && !s.primary_payer_id));
      if (myGroup) {
        const depIds = myGroup.students.filter(s => Number(s.id) !== Number(studentId)).map(s => s.id);
        for (const depId of depIds) {
          const depRes = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=get_simple_ledger&student_id=${depId}&ignore_sibling=1`);
          if (depRes.success) deps.push(depRes);
        }
      }
    }

    let tDue = mainRes.total_due, tPaid = mainRes.total_paid, tDisc = mainRes.total_discount;
    let txns = [...mainRes.transactions];
    let dStr = `(${mainRes.student.name.split(' ')[0]}: ₹${fmt(mainRes.total_due)})`;
    
    deps.forEach(d => {
      tDue += d.total_due; tPaid += d.total_paid; tDisc += d.total_discount;
      txns = [...txns, ...d.transactions];
      dStr += ` + (${d.student.name.split(' ')[0]}: ₹${fmt(d.total_due)})`;
    });

    txns.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

    setDependentsData(deps);
    setAggregated({ total_due: tDue, total_paid: tPaid, total_discount: tDisc, balance: tDue - tPaid - tDisc, transactions: txns, due_string: dStr });
    setLoading(false);
  }, [studentId, showModal]);

  useEffect(() => { if (user?.role === 'admin') loadAll(); }, [user, loadAll]);

  const handleCollect = async () => {
    if (!payForm.amount || Number(payForm.amount) <= 0) return showModal('Error', 'Invalid amount', 'danger');
    setProcessing(true);
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'collect_simple_fee', student_id: studentId, amount: payForm.amount, payment_mode: payForm.mode, reference_no: payForm.ref, remarks: payForm.remarks })
    });
    setProcessing(false);
    if (json.success) {
      showModal('Success', `Payment recorded!`, 'success');
      setPayForm({ amount: '', mode: 'cash', ref: '', remarks: '' });
      loadAll();
    } else showModal('Error', json.message, 'danger');
  };

  const toggleTransport = (targetData) => {
    const isUsing = Number(targetData.student.uses_transport) === 1;
    showModal('Toggle Transport', `Turn ${isUsing ? 'OFF' : 'ON'} transport fee calculation for ${targetData.student.name}?`, 'warning', async () => {
      setProcessing(true);
      const fd = new FormData();
      fd.append('action', 'save_students_mapping');
      fd.append('updates', JSON.stringify([{ id: targetData.student.id, is_new_admission: targetData.student.is_new_admission, uses_transport: isUsing ? 0 : 1, fee_waiver_type: targetData.student.fee_waiver_type }]));
      const res = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php`, { method: 'POST', body: fd });
      setProcessing(false);
      if (res.success) loadAll();
    });
  };

  const handleAddExtra = async () => {
    if (!extraForm.fee_head_id || !extraForm.amount) return;
    setProcessing(true);
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_simple_extra_fee', student_id: targetStudentId, fee_head_id: extraForm.fee_head_id, amount: extraForm.amount })
    });
    setProcessing(false);
    if (json.success) { setModals({ ...modals, extra: false }); loadAll(); }
    else showModal('Error', json.message || 'Failed to add extra fee', 'danger');
  };

  const handleAddDiscount = async () => {
    if (!discountForm.amount || !discountForm.reason) return;
    setProcessing(true);
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_simple_discount', student_id: targetStudentId, discount_amount: discountForm.amount, discount_reason: discountForm.reason, current_total_due: aggregated.total_due })
    });
    setProcessing(false);
    if (json.success) { setModals({ ...modals, discount: false }); loadAll(); }
    else showModal('Refused', json.message, 'danger');
  };

  const handleEditTxn = async () => {
    if (Number(editModal.amount) !== Number(editModal.txn.amount_paid) && !editModal.reason) return showModal('Error', 'Reason required for amount change', 'warning');
    setProcessing(true);
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'edit_transaction', txn_id: editModal.txn.id, amount: editModal.amount, remarks: editModal.remarks, reason: editModal.reason })
    });
    setProcessing(false);
    if (json.success) { setEditModal({ show: false, txn: null, amount: '', remarks: '', reason: '' }); loadAll(); }
    else showModal('Error', json.message, 'danger');
  };

  const viewEditHistory = async (txn_id) => {
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=get_transaction_edits&txn_id=${txn_id}`);
    if (json.success) setHistoryModal({ show: true, logs: json.edits });
  };

  const handlePrint = (txn) => { setReceiptData(txn); setTimeout(() => window.print(), 100); };

  if (loading) return <div className="min-h-screen flex justify-center items-center bg-gray-50 dark:bg-[#0a0a0a]"><Loader2 className="animate-spin text-emerald-500 w-10 h-10" /></div>;
  if (!mainData) return null;

  const isDependent = !!mainData.payer_info;
  const isStaff = mainData.student.fee_waiver_type === 'staff';
  const allStudents = isDependent ? [mainData] : [mainData, ...dependentsData];
  const activeBreakdownData = allStudents.find(s => s.student.id === activeBreakdownTab) || allStudents[0];
  const extrasList = mainData.fee_heads.filter(h => Number(h.is_extra) === 1);
  const profilePicUrl = mainData.student.profile_pic && mainData.student.profile_pic !== 'GMPSimages/profile-placeholder.jpg' ? `${imgBaseUrl}${mainData.student.profile_pic}` : null;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { margin: 0; }
          body * { visibility: hidden; }
          #thermal-receipt, #thermal-receipt * { visibility: visible; }
          #thermal-receipt { position: absolute; left: 0; top: 0; width: 80mm; padding: 5mm; font-family: monospace; font-size: 12px; color: #000; margin: 0 auto; }
          .dashed-line { border-top: 1px dashed #000; margin: 8px 0; }
          .no-print { display: none !important; }
        }
      `}} />
      <div id="thermal-receipt" className="hidden print:block bg-white text-black">
        <div className="text-center pb-2">
          <img src="https://govindmadhav.com/GMPSimages/GMPS.header.logo.png" alt="Logo" className="w-48 mx-auto grayscale" />
          <p className="mt-2 text-[10px]">Session: {mainData.session}</p>
        </div>
        <div className="dashed-line"></div>
        <p><strong>Receipt:</strong> {receiptData?.receipt_no}</p>
        <p><strong>Date:</strong> {receiptData?.created_at ? formatDateTime(receiptData.created_at) : ''}</p>
        <div className="dashed-line"></div>
        <p><strong>Student:</strong> {mainData.student.name}</p>
        <p><strong>Class:</strong> {mainData.student.class_name}</p>
        <p><strong>Father:</strong> Mr. {mainData.student.father_name}</p>
        <div className="dashed-line"></div>
        <div className="flex justify-between items-center py-2">
          <span className="font-bold">PAID AMOUNT</span>
          <span className="text-xl font-bold">{fmt(receiptData?.amount_paid)}</span>
        </div>
        <p className="text-[10px]">Mode: {modeLabel(receiptData?.payment_mode)}</p>
        <div className="dashed-line"></div>
        <div className="text-center text-[10px] space-y-0.5 mt-4">
          <p>Thank you for your payment!</p>
          <p>Email us at info@govindmadhav.com</p>
          <p>Visit us at www.govindmadhav.com</p>
        </div>
      </div>

      <div className="min-h-screen pb-28 bg-gray-50 dark:bg-[#0a0a0a] font-sans print:hidden">
        
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-neutral-800 px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" /></button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-black text-gray-900 dark:text-white truncate">Ledger Overview</h1>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{mainData.session} • {isDependent ? 'Linked Account' : (dependentsData.length > 0 ? 'Aggregated Family Account' : 'Individual Account')}</p>
          </div>
        </div>

        <div className="px-4 pt-5 max-w-4xl mx-auto space-y-6">
          
          <div className={`border rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row gap-5 items-start sm:items-center relative overflow-hidden ${isStaff ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800' : 'bg-white border-gray-100 dark:bg-[#151515] dark:border-neutral-800'}`}>
            {isStaff && <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl shadow-sm">Staff Student (100% Waived)</div>}
            <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center flex-shrink-0 overflow-hidden ${isStaff ? 'border-amber-400 bg-amber-100' : 'border-emerald-500 bg-emerald-100 dark:bg-emerald-900/30'}`}>
              {profilePicUrl ? <img src={profilePicUrl} alt={mainData.student.name} className="w-full h-full object-cover" /> : <User className={`w-8 h-8 ${isStaff ? 'text-amber-600' : 'text-emerald-600 dark:text-emerald-400'}`} />}
            </div>
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full mt-2 sm:mt-0">
              <div><p className="text-[10px] text-gray-400 font-bold uppercase">{isDependent ? 'Name' : 'Primary Payer'}</p><p className="font-black text-sm">{mainData.student.name}</p></div>
              <div><p className="text-[10px] text-gray-400 font-bold uppercase">Class</p><p className="font-black text-sm">{mainData.student.class_name}</p></div>
              <div><p className="text-[10px] text-gray-400 font-bold uppercase">Father</p><p className="font-bold text-xs">Mr. {mainData.student.father_name}</p></div>
              <div><p className="text-[10px] text-gray-400 font-bold uppercase">Contact</p><p className="font-mono text-xs">{mainData.student.contact}</p></div>
            </div>
          </div>

          {/* DEPENDENT VIEW */}
          {isDependent && (
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-3xl p-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-blue-700 dark:text-blue-400 flex items-center gap-2 mb-2"><LinkIcon size={16}/> Linked to Primary Payer</p>
                  <p className="text-xs font-bold text-blue-600/80 dark:text-blue-400/80">
                    Fees for {mainData.student.name} are aggregated and managed by:
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <p className="text-lg font-black text-blue-800 dark:text-blue-300">{mainData.payer_info.name}</p>
                    <span className="text-[10px] font-black uppercase bg-blue-200 dark:bg-blue-800/50 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-md">{mainData.payer_info.class_name}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => router.push(`/accountant/ledger/student?id=${mainData.payer_info.id}`)} className="w-full mt-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-md active:scale-95 transition-transform">
                Open Primary Payer Ledger
              </button>
            </div>
          )}

          {/* PRIMARY PAYER VIEW */}
          {!isDependent && (
            <>
              {dependentsData.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-3xl p-5 shadow-sm mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <LinkIcon className="text-blue-500 w-5 h-5 shrink-0" />
                    <p className="text-sm font-black text-blue-700 dark:text-blue-400">Family Account (Primary Payer)</p>
                  </div>
                  <p className="text-xs font-bold text-blue-600/80 dark:text-blue-400/80 mb-3">
                    This account is aggregating and managing the fees for {dependentsData.length} linked sibling(s):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {dependentsData.map(d => (
                      <div key={d.student.id} className="bg-white dark:bg-blue-950 border border-blue-100 dark:border-blue-800 rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm">
                        <User className="text-blue-500 w-4 h-4" />
                        <p className="text-sm font-black text-blue-900 dark:text-blue-100">{d.student.name}</p>
                        <span className="text-[10px] font-black uppercase bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md">{d.student.class_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-100 dark:bg-neutral-900 rounded-3xl p-4 border border-gray-200 dark:border-neutral-800">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Yr Due</p>
                  <p className="text-xl font-black">{fmt(aggregated.total_due)}</p>
                  {dependentsData.length > 0 && <p className="text-[9px] text-gray-400 font-bold mt-1 truncate" title={aggregated.due_string}>{aggregated.due_string}</p>}
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl p-4 border border-emerald-200 dark:border-emerald-800/50">
                  <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-1">Total Paid</p>
                  <p className="text-xl font-black text-emerald-700 dark:text-emerald-400">{fmt(aggregated.total_paid)}</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-3xl p-4 border border-amber-200 dark:border-amber-800/50">
                  <p className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-1">Discounts</p>
                  <p className="text-xl font-black text-amber-700 dark:text-amber-400">{fmt(aggregated.total_discount)}</p>
                </div>
                <div className={`rounded-3xl p-4 border ${aggregated.balance > 0 ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/50' : 'bg-gray-100 border-gray-200 dark:bg-neutral-900 dark:border-neutral-800'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${aggregated.balance > 0 ? 'text-red-600' : 'text-gray-500'}`}>Current Balance</p>
                  <p className={`text-2xl font-black ${aggregated.balance > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{fmt(aggregated.balance)}</p>
                </div>
              </div>

              <div className="flex bg-gray-200 dark:bg-[#1a1a1a] p-1.5 rounded-2xl gap-1">
                <button onClick={() => setActiveTab('collect')} className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'collect' ? 'bg-white dark:bg-[#252525] text-emerald-500 shadow-sm' : 'text-gray-500 hover:bg-gray-300 dark:hover:bg-neutral-800'}`}><Receipt size={16} /> Pay</button>
                <button onClick={() => setActiveTab('history')} className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'history' ? 'bg-white dark:bg-[#252525] text-blue-500 shadow-sm' : 'text-gray-500 hover:bg-gray-300 dark:hover:bg-neutral-800'}`}><History size={16} /> History</button>
                <button onClick={() => setActiveTab('breakdown')} className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'breakdown' ? 'bg-white dark:bg-[#252525] text-amber-500 shadow-sm' : 'text-gray-500 hover:bg-gray-300 dark:hover:bg-neutral-800'}`}><AlertCircle size={16} /> Breakdown</button>
              </div>
            </>
          )}

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              
              {/* --- COLLECT TAB --- */}
              {!isDependent && activeTab === 'collect' && (
                <div className="space-y-4 max-w-2xl mx-auto">
                  {!isStaff ? (
                    <div className="bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-neutral-800 p-5 shadow-sm space-y-4">
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Amount Received (₹)</label>
                        <input type="number" value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} placeholder="0.00" className="w-full text-2xl font-black bg-gray-50 dark:bg-neutral-900 border-2 border-gray-100 dark:border-neutral-800 rounded-2xl px-4 py-3 outline-none focus:border-emerald-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Payment Mode</label>
                          <select value={payForm.mode} onChange={e => setPayForm({...payForm, mode: e.target.value})} className="w-full text-sm font-bold bg-gray-50 dark:bg-neutral-900 border-2 border-gray-100 dark:border-neutral-800 rounded-2xl px-4 py-3 outline-none focus:border-emerald-500">
                            <option value="cash">Cash</option><option value="upi">UPI</option><option value="cheque">Cheque</option><option value="bank_transfer">Bank Transfer</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Reference (Optional)</label>
                          <input type="text" value={payForm.ref} onChange={e => setPayForm({...payForm, ref: e.target.value})} className="w-full text-sm font-bold bg-gray-50 dark:bg-neutral-900 border-2 border-gray-100 dark:border-neutral-800 rounded-2xl px-4 py-3 outline-none focus:border-emerald-500" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Remarks</label>
                        <input type="text" value={payForm.remarks} onChange={e => setPayForm({...payForm, remarks: e.target.value})} placeholder="Optional notes" className="w-full text-sm font-bold bg-gray-50 dark:bg-neutral-900 border-2 border-gray-100 dark:border-neutral-800 rounded-2xl px-4 py-3 outline-none focus:border-emerald-500" />
                      </div>
                      <button onClick={handleCollect} disabled={processing} className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black flex justify-center gap-2 active:scale-95 transition-all shadow-md">
                        {processing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} Credit Account
                      </button>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 dark:bg-amber-900/10 dark:border-amber-800 rounded-3xl p-6 text-center shadow-sm">
                      <ShieldCheck size={40} className="text-amber-500 mx-auto mb-3" />
                      <h3 className="text-lg font-black text-amber-800 dark:text-amber-400">Staff Account (100% Waived)</h3>
                      <p className="text-xs font-bold text-amber-600/80 mt-2">
                        No payments can be collected. Any extra items (Ties, Belts) added below will be automatically discounted and logged into the history.
                      </p>
                    </div>
                  )}

                  <div className={`grid ${isStaff ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                    <button onClick={() => setModals({...modals, extra: true})} className="flex items-center justify-center py-4 rounded-2xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-neutral-800 hover:border-emerald-400 transition-colors gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 flex items-center justify-center"><Plus size={16} /></div>
                      <div className="text-left"><p className="text-xs font-black">Add Extra Item</p><p className="text-[9px] text-gray-400 font-bold uppercase">Tie, Belt, etc.</p></div>
                    </button>
                    {!isStaff && (
                      <button onClick={() => setModals({...modals, discount: true})} className="flex items-center justify-center py-4 rounded-2xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-neutral-800 hover:border-amber-400 transition-colors gap-2">
                        <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center"><Tag size={16} /></div>
                        <div className="text-left"><p className="text-xs font-black">Grant Discount</p><p className="text-[9px] text-gray-400 font-bold uppercase">Max 10% allowed</p></div>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* --- HISTORY TAB --- */}
              {!isDependent && activeTab === 'history' && (
                <div className="max-w-2xl mx-auto space-y-3">
                  {aggregated.transactions.length === 0 ? (
                    <div className="bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-neutral-800 p-8 text-center text-sm font-bold text-gray-500">No actions recorded yet.</div>
                  ) : (
                    aggregated.transactions.map(txn => {
                      const Icon = modeIcon(txn.payment_mode);
                      const isExtra = txn.payment_mode === 'extra_fee';
                      const isDiscount = txn.payment_mode === 'discount';
                      const hasEdits = Number(txn.edit_count) > 0;
                      
                      let colorClasses = "bg-gray-100 dark:bg-neutral-900 text-gray-500";
                      let amtColor = "text-emerald-600 dark:text-emerald-400";
                      let amtPrefix = "";
                      
                      if (isExtra) { colorClasses = "bg-amber-100 dark:bg-amber-900/30 text-amber-600"; amtColor = "text-amber-600 dark:text-amber-400"; amtPrefix = "+ "; } 
                      else if (isDiscount) { colorClasses = "bg-purple-100 dark:bg-purple-900/30 text-purple-600"; amtColor = "text-purple-600 dark:text-purple-400"; amtPrefix = "- "; }

                      return (
                        <div key={txn.id} className="relative bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-neutral-800 p-4 flex items-center gap-4 shadow-sm group">
                          {hasEdits && (
                            <button onClick={() => viewEditHistory(txn.id)} className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white shadow-md hover:scale-110 transition-transform z-10 animate-pulse">
                              {txn.edit_count}
                            </button>
                          )}
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${colorClasses}`}><Icon size={20} /></div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-black ${amtColor}`}>{amtPrefix}{fmt(txn.amount_paid)}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase truncate">{txn.receipt_no} • {modeLabel(txn.payment_mode)}</p>
                            {txn.remarks && <p className="text-[10px] text-gray-600 font-medium italic mt-0.5">Note: {txn.remarks}</p>}
                            <p className="text-[10px] text-gray-400 mt-0.5">{formatDateTime(txn.created_at)}</p>
                          </div>
                          
                          <div className="flex flex-col gap-1 shrink-0">
                            <button onClick={() => setEditModal({ show: true, txn, amount: txn.amount_paid, remarks: txn.remarks, reason: '' })} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-neutral-900 text-gray-400 hover:bg-blue-500 hover:text-white transition-colors">
                              <Edit3 size={14} />
                            </button>
                            {(!isExtra && !isDiscount) && (
                              <button onClick={() => handlePrint(txn)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-neutral-900 text-gray-400 hover:bg-emerald-500 hover:text-white transition-colors">
                                <Printer size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* --- BREAKDOWN TAB (Always visible for Dependents) --- */}
              {(activeTab === 'breakdown' || isDependent) && (
                <div className="space-y-6 max-w-2xl mx-auto">
                  {/* SIBLING SUB-TABS */}
                  {allStudents.length > 1 && (
                    <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
                      {allStudents.map(s => (
                        <button key={s.student.id} onClick={() => setActiveBreakdownTab(s.student.id)} className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-colors border ${activeBreakdownTab === s.student.id ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white dark:bg-[#151515] border-gray-100 dark:border-neutral-800 text-gray-500 hover:border-emerald-400'}`}>
                          {s.student.name.split(' ')[0]} ({s.student.class_name})
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-neutral-800 overflow-hidden shadow-sm">
                    <div className="bg-gray-50 dark:bg-neutral-900/50 p-4 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-black text-gray-900 dark:text-white">{activeBreakdownData.student.name}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">{activeBreakdownData.student.class_name}</p>
                      </div>
                      <button onClick={() => toggleTransport(activeBreakdownData)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black transition-colors ${Number(activeBreakdownData.student.uses_transport) === 1 ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-500 border border-gray-200 dark:bg-neutral-800 dark:border-neutral-700'}`}>
                        <Bus size={12}/> {Number(activeBreakdownData.student.uses_transport) === 1 ? 'Transport ON' : 'Transport OFF'}
                      </button>
                    </div>
                    <div className="p-4 space-y-3">
                      {activeBreakdownData.breakdown.length === 0 && <p className="text-xs font-bold text-gray-400 text-center py-4">No fees mapped.</p>}
                      {activeBreakdownData.breakdown.map((b, idx) => (
                        <div key={idx} className="flex justify-between items-center pb-3 border-b border-gray-50 dark:border-neutral-800/60 last:border-0 last:pb-0">
                          <div>
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                              {b.name} 
                              {b.type === 'extra' && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 rounded-md">Manual Extra</span>}
                            </p>
                            {b.multiplier && <p className="text-[10px] text-gray-400">{fmt(b.applied_amount)} × {b.multiplier}</p>}
                          </div>
                          <p className={`font-black ${b.total < 0 ? 'text-emerald-500' : 'text-gray-900 dark:text-white'}`}>{fmt(b.total)}</p>
                        </div>
                      ))}
                      <div className="pt-2 flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-gray-400">Student Sub-Due</span>
                        <span className="text-sm font-black text-gray-900 dark:text-white">{fmt(activeBreakdownData.total_due - activeBreakdownData.total_discount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {modals.extra && !isDependent && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-sm bg-white dark:bg-[#1a1a1a] p-6 rounded-[2rem] shadow-2xl">
              <h3 className="text-lg font-black mb-1">Add Extra Item</h3>
              <p className="text-[10px] font-bold text-gray-400 mb-4 uppercase">Adds to Total Due</p>
              <div className="space-y-4">
                <select value={targetStudentId} onChange={e => setTargetStudentId(e.target.value)} className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-neutral-900 border-2 outline-none font-bold text-sm">
                  {allStudents.map(s => <option key={s.student.id} value={s.student.id}>{s.student.name} ({s.student.class_name})</option>)}
                </select>
                <select value={extraForm.fee_head_id} onChange={e => {
                  const head = extrasList.find(h => String(h.id) === e.target.value);
                  setExtraForm({ fee_head_id: e.target.value, amount: head?.preset_amount || '' });
                }} className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-neutral-900 border-2 outline-none font-bold text-sm">
                  <option value="">Select Item...</option>
                  {extrasList.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
                <input type="number" placeholder="Amount (₹)" value={extraForm.amount} onChange={e => setExtraForm({...extraForm, amount: e.target.value})} className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-neutral-900 border-2 outline-none font-bold text-sm" />
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setModals({...modals, extra: false})} className="flex-1 py-3 font-bold rounded-xl bg-gray-100 text-gray-500">Cancel</button>
                  <button onClick={handleAddExtra} disabled={processing} className="flex-1 py-3 font-bold rounded-xl bg-emerald-600 text-white">Add to Due</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {modals.discount && !isDependent && !isStaff && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-sm bg-white dark:bg-[#1a1a1a] p-6 rounded-[2rem] shadow-2xl">
              <h3 className="text-lg font-black mb-1">Grant Discount</h3>
              <p className="text-[10px] font-bold text-amber-500 mb-4 uppercase">Max 10% ({fmt(aggregated.total_due * 0.10)})</p>
              <div className="space-y-4">
                <select value={targetStudentId} onChange={e => setTargetStudentId(e.target.value)} className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-neutral-900 border-2 outline-none font-bold text-sm">
                  {allStudents.map(s => <option key={s.student.id} value={s.student.id}>{s.student.name} ({s.student.class_name})</option>)}
                </select>
                <input type="number" placeholder="Discount Amount (₹)" value={discountForm.amount} onChange={e => setDiscountForm({...discountForm, amount: e.target.value})} className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-neutral-900 border-2 outline-none font-bold text-sm" />
                <input type="text" placeholder="Reason (e.g. Sibling Concession)" value={discountForm.reason} onChange={e => setDiscountForm({...discountForm, reason: e.target.value})} className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-neutral-900 border-2 outline-none font-bold text-sm" />
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setModals({...modals, discount: false})} className="flex-1 py-3 font-bold rounded-xl bg-gray-100 text-gray-500">Cancel</button>
                  <button onClick={handleAddDiscount} disabled={processing} className="flex-1 py-3 font-bold rounded-xl bg-amber-500 text-white">Apply</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* EDIT TXN MODAL */}
        {editModal.show && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-sm bg-white dark:bg-[#1a1a1a] p-6 rounded-[2rem] shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black">Edit Record</h3>
                <span className="text-[10px] bg-gray-100 dark:bg-neutral-800 text-gray-500 px-2 py-1 rounded-md">{editModal.txn.receipt_no}</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Amount (₹)</label>
                  <input type="number" value={editModal.amount} onChange={e => setEditModal({...editModal, amount: e.target.value})} className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-neutral-900 border-2 outline-none font-bold text-sm focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Remarks</label>
                  <input type="text" value={editModal.remarks} onChange={e => setEditModal({...editModal, remarks: e.target.value})} className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-neutral-900 border-2 outline-none font-bold text-sm focus:border-blue-500" />
                </div>
                
                {Number(editModal.amount) !== Number(editModal.txn.amount_paid) && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
                    <label className="text-[10px] font-black uppercase text-rose-500 block mb-1">Reason for Amount Change *</label>
                    <input type="text" value={editModal.reason} onChange={e => setEditModal({...editModal, reason: e.target.value})} placeholder="Required for audit log..." className="w-full p-3 rounded-2xl bg-rose-50 dark:bg-rose-900/10 border-2 border-rose-200 dark:border-rose-800/50 outline-none font-bold text-sm focus:border-rose-500" />
                  </motion.div>
                )}

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setEditModal({ show: false, txn: null, amount: '', remarks: '', reason: '' })} className="flex-1 py-3 font-bold rounded-xl bg-gray-100 dark:bg-neutral-800 text-gray-500">Cancel</button>
                  <button onClick={handleEditTxn} disabled={processing} className="flex-1 py-3 font-bold rounded-xl bg-blue-600 text-white shadow-md">Save Changes</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* VIEW EDIT HISTORY MODAL */}
        {historyModal.show && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-sm bg-white dark:bg-[#1a1a1a] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-5 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-black text-rose-500 flex items-center gap-2"><History size={18}/> Edit Audit Log</h3>
                <button onClick={() => setHistoryModal({ show: false, logs: [] })} className="p-2 bg-gray-100 dark:bg-neutral-800 rounded-full text-gray-500"><X size={16}/></button>
              </div>
              <div className="p-5 overflow-y-auto space-y-4">
                {historyModal.logs.map(log => (
                  <div key={log.id} className="bg-gray-50 dark:bg-neutral-900 p-4 rounded-2xl border border-gray-100 dark:border-neutral-800">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] font-bold text-gray-400">{formatDateTime(log.edited_at)}</p>
                      <p className="text-[10px] font-black uppercase bg-gray-200 dark:bg-neutral-800 text-gray-600 px-2 py-0.5 rounded-md">ID: {log.editor_name || log.edited_by}</p>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-black line-through text-gray-400">{fmt(log.old_amount)}</span>
                      <ArrowLeft size={14} className="text-gray-300 rotate-180" />
                      <span className="text-sm font-black text-rose-500">{fmt(log.new_amount)}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 italic">" {log.reason} "</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}