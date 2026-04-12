"use client";
import { useState, useEffect } from 'react';
import { useAuth } from "../../context/AuthContext";
import { 
  ChevronLeft, LogOut, Info, Shield, 
  Phone, Mail, UserPlus, Users, Check, X, Loader2, ChevronDown, ExternalLink 
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const safeFetchJson = async (url, options = {}) => {
    try {
        const res = await fetch(url, options);
        const text = await res.text();
        const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        return match ? JSON.parse(match[0]) : null;
    } catch (e) {
        return null;
    }
};

export default function Settings() {
  // Pulling the standard, unified functions directly from AuthContext
  const { logout, user, accounts, addAccount, switchAccount } = useAuth(); 
  const router = useRouter();
  
  // Modals State
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Login Form State
  const [selectedRole, setSelectedRole] = useState('student');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [classId, setClassId] = useState('');
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);

  const schoolData = {
    contacts: { phone: "+919415039082", email: "contact@govindmadhav.com" }
  };

  useEffect(() => {
    const fetchClasses = async () => {
        if (isAddingNew && selectedRole === 'student' && classes.length === 0) {
            const data = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/classes.php`);
            if (data && Array.isArray(data)) setClasses(data);
        }
    };
    fetchClasses();
  }, [isAddingNew, selectedRole, classes.length]);

  const confirmLogout = () => {
    logout();
  };

  // Maps the clicked account to its index in the array, then tells the context to switch
  const handleProfileSwitch = (acc) => {
    const targetIndex = accounts.findIndex(a => a.id === acc.id && a.role === acc.role);
    if (targetIndex !== -1) {
        switchAccount(targetIndex);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedRole === 'student' && !classId) {
        setError("Please select a class from the dropdown.");
        return;
    }

    setLoading(true);
    setError('');
    
    // Call the centralized Context function to handle API, saving, and switching
    const res = await addAccount(loginId, password, selectedRole, selectedRole === 'student' ? classId : null);
    
    if (!res.success) {
        setError(res.message);
        setLoading(false);
    }
    // If successful, the AuthContext automatically forces a hard reload, so we don't need to do anything else here!
  };

  const selectedClassName = classes.find(c => c.id == classId)?.name || "Select Class";

  return (
    <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] text-gray-800 dark:text-gray-100 flex flex-col font-sans">
      
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 p-4 flex items-center gap-3 shadow-sm">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-transform">
            <ChevronLeft size={24} className="text-gray-700 dark:text-gray-200" />
        </button>
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
      </div>

      <div className="flex-1 p-4 space-y-6">
        
        <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">General</h2>
            <div className="bg-white dark:bg-[#151515] rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
                <Link href="/privacy" className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-full text-blue-600 dark:text-blue-400"><Shield size={20} /></div>
                    <div className="flex-1"><h3 className="font-semibold text-sm">Privacy Policy</h3><p className="text-xs text-gray-500">Data safety & usage</p></div>
                </Link>
                <div className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="bg-purple-100 dark:bg-purple-900/30 p-2.5 rounded-full text-purple-600 dark:text-purple-400"><Info size={20} /></div>
                    <div className="flex-1"><h3 className="font-semibold text-sm">App Version</h3><p className="text-xs text-gray-500">v1.0.2</p></div>
                </div>
            </div>
        </div>

        <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Profiles & Accounts</h2>
            <div className="bg-white dark:bg-[#151515] rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
                <button onClick={() => { setShowAccountModal(true); setIsAddingNew(false); }} className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left">
                    <div className="bg-orange-100 dark:bg-orange-900/30 p-2.5 rounded-full text-orange-600 dark:text-orange-400"><Users size={20} /></div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Switch Accounts</h3>
                        <p className="text-xs text-gray-500">{accounts?.length > 1 ? `${accounts.length} Profiles Active` : 'Add another profile'}</p>
                    </div>
                    <div className="flex -space-x-2 mr-2">
                         {accounts?.slice(0,3).map((acc, i) => (
                             <img key={i} src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${acc.pic || 'GMPSimages/default_student.png'}`} className="w-6 h-6 rounded-full border border-white dark:border-gray-800 object-cover" alt="avatar" />
                         ))}
                    </div>
                </button>
            </div>
        </div>

        <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Session</h2>
            <div className="bg-white dark:bg-[#151515] rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
                <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center gap-4 p-4 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-left">
                    <div className="bg-red-100 dark:bg-red-900/30 p-2.5 rounded-full text-red-600 dark:text-red-400"><LogOut size={20} /></div>
                    <div><h3 className="font-semibold text-sm text-red-600 dark:text-red-400">Logout</h3><p className="text-xs text-gray-500">Sign out all accounts</p></div>
                </button>
            </div>
        </div>
      </div>

      <div className="mt-8 pt-8 pb-10 text-center border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#050505]">
         <div className="flex justify-center gap-6 mb-6">
            {schoolData?.contacts?.phone && (<a href={`tel:${schoolData.contacts.phone}`} className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center text-green-600 shadow-sm border border-green-100 dark:border-green-900/30"><Phone size={18} /></a>)}
            {schoolData?.contacts?.email && (<a href={`mailto:${schoolData.contacts.email}`} className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500 shadow-sm border border-red-100 dark:border-red-900/30"><Mail size={18} /></a>)}
         </div>
         <div className="mb-6 px-10">
            <h2 className="font-bold text-gray-900 dark:text-white text-sm">Govind Madhav Public School</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Gondey, Pratapgarh, U.P.</p>
         </div>
         <span className="flex items-center text-xs justify-center gap-2 pb-12">
              Designed & Developed by
              <a href="https://www.utarts.in" target="_blank" rel="noopener noreferrer" className="font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1.5">
                <img src="https://www.utarts.in/images/UTArt_Logo.webp" alt="UT Arts Logo" className="h-6 w-6 rounded-full object-cover border border-gray-200" />
                UT Arts <ExternalLink size={10} />
              </a>
        </span>
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
                        <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">Cancel</button>
                        <button onClick={confirmLogout} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-colors">Logout</button>
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
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="bg-white dark:bg-[#1a1a1a] w-full sm:max-w-sm rounded-t-[2rem] sm:rounded-3xl p-6 border-t border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto custom-scrollbar">
                 
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{isAddingNew ? "Add Profile" : "Switch Profile"}</h3>
                    <button onClick={() => setShowAccountModal(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 transition-colors"><X size={20} /></button>
                 </div>

                 {!isAddingNew ? (
                    <div className="space-y-4">
                        {accounts?.map((acc, index) => (
                           <div 
                                key={index} 
                                onClick={() => handleProfileSwitch(acc)} 
                                className={`flex items-center gap-4 p-3 rounded-2xl border transition-all cursor-pointer ${user?.id === acc.id && user?.role === acc.role ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-500 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-800/50 border-transparent hover:bg-gray-100'}`}
                            >
                               <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${acc.pic || 'GMPSimages/default_student.png'}`} className="w-12 h-12 rounded-full object-cover border border-white" alt="avatar"/>
                               <div className="flex-1">
                                   <h4 className="font-bold text-sm text-gray-900 dark:text-white">{acc.name}</h4>
                                   <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{acc.role}</p>
                               </div>
                               {user?.id === acc.id && user?.role === acc.role && <div className="bg-blue-500 text-white p-1 rounded-full"><Check size={14} /></div>}
                           </div>
                        ))}
                        <button onClick={() => setIsAddingNew(true)} className="w-full py-4 mt-2 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl flex items-center justify-center gap-2 text-gray-500 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <UserPlus size={18} /> Add New Profile
                        </button>
                    </div>
                 ) : (
                    <form onSubmit={handleAddSubmit} className="space-y-4">
                        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-4">
                            {['student', 'teacher', 'admin'].map(role => (
                                <button key={role} type="button" onClick={() => setSelectedRole(role)} className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize transition-all ${selectedRole === role ? 'bg-white dark:bg-[#2a2a2a] shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                    {role}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">User ID</label>
                            <input type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow font-bold text-sm" placeholder="Enter ID" required />
                        </div>

                        {selectedRole === 'student' && (
                            <div className="space-y-1 relative">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Class</label>
                                <div onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)} className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center cursor-pointer transition-shadow hover:ring-2 hover:ring-gray-200 dark:hover:ring-gray-800">
                                    <span className={`text-sm font-bold ${!classId ? 'text-gray-400' : ''}`}>{selectedClassName}</span>
                                    <ChevronDown size={16} className="text-gray-400" />
                                </div>
                                {isClassDropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#222] border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                                        {classes.length === 0 ? <div className="p-3 text-sm text-gray-400 text-center font-medium">Loading classes...</div> : null}
                                        {classes.map(c => (
                                            <div key={c.id} onClick={() => { setClassId(c.id); setIsClassDropdownOpen(false); setError(''); }} className="p-3 text-sm font-bold hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-50 dark:border-gray-800 last:border-0">{c.name}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Password</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow font-bold text-sm" placeholder="••••••" required />
                        </div>

                        {error && <p className="text-red-500 text-[11px] uppercase tracking-wide text-center font-black bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{error}</p>}

                        <div className="pt-2 flex gap-3">
                            <button type="button" onClick={() => setIsAddingNew(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">Back</button>
                            <button type="submit" disabled={loading} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm flex justify-center items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50">
                                {loading ? <Loader2 className="animate-spin" size={18} /> : "Add Profile"}
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