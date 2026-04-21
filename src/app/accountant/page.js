"use client";
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useAppModal } from "../../context/ModalContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, Search, CheckCircle2, XCircle, Users, IndianRupee,
  AlertCircle, Clock, Loader2, RefreshCw, Receipt, Settings2,
  BadgeCheck, Ban, ChevronDown, CalendarDays, User, FileText,
  TrendingUp, Banknote, CreditCard, Smartphone, Building2, BookOpen, X
} from 'lucide-react';
import { feeApi } from '../../lib/finApi';

const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_S = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmt(n) { return '₹' + Number(n||0).toLocaleString('en-IN', {maximumFractionDigits:0}); }
function fmtDate(d) { if(!d) return ''; return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); }

function StatusPill({ status }) {
  const s = {
    paid:     'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    partial:  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    unpaid:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    pending:  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    verified: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    completed:'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${s[status]||'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

function Spinner({ size=16 }) { return <Loader2 size={size} className="animate-spin" />; }

function Kpi({ label, value, sub, icon, gradient }) {
  return (
    <div className={`rounded-2xl p-4 ${gradient}`}>
      <div className="flex items-center gap-2 mb-2 opacity-80">{icon}<span className="text-xs font-medium text-white">{label}</span></div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-white/70 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── TAB 1: DASHBOARD ──────────────────────────────────────────────────────
function DashboardTab({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    feeApi.getDashboardStats(token).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28}/></div>;
  if (!data) return null;
  const { stats: s, chart=[], class_data=[] } = data;
  const maxChart = Math.max(...chart.map(c=>c.amount), 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Kpi label="Total Collected" value={fmt(s.total_collected)} gradient="bg-gradient-to-br from-green-500 to-emerald-600" icon={<IndianRupee size={14} className="text-white"/>} />
        <Kpi label="Outstanding" value={fmt(s.total_outstanding)} gradient="bg-gradient-to-br from-red-500 to-rose-600" icon={<AlertCircle size={14} className="text-white"/>} />
        <Kpi label="Pending Verifications" value={s.pending_submissions} sub="tap Verify tab" gradient="bg-gradient-to-br from-blue-500 to-indigo-600" icon={<Clock size={14} className="text-white"/>} />
        <Kpi label="Today's Collection" value={fmt(s.today_collection)} sub={`${s.today_transactions||0} transactions`} gradient="bg-gradient-to-br from-orange-500 to-amber-500" icon={<TrendingUp size={14} className="text-white"/>} />
      </div>

      {/* Bar chart */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
        <p className="text-sm font-bold text-gray-800 dark:text-white mb-4">Monthly Collection</p>
        <div className="flex items-end gap-1 h-28">
          {chart.map((c,i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative cursor-default">
              <div
                className="w-full bg-gradient-to-t from-orange-500 to-red-400 rounded-t transition-all group-hover:from-orange-600 group-hover:to-red-500"
                style={{ height: `${Math.max(4, (c.amount/maxChart)*96)}px` }}
              />
              <span className="text-[9px] text-gray-400 rotate-45 origin-left whitespace-nowrap hidden md:block">{c.label}</span>
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 shadow-lg">
                {c.label}: {fmt(c.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Class table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <p className="text-sm font-bold text-gray-800 dark:text-white">Class-wise Collection</p>
        </div>
        {class_data.map((c,i) => {
          const pct = c.total_due > 0 ? Math.min(100, Math.round((c.total_paid/c.total_due)*100)) : 0;
          return (
            <div key={i} className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-semibold text-gray-800 dark:text-white">{c.class_name}</p>
                <div className="text-right">
                  <span className="text-xs text-green-600 dark:text-green-400 font-bold">{fmt(c.total_paid)}</span>
                  <span className="text-xs text-gray-400"> / {fmt(c.total_due)}</span>
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-400 to-green-400 rounded-full transition-all" style={{width:`${pct}%`}}/>
              </div>
              <p className="text-xs text-gray-400 mt-1">{c.student_count} students · {pct}% collected</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── TAB 2: COLLECT FEE ────────────────────────────────────────────────────
function CollectTab({ token, showModal }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [student, setStudent] = useState(null);
  const [dues, setDues]       = useState(null);
  const [loadingDues, setLoadingDues] = useState(false);
  const [selInvs, setSelInvs] = useState([]);
  const [form, setForm]       = useState({ payment_mode:'cash', reference_no:'', payment_date: new Date().toISOString().slice(0,10), remarks:'' });
  const [saving, setSaving]   = useState(false);
  const timer = useRef(null);

  async function search(q) {
    if (q.length < 2) return setResults([]);
    setSearching(true);
    try { const r = await feeApi.searchStudent(token, q); setResults(r.students||[]); }
    catch(e) { console.error(e); }
    finally { setSearching(false); }
  }

  function handleQ(e) { const q=e.target.value; setQuery(q); clearTimeout(timer.current); timer.current=setTimeout(()=>search(q),400); }

  async function pick(st) {
    setStudent(st); setResults([]); setQuery(''); setSelInvs([]);
    setLoadingDues(true);
    try { const r = await feeApi.getStudentDues(token, st.id); setDues(r); }
    catch(e) { showModal("Error", e.message, "danger"); }
    finally { setLoadingDues(false); }
  }

  function toggleInv(inv) {
    if (inv.status==='paid') return;
    setSelInvs(p => p.find(i=>i.id===inv.id) ? p.filter(i=>i.id!==inv.id) : [...p,inv]);
  }

  const total = selInvs.reduce((s,i) => s+(parseFloat(i.total_due)-parseFloat(i.total_paid)), 0);

  async function collect(e) {
    e.preventDefault();
    if (!selInvs.length) return showModal("Select Invoice","Please select at least one invoice.","danger");
    setSaving(true);
    try {
      const r = await feeApi.collectCash(token, {
        student_id: student.id, invoice_ids: selInvs.map(i=>i.id), amount_paid: total, ...form
      });
      showModal("Receipt Generated ✅", `Receipt No: ${r.receipt_no}`, "success");
      setSelInvs([]);
      const updated = await feeApi.getStudentDues(token, student.id);
      setDues(updated);
    } catch(e) { showModal("Error", e.message, "danger"); }
    finally { setSaving(false); }
  }

  const modeIcon = { cash:<Banknote size={14}/>, upi:<Smartphone size={14}/>, cheque:<BookOpen size={14}/>, bank_transfer:<Building2 size={14}/> };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
          <Search size={16} className="text-gray-400 flex-shrink-0"/>
          <input type="text" value={query} onChange={handleQ}
            placeholder="Search by name, ID, or father's name…"
            className="flex-1 bg-transparent text-sm text-gray-800 dark:text-white outline-none placeholder:text-gray-400"
          />
          {searching && <Spinner />}
        </div>
        {results.length > 0 && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden">
            {results.map(st => (
              <button key={st.id} onClick={() => pick(st)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-0 transition-colors text-left">
                <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">{st.name[0]}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">{st.name}</p>
                  <p className="text-xs text-gray-400">{st.class_name} · {st.login_id} · {st.father_name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected student */}
      {student && (
        <div className="flex items-center gap-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl px-4 py-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold">{student.name[0]}</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-orange-800 dark:text-orange-300">{student.name}</p>
            <p className="text-xs text-orange-500">{student.class_name} · {student.father_name}</p>
          </div>
          <button onClick={()=>{setStudent(null);setDues(null);setSelInvs([]);}} className="text-orange-400 hover:text-orange-600 text-xs">Change</button>
        </div>
      )}

      {loadingDues && <div className="flex justify-center py-10"><Spinner size={24}/></div>}

      {dues && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { l:'Total Due', v: dues.summary?.total_due, c:'text-gray-700 dark:text-gray-200', bg:'bg-gray-100 dark:bg-gray-800' },
              { l:'Paid', v: dues.summary?.total_paid, c:'text-green-700 dark:text-green-400', bg:'bg-green-50 dark:bg-green-900/30' },
              { l:'Balance', v: dues.summary?.balance, c:'text-red-600 dark:text-red-400', bg:'bg-red-50 dark:bg-red-900/30' },
            ].map(k=>(
              <div key={k.l} className={`${k.bg} rounded-2xl p-3 text-center`}>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">{k.l}</p>
                <p className={`text-sm font-bold ${k.c}`}>{fmt(k.v)}</p>
              </div>
            ))}
          </div>

          {/* Invoices */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tap to select for payment</p>
            {(dues.invoices||[]).map(inv => {
              const bal = parseFloat(inv.total_due)-parseFloat(inv.total_paid);
              const isSel = !!selInvs.find(i=>i.id===inv.id);
              return (
                <div key={inv.id} onClick={()=>toggleInv(inv)}
                  className={`rounded-2xl p-4 border-2 transition-all cursor-pointer select-none
                    ${inv.status==='paid' ? 'opacity-50 cursor-default border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900'
                      : isSel ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 shadow-md'
                      : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-200'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {inv.status!=='paid' && (
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSel ? 'bg-orange-500 border-orange-500' : 'border-gray-300 dark:border-gray-600'}`}>
                          {isSel && <CheckCircle2 size={12} className="text-white"/>}
                        </div>
                      )}
                      {inv.status==='paid' && <CheckCircle2 size={18} className="text-green-500"/>}
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{MONTHS_S[inv.invoice_month]} {inv.invoice_year}</p>
                        <p className="text-xs text-gray-400">{inv.fee_heads||'Monthly Fee'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <StatusPill status={inv.status}/>
                      {bal > 0 && <p className="text-sm font-bold text-red-500 mt-1">{fmt(bal)} due</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Collection form */}
          {selInvs.length > 0 && (
            <form onSubmit={collect} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-bold text-gray-900 dark:text-white">Record Payment</p>
                <p className="text-xl font-bold text-orange-600">{fmt(total)}</p>
              </div>

              {/* Mode buttons */}
              <div className="grid grid-cols-2 gap-2">
                {Object.entries({cash:'Cash',upi:'UPI',cheque:'Cheque',bank_transfer:'Bank Transfer'}).map(([k,v])=>(
                  <button key={k} type="button"
                    onClick={()=>setForm(f=>({...f,payment_mode:k}))}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all
                      ${form.payment_mode===k ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}
                  >
                    {modeIcon[k]}{v}
                  </button>
                ))}
              </div>

              {form.payment_mode !== 'cash' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Reference / UTR / Cheque No.</label>
                  <input type="text" value={form.reference_no}
                    onChange={e=>setForm(f=>({...f,reference_no:e.target.value}))}
                    placeholder="e.g. 427689341234"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Payment Date</label>
                <input type="date" value={form.payment_date}
                  max={new Date().toISOString().slice(0,10)}
                  onChange={e=>setForm(f=>({...f,payment_date:e.target.value}))}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Remarks (optional)</label>
                <input type="text" value={form.remarks}
                  onChange={e=>setForm(f=>({...f,remarks:e.target.value}))}
                  placeholder="Notes…"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 outline-none"
                />
              </div>

              <button type="submit" disabled={saving}
                className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                {saving ? <Spinner/> : <BadgeCheck size={18}/>}
                {saving ? 'Generating Receipt…' : `Generate Receipt — ${fmt(total)}`}
              </button>
            </form>
          )}

          {/* Recent transactions */}
          {(dues.transactions||[]).length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <p className="px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800">Recent Transactions</p>
              {dues.transactions.slice(0,5).map(t=>(
                <div key={t.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div>
                    <p className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300">{t.receipt_no}</p>
                    <p className="text-xs text-gray-400">{fmtDate(t.payment_date)} · {t.collected_by_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600 dark:text-green-400">{fmt(t.amount_paid)}</p>
                    <p className="text-xs text-gray-400 capitalize">{(t.payment_mode||'').replace('_',' ')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── TAB 3: VERIFY ─────────────────────────────────────────────────────────
function VerifyTab({ token, showModal }) {
  const [subs, setSubs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('pending');
  const [acting, setActing]   = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [reason, setReason]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await feeApi.getAllSubmissions(token, filter); setSubs(r.submissions||[]); }
    catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [token, filter]);

  useEffect(() => { load(); }, [load]);

  async function verify(id) {
    setActing(id);
    try {
      const r = await feeApi.verifySubmission(token, { submission_id: id });
      showModal("Verified ✅", `Receipt generated: ${r.receipt_no}`, "success");
      load();
    } catch(e) { showModal("Error", e.message, "danger"); }
    finally { setActing(null); }
  }

  async function reject(id) {
    if (!reason.trim()) return;
    setActing(id);
    try {
      await feeApi.rejectSubmission(token, { submission_id: id, reason });
      showModal("Rejected", "Submission rejected and parent notified.", "neutral");
      setRejectId(null); setReason(''); load();
    } catch(e) { showModal("Error", e.message, "danger"); }
    finally { setActing(null); }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['pending','verified','rejected','all'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${filter===f ? 'bg-orange-500 text-white shadow' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
          >{f}</button>
        ))}
        <button onClick={load} className="ml-auto text-orange-500 hover:text-orange-600"><RefreshCw size={16}/></button>
      </div>

      {loading && <div className="flex justify-center py-16"><Spinner size={28}/></div>}

      {!loading && subs.length === 0 && (
        <div className="text-center py-20">
          <CheckCircle2 size={40} className="text-green-400 mx-auto mb-3"/>
          <p className="font-semibold text-gray-700 dark:text-gray-300">No {filter} submissions</p>
        </div>
      )}

      {!loading && subs.map((sub, idx) => (
        <motion.div key={sub.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:idx*0.05}}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
        >
          <div className="flex items-start justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">{sub.student_name?.[0]}</span>
              </div>
              <div>
                <p className="font-bold text-gray-800 dark:text-white text-sm">{sub.student_name}</p>
                <p className="text-xs text-gray-400">{sub.class_name} · {sub.login_id}</p>
              </div>
            </div>
            <StatusPill status={sub.status}/>
          </div>

          <div className="px-4 py-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Amount</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{fmt(sub.amount_submitted)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Mode</p>
              <p className="font-semibold text-gray-700 dark:text-gray-300 capitalize">{(sub.payment_mode||'').replace('_',' ')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Transaction Ref</p>
              <p className="font-mono text-gray-800 dark:text-gray-200 text-sm">{sub.transaction_ref}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Payment Date</p>
              <p className="text-gray-700 dark:text-gray-300">{fmtDate(sub.payment_date)}</p>
            </div>
            {sub.remarks && <div className="col-span-2"><p className="text-xs text-gray-400 mb-0.5">Remarks</p><p className="text-gray-600 dark:text-gray-300">{sub.remarks}</p></div>}
            {sub.rejection_reason && <div className="col-span-2"><p className="text-xs text-red-400 mb-0.5">Rejection Reason</p><p className="text-red-500">{sub.rejection_reason}</p></div>}
            <div className="col-span-2"><p className="text-xs text-gray-400">{fmtDate(sub.created_at)}</p></div>
          </div>

          {sub.status === 'pending' && (
            <div className="px-4 pb-4">
              {rejectId === sub.id ? (
                <div className="space-y-2">
                  <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={2}
                    placeholder="Reason for rejection (shown to parent)…"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2 text-sm resize-none outline-none text-gray-800 dark:text-white"
                  />
                  <div className="flex gap-2">
                    <button onClick={()=>reject(sub.id)} disabled={acting===sub.id || !reason.trim()}
                      className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                      {acting===sub.id ? <Spinner/> : <Ban size={14}/>} Confirm Reject
                    </button>
                    <button onClick={()=>{setRejectId(null);setReason('');}} className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-600 dark:text-gray-400">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={()=>verify(sub.id)} disabled={acting===sub.id}
                    className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-all">
                    {acting===sub.id ? <Spinner/> : <BadgeCheck size={16}/>} Verify & Generate Receipt
                  </button>
                  <button onClick={()=>setRejectId(sub.id)} className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-2xl text-sm font-medium">Reject</button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ─── TAB 4: DEFAULTERS ─────────────────────────────────────────────────────
function DefaultersTab({ token }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth()+1);
  const [year, setYear]   = useState(now.getFullYear());
  const [list, setList]   = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    feeApi.getDefaulters(token, month, year).then(r=>setList(r.defaulters||[])).catch(console.error).finally(()=>setLoading(false));
  }, [token, month, year]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <select value={month} onChange={e=>setMonth(Number(e.target.value))}
          className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-white outline-none">
          {MONTHS.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select value={year} onChange={e=>setYear(Number(e.target.value))}
          className="w-28 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-white outline-none">
          {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading && <div className="flex justify-center py-16"><Spinner size={28}/></div>}

      {!loading && list.length === 0 && (
        <div className="text-center py-20">
          <CheckCircle2 size={40} className="text-green-400 mx-auto mb-3"/>
          <p className="font-semibold text-gray-700 dark:text-gray-300">No defaulters for {MONTHS[month]} {year} 🎉</p>
        </div>
      )}

      {!loading && list.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 rounded-full">
              <p className="text-xs font-bold text-red-600 dark:text-red-400">{list.length} Defaulters</p>
            </div>
            <p className="text-xs text-gray-400">Total Outstanding: <strong className="text-red-500">{fmt(list.reduce((s,d)=>s+parseFloat(d.balance||0),0))}</strong></p>
          </div>
          {list.map((d, idx) => (
            <motion.div key={d.id} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:idx*0.04}}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-start gap-3"
            >
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-red-600 dark:text-red-400 font-bold text-sm">{d.name?.[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-gray-800 dark:text-white text-sm">{d.name}</p>
                    <p className="text-xs text-gray-400">{d.class_name} · {d.father_name}</p>
                    {d.contact && <p className="text-xs text-gray-400 mt-0.5">{d.contact}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-red-500 text-sm">{fmt(d.balance)}</p>
                    <p className="text-xs text-gray-400">of {fmt(d.total_due)}</p>
                    <StatusPill status={d.status}/>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── TAB 5: REPORTS ────────────────────────────────────────────────────────
function ReportsTab({ token }) {
  const [date, setDate]     = useState(new Date().toISOString().slice(0,10));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    feeApi.getReports(token, 'daily', date).then(setReport).catch(console.error).finally(()=>setLoading(false));
  }, [token, date]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Select Date</label>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} max={new Date().toISOString().slice(0,10)}
          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-orange-400 outline-none"
        />
      </div>
      {loading && <div className="flex justify-center py-16"><Spinner size={28}/></div>}
      {!loading && report && (
        <>
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-5 text-white">
            <p className="text-sm opacity-80 mb-1">Total collected on {fmtDate(date)}</p>
            <p className="text-4xl font-bold">{fmt(report.total)}</p>
            <p className="text-sm opacity-70 mt-1">{(report.transactions||[]).length} transactions</p>
          </div>
          {(report.transactions||[]).length === 0 ? (
            <p className="text-center text-gray-400 py-10">No transactions on this date</p>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              {report.transactions.map(t=>(
                <div key={t.id} className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <BadgeCheck size={14} className="text-green-600 dark:text-green-400"/>
                    </div>
                    <div>
                      <p className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300">{t.receipt_no}</p>
                      <p className="text-xs text-gray-400">{t.student_name} · {t.class_name}</p>
                      <p className="text-xs text-gray-400">{t.collected_by_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800 dark:text-white">{fmt(t.amount_paid)}</p>
                    <p className="text-xs text-gray-400 capitalize">{(t.payment_mode||'').replace('_',' ')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── TAB 6: FEE SETUP ──────────────────────────────────────────────────────
function FeeSetupTab({ token, showModal }) {
  const [matrix, setMatrix]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(null);
  const [genForm, setGenForm] = useState({ month: new Date().getMonth()+1, year: new Date().getFullYear() });
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    feeApi.getClassFeeMatrix(token).then(setMatrix).catch(e=>showModal("Error", e.message, "danger")).finally(()=>setLoading(false));
  }, [token]);

  async function saveCell(classId, headId, amount) {
    const key = `${classId}_${headId}`;
    setSaving(key);
    try {
      await feeApi.saveClassFee(token, { class_id: classId, fee_head_id: headId, session: matrix.session, amount });
    } catch(e) { showModal("Error", e.message, "danger"); }
    finally { setSaving(null); }
  }

  async function generate(e) {
    e.preventDefault();
    setGenerating(true);
    try {
      const r = await feeApi.generateInvoices(token, genForm);
      showModal("Done ✅", `Created ${r.created} invoices. ${r.skipped} already existed.`, "success");
    } catch(e) { showModal("Error", e.message, "danger"); }
    finally { setGenerating(false); }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28}/></div>;
  const { fee_heads=[], classes=[], fee_map={}, session } = matrix||{};

  return (
    <div className="space-y-5">
      {/* Matrix */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <p className="text-sm font-bold text-gray-800 dark:text-white">Fee Structure · {session}</p>
          <p className="text-xs text-gray-400">Blur cell to save</p>
        </div>
        <div className="overflow-x-auto">
          <table className="text-sm min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap sticky left-0 bg-gray-50 dark:bg-gray-800">Class</th>
                {fee_heads.map(h=>(
                  <th key={h.id} className="text-center px-3 py-2.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap min-w-[100px]">
                    {h.name}<span className="block text-gray-400 font-normal normal-case capitalize text-[10px]">{(h.type||'').replace('_',' ')}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {classes.map(cls=>(
                <tr key={cls.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-3 font-bold text-gray-800 dark:text-white sticky left-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 whitespace-nowrap">{cls.name}</td>
                  {fee_heads.map(h=>{
                    const val = fee_map[cls.id]?.[h.id] ?? 0;
                    const key = `${cls.id}_${h.id}`;
                    return (
                      <td key={h.id} className="px-2 py-2 text-center">
                        <input type="number" defaultValue={val}
                          onBlur={e=>{ const v=parseFloat(e.target.value); if(v!==val) saveCell(cls.id, h.id, v); }}
                          className="w-24 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-2 text-center text-sm focus:ring-2 focus:ring-orange-400 outline-none"
                          disabled={saving===key}
                        />
                        {saving===key && <p className="text-[10px] text-orange-500 mt-0.5">Saving…</p>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate invoices */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
        <p className="text-sm font-bold text-gray-800 dark:text-white mb-1">Generate Monthly Invoices</p>
        <p className="text-xs text-gray-400 mb-4">Creates invoices for all active students. Already-existing invoices are skipped.</p>
        <form onSubmit={generate} className="flex gap-2 flex-wrap items-end">
          <select value={genForm.month} onChange={e=>setGenForm(f=>({...f,month:Number(e.target.value)}))}
            className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-white outline-none">
            {MONTHS.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={genForm.year} onChange={e=>setGenForm(f=>({...f,year:Number(e.target.value)}))}
            className="w-24 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-white outline-none">
            {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
          <button type="submit" disabled={generating}
            className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center gap-2 active:scale-95 transition-all">
            {generating ? <Spinner/> : <CalendarDays size={14}/>}
            {generating ? 'Generating…' : 'Generate'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
const TABS = [
  { id:'dashboard', label:'Dashboard', icon:<BarChart3 size={16}/> },
  { id:'collect',   label:'Collect',   icon:<Banknote size={16}/> },
  { id:'verify',    label:'Verify',    icon:<BadgeCheck size={16}/> },
  { id:'defaulters',label:'Defaulters',icon:<AlertCircle size={16}/> },
  { id:'reports',   label:'Reports',   icon:<FileText size={16}/> },
  { id:'setup',     label:'Setup',     icon:<Settings2 size={16}/> },
];

export default function AccountantPage() {
  const { user } = useAuth();
  const token = user?.token;
  const { theme } = useTheme();
  const { showModal } = useAppModal();
  const [tab, setTab] = useState('dashboard');

  return (
    <div className={theme}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28">

        {/* Header */}
        <div className="bg-white dark:bg-gray-900 px-4 pt-4 pb-0 border-b border-gray-100 dark:border-gray-800">
          <div className="mb-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Finance & Fees</h1>
            <p className="text-xs text-gray-400 mt-0.5">Welcome, {user?.name?.split(' ')[0]}</p>
          </div>
          {/* Scrollable tab bar */}
          <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-hide -mx-4 px-4">
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap
                  ${tab===t.id ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 mt-4">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.15}}>
              {tab==='dashboard'  && <DashboardTab  token={token} />}
              {tab==='collect'    && <CollectTab    token={token} showModal={showModal} />}
              {tab==='verify'     && <VerifyTab     token={token} showModal={showModal} />}
              {tab==='defaulters' && <DefaultersTab token={token} />}
              {tab==='reports'    && <ReportsTab    token={token} />}
              {tab==='setup'      && <FeeSetupTab   token={token} showModal={showModal} />}
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}