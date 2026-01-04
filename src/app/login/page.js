"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from "../../context/AuthContext";
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, School, ChevronDown, Loader2, ChevronRight } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // State
  const [role, setRole] = useState('student');
  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');
  const [classId, setClassId] = useState('');
  const [classes, setClasses] = useState([]); 
  
  // Dropdown State
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch Classes on Mount
  useEffect(() => {
    async function fetchClasses() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/classes.php`);
        const data = await res.json();
        if (Array.isArray(data)) setClasses(data);
      } catch (e) {
        console.error("Failed to load classes", e);
      }
    }
    fetchClasses();

    // Close dropdown if clicking outside
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsClassDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login(userid, password, role, classId);
    
    if (res.success) {
      router.push('/?source=twa');
    } else {
      setError(res.message);
      setLoading(false);
    }
  };

  // Helper to get selected class name
  const selectedClassName = classes.find(c => c.id == classId)?.name || "Select your class";

  return (
    // Fixed Viewport Container (No scrolling, no padding issues)
    <div className="h-screen w-full bg-[#F2F6FA] flex flex-col justify-center items-center overflow-hidden relative">
      
      {/* 1. Header Logo */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 z-10"
      >
        <img 
          src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}GMPSimages/GMPS.header.logo.png`} 
          alt="GMPS Logo" 
          className="w-[260px] object-contain drop-shadow-sm"
        />
      </motion.div>

      {/* 2. Login Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-[90%] max-w-sm bg-white p-8 rounded-[2rem] shadow-2xl shadow-blue-900/10 border border-white z-10 relative"
      >
        <h2 className="text-xl font-bold text-center text-gray-800 mb-6">Login to Continue</h2>

        {/* Role Switcher */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-6">
          {['student', 'teacher', 'admin'].map((r) => (
            <button
              key={r}
              onClick={() => { setRole(r); setError(''); }}
              className={`flex-1 py-2.5 text-xs font-bold capitalize rounded-xl transition-all duration-200 ${
                role === r 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* User ID Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-400 ml-1 uppercase tracking-wider">
              {role === 'admin' ? 'Admin ID' : role === 'teacher' ? 'Teacher ID' : 'Student ID'}
            </label>
            <div className="relative group">
              <User className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="text" 
                value={userid}
                onChange={(e) => setUserid(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none text-sm font-semibold text-gray-800 placeholder-gray-400"
                placeholder="Enter ID"
                required
              />
            </div>
          </div>

          {/* Custom Class Dropdown (Only for Students) */}
          {role === 'student' && (
            <div className="space-y-1.5" ref={dropdownRef}>
              <label className="text-[11px] font-bold text-gray-400 ml-1 uppercase tracking-wider">Select Class</label>
              
              <div className="relative">
                {/* The Trigger Button */}
                <div 
                  onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
                  className={`w-full pl-11 pr-4 py-3 bg-gray-50 border ${isClassDropdownOpen ? 'border-blue-500 ring-2 ring-blue-100 bg-white' : 'border-gray-200'} rounded-xl cursor-pointer flex items-center justify-between transition-all`}
                >
                  <School className="absolute left-4 text-gray-400" size={18} />
                  <span className={`text-sm font-semibold ${classId ? 'text-gray-800' : 'text-gray-400'}`}>
                    {selectedClassName}
                  </span>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isClassDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {/* The Dropdown Menu (Fixed Height, Internal Scroll) */}
                <AnimatePresence>
                  {isClassDropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto no-scrollbar"
                    >
                      {classes.length > 0 ? (
                        classes.map((cls) => (
                          <div 
                            key={cls.id} 
                            onClick={() => { setClassId(cls.id); setIsClassDropdownOpen(false); }}
                            className={`px-4 py-3 text-sm font-medium border-b border-gray-50 last:border-0 cursor-pointer hover:bg-blue-50 transition-colors ${classId == cls.id ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
                          >
                            {cls.name}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-400 text-center">Loading classes...</div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-400 ml-1 uppercase tracking-wider">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none text-sm font-semibold text-gray-800 placeholder-gray-400"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3 bg-red-50 text-red-600 text-xs rounded-xl text-center font-bold border border-red-100"
            >
              {error}
            </motion.div>
          )}

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex justify-center items-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                <span>Secure Login</span>
                <ChevronRight size={18} />
              </>
            )}
          </button>

        </form>
      </motion.div>
      
      {/* Decorative Background Blob */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-200/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-200/20 rounded-full blur-3xl pointer-events-none"></div>

    </div>
  );
}