"use client";
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useAppModal } from '../../../context/ModalContext';
import {
  Search, User, Phone, BookOpen, ArrowRight, Loader2,
  X, BookMarked, SlidersHorizontal, ChevronRight, GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getToken = () => {
  try { return JSON.parse(localStorage.getItem('gmps_user') || '{}')?.token || ''; }
  catch { return ''; }
};

const safeFetchJson = async (url, options = {}) => {
  try {
    const token = getToken();
    const headers = {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(url, { ...options, headers });
    const text = await res.text();
    return JSON.parse(text);
  } catch (err) {
    return { success: false, message: 'Network/server error.' };
  }
};

const AVATAR_COLORS = [
  'from-emerald-400 to-teal-500',
  'from-blue-400 to-indigo-500',
  'from-violet-400 to-purple-500',
  'from-orange-400 to-rose-500',
  'from-amber-400 to-yellow-500',
  'from-cyan-400 to-sky-500',
];

const avatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

export default function LedgerPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showModal } = useAppModal();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recent, setRecent] = useState([]);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin') { router.replace('/'); return; }
    // Load recent from localStorage
    try {
      const r = JSON.parse(localStorage.getItem('ledger_recent') || '[]');
      setRecent(r.slice(0, 5));
    } catch { }
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [user]);

  const doSearch = useCallback(async (q) => {
    if (q.trim().length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    const json = await safeFetchJson(
      `${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=search_student&q=${encodeURIComponent(q.trim())}`
    );
    setLoading(false);
    if (json.success) setResults(json.students || []);
    else showModal('Error', json.message || 'Search failed.', 'danger');
  }, [showModal]);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(() => doSearch(val), 380);
    } else {
      setResults([]); setSearched(false);
    }
  };

  const openStudent = (student) => {
    // Save to recent
    try {
      const r = JSON.parse(localStorage.getItem('ledger_recent') || '[]');
      const filtered = r.filter(s => s.id !== student.id);
      const updated = [student, ...filtered].slice(0, 5);
      localStorage.setItem('ledger_recent', JSON.stringify(updated));
      setRecent(updated);
    } catch { }
    router.push(`/accountant/ledger/student?id=${student.id}`);
  };

  const clearSearch = () => { setQuery(''); setResults([]); setSearched(false); inputRef.current?.focus(); };

  const StudentCard = ({ student, index = 0 }) => (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.28 }}
      onClick={() => openStudent(student)}
      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-700/50 hover:border-emerald-300 dark:hover:border-emerald-500/40 hover:shadow-md hover:shadow-emerald-500/5 transition-all duration-200 text-left group"
    >
      {/* Avatar */}
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${avatarColor(student.name)} flex items-center justify-center text-white font-bold text-base flex-shrink-0`}>
        {student.name?.[0]?.toUpperCase() || '?'}
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white truncate text-sm">{student.name}</p>
        <p className="text-xs text-gray-500 dark:text-zinc-400 truncate mt-0.5">
          {student.father_name && <span>{student.father_name} · </span>}
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">{student.class_name}</span>
        </p>
      </div>
      {/* Right info */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {student.login_id && (
          <span className="text-xs font-mono bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400 px-2 py-0.5 rounded-lg">{student.login_id}</span>
        )}
        {student.contact && (
          <span className="text-xs text-gray-400 dark:text-zinc-500 flex items-center gap-1">
            <Phone size={10} />{student.contact}
          </span>
        )}
      </div>
      <ChevronRight size={16} className="text-gray-300 dark:text-zinc-600 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
    </motion.button>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-lg border-b border-gray-100 dark:border-zinc-800">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center gap-3">
          <BookMarked size={20} className="text-emerald-500 flex-shrink-0" />
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white leading-tight">Student Ledger</h1>
            <p className="text-xs text-gray-400 dark:text-zinc-500">Search by name, ID or father's name</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-5 space-y-5">
        {/* Search Box */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative"
        >
          <div className="flex items-center gap-3 bg-white dark:bg-zinc-800 border-2 border-gray-200 dark:border-zinc-700 focus-within:border-emerald-400 dark:focus-within:border-emerald-500 rounded-2xl px-4 py-3 shadow-sm transition-all duration-200">
            {loading
              ? <Loader2 size={18} className="text-emerald-500 animate-spin flex-shrink-0" />
              : <Search size={18} className="text-gray-400 dark:text-zinc-500 flex-shrink-0" />
            }
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInput}
              placeholder="Type name, ID, or father's name…"
              className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500"
              autoComplete="off"
            />
            {query && (
              <button onClick={clearSearch} className="text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors">
                <X size={16} />
              </button>
            )}
          </div>
          {/* Hint pills */}
          <div className="flex gap-2 mt-2 flex-wrap">
            {['By Name', 'By ID', "By Father's Name"].map(hint => (
              <span key={hint} className="text-xs bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 px-2.5 py-1 rounded-full flex items-center gap-1">
                <SlidersHorizontal size={10} />{hint}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {searched && !loading && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {results.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                    <GraduationCap size={28} className="text-gray-300 dark:text-zinc-600" />
                  </div>
                  <p className="font-semibold text-gray-700 dark:text-zinc-300">No students found</p>
                  <p className="text-sm text-gray-400 dark:text-zinc-500 mt-1">Try a different name or ID</p>
                </motion.div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium px-1">
                    {results.length} result{results.length !== 1 ? 's' : ''} found
                  </p>
                  {results.map((s, i) => <StudentCard key={s.id} student={s} index={i} />)}
                </div>
              )}
            </motion.div>
          )}

          {/* Recent — show only when not searching */}
          {!searched && recent.length > 0 && (
            <motion.div key="recent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium px-1 flex items-center gap-1.5">
                <BookOpen size={11} /> Recently Viewed
              </p>
              {recent.map((s, i) => <StudentCard key={s.id} student={s} index={i} />)}
            </motion.div>
          )}

          {/* Empty state — no search, no recent */}
          {!searched && recent.length === 0 && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20 flex items-center justify-center mx-auto mb-4">
                <Search size={32} className="text-emerald-400" />
              </div>
              <p className="font-semibold text-gray-700 dark:text-zinc-300 text-base">Find a Student</p>
              <p className="text-sm text-gray-400 dark:text-zinc-500 mt-1.5 max-w-xs mx-auto">
                Search by name, admission ID, or father's name to view their complete fee ledger
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
