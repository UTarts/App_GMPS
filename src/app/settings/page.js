"use client";
import { useState, useEffect, useRef } from 'react';
import { useAuth } from "../../context/AuthContext";
import { 
  ChevronLeft, Moon, Sun, LogOut, Info, Shield, 
  Phone, Mail, MapPin, UserPlus, Users, Check, X, Loader2, School, ChevronDown 
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function Settings() {
  const { logout, user, accounts, switchAccount, addStudentAccount } = useAuth();
  const router = useRouter();
  
  // Modals State
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false); // Toggle between List vs Login Form

  // Login Form State
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [classId, setClassId] = useState('');
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);

  // Hardcoded School Data
  const schoolData = {
    contacts: { phone: "+919415039082", email: "contact@govindmadhav.com" }
  };

  // Fetch Classes for Dropdown (Only when adding new user)
  useEffect(() => {
    if (isAddingNew && classes.length === 0) {
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/classes.php`)
            .then(res => res.json())
            .then(data => { if(Array.isArray(data)) setClasses(data); })
            .catch(err => console.error(err));
    }
  }, [isAddingNew]);

  const confirmLogout = () => {
    logout();
    router.replace('/login');
  };

  const handleAddStudentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const res = await addStudentAccount(loginId, password, classId);
    
    if (res.success) {
        setShowAccountModal(false); // Close Modal
        setIsAddingNew(false); // Reset Form
        setLoginId(''); setPassword(''); setClassId('');
    } else {
        setError(res.message);
    }
    setLoading(false);
  };

  // Helper for Dropdown Label
  const selectedClassName = classes.find(c => c.id == classId)?.name || "Select Class";

  return (
    <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] text-gray-800 dark:text-gray-100 flex flex-col font-sans">
      
      {/* --- HEADER --- */}
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 p-4 flex items-center gap-3">
        <Link href="/profile" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-transform">
          <ChevronLeft size={24} className="text-gray-700 dark:text-gray-200" />
        </Link>
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
      </div>

      {/* --- CONTENT --- */}
      <div className="flex-1 p-4 space-y-6">
        
        {/* SECTION 1: GENERAL */}
        <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">General</h2>
            <div className="bg-white dark:bg-[#151515] rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
                <Link href="/privacy" className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-full text-blue-600 dark:text-blue-400">
                        <Shield size={20} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-sm">Privacy Policy</h3>
                        <p className="text-xs text-gray-500">Data safety & usage</p>
                    </div>
                </Link>

                <div className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="bg-purple-100 dark:bg-purple-900/30 p-2.5 rounded-full text-purple-600 dark:text-purple-400">
                        <Info size={20} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-sm">App Version</h3>
                        <p className="text-xs text-gray-500">v1.0.0 (Release)</p>
                    </div>
                </div>
            </div>
        </div>

        {/* SECTION 2: ACCOUNTS */}
        <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Family & Accounts</h2>
            <div className="bg-white dark:bg-[#151515] rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
                <button 
                    onClick={() => { setShowAccountModal(true); setIsAddingNew(false); }}
                    className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                >
                    <div className="bg-orange-100 dark:bg-orange-900/30 p-2.5 rounded-full text-orange-600 dark:text-orange-400">
                        <Users size={20} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Switch Accounts</h3>
                        <p className="text-xs text-gray-500">
                            {accounts.length > 1 ? `${accounts.length} Profiles Active` : 'Add another child profile'}
                        </p>
                    </div>
                    {/* Tiny avatars preview */}
                    <div className="flex -space-x-2 mr-2">
                         {accounts.slice(0,3).map((acc, i) => (
                             <img key={i} src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${acc.pic || 'GMPSimages/default_student.png'}`} className="w-6 h-6 rounded-full border border-white dark:border-gray-800" />
                         ))}
                    </div>
                </button>
            </div>
        </div>

        {/* SECTION 3: SESSION */}
        <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Session</h2>
            <div className="bg-white dark:bg-[#151515] rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
                <button 
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-left"
                >
                    <div className="bg-red-100 dark:bg-red-900/30 p-2.5 rounded-full text-red-600 dark:text-red-400">
                        <LogOut size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm text-red-600 dark:text-red-400">Logout</h3>
                        <p className="text-xs text-gray-500">Sign out all accounts</p>
                    </div>
                </button>
            </div>
        </div>

      </div>

      {/* --- FOOTER --- */}
      <div className="mt-8 pt-8 pb-10 text-center border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#050505]">
         <div className="flex justify-center gap-6 mb-6">
            {schoolData?.contacts?.phone && (
               <a href={`tel:${schoolData.contacts.phone}`} className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center text-green-600 shadow-sm border border-green-100 dark:border-green-900/30">
                  <Phone size={18} />
               </a>
            )}
            {schoolData?.contacts?.email && (
               <a href={`mailto:${schoolData.contacts.email}`} className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500 shadow-sm border border-red-100 dark:border-red-900/30">
                  <Mail size={18} />
               </a>
            )}
         </div>
         <div className="mb-6 px-10">
            <h2 className="font-bold text-gray-900 dark:text-white text-sm">Govind Madhav Public School</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Gondey, Pratapgarh, U.P.</p>
         </div>
      </div>

      {/* --- LOGOUT CONFIRM MODAL --- */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-xs rounded-3xl p-6 border border-gray-100 dark:border-gray-800">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4"><LogOut size={32} className="text-red-500" /></div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Logout?</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Sign out of all accounts on this device?</p>
                    <div className="flex gap-3 w-full">
                        <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl font-bold text-sm">Cancel</button>
                        <button onClick={confirmLogout} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm">Logout</button>
                    </div>
                </div>
              </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- ACCOUNTS SWITCHER MODAL --- */}
      <AnimatePresence>
        {showAccountModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="bg-white dark:bg-[#1a1a1a] w-full sm:max-w-sm rounded-t-[2rem] sm:rounded-3xl p-6 border-t border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
                 
                 {/* MODAL HEADER */}
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {isAddingNew ? "Add Student" : "Switch Profile"}
                    </h3>
                    <button onClick={() => setShowAccountModal(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"><X size={20} /></button>
                 </div>

                 {/* --- VIEW 1: ACCOUNT LIST --- */}
                 {!isAddingNew ? (
                    <div className="space-y-4">
                        {accounts.map((acc, index) => (
                           <div key={index} 
                                onClick={() => switchAccount(index)}
                                className={`flex items-center gap-4 p-3 rounded-2xl border transition-all cursor-pointer ${
                                    user.id === acc.id ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-500' : 'bg-gray-50 dark:bg-gray-800/50 border-transparent hover:bg-gray-100'
                                }`}
                           >
                               <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${acc.pic || 'GMPSimages/default_student.png'}`} className="w-12 h-12 rounded-full object-cover" />
                               <div className="flex-1">
                                   <h4 className="font-bold text-sm text-gray-900 dark:text-white">{acc.name}</h4>
                                   <p className="text-xs text-gray-500">{acc.role === 'student' ? 'Student' : 'Staff'}</p>
                               </div>
                               {user.id === acc.id && <div className="bg-blue-500 text-white p-1 rounded-full"><Check size={14} /></div>}
                           </div>
                        ))}
                        
                        <button onClick={() => setIsAddingNew(true)} className="w-full py-4 mt-2 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl flex items-center justify-center gap-2 text-gray-500 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <UserPlus size={18} /> Add New Student
                        </button>
                    </div>
                 ) : (
                    
                 /* --- VIEW 2: LOGIN FORM --- */
                    <form onSubmit={handleAddStudentSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 ml-1">Student ID</label>
                            <input type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter ID" required />
                        </div>

                        {/* Class Dropdown */}
                        <div className="space-y-1 relative">
                            <label className="text-xs font-bold text-gray-400 ml-1">Class</label>
                            <div onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)} className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center cursor-pointer">
                                <span className="text-sm font-medium">{selectedClassName}</span>
                                <ChevronDown size={16} />
                            </div>
                            {isClassDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#222] border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-40 overflow-y-auto">
                                    {classes.map(c => (
                                        <div key={c.id} onClick={() => { setClassId(c.id); setIsClassDropdownOpen(false); }} className="p-3 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer">{c.name}</div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 ml-1">Password</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••" required />
                        </div>

                        {error && <p className="text-red-500 text-xs text-center font-bold">{error}</p>}

                        <div className="pt-2 flex gap-3">
                            <button type="button" onClick={() => setIsAddingNew(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl font-bold text-sm">Back</button>
                            <button type="submit" disabled={loading} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm flex justify-center items-center gap-2">
                                {loading ? <Loader2 className="animate-spin" size={18} /> : "Add Account"}
                            </button>
                        </div>
                    </form>
                 )}
              </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}