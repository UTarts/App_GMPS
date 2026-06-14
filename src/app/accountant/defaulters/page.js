"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { ArrowLeft, AlertCircle, Phone, ChevronRight, Loader2 } from 'lucide-react';
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

export default function Defaulters() {
  const { user } = useAuth();
  const router = useRouter();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterClass, setFilterClass] = useState('All');

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin' || user.level != 3) { router.replace('/'); return; }
    loadDefaulters(now.getMonth() + 1, now.getFullYear());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadDefaulters = async (m, y) => {
    setLoading(true); setError('');
    const json = await safeFetchJson(
      `${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=get_defaulters&month=${m}&year=${y}`
    );
    setLoading(false);
    if (json.success) setDefaulters(json.defaulters || []);
    else setError(json.message || 'Failed to load defaulters');
  };

  const handleNav = (m, y) => { setMonth(m); setYear(y); setFilterClass('All'); loadDefaulters(m, y); };
  const prevMonth = () => { const d = new Date(year, month - 2, 1); handleNav(d.getMonth() + 1, d.getFullYear()); };
  const nextMonth = () => { const d = new Date(year, month, 1); handleNav(d.getMonth() + 1, d.getFullYear()); };

  const classes = ['All', ...new Set(defaulters.map(d => d.class_name))];
  const filtered = filterClass === 'All' ? defaulters : defaulters.filter(d => d.class_name === filterClass);
  const totalDue = filtered.reduce((s, d) => s + Number(d.balance || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3 shadow-sm">
        <Link href="/accountant" className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 active:scale-95 transition-transform">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <p className="text-base font-semibold text-gray-800 dark:text-gray-100">Defaulters</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Students with pending dues</p>
        </div>
        {loading && <Loader2 size={18} className="animate-spin text-emerald-500" />}
      </div>

      <div className="px-4 pt-4 max-w-lg mx-auto space-y-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-2 px-4 py-3">
          <button onClick={prevMonth} className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 text-lg font-bold active:scale-95 transition-transform">‹</button>
          <div className="flex-1 text-center">
            <p className="text-base font-semibold text-gray-800 dark:text-gray-100">{MONTHS[month - 1]} {year}</p>
          </div>
          <button onClick={nextMonth} className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 text-lg font-bold active:scale-95 transition-transform">›</button>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3 text-sm text-red-500">{error}</div>}

        {defaulters.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-red-500" />
                <span className="text-sm font-semibold text-red-700 dark:text-red-400">{filtered.length} Defaulters</span>
              </div>
              <span className="text-sm font-bold text-red-600 dark:text-red-400">{fmt(totalDue)} total due</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {classes.map(c => (
                <button key={c} onClick={() => setFilterClass(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${filterClass === c ? 'bg-red-500 text-white' : 'bg-white dark:bg-gray-800 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-800'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>
        ) : filtered.length === 0 && !error ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <AlertCircle size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">{defaulters.length === 0 ? 'No defaulters this month!' : 'No defaulters in this class'}</p>
            {defaulters.length === 0 && <p className="text-xs mt-1 text-emerald-500">All students are up to date</p>}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            {filtered.map((d, i) => (
              <Link key={i} href={`/accountant/ledger/${d.id}`}
                className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 dark:border-gray-800/60 last:border-0 active:bg-gray-50 dark:active:bg-gray-800/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-sm shrink-0">
                  {d.name?.[0] || 'S'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{d.name}</p>
                  <p className="text-xs text-gray-400 truncate">{d.class_name} · {d.login_id}</p>
                  {d.father_name && <p className="text-xs text-gray-400 truncate">F: {d.father_name}</p>}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-sm font-bold text-red-500">{fmt(d.balance)}</span>
                  {d.contact && (
                    <a href={`tel:${d.contact}`} onClick={e => e.stopPropagation()}
                      className="flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                      <Phone size={9} /> {d.contact}
                    </a>
                  )}
                </div>
                <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
