'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { Search, Loader2, ArrowLeft, ArrowRight, User, Banknote, CalendarDays, Plus, Tag, ShieldCheck, FileText, Filter, Calendar, X } from 'lucide-react';
import Link from 'next/link';

const safeFetchJson = async (url) => {
  try {
    const token = JSON.parse(localStorage.getItem('gmps_user') || '{}')?.token || '';
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    return JSON.parse(await res.text());
  } catch { return { success: false }; }
};

const modeIcon = (mode) => ({ cash: Banknote, upi: Banknote, cheque: FileText, bank_transfer: ShieldCheck, extra_fee: Plus, discount: Tag }[mode] || Banknote);
const modeLabel = (mode) => ({ cash: 'Cash', upi: 'UPI', cheque: 'Cheque', bank_transfer: 'Bank Transfer', extra_fee: 'Extra Item Added', discount: 'Discount Granted' }[mode] || mode);

export default function LedgerSearchPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Search States
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  // Timeline States
  const [timeline, setTimeline] = useState([]);
  const [loadingTime, setLoadingTime] = useState(true);
  
  // Filter & Infinite Scroll States
  const [filterType, setFilterType] = useState('all'); // 'all', 'credit', 'extra', 'discount'
  const [selectedDate, setSelectedDate] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    if (!user || user.role !== 'admin') { router.replace('/'); return; }
    loadTimeline();
  }, [user, router]);

  const loadTimeline = async () => {
    setLoadingTime(true);
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=get_global_timeline`);
    if (json.success) setTimeline(json.timeline || []);
    setLoadingTime(false);
  };

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (q.length < 2) return setResults([]);
      setSearching(true);
      const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=search_student&q=${encodeURIComponent(q)}`);
      setSearching(false);
      if (json.success) setResults(json.students || []);
    }, 400);
    return () => clearTimeout(delay);
  }, [q]);

  // Derived filtered timeline
  const filteredTimeline = timeline.filter((t) => {
    let passType = true;
    if (filterType === 'credit') passType = !['extra_fee', 'discount'].includes(t.payment_mode);
    if (filterType === 'extra') passType = t.payment_mode === 'extra_fee';
    if (filterType === 'discount') passType = t.payment_mode === 'discount';

    let passDate = true;
    if (selectedDate) passDate = t.created_at.startsWith(selectedDate);

    return passType && passDate;
  });

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(20);
  }, [filterType, selectedDate, q]);

  // Robust Infinite Scroll Observer Setup
  const observer = useRef();
  const lastElementRef = useCallback((node) => {
    if (loadingTime) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      // Threshold 0.1 ensures it triggers early as soon as 10% of the loader is visible
      if (entries[0].isIntersecting && visibleCount < filteredTimeline.length) {
        setVisibleCount(prev => prev + 20);
      }
    }, { threshold: 0.1 });

    if (node) observer.current.observe(node);
  }, [loadingTime, visibleCount, filteredTimeline.length]);

  const visibleTimeline = filteredTimeline.slice(0, visibleCount);

  const groupTimeline = (items) => {
    const groups = {};
    items.forEach(t => {
      const date = new Date(t.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      if (!groups[date]) groups[date] = [];
      groups[date].push(t);
    });
    return groups;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 font-sans">
      
      {/* Unified Sticky Top Header containing Title, Search, and Filters */}
      <div className="sticky top-0 z-40 bg-gray-50/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-gray-200 dark:border-neutral-800 pt-4 pb-4">
        <div className="max-w-2xl mx-auto px-4 space-y-4">
          
          {/* Header Row */}
          <div className="flex items-center gap-3">
            <Link href="/accountant/profile" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </Link>
            <div>
              <h1 className="text-base font-black text-gray-900 dark:text-white">Student Ledgers</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Search & History</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, father's name..." className="w-full pl-12 pr-4 py-3.5 rounded-[2rem] bg-white dark:bg-[#151515] border border-gray-200 dark:border-neutral-800 shadow-sm text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-emerald-500 transition-colors" />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            {searching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500 animate-spin" />}
          </div>

          {/* Filters & Date Jumper (Only visible when not actively searching students) */}
          {q.length < 2 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
              {/* Date Jumper */}
              <div className="relative flex-shrink-0">
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-[140px] pl-9 pr-8 py-2.5 rounded-2xl bg-white dark:bg-[#151515] border border-gray-200 dark:border-neutral-800 shadow-sm text-xs font-black text-gray-900 dark:text-white outline-none focus:border-emerald-500 transition-colors appearance-none"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                {selectedDate && (
                  <button onClick={() => setSelectedDate('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-gray-100 dark:bg-neutral-800 rounded-full text-gray-500 hover:text-red-500 transition-colors">
                    <X size={12} strokeWidth={3} />
                  </button>
                )}
              </div>

              {/* Quick Filters */}
              <div className="flex p-1 bg-gray-200/50 dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'credit', label: 'Credits' },
                  { id: 'extra', label: 'Add-ons' },
                  { id: 'discount', label: 'Discounts' }
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setFilterType(filter.id)}
                    className={`px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl whitespace-nowrap transition-all ${
                      filterType === filter.id 
                        ? 'bg-white dark:bg-[#151515] text-emerald-600 dark:text-emerald-500 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        
        {/* Search Results */}
        {q.length >= 2 && (
          <div className="bg-white dark:bg-[#151515] rounded-[2rem] border border-gray-100 dark:border-neutral-800 overflow-hidden shadow-lg p-2 space-y-1">
            {results.length === 0 && !searching ? (
              <div className="p-6 text-center text-gray-500 text-sm font-bold">No students found.</div>
            ) : (
              results.map(s => (
                <Link key={s.id} href={`/accountant/ledger/student?id=${s.id}`} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600"><User size={18} /></div>
                    <div>
                      <p className="text-sm font-black text-gray-900 dark:text-white">{s.name}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{s.class_name} • S/D/O {s.father_name}</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
                </Link>
              ))
            )}
          </div>
        )}

        {/* Global Timeline Rendering */}
        {q.length < 2 && (
          <div className="w-full space-y-6"> 
            
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <CalendarDays size={14}/> Global Transaction Timeline
            </h2> 
            
            {loadingTime ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              </div>
            ) : filteredTimeline.length === 0 ? (
              <div className="text-center py-10 bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-neutral-800">
                <Filter className="w-8 h-8 mx-auto text-gray-300 dark:text-neutral-700 mb-3" />
                <p className="text-sm font-bold text-gray-500">No transactions match your filters.</p>
                {(filterType !== 'all' || selectedDate) && (
                  <button onClick={() => { setFilterType('all'); setSelectedDate(''); }} className="mt-3 text-xs font-black text-emerald-500 uppercase tracking-widest">
                    Clear Filters
                  </button>
                )}
              </div>
            ) : ( 
              <div className="space-y-8 relative before:absolute before:inset-0 before:left-5 before:-translate-x-1/2 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-neutral-800 before:to-transparent"> 
                {Object.entries(groupTimeline(visibleTimeline)).map(([date, txns]) => ( 
                  <div key={date} className="relative z-10"> 
                    <div className="flex justify-start pl-12 mb-4">
                      <span className="px-3 py-1 bg-gray-100 dark:bg-neutral-900 text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-gray-200 dark:border-neutral-800">
                        {date}
                      </span>
                    </div> 
                    <div className="space-y-3"> 
                      {txns.map(t => { 
                        const Icon = modeIcon(t.payment_mode); 
                        const isExtra = t.payment_mode === 'extra_fee'; 
                        const isDiscount = t.payment_mode === 'discount'; 
                        let amtColor = "text-emerald-600 dark:text-emerald-400"; 
                        let amtPrefix = ""; 
                        if (isExtra) { 
                          amtColor = "text-amber-600 dark:text-amber-400"; 
                          amtPrefix = "+ "; 
                        } else if (isDiscount) { 
                          amtColor = "text-purple-600 dark:text-purple-400"; 
                          amtPrefix = "- "; 
                        } 
                        return ( 
                          <Link key={t.id} href={`/accountant/ledger/student?id=${t.student_id}`} className="block relative pl-12 flex"> 
                            <div className="w-full group"> 
                              <div className="bg-white dark:bg-[#151515] p-4 rounded-3xl border border-gray-100 dark:border-neutral-800 shadow-sm hover:border-emerald-500 transition-colors"> 
                                <div className="flex items-center justify-between mb-1"> 
                                  <p className="text-[10px] text-gray-400 font-bold uppercase">
                                    {new Date(t.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                  </p> 
                                  <p className={`text-sm font-black ${amtColor} flex items-center gap-1`}>
                                    {amtPrefix}₹{t.amount_paid} <Icon size={14}/>
                                  </p> 
                                </div> 
                                <p className="text-sm font-black text-gray-900 dark:text-white truncate">{t.student_name}</p> 
                                <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">
                                  {t.class_name} • {t.remarks || modeLabel(t.payment_mode)}
                                </p> 
                              </div> 
                            </div> 
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center"> 
                              <div className="w-3 h-3 bg-emerald-500 rounded-full border-4 border-gray-50 dark:border-[#0a0a0a] box-content"></div> 
                            </div> 
                          </Link> 
                        ); 
                      })} 
                    </div> 
                  </div> 
                ))} 
                
                {/* Robust Infinite Scroll Sentinel */}
                {visibleCount < filteredTimeline.length && (
                  <div ref={lastElementRef} className="flex justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  </div>
                )}
                
                {/* End of Line Indicator */}
                {visibleCount >= filteredTimeline.length && filteredTimeline.length > 20 && (
                  <div className="text-center py-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">End of timeline</p>
                  </div>
                )}
              </div> 
            )} 
          </div> 
        )}
      </div>
    </div>
  );
}