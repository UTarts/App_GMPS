"use client";
import { useState, useEffect, Suspense } from 'react';
import { useAuth } from "../../../context/AuthContext";
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ChevronLeft, IndianRupee, History, AlertCircle, PlusCircle, 
  CheckCircle2, FileText, X, Loader2, Calendar, LayoutDashboard 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function LedgerContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id'); 
  const { user } = useAuth();
  const router = useRouter();
  
  // State Management
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ledger');
  const [currentSession, setCurrentSession] = useState("2026-2027"); // Matches your database

  // Payment Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payRemarks, setPayRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLedger = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // 1. Trigger the Smart Generator first to ensure April-March bills exist
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/fin_generate_invoices.php?student_id=${id}&session=${currentSession}`);
      
      // 2. Fetch the actual ledger data
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/fin_student_ledger.php?student_id=${id}&session=${currentSession}`);
      const json = await res.json();
      
      if (json.status === 'success') {
        // Strict Sort: April (4) thru December, then Jan (1) thru March (3)
        json.invoices.sort((a, b) => {
          const monthOrder = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
          return monthOrder.indexOf(parseInt(a.invoice_month)) - monthOrder.indexOf(parseInt(b.invoice_month));
        });
        setData(json);
      }
    } catch (e) {
      console.error("Finance Sync Error:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user || parseInt(user.level) !== 3) {
      router.push('/');
      return;
    }
    fetchLedger();
  }, [id, user, currentSession]);

  const handleCollectFee = async (e) => {
    e.preventDefault();
    if (!payAmount || payAmount <= 0) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/fin_collect_fee.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: id,
          amount: Number(payAmount),
          collected_by: user.id,
          remarks: payRemarks,
          session: currentSession
        })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setIsModalOpen(false);
        setPayAmount('');
        setPayRemarks('');
        fetchLedger(); // Refresh math immediately
      } else {
        alert(json.message);
      }
    } catch (error) {
      alert("Transaction failed. Check network.");
    }
    setIsSubmitting(false);
  };

  const getMonthName = (m) => {
    const months = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return months[parseInt(m)];
  };

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex justify-center items-center"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>;
  if (!data?.student) return <div className="p-8 text-center text-red-500 font-bold">Student record not found.</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-gray-900 pb-20 relative">
      
      {/* PROFESSIONAL HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={24} /></button>
          <div>
            <h1 className="font-black text-lg tracking-tight">Fee Ledger</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Financial Control</p>
          </div>
        </div>
        
        {/* SESSION SWITCHER */}
        <select 
          value={currentSession} 
          onChange={(e) => setCurrentSession(e.target.value)}
          className="bg-gray-100 border-none rounded-lg px-3 py-1.5 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="2026-2027">Session 2026-27</option>
          <option value="2025-2026">Session 2025-26</option>
        </select>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* STUDENT INFO CARD */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL.replace('/api', '')}/${data.student.profile_pic}`} className="w-24 h-24 rounded-3xl object-cover border-4 border-gray-50 shadow-sm" alt="Student" />
          <div className="text-center sm:text-left flex-1">
            <h2 className="text-2xl font-black text-gray-900 leading-tight">{data.student.name}</h2>
            <p className="text-emerald-600 font-bold uppercase tracking-wider text-[10px] mt-1 mb-3">Class {data.student.class_name} • Roll No: {data.student.roll_no}</p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-3">
              <div className="bg-gray-50 px-3 py-2 rounded-xl border border-gray-100"><p className="text-[9px] text-gray-400 font-bold uppercase">Father's Name</p><p className="text-xs font-bold">{data.student.father_name}</p></div>
              <div className="bg-gray-50 px-3 py-2 rounded-xl border border-gray-100"><p className="text-[9px] text-gray-400 font-bold uppercase">Contact</p><p className="text-xs font-bold">{data.student.contact || 'N/A'}</p></div>
            </div>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto px-8 py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[1.5rem] font-black flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-all active:scale-95">
            <PlusCircle size={20} /> Collect Fee
          </button>
        </div>

        {/* FINANCIAL SUMMARY */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm">
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Total Pending Dues</p>
            <h3 className="text-3xl font-black text-red-500 flex items-center gap-1"><IndianRupee size={24} strokeWidth={3} /> {data.summary.total_due.toLocaleString()}</h3>
          </div>
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm">
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Fees Paid (Session)</p>
            <h3 className="text-3xl font-black text-emerald-500 flex items-center gap-1"><IndianRupee size={24} strokeWidth={3} /> {data.summary.total_paid.toLocaleString()}</h3>
          </div>
        </div>

        {/* DATA TABLE AREA */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-100 bg-gray-50/30 p-2">
            <button onClick={() => setActiveTab('ledger')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest rounded-2xl transition-all ${activeTab === 'ledger' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}>Monthly Ledger</button>
            <button onClick={() => setActiveTab('history')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest rounded-2xl transition-all ${activeTab === 'history' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}>Transaction Logs</button>
          </div>

          <div className="p-4 md:p-6 min-h-[400px]">
            {activeTab === 'ledger' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {data.invoices.map((inv, idx) => (
                  <div key={idx} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${inv.status === 'paid' ? 'bg-emerald-50/30 border-emerald-100 opacity-60' : 'bg-white border-gray-100 hover:border-gray-300'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${inv.status === 'paid' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        <Calendar size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">{getMonthName(inv.invoice_month)} {inv.invoice_year}</h4>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-500'}`}>{inv.status}</span>
                          {inv.invoice_month === 4 && <span className="bg-blue-50 text-blue-600 text-[8px] font-black uppercase px-2 py-0.5 rounded-md">Annual Charges Included</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-900">₹{inv.total_due.toLocaleString()}</p>
                      {inv.total_paid > 0 && <p className="text-[10px] font-bold text-gray-400 italic">Paid: ₹{inv.total_paid.toLocaleString()}</p>}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {data.transactions.length === 0 ? (
                  <div className="py-20 text-center"><History className="mx-auto text-gray-200 mb-2" size={48} /><p className="text-gray-400 font-bold">No payment history found.</p></div>
                ) : (
                  data.transactions.map((txn, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex justify-between items-center group hover:bg-white hover:shadow-md transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-200"><FileText size={18} className="text-gray-400" /></div>
                        <div>
                          <p className="font-bold text-sm text-gray-900">{txn.receipt_no}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{txn.payment_date} • {txn.payment_mode}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <h4 className="font-black text-emerald-600 text-lg">₹{Number(txn.amount_paid).toLocaleString()}</h4>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </div>
        </div>
      </main>

      {/* COLLECT PAYMENT MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 z-50 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="bg-white w-full sm:max-w-md rounded-t-[3rem] sm:rounded-[2.5rem] p-8 shadow-2xl relative">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 bg-gray-100 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
              
              <div className="mb-6">
                <h3 className="text-xl font-black text-gray-900">Process Payment</h3>
                <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg mt-2 uppercase tracking-wider">FIFO Engine: Oldest months will be cleared first</p>
              </div>
              
              <form onSubmit={handleCollectFee} className="space-y-5">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Lump-Sum Amount (₹)</label>
                  <div className="relative mt-1">
                    <IndianRupee className="absolute left-4 top-4 text-gray-300" size={20} />
                    <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" required />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button type="button" className="py-3 text-xs font-bold border-2 border-emerald-500 bg-emerald-50 text-emerald-700 rounded-xl">CASH</button>
                    <button type="button" disabled className="py-3 text-xs font-bold border-2 border-gray-100 bg-gray-50 text-gray-300 rounded-xl cursor-not-allowed">DIGITAL</button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Accountant Notes</label>
                  <input type="text" value={payRemarks} onChange={(e) => setPayRemarks(e.target.value)} placeholder="e.g. Received by Parent" className="w-full mt-1 p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500" />
                </div>

                <button type="submit" disabled={isSubmitting || !payAmount} className="w-full mt-2 py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-sm flex justify-center items-center gap-2 shadow-xl shadow-emerald-500/30 transition-all disabled:opacity-50 active:scale-95">
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : `Confirm & Allocate ₹${Number(payAmount).toLocaleString()}`}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// WRAP IN SUSPENSE FOR STATIC EXPORT COMPATIBILITY
export default function StudentLedgerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC] flex justify-center items-center"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>}>
      <LedgerContent />
    </Suspense>
  );
}