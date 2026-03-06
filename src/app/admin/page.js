"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation'; 
import { useAuth } from "../../context/AuthContext";
import { useAppModal } from "../../context/ModalContext"; 
import { 
    Users, BookOpen, UserCheck, Shield, Mail, Trash2, Edit3, 
    Search, Plus, X, Save, Calendar, Award, CheckCircle2, AlertCircle, Loader2, ChevronDown, Camera,
    ArrowLeft, LayoutGrid, GraduationCap, School, LogOut, Printer 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- BULLETPROOF JSON PARSER ---
const safeFetchJson = async (url, options = {}) => {
    try {
        const res = await fetch(url, options);
        let text = await res.text(); 
        try {
            const firstBrace = text.indexOf('{');
            const lastBrace = text.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                text = text.substring(firstBrace, lastBrace + 1);
            }
            return JSON.parse(text);
        } catch (e) {
            console.error("API returned non-JSON response:", text);
            return { status: 'error', message: 'Server error. Check console.' };
        }
    } catch (err) {
        console.error("Network Error:", err);
        return { status: 'error', message: 'Network error.' };
    }
};

export default function AdminProfile() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const { showModal } = useAppModal(); 

    const [stats, setStats] = useState({ students: 0, teachers: 0 });
    const [currentProfile, setCurrentProfile] = useState(user || {}); 
    const [loading, setLoading] = useState(true); 

    const isSuperAdmin = user?.level == 1;
    const [activeTab, setActiveTab] = useState(isSuperAdmin ? 'suggestions' : 'students');
    const [dashboardView, setDashboardView] = useState(true);

    // Data States
    const [suggestions, setSuggestions] = useState([]);
    const [pendingLeaves, setPendingLeaves] = useState([]);
    const [classes, setClasses] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [admins, setAdmins] = useState([]);
    
    // Tab Specific States
    const [selectedClass, setSelectedClass] = useState(null);
    const [classStudents, setClassStudents] = useState([]);
    const [studentLoading, setStudentLoading] = useState(false);

    // Modal States
    const [detailModal, setDetailModal] = useState(null); 
    const [editMode, setEditMode] = useState(false);
    const [addModalType, setAddModalType] = useState(null); 
    const [addModalData, setAddModalData] = useState({});

    const addFormRef = useRef(null);
    const editFormRef = useRef(null);

    // --- 1. INITIAL FETCH ---
    useEffect(() => {
        async function loadInit() {
            try {
                const sJson = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php?action=get_stats`);
                if(sJson.status === 'success') setStats(sJson.data);

                const cJson = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php?action=get_classes`);
                if(cJson.status === 'success') setClasses(cJson.data);
                
                if (user?.id) {
                    const aJson = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php?action=get_admins`);
                    if (aJson.status === 'success') {
                        const me = aJson.data.find(a => a.id == user.id);
                        if (me) setCurrentProfile(me);
                    }
                }
                if (isSuperAdmin) {
                    const lJson = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/leave.php?action=get_pending_leaves`);
                    if(lJson.status === 'success') setPendingLeaves(lJson.data);
                }
            } catch (e) {
                console.error("Initialization Error:", e);
            } finally {
                setLoading(false);
            }
        }
        if (user) loadInit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // --- 2. TAB DATA FETCHING ---
    useEffect(() => {
        if (activeTab === 'suggestions' && isSuperAdmin) fetchSuggestions();
        if (activeTab === 'leaves' && isSuperAdmin) fetchPendingLeaves();
        if (activeTab === 'teachers' && isSuperAdmin) fetchTeachers();
        if (activeTab === 'admins' && isSuperAdmin) fetchAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const fetchPendingLeaves = async () => {
        const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/leave.php?action=get_pending_leaves`);
        if(json.status === 'success') setPendingLeaves(json.data);
    };

    const handleLeaveAction = async (leaveId, status) => {
        const fd = new FormData();
        fd.append('action', 'update_status');
        fd.append('leave_id', leaveId);
        fd.append('status', status);
        fd.append('admin_id', user.id);
        await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/leave.php`, { method: 'POST', body: fd });
        fetchPendingLeaves();
        showModal("Success", `Leave ${status} successfully.`, "success");
    };

    const fetchSuggestions = async () => {
        const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php?action=get_suggestions`);
        if(json.status === 'success') setSuggestions(json.data);
    };

    const fetchTeachers = async () => {
        const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php?action=get_teachers`);
        if(json.status === 'success') {
            setTeachers(json.data);
            setSubjects(json.subjects);
        }
    };

    const fetchAdmins = async () => {
        const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php?action=get_admins`);
        if(json.status === 'success') setAdmins(json.data);
    };

    const loadStudents = async (classId) => {
        setSelectedClass(classId);
        setStudentLoading(true);
        const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php?action=get_students&class_id=${classId}`);
        if(json.status === 'success') setClassStudents(json.data);
        setStudentLoading(false);
    };

    // --- SMART ADD STUDENT HANDLER ---
    const handleAddStudentClick = async () => {
        try {
            const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php?action=get_next_student_id`);
            if (json.status === 'success') {
                setAddModalData({ login_id: json.next_id, password: json.next_id });
            } else {
                setAddModalData({ login_id: '', password: '' });
            }
        } catch (e) {
            setAddModalData({ login_id: '', password: '' });
        }
        setAddModalType('student');
    };

    // --- DETAILED FETCHERS ---
    const openStudentDetail = async (id) => {
        const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php?action=get_student_details&id=${id}`);
        if(json.status === 'success') {
            setDetailModal({ type: 'student', data: json.data });
            setEditMode(false);
        }
    };

    const openTeacherDetail = async (id) => {
        const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php?action=get_teacher_details&id=${id}`);
        if(json.status === 'success') {
            setDetailModal({ type: 'teacher', data: json.data });
            setEditMode(false);
        }
    };

    const openAdminDetail = (adminData) => {
        setDetailModal({ type: 'admin', data: adminData });
        setEditMode(false);
    };

    // --- SAVE HANDLERS ---
    const handleSave = async (e) => {
        e.preventDefault();
        const fd = new FormData(editFormRef.current);
        
        let action = '';
        if (detailModal.type === 'student') action = 'save_student';
        if (detailModal.type === 'teacher') action = 'save_teacher';
        if (detailModal.type === 'admin') action = 'save_admin';
        
        fd.append('action', action);
        fd.append('id', detailModal.type === 'student' ? detailModal.data.profile.id : detailModal.data.id);

        try {
            await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php`, { method: 'POST', body: fd });
            showModal("Success", "Changes saved successfully.", "success");
            setDetailModal(null);
            
            if(activeTab === 'students') loadStudents(selectedClass);
            if(activeTab === 'teachers') fetchTeachers();
            if(activeTab === 'admins') fetchAdmins();
            
            if(detailModal.type === 'admin' && detailModal.data.id === user.id) {
                 const aJson = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php?action=get_admins`);
                 if (aJson.status === 'success') {
                     const me = aJson.data.find(a => a.id == user.id);
                     if (me) setCurrentProfile(me);
                 }
            }
        } catch (error) {
            showModal("Error", "Failed to save changes.", "danger");
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        const fd = new FormData(addFormRef.current);
        fd.append('action', `add_${addModalType}`);
        
        try {
            await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php`, { method: 'POST', body: fd });
            showModal("Added!", `New ${addModalType} added successfully.`, "success");
            setAddModalType(null);
            setAddModalData({});
            
            if(addModalType === 'student' && selectedClass) loadStudents(selectedClass);
            if(addModalType === 'teacher') fetchTeachers();
            if(addModalType === 'admin') fetchAdmins();
        } catch (error) {
            showModal("Error", "Failed to add.", "danger");
        }
    };

    const confirmDelete = (type, id) => {
        showModal(
            "Delete Record?", 
            "This action cannot be undone. Are you sure you want to delete this?", 
            "danger", 
            () => handleDelete(type, id)
        );
    };

    const handleDelete = async (type, id) => {
        const fd = new FormData();
        fd.append('action', `delete_${type}`);
        fd.append('id', id);
        
        try {
            await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php`, { method: 'POST', body: fd });
            showModal("Deleted", "Record deleted successfully.", "success");
            setDetailModal(null); 
            
            if(type === 'student') loadStudents(selectedClass);
            if(type === 'teacher') fetchTeachers();
            if(type === 'admin') fetchAdmins();
            if(type === 'suggestion') fetchSuggestions();
        } catch (error) {
            showModal("Error", "Failed to delete.", "danger");
        }
    };

    const handleLogout = () => {
        showModal("Logout", "Are you sure you want to logout?", "danger", () => {
            if (logout) logout();
            router.push('/login'); 
        });
    };

    const getProfilePic = (pic) => {
        if (!pic) return `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}GMPSimages/default-admin.jpg`;
        return `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${pic}`;
    };

    const openSection = (sectionName) => {
        setActiveTab(sectionName);
        setDashboardView(false);
    };

    const dropdownStyle = "w-full p-4 bg-gray-50 dark:bg-neutral-900 border-2 border-gray-200 dark:border-neutral-800 rounded-2xl text-sm font-bold text-gray-700 dark:text-gray-200 appearance-none outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer bg-[url('https://api.iconify.design/lucide/chevron-down.svg?color=%239ca3af')] bg-[length:20px] bg-[center_right_1rem] bg-no-repeat pr-10";

    if (loading) return <AdminSkeleton />;

    return (
        <div className="min-h-screen pb-24 font-sans text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-[#0a0a0a]">
            
            {dashboardView ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="relative pt-12 pb-10 px-6 flex flex-col items-center justify-center">
                        <button onClick={handleLogout} className="absolute top-6 right-6 p-2 rounded-full bg-red-50 text-red-500 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                            <LogOut size={20} />
                        </button>

                        <div className="absolute top-6 left-6">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-lg backdrop-blur-md ${isSuperAdmin ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-500' : 'bg-indigo-500/20 border-indigo-500 text-indigo-600 dark:text-indigo-400'}`}>
                                {isSuperAdmin ? "Super Admin" : "Administrator"}
                            </span>
                        </div>

                        <div className={`relative w-32 h-32 rounded-full border-4 p-1 shadow-2xl mb-4 ${isSuperAdmin ? 'border-amber-500 bg-white dark:bg-neutral-900' : 'border-indigo-500 bg-white dark:bg-neutral-900'}`}>
                            <div className="w-full h-full rounded-full overflow-hidden relative">
                                <img 
                                    src={getProfilePic(currentProfile?.profile_pic)} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => e.target.src = `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}GMPSimages/default-admin.jpg`}
                                    loading="lazy"
                                />
                            </div>
                        </div>

                        <h1 className="text-3xl font-black tracking-tighter text-center mb-1 text-gray-900 dark:text-white">
                            {currentProfile?.name || "Administrator"}
                        </h1>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            {currentProfile?.contact || "No Contact Info"}
                        </p>
                    </div>

                    <div className="px-4 max-w-lg mx-auto">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div onClick={() => openSection('students')} className={`p-5 rounded-3xl border flex flex-col items-center justify-center gap-1 shadow-xl bg-white dark:bg-[#151515] border-gray-100 dark:border-neutral-800 hover:scale-[1.02] transition-transform cursor-pointer`}>
                                <span className={`text-4xl font-black ${isSuperAdmin ? 'text-amber-500' : 'text-indigo-600'}`}>{stats.students}</span>
                                <span className="text-[10px] text-gray-500 font-bold uppercase">Students</span>
                            </div>
                            <div  onClick={() => openSection('teachers')} className={`p-5 rounded-3xl border flex flex-col items-center justify-center gap-1 shadow-xl bg-white dark:bg-[#151515] border-gray-100 dark:border-neutral-800 hover:scale-[1.02] transition-transform cursor-pointer`}>
                                <span className={`text-4xl font-black ${isSuperAdmin ? 'text-pink-500' : 'text-pink-600'}`}>{stats.teachers}</span>
                                <span className="text-[10px] text-gray-500 font-bold uppercase">Teachers</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {isSuperAdmin && (
                                <>
                                    <button onClick={() => openSection('leaves')} className="w-full bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-neutral-800 p-4 rounded-3xl flex items-center justify-between group hover:border-emerald-500/50 transition-all shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                                <Calendar size={20} />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="text-gray-900 dark:text-white font-bold text-sm">Leave Requests</h3>
                                                <p className="text-gray-500 text-[10px]">{pendingLeaves?.length || 0} pending</p>
                                            </div>
                                        </div>
                                        <ChevronDown className="-rotate-90 text-gray-400 group-hover:text-emerald-500 transition-colors" size={20}/>
                                    </button>

                                    <button onClick={() => openSection('suggestions')} className="w-full bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-neutral-800 p-4 rounded-3xl flex items-center justify-between group hover:border-amber-500/50 transition-all shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                                                <Mail size={20} />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="text-gray-900 dark:text-white font-bold text-sm">Inbox & Suggestions</h3>
                                                <p className="text-gray-500 text-[10px]">{suggestions.length} New Messages</p>
                                            </div>
                                        </div>
                                        <ChevronDown className="-rotate-90 text-gray-400 group-hover:text-amber-500 transition-colors" size={20}/>
                                    </button>
                                </>
                            )}

                            <button onClick={() => openSection('students')} className={`w-full p-6 rounded-3xl flex flex-col items-start gap-4 shadow-xl transition-all relative overflow-hidden group ${isSuperAdmin ? 'bg-amber-500 text-black' : 'bg-indigo-600 text-white'}`}>
                                <div className="absolute right-[-20px] top-[-20px] opacity-20 rotate-12 group-hover:scale-110 transition-transform duration-500">
                                    <GraduationCap size={120} />
                                </div>
                                <div className="w-12 h-12 rounded-full bg-black/10 backdrop-blur-sm flex items-center justify-center">
                                    <Users size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black text-xl">Manage Students</h3>
                                    <p className="opacity-70 text-xs font-medium">View profiles, attendance & results</p>
                                </div>
                            </button>

                            <div className="grid grid-cols-2 gap-3">
                                {isSuperAdmin && (
                                    <>
                                        <button onClick={() => openSection('teachers')} className="p-4 rounded-3xl border flex flex-col items-center text-center gap-3 hover:scale-[1.02] transition-transform bg-white dark:bg-[#151515] border-gray-100 dark:border-neutral-800 shadow-sm">
                                            <div className="w-10 h-10 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center">
                                                <BookOpen size={20} />
                                            </div>
                                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Teachers</span>
                                        </button>
                                        <button onClick={() => openSection('admins')} className="p-4 rounded-3xl border flex flex-col items-center text-center gap-3 hover:scale-[1.02] transition-transform bg-white dark:bg-[#151515] border-gray-100 dark:border-neutral-800 shadow-sm">
                                            <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                                <Shield size={20} />
                                            </div>
                                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Admins</span>
                                        </button>
                                    </>
                                )}
                                
                                <button onClick={() => openSection('report_cards')} className="p-4 rounded-3xl border flex flex-col items-center text-center gap-3 hover:scale-[1.02] transition-transform bg-white dark:bg-[#151515] border-gray-100 dark:border-neutral-800 shadow-sm">
                                    <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
                                        <Printer size={20} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Report Cards</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                
                <div className="animate-in slide-in-from-right-8 duration-300">
                    
                    {/* STANDARD HEADER */}
                    <div className="sticky top-0 z-50 px-4 py-4 flex items-center gap-4 border-b backdrop-blur-xl bg-white/80 dark:bg-black/80 border-gray-100 dark:border-neutral-800 text-gray-800 dark:text-white">
                        <button onClick={() => setDashboardView(true)} className="p-2 rounded-full bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h2 className="text-lg font-black capitalize">{activeTab === 'report_cards' ? 'Report Cards' : activeTab}</h2>
                            <p className="text-[10px] opacity-60">Management Console</p>
                        </div>
                    </div>

                    <div className={activeTab === 'report_cards' ? "px-4 mt-2" : "px-4 mt-6"}>
                        
                        {activeTab === 'report_cards' && (
                            <AdminReportCardSection />
                        )}

                        {activeTab === 'leaves' && isSuperAdmin && (
                            <div className="space-y-3 pb-10">
                                {pendingLeaves.length === 0 ? <p className="text-center text-gray-400 text-xs py-10">No pending leave requests</p> : 
                                pendingLeaves.map(l => (
                                    <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} key={l.id} className="bg-white dark:bg-[#151515] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="text-sm font-bold">{l.applicant_name} <span className="text-[10px] font-bold uppercase text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded ml-1">{l.role}</span></h4>
                                                <p className="text-[10px] text-gray-400 mt-0.5">{l.class_name} • Applied: {new Date(l.applied_on).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-[#1a1a1a] p-3 rounded-xl mb-3 mt-2">
                                            <p className="text-xs font-black text-blue-600 dark:text-blue-400 mb-1">
                                                {new Date(l.start_date).toLocaleDateString('en-GB', {day:'numeric', month:'short'})} 
                                                {l.start_date !== l.end_date && ` - ${new Date(l.end_date).toLocaleDateString('en-GB', {day:'numeric', month:'short'})}`}
                                            </p>
                                            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">"{l.reason}"</p>
                                        </div>
                                        {l.proof_image && (
                                            <a href={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${l.proof_image}`} target="_blank" rel="noopener noreferrer" className="inline-block text-[10px] font-bold text-white bg-blue-500 px-3 py-1.5 rounded-lg mb-3">
                                                View Proof Document
                                            </a>
                                        )}
                                        <div className="flex gap-2">
                                            <button onClick={() => handleLeaveAction(l.id, 'rejected')} className="flex-1 py-2.5 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl active:scale-95 transition-transform">Reject</button>
                                            <button onClick={() => handleLeaveAction(l.id, 'approved')} className="flex-1 py-2.5 text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 rounded-xl active:scale-95 transition-transform">Approve</button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'suggestions' && isSuperAdmin && (
                            <div className="space-y-3">
                                {suggestions.length === 0 ? <p className="text-center text-gray-400 text-xs py-10">Inbox Empty</p> : 
                                suggestions.map(s => (
                                    <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} key={s.id} className="bg-white dark:bg-[#151515] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-3">
                                                <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${s.profile_pic || 'GMPSimages/default_user.png'}`} className="w-8 h-8 rounded-full object-cover bg-gray-100" loading="lazy"/>
                                                <div>
                                                    <h4 className="text-sm font-bold">{s.name}</h4>
                                                    <p className="text-[10px] text-gray-400">{s.class_name}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => confirmDelete('suggestion', s.id)} className="text-gray-300 hover:text-red-500 p-1">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-[#1a1a1a] p-3 rounded-xl leading-relaxed">"{s.message}"</p>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'students' && (
                            <div>
                                <div className="mb-6">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block ml-2">Select Class View</label>
                                    <div className="relative">
                                        <select className={dropdownStyle} onChange={(e) => loadStudents(e.target.value)} value={selectedClass || ""}>
                                            <option value="" disabled>Choose a class...</option>
                                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pb-10">
                                    <button onClick={handleAddStudentClick} className="bg-indigo-50 dark:bg-indigo-900/10 border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400 min-h-[120px]">
                                        <div className="w-10 h-10 rounded-full bg-white dark:bg-[#151515] flex items-center justify-center shadow-sm">
                                            <Plus size={20} />
                                        </div>
                                        <span className="text-xs font-bold">Add Student</span>
                                    </button>

                                    {studentLoading ? (
                                        <p className="col-span-2 text-center text-xs text-gray-400 py-4">Loading...</p>
                                    ) : (
                                        classStudents.map(s => (
                                            <motion.div key={s.id} whileTap={{scale:0.98}} onClick={() => openStudentDetail(s.id)} className="bg-white dark:bg-[#151515] p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 flex flex-col items-center text-center cursor-pointer">
                                                <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${s.profile_pic || 'GMPSimages/default_student.png'}`} className="w-12 h-12 rounded-full object-cover mb-2 bg-gray-100 border border-gray-100 dark:border-gray-700" loading="lazy" />
                                                <h4 className="text-xs font-bold line-clamp-1">{s.name}</h4>
                                                <p className="text-[10px] text-gray-400">Roll: {s.roll_no || '-'}</p>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'teachers' && isSuperAdmin && (
                            <div className="grid grid-cols-1 gap-3 pb-10">
                                <button onClick={() => setAddModalType('teacher')} className="bg-indigo-600 text-white p-4 rounded-2xl text-sm font-bold shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 mb-2">
                                    <Plus size={18}/> Add New Teacher
                                </button>
                                
                                {teachers.map(t => (
                                    <motion.div whileTap={{scale:0.98}} onClick={() => openTeacherDetail(t.id)} key={t.id} className="bg-white dark:bg-[#151515] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 flex items-center gap-4 cursor-pointer">
                                        <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${t.profile_pic || 'GMPSimages/default_teacher.png'}`} className="w-12 h-12 rounded-full object-cover bg-gray-100 border border-gray-100 dark:border-gray-700" loading="lazy" />
                                        <div>
                                            <h4 className="font-bold text-sm">{t.name}</h4>
                                            <p className="text-[10px] text-indigo-500 font-bold">
                                                {t.assigned_class ? `Class Teacher: ${t.assigned_class}` : (t.subject ? `${t.subject} Teacher` : 'Subject Teacher')}
                                            </p>
                                        </div>
                                        <button className="ml-auto text-xs bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg font-bold">Edit</button>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'admins' && isSuperAdmin && (
                            <div className="space-y-3 pb-10">
                                <button onClick={() => setAddModalType('admin')} className="w-full bg-white dark:bg-[#151515] border-2 border-dashed border-gray-300 dark:border-neutral-700 text-gray-500 p-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2">
                                    <Plus size={18}/> Add New Admin
                                </button>
                                {admins.map(a => (
                                    <motion.div whileTap={{scale:0.98}} onClick={() => openAdminDetail(a)} key={a.id} className="bg-white dark:bg-[#151515] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 flex items-center gap-4 cursor-pointer">
                                        <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${a.profile_pic || 'GMPSimages/default-admin.jpg'}`} className="w-10 h-10 rounded-full object-cover bg-gray-100 border border-gray-100 dark:border-gray-700" loading="lazy" />
                                        <div>
                                            <h4 className="font-bold text-sm">{a.name}</h4>
                                            <span className="text-[9px] bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">{a.level == 1 ? 'Super Admin' : 'Admin'}</span>
                                        </div>
                                        <button className="ml-auto text-xs bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg font-bold">Edit</button>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <AnimatePresence>
                {detailModal && (
                    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div 
                            initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
                            className="bg-white dark:bg-[#151515] w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 h-[90vh] overflow-y-auto relative shadow-2xl no-scrollbar"
                        >
                            <button onClick={() => setDetailModal(null)} className="absolute top-4 right-4 bg-gray-100 dark:bg-gray-800 p-2 rounded-full z-10"><X size={20}/></button>
                            
                            <form ref={editFormRef} onSubmit={handleSave} className="space-y-6">
                                <div className="flex flex-col items-center">
                                    <div className="w-24 h-24 rounded-full border-4 border-gray-100 dark:border-gray-800 overflow-hidden mb-3 relative group bg-gray-100">
                                        <img 
                                            src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${detailModal.data.profile?.profile_pic || detailModal.data.profile_pic || 'GMPSimages/default_student.png'}`} 
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                        {editMode && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer">
                                                <Camera className="text-white" size={24}/>
                                                <input type="file" name="image" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*"/>
                                            </div>
                                        )}
                                    </div>
                                    <h2 className="text-xl font-black text-center">{detailModal.data.profile?.name || detailModal.data.name}</h2>
                                    <p className="text-sm text-gray-500">
                                        {detailModal.type === 'student' ? detailModal.data.profile?.login_id : detailModal.data.login_id}
                                    </p>
                                </div>

                                {!editMode && (
                                    <div className="flex justify-center">
                                        <button type="button" onClick={() => setEditMode(true)} className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-full text-xs font-bold flex items-center gap-2">
                                            <Edit3 size={14}/> Edit Profile
                                        </button>
                                    </div>
                                )}

                                {detailModal.type === 'student' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input label="Full Name" name="name" val={detailModal.data.profile.name} edit={editMode} />
                                            <Input label="DOB" name="dob" type="date" val={detailModal.data.profile.dob} edit={editMode} />
                                            <Input label="Father's Name" name="father_name" val={detailModal.data.profile.father_name} edit={editMode} />
                                            <Input label="Mother's Name" name="mother_name" val={detailModal.data.profile.mother_name} edit={editMode} />
                                            <Input label="Contact" name="contact" val={detailModal.data.profile.contact} edit={editMode} />
                                            <Input label="Roll No" name="roll_no" val={detailModal.data.profile.roll_no} edit={editMode} />
                                            <Input label="Aadhar No" name="aadhar_no" val={detailModal.data.profile.aadhar_no} edit={editMode} />
                                            <Input label="Login ID" name="login_id" val={detailModal.data.profile.login_id} edit={editMode} />
                                            
                                            {/* DROPDOWN FOR CLASS UPDATE WHEN EDITING */}
                                            {editMode && (
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Class</label>
                                                    <select name="class_id" className={dropdownStyle} defaultValue={detailModal.data.profile.class_id}>
                                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                </div>
                                            )}

                                            {editMode && <Input label="New Password" name="password" type="password" placeholder="Leave blank to keep" edit={true} />}
                                        </div>
                                        <Input label="Address" name="address" val={detailModal.data.profile.address} edit={editMode} textArea />

                                        {!editMode && (
                                            <>
                                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b dark:border-gray-800 pb-2 mt-8 mb-4">Monthly Attendance</h3>
                                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                                    {[4,5,6,7,8,9,10,11,12,1,2,3].map((m) => {
                                                        const att = detailModal.data.attendance[m] || {present_days: 0, absent_days: 0};
                                                        const total = Number(att.present_days) + Number(att.absent_days);
                                                        const pct = total > 0 ? Math.round((att.present_days / total) * 100) : 0;
                                                        
                                                        return (
                                                            <div key={m} className="bg-gray-50 dark:bg-[#1a1a1a] p-3 rounded-2xl border border-gray-100 dark:border-neutral-800 flex flex-col items-center text-center">
                                                                <span className="font-black text-sm text-gray-800 dark:text-gray-200 mb-1">{['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'][m - (m < 4 ? -9 : 4)]}</span>
                                                                {total === 0 ? (
                                                                    <span className="text-[10px] text-gray-400 font-bold">- No Data -</span>
                                                                ) : (
                                                                    <>
                                                                        <div className="flex gap-2 text-[10px] font-black uppercase">
                                                                            <span className="text-green-600">{att.present_days} P</span>
                                                                            <span className="text-red-500">{att.absent_days} A</span>
                                                                        </div>
                                                                        <div className="w-full bg-gray-200 dark:bg-gray-800 h-1.5 rounded-full mt-2 overflow-hidden">
                                                                            <div className="bg-green-500 h-full" style={{width: `${pct}%`}}></div>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b dark:border-gray-800 pb-2 mt-8 mb-4">Academic Performance</h3>
                                                {detailModal.data.exams && detailModal.data.exams.length > 0 ? detailModal.data.exams.map(exam => {
                                                    const isUT = exam.name.toLowerCase().includes('ut') || exam.name.toLowerCase().includes('periodic');
                                                    return (
                                                        <div key={exam.id} className="mb-6 bg-white dark:bg-[#151515] rounded-2xl border border-gray-200 dark:border-neutral-800 overflow-hidden shadow-sm">
                                                            <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-3 border-b border-gray-200 dark:border-neutral-800">
                                                                <h4 className="text-sm font-black text-blue-800 dark:text-blue-400 uppercase tracking-wide">{exam.name}</h4>
                                                            </div>
                                                            <div className="overflow-x-auto custom-scrollbar">
                                                                <table className="w-full text-left text-xs">
                                                                    <thead>
                                                                        <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-neutral-800 text-gray-500 uppercase tracking-wider">
                                                                            <th className="p-3 font-bold">Subject</th>
                                                                            {isUT ? (
                                                                                <th className="p-3 font-bold text-center">Marks (20)</th>
                                                                            ) : (
                                                                                <>
                                                                                    <th className="p-3 font-bold text-center">PT</th>
                                                                                    <th className="p-3 font-bold text-center">NB</th>
                                                                                    <th className="p-3 font-bold text-center">SE</th>
                                                                                    <th className="p-3 font-bold text-center">Exam</th>
                                                                                </>
                                                                            )}
                                                                            <th className="p-3 font-bold text-center text-gray-900 dark:text-gray-100">Total</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                                                                        {exam.results.map((res, i) => {
                                                                            const pt = Number(res.pt_marks || 0);
                                                                            const nb = Number(res.notebook_marks || 0);
                                                                            const se = Number(res.enrichment_marks || 0);
                                                                            const exm = Number(res.exam_marks || 0);
                                                                            const total = isUT ? exm : (pt + nb + se + exm);

                                                                            return (
                                                                                <tr key={i} className={`hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors ${res.is_absent == 1 ? 'opacity-50 text-red-500' : ''}`}>
                                                                                    <td className="p-3 font-bold text-gray-800 dark:text-gray-200 uppercase">{res.subject}</td>
                                                                                    {isUT ? (
                                                                                        <td className="p-3 text-center font-bold">{res.is_absent == 1 ? 'AB' : exm}</td>
                                                                                    ) : (
                                                                                        <>
                                                                                            <td className="p-3 text-center">{res.is_absent == 1 ? '-' : res.pt_marks || '-'}</td>
                                                                                            <td className="p-3 text-center">{res.is_absent == 1 ? '-' : res.notebook_marks || '-'}</td>
                                                                                            <td className="p-3 text-center">{res.is_absent == 1 ? '-' : res.enrichment_marks || '-'}</td>
                                                                                            <td className="p-3 text-center">{res.is_absent == 1 ? '-' : res.exam_marks || '-'}</td>
                                                                                        </>
                                                                                    )}
                                                                                    <td className="p-3 text-center font-black text-blue-600 dark:text-blue-400">{res.is_absent == 1 ? 'AB' : total}</td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    );
                                                }) : <div className="text-sm text-gray-400 italic text-center p-4">No exams recorded yet.</div>}
                                            </>
                                        )}
                                    </>
                                )}

                                {detailModal.type === 'teacher' && (
                                    <div className="space-y-4">
                                        <Input label="Full Name" name="name" val={detailModal.data.name} edit={editMode} />
                                        <Input label="Contact" name="contact" val={detailModal.data.contact} edit={editMode} />
                                        <Input label="Login ID" name="login_id" val={detailModal.data.login_id} edit={editMode} />
                                        
                                        {editMode ? (
                                            <>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Role / Class</label>
                                                    <select name="assigned_class_id" className={dropdownStyle} defaultValue={detailModal.data.assigned_class_id}>
                                                        <option value="">Subject Teacher (No Class)</option>
                                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Subject</label>
                                                    <select name="subject_code" className={dropdownStyle} defaultValue={detailModal.data.subject_code}>
                                                        <option value="">Select Subject...</option>
                                                        {subjects.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                                                    </select>
                                                </div>
                                                <Input label="New Password" name="password" type="password" placeholder="Leave blank to keep" edit={true} />
                                            </>
                                        ) : (
                                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl text-xs text-indigo-700 dark:text-indigo-300 font-bold text-center">
                                                {detailModal.data.assigned_class_id ? "Classteacher" : "Subject Teacher"}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {detailModal.type === 'admin' && (
                                    <div className="space-y-4">
                                        <Input label="Full Name" name="name" val={detailModal.data.name} edit={editMode} />
                                        <Input label="Contact" name="contact" val={detailModal.data.contact} edit={editMode} />
                                        <Input label="Login ID" name="login_id" val={detailModal.data.login_id} edit={editMode} />
                                        {editMode ? (
                                            <>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Level</label>
                                                    <select name="level" className={dropdownStyle} defaultValue={detailModal.data.level}>
                                                        <option value="1">Super Admin (Level 1)</option>
                                                        <option value="2">Admin (Level 2)</option>
                                                    </select>
                                                </div>
                                                <Input label="New Password" name="password" type="password" placeholder="Leave blank to keep" edit={true} />
                                            </>
                                        ) : (
                                            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl text-xs text-orange-700 dark:text-orange-300 font-bold text-center">
                                                {detailModal.data.level == 1 ? "Super Admin" : "Admin"}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {editMode && (
                                    <div className="pt-4 flex gap-3">
                                        <button type="button" onClick={() => setEditMode(false)} className="flex-1 py-3 text-gray-500 font-bold text-sm bg-gray-100 dark:bg-gray-800 rounded-xl">Cancel</button>
                                        <button type="submit" className="flex-1 py-3 bg-black dark:bg-white text-white dark:text-black font-bold text-sm rounded-xl">Save Changes</button>
                                    </div>
                                )}

                                <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                                    <button 
                                        type="button"
                                        onClick={() => confirmDelete(
                                            detailModal.type, 
                                            detailModal.type === 'student' ? detailModal.data.profile.id : detailModal.data.id
                                        )}
                                        className="w-full text-red-500 text-xs font-bold py-3 flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors"
                                    >
                                        <Trash2 size={16} /> Delete Permanently
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {addModalType && (
                    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div 
                            initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
                            className="bg-white dark:bg-[#151515] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl h-[80vh] overflow-y-auto no-scrollbar"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg">Add New {addModalType}</h3>
                                <button onClick={() => {setAddModalType(null); setAddModalData({});}} className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full"><X size={20}/></button>
                            </div>
                            
                            <form ref={addFormRef} onSubmit={handleAdd} className="space-y-4">
                                <Input label="Full Name" name="name" required edit={true} />
                                <Input label="Login ID" name="login_id" required edit={true} val={addModalData?.login_id || ''} />
                                <Input label="Password" name="password" type="password" required edit={true} val={addModalData?.password || ''} />
                                <Input label="Contact" name="contact" required edit={true} />
                                <Input label="Profile Picture" name="image" type="file" edit={true} />

                                {addModalType === 'student' && (
                                    <>
                                        <Input label="DOB" name="dob" type="date" edit={true} />
                                        <Input label="Father's Name" name="father_name" edit={true} />
                                        <Input label="Mother's Name" name="mother_name" edit={true} />
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Class</label>
                                            <select name="class_id" className={dropdownStyle} required>
                                                <option value="">Select Class...</option>
                                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <Input label="Roll No" name="roll_no" type="number" edit={true} />
                                        <Input label="Aadhar No" name="aadhar_no" type="text" edit={true} />
                                        <Input label="Address" name="address" textArea edit={true} />
                                        <Input label="Admission Year" name="admission_year" type="number" val={new Date().getFullYear()} edit={true} />
                                    </>
                                )}

                                {addModalType === 'teacher' && (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Assigned Class (Optional)</label>
                                            <select name="assigned_class_id" className={dropdownStyle}>
                                                <option value="">None (Subject Teacher)</option>
                                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Subject</label>
                                            <select name="subject_code" className={dropdownStyle}>
                                                <option value="">Select Subject...</option>
                                                {subjects.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}

                                {addModalType === 'admin' && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Level</label>
                                        <select name="level" className={dropdownStyle}>
                                            <option value="1">Super Admin</option>
                                            <option value="2">Admin</option>
                                        </select>
                                    </div>
                                )}

                                <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold mt-4 shadow-lg shadow-indigo-500/30">
                                    Create Account
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}

function AdminReportCardSection({ onBack }) {
    const [loading, setLoading] = useState(true);
    const [exams, setExams] = useState([]);
    const [classes, setClasses] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    
    const [selectedExam, setSelectedExam] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedStudent, setSelectedStudent] = useState('ALL'); 
    
    useEffect(() => {
        const loadFilters = async () => {
            const fd = new FormData();
            fd.append('action', 'fetch_admin_filters');
            try {
                const res = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/report_card.php`, { method: 'POST', body: fd });
                if (res.status === 'success') {
                    setExams(res.exams || []);
                    setClasses(res.classes || []);
                    setAllStudents(res.students || []);
                }
            } catch (e) {
                console.error("Report Card Fetch Error:", e);
            }
            setLoading(false);
        };
        loadFilters();
    }, []);

    const classStudents = allStudents.filter(s => s.class_id == selectedClass);

    const handleGenerate = () => {
        if (!selectedExam || !selectedClass) return alert("Please select an Exam and a Class.");
        let url = `/print_report?class_id=${selectedClass}&exam_id=${selectedExam}`;
        if (selectedStudent !== 'ALL') url += `&student_id=${selectedStudent}`;
        window.location.href = url; 
    };

    if (loading) return <div className="p-10 text-center text-gray-400 font-bold flex flex-col items-center gap-3"><Loader2 className="animate-spin text-purple-600" size={32}/> Loading Engine...</div>;

    const dropdownStyle = "w-full p-4 bg-gray-50 dark:bg-neutral-900 border-2 border-gray-200 dark:border-neutral-800 rounded-2xl text-sm font-bold text-gray-700 dark:text-gray-200 appearance-none outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all cursor-pointer bg-[url('https://api.iconify.design/lucide/chevron-down.svg?color=%239ca3af')] bg-[length:20px] bg-[center_right_1rem] bg-no-repeat pr-10";

    return (
        <div className="max-w-lg mx-auto mt-4">
            <div className="bg-white dark:bg-[#151515] p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 space-y-5">
                
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">1. Select Exam</label>
                    <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)} className={dropdownStyle}>
                        <option value="">-- Choose Exam --</option>
                        {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                    </select>
                </div>

                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">2. Select Class</label>
                    <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedStudent('ALL'); }} className={dropdownStyle}>
                        <option value="">-- Choose Class --</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                <div className={`transition-all duration-300 ${!selectedClass ? 'opacity-40 pointer-events-none grayscale' : 'opacity-100'}`}>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">3. Select Student (Optional)</label>
                    <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className={dropdownStyle.replace('bg-gray-50', 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800/50 text-purple-700 dark:text-purple-400')}>
                        <option value="ALL">✅ Print Entire Class (Bulk Print)</option>
                        {classStudents.map(stu => <option key={stu.id} value={stu.id} className="text-gray-800 dark:text-gray-200">{stu.name}</option>)}
                    </select>
                </div>

                <button 
                    onClick={handleGenerate}
                    disabled={!selectedExam || !selectedClass}
                    className="w-full mt-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-2xl font-black text-[15px] shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
                >
                    <Printer size={20} /> {selectedStudent === 'ALL' ? 'Generate Bulk Print' : 'View Single Report'}
                </button>
            </div>
        </div>
    );
}

const Input = ({ label, name, val, edit, type = "text", textArea = false, placeholder, required }) => (
    <div className="space-y-1">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">{label}</label>
        {edit ? (
            textArea ? (
                <textarea name={name} defaultValue={val} className="w-full p-3 bg-gray-50 dark:bg-neutral-900 border-2 border-gray-100 dark:border-neutral-800 rounded-xl text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all dark:text-white custom-scrollbar" rows="2" />
            ) : (
                <input type={type} name={name} defaultValue={val} placeholder={placeholder} required={required} className="w-full p-3 bg-gray-50 dark:bg-neutral-900 border-2 border-gray-100 dark:border-neutral-800 rounded-xl text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all dark:text-white" />
            )
        ) : (
            <div className="text-sm font-bold text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-neutral-800 pb-1">{val || '-'}</div>
        )}
    </div>
);

function AdminSkeleton() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24">
            <div className="pt-12 pb-10 px-6 flex flex-col items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-800 skeleton mb-4"></div>
                <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-full skeleton mb-2"></div>
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded-full skeleton"></div>
            </div>
            <div className="px-4 max-w-lg mx-auto">
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-3xl skeleton"></div>
                    <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-3xl skeleton"></div>
                </div>
                <div className="space-y-3">
                    <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded-3xl skeleton"></div>
                    <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-3xl skeleton"></div>
                </div>
            </div>
        </div>
    )
}