"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import { useAppModal } from '../../../../context/ModalContext';
import { ArrowLeft, FileText, Play, CheckCircle2, AlertTriangle, Loader2, Info } from 'lucide-react';
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

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function GenerateInvoices() {
  const { user } = useAuth();
  const { showModal } = useAppModal();
  const router = useRouter();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [year, setYear] = useState(now.getFullYear());
  const [session, setSession] = useState('2025-2026');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin' || user.level != 3) { router.replace('/'); return; }
    loadSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadSession = async () => {
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=get_dashboard_stats`);
    if (json.success && json.current_session) setSession(json.current_session);
  };

  const handleGenerate = () => {
    showModal(
      "Generate Invoices",
      `Generate invoices for ${MONTHS[month - 1]} ${year}? This will create invoices for all active students who don't have one for this month yet.`,
      "warning",
      async () => {
        setGenerating(true); setError(''); setResult(null);
        const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=generate_invoices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ month, year, session }),
        });
        setGenerating(false);
        if (json.success) setResult(json);
        else setError(json.message || 'Generation failed.');
      }
    );
  };

  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3 shadow-sm">
        <Link href="/accountant" className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 active:scale-95 transition-transform">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="text-base font-semibold text-gray-800 dark:text-gray-100">Generate Invoices</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Session: {session}</p>
        </div>
      </div>

      <div className="px-4 pt-6 max-w-lg mx-auto space-y-5">
        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex gap-3">
          <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-0.5">How it works</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
              This generates monthly fee invoices for all active students based on their class fee matrix.
              Yearly charges are only added in April. Already-generated invoices are skipped automatically.
            </p>
          </div>
        </div>

        {/* Month + Year Selection */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Select Month & Year</p>
          </div>

          {/* Month Grid */}
          <div className="p-4">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Month</p>
            <div className="grid grid-cols-4 gap-2">
              {MONTHS.map((m, idx) => {
                const mNum = idx + 1;
                return (
                  <button key={mNum} onClick={() => setMonth(mNum)}
                    className={`py-2 rounded-xl text-xs font-semibold transition-colors active:scale-95 ${month === mNum ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                    {m.substring(0, 3)}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 mb-2">Year</p>
            <div className="flex gap-2">
              {yearOptions.map(y => (
                <button key={y} onClick={() => setYear(y)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors active:scale-95 ${year === y ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Summary */}
          <div className="px-4 pb-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  {MONTHS[month - 1]} {year}
                </span>
              </div>
              <span className="text-xs text-emerald-600 dark:text-emerald-400">{month === 4 ? 'Includes yearly fees' : 'Monthly fees only'}</span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3 flex gap-2 items-start">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={20} className="text-emerald-500" />
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">Invoices Generated!</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Created", value: result.created, color: "text-emerald-700 dark:text-emerald-400" },
                { label: "Skipped (already existed)", value: result.skipped, color: "text-gray-500" },
              ].map((s, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 rounded-xl p-3 text-center shadow-sm">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-3 text-center">
              {MONTHS[(result.month || month) - 1]} {result.year || year} · Session {session}
            </p>
          </div>
        )}

        {/* Generate Button */}
        <button onClick={handleGenerate} disabled={generating}
          className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white py-4 rounded-2xl font-semibold text-base shadow-md active:scale-95 transition-transform disabled:opacity-50">
          {generating ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />}
          {generating ? 'Generating...' : `Generate for ${MONTHS[month - 1]} ${year}`}
        </button>
      </div>
    </div>
  );
}
