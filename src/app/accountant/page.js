"use client";
import { useState, useEffect } from 'react';
import { useAuth } from "../../context/AuthContext";
import { useRouter } from 'next/navigation';
import { Search, IndianRupee, Users, TrendingDown, Receipt, Menu, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AccountantDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Security Check: Only Level 3 Admins (Accountants) can view this page
  useEffect(() => {
    if (!user) router.push('/login');
    else if (user.role !== 'admin' || parseInt(user.level) !== 3) {
      router.push('/'); // Kick non-accountants out
    }
  }, [user]);

  // Smart Search Logic
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/fin_search_student.php?q=${searchQuery}`);
        const json = await res.json();
        if (json.status === 'success') setSearchResults(json.data);
      } catch (e) {
        console.error("Search failed", e);
      }
      setIsSearching(false);
    }, 400); // 400ms delay so we don't spam the database on every keystroke

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  if (!user || parseInt(user.level) !== 3) return null; // Hide UI while redirecting

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans text-gray-900">
      
      {/* SIDEBAR (Desktop) / MOBILE MENU (Mobile) */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0F172A] text-white transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex justify-between items-center border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg"><IndianRupee size={20} className="text-white" /></div>
            <h1 className="font-black text-lg tracking-tight">Finance<span className="text-emerald-400">Hub</span></h1>
          </div>
          <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}><X size={24} /></button>
        </div>
        
        <nav className="p-4 space-y-2">
          <button className="w-full flex items-center gap-3 p-3 bg-emerald-500/10 text-emerald-400 rounded-xl font-bold transition-colors"><Search size={18} /> Collect Fees</button>
          <button className="w-full flex items-center gap-3 p-3 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl font-bold transition-colors"><TrendingDown size={18} /> Add Expense</button>
          <button className="w-full flex items-center gap-3 p-3 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl font-bold transition-colors"><Receipt size={18} /> Daily Reports</button>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <button onClick={logout} className="w-full p-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl font-bold transition-colors text-sm">Sign Out</button>
        </div>
      </div>

      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Header */}
        <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-gray-600 bg-gray-100 rounded-lg" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={20} />
            </button>
            <div>
              <h2 className="font-bold text-lg text-gray-900">Dashboard</h2>
              <p className="text-xs text-gray-500 font-medium hidden sm:block">Welcome back, {user.name}</p>
            </div>
          </div>
        </header>

        {/* Scrollable Workspace */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#F8FAFC]">
          
          {/* SEARCH WIDGET */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8">
              <h3 className="font-black text-xl text-gray-900 mb-1">Find Student</h3>
              <p className="text-sm text-gray-500 mb-6 font-medium">Search by Name, Roll No, or Father's Name to collect fees.</p>
              
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  {isSearching ? <span className="animate-spin w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full" /> : <Search className="text-gray-400" size={20} />}
                </div>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g., Rahul Kumar or 45" 
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                />
              </div>

              {/* Live Search Results */}
              <AnimatePresence>
                {searchQuery.length >= 2 && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-4 space-y-2">
                    {searchResults.length === 0 && !isSearching ? (
                      <div className="p-4 text-center text-sm text-gray-500 font-bold bg-gray-50 rounded-xl">No students found.</div>
                    ) : (
                      searchResults.map((student) => (
                        <div key={student.id} onClick={() => router.push(`/accountant/student?id=${student.id}`)} className="flex items-center justify-between p-3 hover:bg-emerald-50 border border-transparent hover:border-emerald-100 rounded-2xl cursor-pointer transition-all group">
                              <div className="flex items-center gap-4">
                            <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL.replace('/api', '')}/${student.profile_pic}`} className="w-12 h-12 rounded-full object-cover border border-gray-200" alt="avatar" />
                            <div>
                              <h4 className="font-bold text-gray-900">{student.name}</h4>
                              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Class {student.class_name} • D/O {student.father_name}</p>
                            </div>
                          </div>
                          <button className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quick Stats Placeholder (For Phase 4) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-5 text-white shadow-lg shadow-emerald-500/20">
                <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Today's Collection</p>
                <h3 className="text-2xl font-black flex items-center gap-1"><IndianRupee size={22} strokeWidth={3} /> 0.00</h3>
              </div>
              <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Today's Expenses</p>
                <h3 className="text-2xl font-black text-gray-900 flex items-center gap-1"><IndianRupee size={22} strokeWidth={3} /> 0.00</h3>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}