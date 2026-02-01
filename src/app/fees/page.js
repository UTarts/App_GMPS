"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, CreditCard, History, Download, CheckCircle, 
  AlertCircle, Calendar, FileText, ChevronRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FeesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('pay'); // 'pay' or 'history'

  // --- MOCK DATA (Replace with API later) ---
  const currentDue = {
    amount: 4500,
    dueDate: "10 Feb 2026",
    month: "January - March (Q4)",
    breakdown: [
      { title: "Tuition Fee", amount: 3500 },
      { title: "Transport Fee", amount: 800 },
      { title: "Computer Lab", amount: 200 },
    ]
  };

  const history = [
    { id: "TXN99281", date: "12 Oct 2025", amount: 4500, status: "Success", period: "Oct - Dec (Q3)" },
    { id: "TXN88120", date: "10 Jul 2025", amount: 4500, status: "Success", period: "Jul - Sep (Q2)" },
    { id: "TXN77219", date: "05 Apr 2025", amount: 8200, status: "Success", period: "Apr - Jun (Q1) + Annual" },
  ];

  return (
    <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] text-gray-800 dark:text-gray-100 font-sans flex flex-col">
      
      {/* --- HEADER --- */}
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 p-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-transform">
          <ChevronLeft size={24} className="text-gray-700 dark:text-gray-200" />
        </button>
        <h1 className="text-xl font-bold tracking-tight">Fee Center</h1>
      </div>

      {/* --- TABS --- */}
      <div className="px-4 mt-4">
        <div className="bg-white dark:bg-[#151515] p-1 rounded-2xl flex border border-gray-100 dark:border-gray-800">
          <button 
            onClick={() => setActiveTab('pay')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'pay' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <CreditCard size={16} /> Pay Dues
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'history' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <History size={16} /> History
          </button>
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 p-4 pb-20">
        <AnimatePresence mode='wait'>
          
          {/* TAB 1: PAY FEES */}
          {activeTab === 'pay' ? (
            <motion.div 
              key="pay"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* DUE CARD */}
              <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2rem] p-6 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden">
                 <div className="relative z-10 text-center">
                    <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-1">Total Outstanding</p>
                    <h2 className="text-4xl font-black mb-1">₹{currentDue.amount.toLocaleString()}</h2>
                    <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold mt-2 border border-white/10">
                       <AlertCircle size={12} /> Due by {currentDue.dueDate}
                    </div>
                 </div>
                 {/* Decorative Circles */}
                 <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -ml-10 -mt-10"></div>
                 <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl -mr-10 -mb-10"></div>
              </div>

              {/* DETAILS LIST */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Fee Breakdown</h3>
                <div className="bg-white dark:bg-[#151515] rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                   <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                            <Calendar size={18} />
                         </div>
                         <div>
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">{currentDue.month}</h4>
                            <p className="text-xs text-gray-500">Academic Session 2025-26</p>
                         </div>
                      </div>
                   </div>
                   <div className="p-4 space-y-3">
                      {currentDue.breakdown.map((item, i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                           <span className="text-gray-600 dark:text-gray-400 font-medium">{item.title}</span>
                           <span className="font-bold text-gray-900 dark:text-white">₹{item.amount}</span>
                        </div>
                      ))}
                      <div className="border-t border-dashed border-gray-200 dark:border-gray-700 my-3"></div>
                      <div className="flex justify-between items-center text-base">
                           <span className="font-bold text-gray-800 dark:text-white">Total Payable</span>
                           <span className="font-black text-blue-600">₹{currentDue.amount}</span>
                      </div>
                   </div>
                </div>
              </div>

              {/* PAY BUTTON */}
              <button className="w-full py-4 bg-green-600 hover:bg-green-700 active:scale-95 text-white rounded-2xl font-bold text-lg shadow-lg shadow-green-600/30 transition-all flex items-center justify-center gap-2">
                 Pay Securely <ChevronRight size={20} />
              </button>

            </motion.div>
          ) : (
            
            /* TAB 2: HISTORY */
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {history.map((txn, i) => (
                 <div key={i} className="bg-white dark:bg-[#151515] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 flex items-center justify-center shrink-0">
                       <CheckCircle size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-start">
                          <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">{txn.period}</h4>
                          <span className="font-bold text-gray-900 dark:text-white text-sm">₹{txn.amount}</span>
                       </div>
                       <div className="flex justify-between items-end mt-1">
                          <div>
                             <p className="text-[10px] text-gray-400 font-mono">ID: {txn.id}</p>
                             <p className="text-[10px] text-gray-400">{txn.date}</p>
                          </div>
                          <button className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-transform">
                             <Download size={12} /> Receipt
                          </button>
                       </div>
                    </div>
                 </div>
              ))}
              
              <p className="text-center text-xs text-gray-400 mt-6 pb-4">
                 Showing last 3 transactions. For older records, please contact administration.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}