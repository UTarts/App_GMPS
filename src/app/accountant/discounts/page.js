'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { ArrowLeft, Loader2, Tag, Search, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const getToken = () => { try { return JSON.parse(localStorage.getItem('gmps_user') || '{}')?.token || ''; } catch { return ''; } };
const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const formatDateTime = (dateStr) => new Date(dateStr).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export default function DiscountTracker() {
  const { user } = useAuth();
  const router = useRouter();

  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('student'); // 'student' or 'staff'

  useEffect(() => {
    if (!user || user.role !== 'admin') { router.replace('/'); return; }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=get_discount_tracking`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const json = await res.json();
      if (json.success) setDiscounts(json.discounts);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const filtered = discounts
    .filter(d => activeTab === 'staff' ? d.fee_waiver_type === 'staff' : d.fee_waiver_type !== 'staff')
    .filter(d => d.student_name.toLowerCase().includes(search.toLowerCase()) || d.remarks.toLowerCase().includes(search.toLowerCase()));

  const totalDiscount = filtered.reduce((acc, d) => acc + Number(d.amount_paid), 0);

  if (loading) return <div className="min-h-screen flex justify-center items-center"><Loader2 className="animate-spin text-purple-500 w-10 h-10" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-28">
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-neutral-800 px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-base font-black text-gray-900 dark:text-white">Discount Logs</h1>
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Concessions & Waivers</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-4">
        
        <div className="flex bg-gray-200 dark:bg-[#1a1a1a] p-1.5 rounded-2xl gap-1">
          <button onClick={() => setActiveTab('student')} className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'student' ? 'bg-white dark:bg-[#252525] text-purple-500 shadow-sm' : 'text-gray-500 hover:bg-gray-300 dark:hover:bg-neutral-800'}`}>
            <Tag size={16}/> Student Concessions
          </button>
          <button onClick={() => setActiveTab('staff')} className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'staff' ? 'bg-white dark:bg-[#252525] text-amber-500 shadow-sm' : 'text-gray-500 hover:bg-gray-300 dark:hover:bg-neutral-800'}`}>
            <ShieldCheck size={16}/> Staff Waivers
          </button>
        </div>

        <div className={`border rounded-3xl p-5 shadow-sm flex items-center justify-between ${activeTab === 'staff' ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10' : 'bg-purple-50 border-purple-200 dark:bg-purple-900/10'}`}>
          <div>
            <p className={`text-sm font-black flex items-center gap-2 ${activeTab === 'staff' ? 'text-amber-700 dark:text-amber-400' : 'text-purple-700 dark:text-purple-400'}`}>
               Total Value
            </p>
            <p className={`text-xs font-bold mt-1 ${activeTab === 'staff' ? 'text-amber-600/80' : 'text-purple-600/80'}`}>{filtered.length} Entries Logged</p>
          </div>
          <p className={`text-2xl font-black ${activeTab === 'staff' ? 'text-amber-700 dark:text-amber-500' : 'text-purple-700 dark:text-purple-500'}`}>{fmt(totalDiscount)}</p>
        </div>

        <div className="relative">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or reason..." className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-neutral-800 shadow-sm text-sm font-bold outline-none focus:border-purple-500 transition-colors" />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-10"><p className="text-sm font-bold text-gray-400">No discounts found.</p></div>
          ) : (
            filtered.map(d => (
              <Link href={`/accountant/ledger/student?id=${d.student_id}`} key={d.id} className="bg-white dark:bg-[#151515] border border-gray-100 dark:border-neutral-800 rounded-3xl p-4 shadow-sm flex justify-between gap-4 items-center group hover:border-purple-300 transition-all block">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-900 dark:text-white truncate">{d.student_name}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase">{d.class_name} • {formatDateTime(d.created_at)}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 italic mt-1 bg-gray-50 dark:bg-neutral-900 w-max px-2 py-1 rounded-lg">"{d.remarks}"</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-lg font-black ${activeTab === 'staff' ? 'text-amber-600' : 'text-purple-600'}`}>-{fmt(d.amount_paid)}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}