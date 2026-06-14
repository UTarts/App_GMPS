"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { ArrowLeft, BarChart3, Calendar, Loader2, Receipt, TrendingUp } from 'lucide-react';
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

export default function Reports() {
  const { user } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState('daily');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin' || user.level != 3) { router.replace('/'); return; }
    loadReport('daily', date);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadReport = async (type, d) => {
    setLoading(true); setError(''); setData(null);
    const params = type === 'daily' ? `&date=${d}` : '';
    const json = await safeFetchJson(
      `${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=get_reports&type=${type}${params}`
    );
    setLoading(false);
    if (json.success) setData(json);
    else setError(json.message || 'Failed to load report');
  };

  const switchTab = (t) => { setTab(t); loadReport(t, date); };
  const handleDateChange = (d) => { setDate(d); if (tab === 'daily') loadReport('daily', d); };

  const MODE_COLORS = {
    cash: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    upi: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    cheque: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    bank_transfer: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3 shadow-sm">
        <Link href="/accountant" className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 active:scale-95 transition-transform">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <p className="text-base font-semibold text-gray-800 dark:text-gray-100">Reports</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Daily & session summaries</p>
        </div>
        {loading && <Loader2 size={18} className="animate-spin text-emerald-500" />}
      </div>

      <div className="px-4 pt-4 max-w-lg mx-auto space-y-4">
        {/* Tab Toggle */}
        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 flex gap-1">
          {[['daily','Daily Report'],['session','Session Summary']].map(([t, label]) => (
            <button key={t} onClick={() => switchTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${tab === t ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-400 dark:text-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Date Picker (daily only) */}
        {tab === 'daily' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
            <Calendar size={18} className="text-gray-400 shrink-0" />
            <input type="date" value={date} onChange={e => handleDateChange(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-100 outline-none" />
          </div>
        )}

        {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3 text-sm text-red-500">{error}</div>}

        {/* Daily Report */}
        {tab === 'daily' && data && (
          <>
            {/* Total */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white">
              <p className="text-emerald-100 text-xs mb-1">Total Collected — {date}</p>
              <p className="text-2xl font-bold">{fmt(data.total)}</p>
              <p className="text-emerald-200 text-xs mt-1">{(data.transactions || []).length} transactions</p>
            </div>

            {/* Transaction List */}
            {(data.transactions || []).length === 0 ? (
              <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                <Receipt size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No transactions on this date</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                {data.transactions.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 dark:border-gray-800/60 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{t.student_name}</p>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize shrink-0 ${MODE_COLORS[t.payment_mode] || 'bg-gray-100 text-gray-500'}`}>{t.payment_mode?.replace('_',' ')}</span>
                      </div>
                      <p className="text-xs text-gray-400 truncate">{t.class_name} · {t.receipt_no} · by {t.collected_by_name}</p>
                    </div>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0">{fmt(t.amount_paid)}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Session Summary */}
        {tab === 'session' && data && (
          <div className="space-y-3">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">By Payment Mode</p>
              </div>
              {(data.summary || []).map((s, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 dark:border-gray-800/60 last:border-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${MODE_COLORS[s.payment_mode] || 'bg-gray-100 text-gray-500'}`}>
                    {s.payment_mode?.replace('_',' ')}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400">{s.count} transactions</p>
                  </div>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{fmt(s.total)}</p>
                </div>
              ))}
              {(data.summary || []).length === 0 && (
                <div className="py-8 text-center text-gray-400 text-sm">No data yet</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
