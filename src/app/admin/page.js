"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation'; 
import { useAuth } from "../../context/AuthContext";
import { useAppModal } from "../../context/ModalContext"; // Import Global Modal
import { 
    Users, BookOpen, UserCheck, Shield, Mail, Trash2, Edit3, 
    Search, Plus, X, Save, Calendar, Award, CheckCircle2, AlertCircle, Loader2, ChevronDown, Camera,
    ArrowLeft, LayoutGrid, GraduationCap, School, LogOut 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminProfile() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const { showModal } = useAppModal(); // Use Global Modal

    const [stats, setStats] = useState({ students: 0, teachers: 0 });
    const [currentProfile, setCurrentProfile] = useState(user || {}); 
    const [loading, setLoading] = useState(true); // Main loading state

    const isSuperAdmin = user?.level == 1;
    const [activeTab, setActiveTab] = useState(isSuperAdmin ? 'suggestions' : 'students');
    const [dashboardView, setDashboardView] = useState(true);

    // Data States
    const [suggestions, setSuggestions] = useState([]);
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

    // Refs
    const addFormRef = useRef(null);
    const editFormRef = useRef(null);

    // --- 1. INITIAL FETCH ---
    useEffect(() => {
        async function loadInit() {
            try {
                // Stats & Classes
                const sRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php?action=get_stats`);
                const sJson = await sRes.json();
                if(sJson.status === 'success') setStats(sJson.data);

                const cRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php?action=get_classes`);
                const cJson = await cRes.json();
                if(cJson.status === 'success') setClasses(cJson.data);
                
                // Fetch fresh profile
                if (user?.id) {
                    const aRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php?action=get_admins`);
                    const aJson = await aRes.json();
                    if (aJson.status === 'success') {
                        const me = aJson.data.find(a => a.id == user.id);
                        if (me) setCurrentProfile(me);
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        if (user) loadInit();
    }, [user]);

    // --- 2. TAB DATA FETCHING ---
    useEffect(() => {
        if (activeTab === 'suggestions' && isSuperAdmin) fetchSuggestions();
        if (activeTab === 'teachers' && isSuperAdmin) fetchTeachers();
        if (activeTab === 'admins' && isSuperAdmin) fetchAdmins();
    }, [activeTab]);

    const fetchSuggestions = async () => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php?action=get_suggestions`);
        const json = await res.json();
        if(json.status === 'success') setSuggestions(json.data);
    };

    const fetchTeachers = async () => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php?action=get_teachers`);
        const json = await res.json();
        if(json.status === 'success') {
            setTeachers(json.data);
            setSubjects(json.subjects);
        }
    };

    const fetchAdmins = async () => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php?action=get_admins`);
        const json = await res.json();
        if(json.status === 'success') setAdmins(json.data);
    };

    const loadStudents = async (classId) => {
        setSelectedClass(classId);
        setStudentLoading(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php?action=get_students&class_id=${classId}`);
        const json = await res.json();
        if(json.status === 'success') setClassStudents(json.data);
        setStudentLoading(false);
    };

    // --- DETAILED FETCHERS ---
    const openStudentDetail = async (id) => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php?action=get_student_details&id=${id}`);
        const json = await res.json();
        if(json.status === 'success') {
            setDetailModal({ type: 'student', data: json.data });
            setEditMode(false);
        }
    };

    const openTeacherDetail = async (id) => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php?action=get_teacher_details&id=${id}`);
        const json = await res.json();
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
        
        // Show loading state or confirm? Direct save is usually fine, let's show success after.
        const fd = new FormData(editFormRef.current);
        
        let action = '';
        if (detailModal.type === 'student') action = 'save_student';
        if (detailModal.type === 'teacher') action = 'save_teacher';
        if (detailModal.type === 'admin') action = 'save_admin';
        
        fd.append('action', action);
        fd.append('id', detailModal.type === 'student' ? detailModal.data.profile.id : detailModal.data.id);

        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php`, { method: 'POST', body: fd });
            showModal("Success", "Changes saved successfully.", "success");
            setDetailModal(null);
            
            // Refresh logic
            if(activeTab === 'students') loadStudents(selectedClass);
            if(activeTab === 'teachers') fetchTeachers();
            if(activeTab === 'admins') fetchAdmins();
            
            if(detailModal.type === 'admin' && detailModal.data.id === user.id) {
                 const aRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php?action=get_admins`);
                 const aJson = await aRes.json();
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
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php`, { method: 'POST', body: fd });
            showModal("Added!", `New ${addModalType} added successfully.`, "success");
            setAddModalType(null);
            // Refresh
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
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php`, { method: 'POST', body: fd });
            showModal("Deleted", "Record deleted successfully.", "success");
            setDetailModal(null); // Close detail view if open
            
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

    // Helper for profile pics
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
            
            {/* --- DASHBOARD VIEW --- */}
            {dashboardView ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* PREMIUM PROFILE HEADER */}
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

                    {/* BENTO GRID LAYOUT */}
                    <div className="px-4 max-w-lg mx-auto">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className={`p-5 rounded-3xl border flex flex-col items-center justify-center gap-1 shadow-xl bg-white dark:bg-[#151515] border-gray-100 dark:border-neutral-800`}>
                                <span className={`text-4xl font-black ${isSuperAdmin ? 'text-amber-500' : 'text-indigo-600'}`}>{stats.students}</span>
                                <span className="text-[10px] text-gray-500 font-bold uppercase">Students</span>
                            </div>
                            <div className={`p-5 rounded-3xl border flex flex-col items-center justify-center gap-1 shadow-xl bg-white dark:bg-[#151515] border-gray-100 dark:border-neutral-800`}>
                                <span className={`text-4xl font-black ${isSuperAdmin ? 'text-pink-500' : 'text-pink-600'}`}>{stats.teachers}</span>
                                <span className="text-[10px] text-gray-500 font-bold uppercase">Teachers</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {isSuperAdmin && (
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
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                
                /* --- CONTENT VIEW (DRILL DOWN) --- */
                <div className="animate-in slide-in-from-right-8 duration-300">
                    
                    {/* STICKY HEADER */}
                    <div className="sticky top-0 z-50 px-4 py-4 flex items-center gap-4 border-b backdrop-blur-xl bg-white/80 dark:bg-black/80 border-gray-100 dark:border-neutral-800 text-gray-800 dark:text-white">
                        <button onClick={() => setDashboardView(true)} className="p-2 rounded-full bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h2 className="text-lg font-black capitalize">{activeTab}</h2>
                            <p className="text-[10px] opacity-60">Management Console</p>
                        </div>
                    </div>

                    <div className="px-4 mt-6">
                        {/* 1. SUGGESTIONS */}
                        {activeTab === 'suggestions' && isSuperAdmin && (
                            <div className="space-y-3">
                                {suggestions.length === 0 ? <p className="text-center text-gray-400 text-xs py-10">Inbox Empty</p> : 
                                suggestions.map(s => (
                                    <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} key={s.id} className="bg-white dark:bg-[#151515] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-3">
                                                <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${s.profile_pic || 'GMPSimages/default_student.png'}`} className="w-8 h-8 rounded-full object-cover bg-gray-100" loading="lazy"/>
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

                        {/* 2. STUDENTS MANAGER */}
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
                                    <button onClick={() => setAddModalType('student')} className="bg-indigo-50 dark:bg-indigo-900/10 border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400 min-h-[120px]">
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

                        {/* 3. TEACHERS MANAGER */}
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

                        {/* 4. ADMINS MANAGER */}
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

            {/* --- DETAILED VIEW MODAL --- */}
            <AnimatePresence>
                {detailModal && (
                    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div 
                            initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
                            className="bg-white dark:bg-[#151515] w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 h-[90vh] overflow-y-auto relative shadow-2xl no-scrollbar"
                        >
                            <button onClick={() => setDetailModal(null)} className="absolute top-4 right-4 bg-gray-100 dark:bg-gray-800 p-2 rounded-full z-10"><X size={20}/></button>
                            
                            <form ref={editFormRef} onSubmit={handleSave} className="space-y-6">
                                
                                {/* Header Image */}
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

                                {/* --- STUDENT FIELDS --- */}
                                {detailModal.type === 'student' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input label="Full Name" name="name" val={detailModal.data.profile.name} edit={editMode} />
                                            <Input label="DOB" name="dob" type="date" val={detailModal.data.profile.dob} edit={editMode} />
                                            <Input label="Father's Name" name="father_name" val={detailModal.data.profile.father_name} edit={editMode} />
                                            <Input label="Mother's Name" name="mother_name" val={detailModal.data.profile.mother_name} edit={editMode} />
                                            <Input label="Contact" name="contact" val={detailModal.data.profile.contact} edit={editMode} />
                                            <Input label="Roll No" name="roll_no" val={detailModal.data.profile.roll_no} edit={editMode} />
                                            <Input label="Login ID" name="login_id" val={detailModal.data.profile.login_id} edit={editMode} />
                                            {editMode && <Input label="New Password" name="password" type="password" placeholder="Leave blank to keep" edit={true} />}
                                        </div>
                                        <Input label="Address" name="address" val={detailModal.data.profile.address} edit={editMode} textArea />

                                        {!editMode && (
                                            <>
                                                {/* ATTENDANCE */}
                                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b dark:border-gray-800 pb-2 mt-6 mb-3">Attendance</h3>
                                                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-neutral-800 max-h-40 overflow-y-auto">
                                                    {[4,5,6,7,8,9,10,11,12,1,2,3].map((m) => {
                                                        const att = detailModal.data.attendance[m] || {days_present: '-', days_absent: '-'};
                                                        return (
                                                            <div key={m} className="flex justify-between text-xs py-2 border-b border-gray-200 dark:border-gray-800 last:border-0">
                                                                <span className="font-medium">{['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'][m - (m < 4 ? -9 : 4)]}</span>
                                                                <span className="text-green-600 font-bold">{att.days_present} P / {att.days_absent} A</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* EXAM RESULTS */}
                                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b dark:border-gray-800 pb-2 mt-6 mb-3">Exam Results</h3>
                                                {detailModal.data.exams.map(exam => (
                                                    <div key={exam.id} className="mb-4">
                                                        <h4 className="text-xs font-bold mb-1">{exam.name} <span className="text-gray-400 font-normal">(Max: {exam.max_marks})</span></h4>
                                                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl overflow-hidden border border-gray-100 dark:border-neutral-800">
                                                            {exam.results.length > 0 ? exam.results.map((res, i) => (
                                                                <div key={i} className="flex justify-between text-xs p-2 border-b border-gray-200 dark:border-gray-800 last:border-0">
                                                                    <span>{res.subject}</span>
                                                                    <span className="font-bold">{res.marks_obtained}</span>
                                                                </div>
                                                            )) : <div className="p-2 text-xs text-gray-400 text-center">No marks available</div>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </>
                                )}

                                {/* --- TEACHER FIELDS --- */}
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

                                {/* --- ADMIN FIELDS --- */}
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

                                {/* Delete Button */}
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

            {/* --- ADD NEW MODAL --- */}
            <AnimatePresence>
                {addModalType && (
                    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div 
                            initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
                            className="bg-white dark:bg-[#151515] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl h-[80vh] overflow-y-auto no-scrollbar"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg">Add New {addModalType}</h3>
                                <button onClick={() => setAddModalType(null)} className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full"><X size={20}/></button>
                            </div>
                            
                            <form ref={addFormRef} onSubmit={handleAdd} className="space-y-4">
                                <Input label="Full Name" name="name" required edit={true} />
                                <Input label="Login ID" name="login_id" required edit={true} />
                                <Input label="Password" name="password" type="password" required edit={true} />
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

// Reusable Input Component
const Input = ({ label, name, val, edit, type = "text", textArea = false, placeholder, required }) => (
    <div className="space-y-1">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>
        {edit ? (
            textArea ? (
                <textarea name={name} defaultValue={val} className="w-full p-3 bg-gray-50 dark:bg-neutral-900 border-2 border-gray-100 dark:border-neutral-800 rounded-xl text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all dark:text-white" rows="2" />
            ) : (
                <input type={type} name={name} defaultValue={val} placeholder={placeholder} required={required} className="w-full p-3 bg-gray-50 dark:bg-neutral-900 border-2 border-gray-100 dark:border-neutral-800 rounded-xl text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all dark:text-white" />
            )
        ) : (
            <div className="text-sm font-bold text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-neutral-800 pb-1">{val || '-'}</div>
        )}
    </div>
);

// --- SKELETON COMPONENT ---
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