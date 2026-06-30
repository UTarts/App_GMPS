'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { ArrowLeft, Loader2, ShieldAlert, Phone, Search, Link as LinkIcon, Users } from 'lucide-react';
import Link from 'next/link';

const getToken = () => { try { return JSON.parse(localStorage.getItem('gmps_user') || '{}')?.token || ''; } catch { return ''; } };
const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function DefaultersPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [targetPct, setTargetPct] = useState(25); // 25%, 50%, 75%, 100%

  useEffect(() => {
    if (!user || user.role !== 'admin') { router.replace('/'); return; }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=get_recovery_data`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const json = await res.json();
      if (json.success) setStudents(json.students);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // The Magic Defaulter Logic (Family-Aware)
  const defaulters = students.map(s => {
    const due = Number(s.family_due);
    const paid = Number(s.family_paid) + Number(s.family_discount); // Discounts count as paid for recovery math
    const targetAmount = due * (targetPct / 100);
    const shortfall = targetAmount - paid;
    return { ...s, targetAmount, paid, shortfall, due };
  }).filter(s => s.shortfall > 0 && s.due > 0 && !s.is_staff) // Exclude staff & zeros
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.class_name.toLowerCase().includes(search.toLowerCase()));

  const totalShortfall = defaulters.reduce((acc, s) => acc + s.shortfall, 0);

  if (loading) return <div className="min-h-screen flex justify-center items-center"><Loader2 className="animate-spin text-rose-500 w-10 h-10" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-28">
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-100 dark:border-neutral-800 px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-base font-black text-gray-900 dark:text-white">Recovery Target</h1>
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Quarterly Defaulters List</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-4">
        <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-rose-700 dark:text-rose-400 flex items-center gap-2"><ShieldAlert size={16}/> Target Shortfall</p>
            <p className="text-xs font-bold text-rose-600/80 mt-1">{defaulters.length} Accounts below {targetPct}%</p>
          </div>
          <p className="text-2xl font-black text-rose-700 dark:text-rose-500">{fmt(totalShortfall)}</p>
        </div>

        {/* QUARTER TABS */}
        <div className="flex bg-white dark:bg-[#151515] p-1.5 rounded-2xl border border-gray-100 dark:border-neutral-800 shadow-sm gap-1 overflow-x-auto">
          {[25, 50, 75, 100].map(pct => (
            <button key={pct} onClick={() => setTargetPct(pct)} className={`flex-1 min-w-[80px] py-2.5 rounded-xl text-xs font-black transition-all ${targetPct === pct ? 'bg-rose-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-900'}`}>
              Q{pct/25} ({pct}%)
            </button>
          ))}
        </div>

        <div className="relative">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or class..." className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-neutral-800 shadow-sm text-sm font-bold outline-none focus:border-rose-500 transition-colors" />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>

        <div className="space-y-3">
          {defaulters.length === 0 ? (
            <div className="text-center py-10"><p className="text-sm font-bold text-gray-400">All targets met for Q{targetPct/25}!</p></div>
          ) : (
            defaulters.map(s => (
              <div key={s.id} className="bg-white dark:bg-[#151515] border border-gray-100 dark:border-neutral-800 rounded-3xl p-4 shadow-sm flex flex-col sm:flex-row justify-between gap-4 group hover:border-rose-300 transition-all">
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-gray-900 dark:text-white">{s.name}</p>
                        {s.dependents.length > 0 && <span className="flex items-center gap-1 text-[9px] font-black uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md"><Users size={10}/> +{s.dependents.length} Family</span>}
                      </div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">{s.class_name} • S/D/O {s.father_name}</p>
                    </div>
                    <Link href={`/accountant/ledger/student?id=${s.id}`} className="w-8 h-8 rounded-full bg-gray-50 dark:bg-neutral-900 flex items-center justify-center text-gray-400 hover:bg-blue-500 hover:text-white transition-colors shrink-0"><LinkIcon size={14}/></Link>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between text-xs bg-gray-50 dark:bg-neutral-900/50 p-3 rounded-2xl">
                    <div>
                      <p className="text-[10px] text-gray-400 font-black uppercase">Target ({targetPct}%)</p>
                      <p className="font-bold">{fmt(s.targetAmount)}</p>
                    </div>
                    <div className="h-6 border-r border-gray-200 dark:border-neutral-700"></div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-black uppercase">Paid</p>
                      <p className="font-bold text-emerald-600">{fmt(s.paid)}</p>
                    </div>
                    <div className="h-6 border-r border-gray-200 dark:border-neutral-700"></div>
                    <div className="text-right">
                      <p className="text-[10px] text-rose-500 font-black uppercase">To Collect</p>
                      <p className="font-black text-rose-600">{fmt(s.shortfall)}</p>
                    </div>
                  </div>
                </div>
                
                <a href={`tel:${s.contact}`} className="sm:w-12 h-12 flex items-center justify-center rounded-2xl bg-green-50 text-green-600 hover:bg-green-500 hover:text-white transition-colors shrink-0">
                  <Phone size={18} />
                </a>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}