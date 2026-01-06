"use client";
import { useEffect, useState, useRef } from 'react';
import { useAuth } from "../../context/AuthContext";
import { useAppModal } from "../../context/ModalContext"; // Import Global Modal
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  LogOut, Plus, Trash2, Save, User, Calendar, 
  BookOpen, CheckSquare, BarChart2, Award, FileText, Upload,
  Users, ChevronDown, ChevronUp, Image as ImageIcon, X,
  AlertCircle, CheckCircle, Clock, Phone, Hash, Layers, 
  Search, ArrowLeft, MoreVertical, Edit3, MapPin, Printer, ChevronRight
} from 'lucide-react';

// --- CUSTOM APP-STYLE DROPDOWN COMPONENT ---
function CustomSelect({ options, value, onChange, placeholder, allowManual = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedLabel = options.find(o => o.value == value)?.label || value || placeholder;

    const filteredOptions = options.filter(o => 
        o.label.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative w-full" ref={ref}>
            <div 
                onClick={() => setIsOpen(!isOpen)} 
                className="w-full p-3 bg-gray-50 dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-800 flex justify-between items-center cursor-pointer active:scale-[0.99] transition-transform"
            >
                <span className={`text-sm font-bold truncate ${!value ? 'text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                    {selectedLabel}
                </span>
                <ChevronDown size={16} className="text-gray-400"/>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden"
                    >
                        <div className="p-2 border-b border-gray-50 dark:border-gray-800 sticky top-0 bg-white dark:bg-[#1a1a1a]">
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                className="w-full text-xs p-2 bg-gray-50 dark:bg-black rounded-lg outline-none text-gray-800 dark:text-white"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="max-h-48 overflow-y-auto custom-scrollbar">
                            {/* Option to clear */}
                            <div 
                                onClick={() => { onChange(''); setIsOpen(false); }}
                                className="px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer font-bold border-b border-gray-50 dark:border-gray-800"
                            >
                                Clear Selection
                            </div>

                            {filteredOptions.length > 0 ? filteredOptions.map((opt) => (
                                <div 
                                    key={opt.value} 
                                    onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}
                                    className={`px-4 py-3 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${value == opt.value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-bold' : 'text-gray-700 dark:text-gray-300'}`}
                                >
                                    {opt.label}
                                </div>
                            )) : (
                                <div className="p-4 text-center text-xs text-gray-400">No results found</div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function TeacherPage() {
    const { user, logout } = useAuth();
    const { showModal } = useAppModal(); // Use Global Modal
    const router = useRouter();
    const [dashboardData, setDashboardData] = useState(null);
    const [activeSection, setActiveSection] = useState('profile');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function init() {
            if (!user?.id) return;
            const fd = new FormData();
            fd.append('action', 'fetch_dashboard');
            fd.append('teacher_id', user.id);
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
            const json = await res.json();
            if(json.status === 'success') setDashboardData(json);
            setLoading(false);
        }
        init();
    }, [user]);

    // --- LOGOUT HANDLER ---
    const handleLogout = () => {
        showModal("Logout", "Are you sure you want to log out?", "danger", logout);
    };

    if(loading || !dashboardData) return <TeacherSkeleton />;

    const { profile, students, student_count, all_classes } = dashboardData;
    const isClassTeacher = !!profile.assigned_class_id;
    const classId = profile.assigned_class_id;

    // --- HEADER (FIXED & MINIMAL) ---
    const Header = () => (
        <div className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-5 py-4 flex justify-between items-center shadow-sm">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Teacher Profile</h1>
            <button 
                onClick={handleLogout} 
                className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-full text-xs font-bold transition-colors hover:bg-red-100 dark:hover:bg-red-900/30"
            >
                <LogOut size={14} /> Logout
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] text-gray-800 dark:text-gray-100 font-sans pb-24 relative flex flex-col h-screen overflow-hidden">
            
            {activeSection === 'profile' && <Header />}

            <div className="flex-1 overflow-y-auto">
                {activeSection === 'profile' && (
                    <div className="p-4 space-y-4 animate-in fade-in zoom-in duration-300">
                        
                        {/* 1. TEACHER PROFILE CARD (Updated Style) */}
                        <div className="relative mb-6">
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-500/25 relative overflow-hidden">
                                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                                <div className="relative z-10 flex flex-col items-center text-center">
                                    <div className="w-24 h-24 rounded-full border-4 border-white/30 p-1 mb-3">
                                        <img 
                                            src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${profile.profile_pic}`} 
                                            className="w-full h-full rounded-full object-cover bg-gray-200" 
                                            alt="Profile"
                                            loading="lazy"
                                        />
                                    </div>
                                    <h2 className="text-2xl font-black leading-tight">{profile.name}</h2>
                                    <p className="text-indigo-100 text-sm font-medium mb-3">{profile.login_id} | {profile.contact}</p>
                                    
                                    <div className="flex gap-2 mb-4">
                                        <span className="bg-black/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold border border-white/10">
                                            {isClassTeacher ? `Class Teacher: ${profile.class_name}` : 'Subject Teacher'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. BENTO GRID ACTIONS */}
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setActiveSection('create_post')} className="col-span-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-5 rounded-2xl shadow-lg flex items-center justify-between active:scale-95 transition-transform">
                                <div className="text-left"><h3 className="font-bold text-lg">Create Update</h3><p className="text-blue-100 text-xs opacity-90">Homework, Notices & Files</p></div>
                                <div className="bg-white/20 p-3 rounded-full"><FileText size={24} /></div>
                            </button>

                            <button onClick={() => setActiveSection('recent_posts')} className="bg-white dark:bg-[#151515] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform h-32">
                                <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 p-2.5 rounded-full"><Clock size={22} /></div>
                                <span className="font-bold text-sm text-gray-800 dark:text-white">History</span>
                            </button>

                            {isClassTeacher ? (
                                <button onClick={() => setActiveSection('my_students')} className="bg-white dark:bg-[#151515] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform h-32">
                                    <div className="bg-green-50 dark:bg-green-900/20 text-green-600 p-2.5 rounded-full"><Users size={22} /></div>
                                    <div className="text-center"><span className="font-bold text-sm text-gray-800 dark:text-white">My Students</span><span className="block text-[10px] text-gray-400 font-bold">{student_count} Active</span></div>
                                </button>
                            ) : (
                                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center opacity-60 h-32">
                                    <Users size={22} className="mb-2 text-gray-400"/><span className="text-[10px] font-bold text-gray-400">Class Teacher Only</span>
                                </div>
                            )}

                            {isClassTeacher && (
                                <button onClick={() => router.push('/attendance?source=twa')} className="bg-white dark:bg-[#151515] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform h-32">
                                    <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 p-2.5 rounded-full"><CheckSquare size={22} /></div>
                                    <span className="font-bold text-sm text-gray-800 dark:text-white">Attendance</span>
                                </button>
                            )}

                            {isClassTeacher && ['marks', 'timetable', 'report_cards', 'toppers'].map(item => (
                                <button key={item} onClick={() => setActiveSection(item)} className="bg-white dark:bg-[#151515] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform h-32">
                                    <div className={`p-2.5 rounded-full ${
                                        item==='marks'?'bg-pink-50 text-pink-600 dark:bg-pink-900/20':
                                        item==='timetable'?'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20':
                                        item==='report_cards'?'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20':
                                        'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20'
                                    }`}>
                                        {item==='marks'?<BarChart2 size={22}/>:item==='timetable'?<Calendar size={22}/>:item==='report_cards'?<Printer size={22}/>:<Award size={22}/>}
                                    </div>
                                    <span className="font-bold text-sm text-gray-800 dark:text-white capitalize">{item.replace('_',' ')}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- SECTIONS --- */}
                {activeSection !== 'profile' && (
                    <div className="animate-in slide-in-from-bottom-4 duration-300 h-full">
                        {activeSection === 'create_post' && <CreatePostSection teacherId={user.id} isClassTeacher={isClassTeacher} students={students} allClasses={all_classes} onBack={() => setActiveSection('profile')} showModal={showModal} />}
                        {activeSection === 'recent_posts' && <RecentPostsSection teacherId={user.id} onBack={() => setActiveSection('profile')} showModal={showModal} />}
                        {activeSection === 'my_students' && <MyStudentsSection teacherId={user.id} students={students} onBack={() => setActiveSection('profile')} showModal={showModal} />}
                        
                        {/* New Feature Sections */}
                        {activeSection === 'marks' && <MarksSection classId={classId} onBack={() => setActiveSection('profile')} showModal={showModal} />}
                        {activeSection === 'timetable' && <TimetableSection classId={classId} onBack={() => setActiveSection('profile')} showModal={showModal} />}
                        {activeSection === 'report_cards' && <ReportCardsSection classId={classId} onBack={() => setActiveSection('profile')} showModal={showModal} />}
                        {activeSection === 'toppers' && <ToppersSection classId={classId} students={students} onBack={() => setActiveSection('profile')} showModal={showModal} />}
                    </div>
                )}
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: MARKS ENTRY
// ----------------------------------------------------------------------
function MarksSection({ classId, onBack, showModal }) {
    const [exams, setExams] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [selectedExam, setSelectedExam] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [studentMarks, setStudentMarks] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function loadOptions() {
             const fd = new FormData(); fd.append('action', 'fetch_timetable'); fd.append('class_id', classId);
             const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
             const json = await res.json();
             if(json.status==='success') setSubjects(json.subjects.map(s => ({ value: s.code, label: s.name })));

             const fd2 = new FormData(); fd2.append('action', 'fetch_exams_status'); fd2.append('class_id', classId);
             const res2 = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd2 });
             const json2 = await res2.json();
             if(json2.status==='success') setExams(json2.data.map(e => ({ value: e.id, label: e.name })));
        }
        loadOptions();
    }, [classId]);

    const loadSheet = async () => {
        if(!selectedExam || !selectedSubject) return;
        setLoading(true);
        const fd = new FormData(); fd.append('action', 'fetch_marks_sheet'); fd.append('class_id', classId); fd.append('exam_id', selectedExam); fd.append('subject_code', selectedSubject);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
        const json = await res.json();
        if(json.status==='success') setStudentMarks(json.data);
        setLoading(false);
    };

    const saveBulkMarks = async () => {
        const marksData = {};
        studentMarks.forEach(s => { if(s.marks_obtained !== null) marksData[s.id] = s.marks_obtained; });
        const fd = new FormData(); fd.append('action', 'save_marks_bulk'); fd.append('exam_id', selectedExam); fd.append('subject_code', selectedSubject); fd.append('marks_data', JSON.stringify(marksData));
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
        showModal("Saved", "Marks updated successfully.", "success");
    };

    return (
        <div className="bg-gray-50 dark:bg-[#0a0a0a] h-full flex flex-col">
            <div className="sticky top-0 bg-white dark:bg-[#151515] z-40 px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4 shadow-sm shrink-0">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft size={20} className="dark:text-white"/></button>
                <h2 className="text-lg font-black text-gray-800 dark:text-white">Marks Entry</h2>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
                <div className="bg-white dark:bg-[#151515] p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm mb-4 space-y-3">
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Select Exam</label>
                        <CustomSelect options={exams} value={selectedExam} onChange={setSelectedExam} placeholder="Choose Exam..." />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Select Subject</label>
                        <CustomSelect options={subjects} value={selectedSubject} onChange={setSelectedSubject} placeholder="Choose Subject..." />
                    </div>
                    <button onClick={loadSheet} disabled={!selectedExam || !selectedSubject} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/30">Load Sheet</button>
                </div>
                {loading ? <div className="text-center py-10 dark:text-gray-400">Loading...</div> : (
                    <div className="space-y-2">
                        {studentMarks.map(stu => (
                            <div key={stu.id} className="flex items-center justify-between bg-white dark:bg-[#151515] p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                                <div><p className="font-bold text-sm dark:text-white">{stu.name}</p><p className="text-xs text-gray-400">Roll: {stu.roll_no}</p></div>
                                <input type="number" value={stu.marks_obtained || ''} placeholder="-" onChange={e => setStudentMarks(p => p.map(s => s.id === stu.id ? { ...s, marks_obtained: e.target.value } : s))} className="w-16 p-2 text-center font-bold bg-gray-50 dark:bg-black rounded-lg border-none outline-none dark:text-white"/>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {studentMarks.length > 0 && <div className="p-4 bg-white dark:bg-[#151515] border-t border-gray-100 dark:border-gray-800"><button onClick={saveBulkMarks} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"><Save size={18}/> Save All Marks</button></div>}
        </div>
    );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: TIMETABLE
// ----------------------------------------------------------------------
function TimetableSection({ classId, onBack, showModal }) {
    const [timetable, setTimetable] = useState({});
    const [subjectOptions, setSubjectOptions] = useState([]);
    const [editing, setEditing] = useState(false);
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const periods = [1,2,3,4,5,6,7,8];

    useEffect(() => {
        async function load() {
            const fd = new FormData(); fd.append('action', 'fetch_timetable'); fd.append('class_id', classId);
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
            const json = await res.json();
            if(json.status==='success') {
                setTimetable(json.timetable);
                setSubjectOptions(json.subjects.map(s => ({ value: s.code, label: s.name })));
            }
        }
        load();
    }, [classId]);

    const getSubjectName = (code) => subjectOptions.find(o => o.value === code)?.label || code || '-';

    const saveTimetable = async () => {
        const fd = new FormData(); fd.append('action', 'save_timetable'); fd.append('class_id', classId); fd.append('timetable_data', JSON.stringify(timetable));
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
        setEditing(false); showModal("Saved", "Timetable updated.", "success");
    };

    return (
        <div className="bg-gray-50 dark:bg-[#0a0a0a] h-full flex flex-col">
            <div className="sticky top-0 bg-white dark:bg-[#151515] z-40 px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft size={20} className="dark:text-white"/></button>
                    <h2 className="text-lg font-black text-gray-800 dark:text-white">Timetable</h2>
                </div>
                <button onClick={() => editing ? saveTimetable() : setEditing(true)} className={`text-xs font-bold px-3 py-1.5 rounded-lg ${editing ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{editing ? 'Save' : 'Edit'}</button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
                <div className="bg-white dark:bg-[#151515] rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-center border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                                    <th className="p-3 border-r border-blue-100 dark:border-blue-900/30 sticky left-0 bg-blue-50 dark:bg-blue-900/20 z-10 w-24">Day</th>
                                    {periods.map(p => <th key={p} className="p-3 border-r border-blue-100 dark:border-blue-900/30 w-32">P{p}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {days.map(day => (
                                    <tr key={day} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                                        <td className="p-3 font-bold text-left bg-gray-50 dark:bg-gray-900 sticky left-0 z-10 border-r border-gray-100 dark:border-gray-800 dark:text-white">{day.substring(0,3)}</td>
                                        {periods.map(p => (
                                            <td key={p} className="p-1 border-r border-gray-100 dark:border-gray-800">
                                                {editing ? (
                                                    <div className="w-full min-w-[100px]">
                                                        <CustomSelect 
                                                            options={subjectOptions} 
                                                            value={timetable[day]?.[p] || ''} 
                                                            onChange={(val) => setTimetable(prev => ({ ...prev, [day]: { ...prev[day], [p]: val } }))}
                                                            placeholder="-"
                                                        />
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-500 dark:text-gray-400 font-medium block p-2">{getSubjectName(timetable[day]?.[p])}</span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: REPORT CARDS (Publishing)
// ----------------------------------------------------------------------
function ReportCardsSection({ classId, onBack, showModal }) {
    const [exams, setExams] = useState([]);

    useEffect(() => {
        const load = async () => {
             const fd = new FormData(); fd.append('action', 'fetch_exams_status'); fd.append('class_id', classId);
             const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
             const json = await res.json();
             if(json.status==='success') setExams(json.data);
        }
        load();
    }, [classId]);

    const togglePublish = async (eid, currentStatus) => {
        const newStatus = currentStatus == 1 ? 0 : 1;
        const fd = new FormData(); fd.append('action', 'toggle_publish'); fd.append('class_id', classId); fd.append('exam_id', eid); fd.append('status', newStatus);
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
        setExams(prev => prev.map(e => e.id === eid ? { ...e, is_published: newStatus } : e));
    };

    return (
        <div className="bg-gray-50 dark:bg-[#0a0a0a] h-full flex flex-col">
            <div className="sticky top-0 bg-white dark:bg-[#151515] z-40 px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4 shadow-sm shrink-0">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft size={20} className="dark:text-white"/></button>
                <h2 className="text-lg font-black text-gray-800 dark:text-white">Report Cards</h2>
            </div>
            <div className="p-4 flex-1 overflow-auto">
                <div className="space-y-3">
                    {exams.map(ex => (
                        <div key={ex.id} className="bg-white dark:bg-[#151515] p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex justify-between items-center shadow-sm">
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white">{ex.name}</h4>
                                <p className={`text-xs font-bold ${ex.is_published == 1 ? 'text-green-600' : 'text-gray-400'}`}>
                                    {ex.is_published == 1 ? 'Live to Students' : 'Hidden'}
                                </p>
                            </div>
                            <button 
                                onClick={() => togglePublish(ex.id, ex.is_published)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${ex.is_published == 1 ? 'bg-green-500' : 'bg-gray-300'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${ex.is_published == 1 ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: TOPPERS
// ----------------------------------------------------------------------
function ToppersSection({ classId, students, onBack, showModal }) {
    const [toppers, setToppers] = useState({});
    const [showToppers, setShowToppers] = useState(false);
    const [studentOptions, setStudentOptions] = useState([]);

    useEffect(() => {
        setStudentOptions(students.map(s => ({ value: s.id, label: s.name })));
        async function load() {
            const fd = new FormData(); fd.append('action', 'fetch_toppers'); fd.append('class_id', classId);
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
            const json = await res.json();
            if(json.status==='success') { setToppers(json.toppers); setShowToppers(json.show_toppers == 1); }
        }
        load();
    }, [classId, students]);

    const saveToppers = async () => {
        const ranksData = {};
        [1,2,3].forEach(r => ranksData[r] = { sid: toppers[r]?.student_id || 0, pct: toppers[r]?.percentage || '' });
        const fd = new FormData(); fd.append('action', 'save_toppers'); fd.append('class_id', classId); fd.append('show_toppers', showToppers ? 1 : 0); fd.append('ranks_data', JSON.stringify(ranksData));
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
        showModal("Saved", "Toppers updated.", "success");
    };

    return (
        <div className="bg-gray-50 dark:bg-[#0a0a0a] h-full flex flex-col">
            <div className="sticky top-0 bg-white dark:bg-[#151515] z-40 px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft size={20} className="dark:text-white"/></button>
                    <h2 className="text-lg font-black text-gray-800 dark:text-white">Toppers</h2>
                </div>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
                <div className="bg-white dark:bg-[#151515] p-4 rounded-xl border border-gray-100 dark:border-gray-800 mb-6 flex justify-between items-center shadow-sm">
                    <span className="font-bold text-sm dark:text-white">Show on App Home</span>
                    <button onClick={() => setShowToppers(!showToppers)} className={`w-12 h-6 rounded-full p-1 transition-colors ${showToppers ? 'bg-blue-600' : 'bg-gray-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${showToppers ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map(rank => (
                        <div key={rank} className="bg-white dark:bg-[#151515] p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-1 h-full ${rank===1?'bg-yellow-400':rank===2?'bg-gray-400':'bg-orange-400'}`}></div>
                            <h4 className="font-bold mb-3 dark:text-white flex items-center gap-2">
                                <span className="text-lg">
                                    {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                                </span> 
                                Rank {rank}
                            </h4>                            
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Student</label>
                                    <CustomSelect 
                                        options={studentOptions} 
                                        value={toppers[rank]?.student_id || ''} 
                                        onChange={(val) => setToppers(p => ({ ...p, [rank]: { ...p[rank], student_id: val } }))}
                                        placeholder="Select Student..."
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Percent</label>
                                    <input type="text" placeholder="%" className="w-full p-3 bg-gray-50 dark:bg-black rounded-xl border-none outline-none text-sm dark:text-white font-bold"
                                        value={toppers[rank]?.percentage || ''}
                                        onChange={e => setToppers(p => ({ ...p, [rank]: { ...p[rank], percentage: e.target.value } }))}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="p-4 bg-white dark:bg-[#151515] border-t border-gray-100 dark:border-gray-800">
                <button onClick={saveToppers} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"><Save size={18}/> Update Toppers</button>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: MY STUDENTS
// ----------------------------------------------------------------------
function MyStudentsSection({ teacherId, students, onBack, showModal }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);

    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.login_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-gray-50 dark:bg-[#0a0a0a] h-full flex flex-col">
            <div className="sticky top-0 bg-white dark:bg-[#151515] z-40 px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4 shadow-sm shrink-0">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft size={20} className="dark:text-white" /></button>
                <div className="flex-1">
                    <h2 className="text-lg font-black text-gray-800 dark:text-white">My Students</h2>
                    <p className="text-xs text-gray-400 font-bold">{students.length} Total</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="bg-white dark:bg-[#151515] p-3 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center gap-2 mb-4 shadow-sm sticky top-0 z-30">
                    <Search size={18} className="text-gray-400" />
                    <input 
                        type="text" placeholder="Search by name or ID..." 
                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none outline-none w-full text-sm font-medium dark:text-white"
                    />
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {filteredStudents.map(stu => (
                        <div key={stu.id} onClick={() => setSelectedStudent(stu.id)} className="bg-white dark:bg-[#151515] p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center gap-4 active:scale-98 transition-transform cursor-pointer shadow-sm">
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden border border-gray-100 dark:border-gray-700">
                                <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${stu.profile_pic || 'GMPSimages/default_student.png'}`} className="w-full h-full object-cover" loading="lazy" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-900 dark:text-white">{stu.name}</h4>
                                <div className="flex gap-2 mt-1">
                                    <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 px-2 py-0.5 rounded">Roll: {stu.roll_no || '-'}</span>
                                    <span className="text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded">{stu.login_id}</span>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-gray-300" />
                        </div>
                    ))}
                </div>
            </div>

            <AnimatePresence>
                {selectedStudent && (
                    <StudentDetailView 
                        studentId={selectedStudent} 
                        teacherId={teacherId}
                        onClose={() => setSelectedStudent(null)} 
                        showModal={showModal}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: STUDENT DEEP DETAIL VIEW
// ----------------------------------------------------------------------
function StudentDetailView({ studentId, teacherId, onClose, showModal }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [tab, setTab] = useState('profile'); 
    const [selectedMonth, setSelectedMonth] = useState(null); 
    const [monthLogs, setMonthLogs] = useState([]);
    
    const [modifiedMarks, setModifiedMarks] = useState({}); 
    const [modifiedAttendance, setModifiedAttendance] = useState([]); 

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const fd = new FormData();
                fd.append('action', 'fetch_student_full_detail');
                fd.append('student_id', studentId);
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
                const json = await res.json();
                if(json.status === 'success') {
                    setData(json);
                } else {
                    setError(true);
                }
            } catch (e) { console.error(e); setError(true); }
            setLoading(false);
        };
        fetchDetails();
    }, [studentId]);

    const loadMonthLogs = async (month) => {
        if(selectedMonth === month) { setSelectedMonth(null); return; }
        setSelectedMonth(month);
        const fd = new FormData();
        fd.append('action', 'fetch_student_month_detail');
        fd.append('student_id', studentId);
        fd.append('month', month);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
        const json = await res.json();
        if(json.status === 'success') setMonthLogs(json.logs);
        setModifiedAttendance([]); 
    };

    const toggleAttendanceDay = (date, currentStatus) => {
        const dayOfWeek = new Date(date).getDay();
        if (dayOfWeek === 0) return; 
        if (currentStatus === 'holiday') return; 

        const newStatus = currentStatus === 'present' ? 'absent' : 'present';
        setMonthLogs(prev => prev.map(l => l.date === date ? { ...l, status: newStatus } : l));
        setModifiedAttendance(prev => {
            const filtered = prev.filter(p => p.date !== date);
            return [...filtered, { date, status: newStatus }];
        });
    };

    const saveAttendanceChanges = async () => {
        if (modifiedAttendance.length === 0) return;
        const promises = modifiedAttendance.map(log => {
            const fd = new FormData();
            fd.append('action', 'update_student_day_attendance');
            fd.append('student_id', studentId);
            fd.append('date', log.date);
            fd.append('status', log.status);
            fd.append('teacher_id', teacherId);
            fd.append('class_id', data.student.class_id);
            return fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
        });
        await Promise.all(promises);
        setModifiedAttendance([]);
        showModal("Saved", "Attendance updated successfully.", "success");
    };

    const handleMarkChange = (examId, subjectCode, newVal) => {
        setModifiedMarks(prev => ({
            ...prev,
            [examId]: {
                ...(prev[examId] || {}),
                [subjectCode]: newVal
            }
        }));
    };

    const saveMarksForExam = async (examId) => {
        const changes = modifiedMarks[examId];
        if (!changes) return;
        const fd = new FormData();
        fd.append('action', 'update_student_marks');
        fd.append('student_id', studentId);
        fd.append('exam_id', examId);
        fd.append('marks', JSON.stringify(changes));
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
        const newMod = { ...modifiedMarks };
        delete newMod[examId];
        setModifiedMarks(newMod);
        showModal("Saved", "Exam marks updated successfully.", "success");
    };

    if(loading) return <div className="fixed inset-0 bg-white dark:bg-[#101010] z-50 flex justify-center items-center"><div className="w-8 h-8 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div></div>;
    if(error || !data) return <div className="fixed inset-0 bg-white dark:bg-[#101010] z-50 flex flex-col justify-center items-center"><p className="text-red-500 font-bold mb-4">Failed to load student data.</p><button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg text-sm font-bold">Close</button></div>;

    const { student, attendance, marks } = data;

    return (
        <motion.div 
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-[#F2F6FA] dark:bg-[#0a0a0a] z-50 flex flex-col overflow-hidden"
        >
            <div className="bg-white dark:bg-[#151515] px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4 shadow-sm shrink-0">
                <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft size={20} className="dark:text-white"/></button>
                <div className="flex items-center gap-3">
                    <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${student.profile_pic}`} className="w-8 h-8 rounded-full object-cover bg-gray-200" loading="lazy" />
                    <h2 className="text-sm font-black text-gray-800 dark:text-white">{student.name}</h2>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="bg-white dark:bg-[#151515] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 text-center">
                    <div className="w-24 h-24 mx-auto rounded-full p-1 bg-gradient-to-tr from-blue-500 to-purple-500 mb-3">
                        <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${student.profile_pic}`} className="w-full h-full rounded-full object-cover border-4 border-white dark:border-[#151515] bg-white" loading="lazy" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">{student.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Roll No: {student.roll_no} | {student.login_id}</p>
                </div>

                <div className="flex p-1 bg-white dark:bg-[#151515] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                    {['profile', 'attendance', 'marks'].map(t => (
                        <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2.5 text-xs font-bold rounded-lg capitalize transition-all ${tab===t ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>{t}</button>
                    ))}
                </div>

                {tab === 'profile' && (
                    <div className="bg-white dark:bg-[#151515] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-4">
                        <InfoRow label="Father" value={student.father_name} icon={User} />
                        <InfoRow label="Mother" value={student.mother_name} icon={User} />
                        <InfoRow label="Contact" value={student.contact} icon={Phone} />
                        <InfoRow label="Address" value={student.address} icon={MapPin} />
                        <InfoRow label="Admission Year" value={student.admission_year} icon={Calendar} />
                    </div>
                )}

                {tab === 'attendance' && (
                    <div className="space-y-3">
                        {attendance && Object.entries(attendance).map(([m, stats]) => (
                            <div key={m} className="bg-white dark:bg-[#151515] rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
                                <button onClick={() => loadMonthLogs(m)} className="w-full flex justify-between items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-900">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 p-2 rounded-lg font-bold text-xs w-10 text-center">{new Date(0, m-1).toLocaleString('default', {month:'short'})}</div>
                                        <div className="text-left">
                                            <div className="text-xs text-gray-400 font-bold uppercase">Summary</div>
                                            <div className="text-sm font-bold dark:text-white"><span className="text-green-600">{stats.present} P</span> 窶｢ <span className="text-red-500">{stats.absent} A</span></div>
                                        </div>
                                    </div>
                                    {selectedMonth == m ? <ChevronUp size={18} className="dark:text-white"/> : <ChevronDown size={18} className="dark:text-white"/>}
                                </button>
                                {selectedMonth == m && (
                                    <div className="bg-gray-50 dark:bg-black p-3 border-t border-gray-100 dark:border-gray-800">
                                        <div className="grid grid-cols-5 gap-2 mb-4">
                                            {monthLogs.map((log) => {
                                                const isSun = new Date(log.date).getDay() === 0;
                                                const isHol = log.status === 'holiday';
                                                
                                                return (
                                                    <button 
                                                        key={log.date} 
                                                        onClick={() => toggleAttendanceDay(log.date, log.status)}
                                                        disabled={isSun || isHol}
                                                        className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-bold transition-all ${
                                                            isHol ? 'bg-red-50 dark:bg-red-900/10 border-red-200 text-red-400 opacity-70 cursor-not-allowed' :
                                                            isSun ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 text-orange-400 opacity-60 cursor-not-allowed' :
                                                            log.status === 'present' ? 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' : 
                                                            'bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                                                        }`}
                                                    >
                                                        <span>{new Date(log.date).getDate()}</span>
                                                        <span className="uppercase text-[8px] opacity-80">{log.status.substring(0,1)}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                        {/* SAVE BUTTON FOR ATTENDANCE */}
                                        {modifiedAttendance.length > 0 && (
                                            <button 
                                                onClick={saveAttendanceChanges}
                                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
                                            >
                                                <Save size={16}/> Save Changes
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                        {(!attendance || Object.keys(attendance).length === 0) && <p className="text-center text-gray-400 text-sm py-4">No attendance data found.</p>}
                    </div>
                )}

                {tab === 'marks' && (
                    <div className="space-y-4">
                        {marks && marks.map((exam) => (
                            <div key={exam.id} className="bg-white dark:bg-[#151515] rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                                <div className="bg-gray-50 dark:bg-[#1a1a1a] p-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                    <h4 className="font-bold text-sm dark:text-white">{exam.name}</h4>
                                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">Max: {exam.max_marks}</span>
                                </div>
                                <div className="p-3 space-y-3">
                                    {exam.subjects.map(sub => (
                                        <div key={sub.code} className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-600 dark:text-gray-400 w-1/2">{sub.name}</span>
                                            <input 
                                                type="number" 
                                                defaultValue={sub.marks_obtained}
                                                onChange={(e) => handleMarkChange(exam.id, sub.code, e.target.value)}
                                                className="w-20 p-2 text-center text-sm font-bold rounded-lg border border-gray-200 bg-gray-50 focus:ring-2 ring-blue-50 outline-none dark:bg-black dark:text-white dark:border-gray-700"
                                            />
                                        </div>
                                    ))}
                                    {/* SAVE BUTTON FOR MARKS (Per Exam) */}
                                    {modifiedMarks[exam.id] && (
                                        <button 
                                            onClick={() => saveMarksForExam(exam.id)}
                                            className="w-full mt-2 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-md active:scale-95 transition-transform"
                                        >
                                            Save {exam.name} Marks
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {(!marks || marks.length === 0) && <p className="text-center text-gray-400 text-sm py-4">No marks data found.</p>}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: CREATE POST
// ----------------------------------------------------------------------
function CreatePostSection({ teacherId, isClassTeacher, students, allClasses, onBack, showModal }) {
    const [mode, setMode] = useState(isClassTeacher ? 'daily' : 'general');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [submitting, setSubmitting] = useState(false);

    const [cw, setCw] = useState([{ heading: '', content: '' }]);
    const [hw, setHw] = useState([{ heading: '', content: '' }]);
    const [def, setDef] = useState([{ heading: '', students: [] }]);
    const [gen, setGen] = useState([{ heading: '', content: '' }]);
    const [selectedClasses, setSelectedClasses] = useState([]);

    const handleSubmitClick = () => {
        if(mode === 'general' && selectedClasses.length === 0) return alert("Select at least one class!");
        showModal("Publish Update?", "Are you sure you want to publish this update?", "neutral", executeSubmit);
    };

    const executeSubmit = async () => {
        setSubmitting(true);
        const fd = new FormData();
        fd.append('action', 'create_post');
        fd.append('teacher_id', teacherId);
        fd.append('post_date', date);
        fd.append('post_type', mode);

        if(mode === 'general') fd.append('target_classes', JSON.stringify(selectedClasses.includes('all') ? 'all' : selectedClasses));

        const appendItems = (prefix, items, fileKey) => {
            items.forEach((item, idx) => {
                if(!item.heading) return;
                fd.append(`${prefix}_heading[${idx}]`, item.heading);
                if(item.content) fd.append(`${prefix}_content[${idx}]`, item.content);
                const fileInput = document.getElementById(`${fileKey}_${idx}`);
                if(fileInput && fileInput.files.length > 0) {
                    for (let i = 0; i < fileInput.files.length; i++) fd.append(`${fileKey}[${idx}][]`, fileInput.files[i]);
                }
            });
        };

        if(mode === 'daily') {
            appendItems('cw', cw, 'cw_files');
            appendItems('hw', hw, 'hw_files');
            def.forEach((item, idx) => {
                if(item.heading) {
                    fd.append(`def_heading[${idx}]`, item.heading);
                    fd.append(`def_students[${idx}]`, JSON.stringify(item.students));
                }
            });
        } else {
            appendItems('gen', gen, 'gen_files');
        }

        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
            showModal("Posted!", "Your update is now live.", "success");
            onBack();
        } catch(e) { alert("Error posting"); }
        setSubmitting(false);
    };

    return (
        <div className="pb-20">
            <div className="sticky top-0 bg-white dark:bg-[#151515] z-40 px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4 shadow-sm">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><X size={20} className="dark:text-white" /></button>
                <h2 className="text-lg font-black text-gray-800 dark:text-white">Create Update</h2>
            </div>
            <div className="p-4 space-y-6">
                <div className="bg-gray-100 dark:bg-gray-900 p-1 rounded-xl flex">
                    {isClassTeacher && <button onClick={()=>setMode('daily')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode==='daily'?'bg-white dark:bg-[#151515] shadow text-blue-600':'text-gray-500 dark:text-gray-400'}`}>Daily Update</button>}
                    <button onClick={()=>setMode('general')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode==='general'?'bg-white dark:bg-[#151515] shadow text-blue-600':'text-gray-500 dark:text-gray-400'}`}>General Notice</button>
                </div>
                <div className="bg-white dark:bg-[#151515] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <label className="text-xs font-bold text-gray-400 uppercase">Date</label>
                    <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full mt-1 p-2 bg-gray-50 dark:bg-[#0a0a0a] rounded-lg font-bold outline-none dark:text-white"/>
                </div>
                {mode === 'daily' && isClassTeacher ? (
                    <div className="space-y-6">
                        <RepeaterSection title="Classwork" color="blue" items={cw} setter={setCw} fileKey="cw_files" placeholder="Subject / Chapter" icon={BookOpen} />
                        <RepeaterSection title="Homework" color="purple" items={hw} setter={setHw} fileKey="hw_files" placeholder="Subject / Task" icon={FileText} />
                        <DefaulterSection items={def} setter={setDef} students={students} />
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-[#151515] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Post To</label>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => setSelectedClasses(prev => prev.includes('all') ? [] : ['all'])} className={`px-3 py-1 rounded-full text-xs font-bold border ${selectedClasses.includes('all') ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-[#151515] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800'}`}>All Classes</button>
                                {!selectedClasses.includes('all') && allClasses.map(c => (
                                    <button key={c.id} onClick={() => setSelectedClasses(prev => prev.includes(c.id) ? prev.filter(id=>id!==c.id) : [...prev, c.id])} className={`px-3 py-1 rounded-full text-xs font-bold border ${selectedClasses.includes(c.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-[#151515] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800'}`}>{c.name}</button>
                                ))}
                            </div>
                        </div>
                        <RepeaterSection title="General Update" color="green" items={gen} setter={setGen} fileKey="gen_files" placeholder="Heading" icon={FileText} />
                    </div>
                )}
                <button onClick={handleSubmitClick} disabled={submitting} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-95 transition-transform">
                    {submitting ? "Publishing..." : <><Save size={20}/> Publish Now</>}
                </button>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// SUB-COMPONENT: RECENT POSTS
// ----------------------------------------------------------------------
function RecentPostsSection({ teacherId, onBack, showModal }) {
    const [posts, setPosts] = useState([]);
    useEffect(() => {
        const fetchPosts = async () => {
            const fd = new FormData();
            fd.append('action', 'fetch_recent_posts');
            fd.append('teacher_id', teacherId);
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
            const json = await res.json();
            if(json.status==='success') setPosts(json.posts);
        };
        fetchPosts();
    }, [teacherId]);

    const requestDeleteBatch = (timestamp) => showModal("Delete Post?", "Delete entire post?", "danger", () => deleteBatch(timestamp));
    const deleteBatch = async (timestamp) => {
        const fd = new FormData(); fd.append('action', 'delete_batch'); fd.append('batch_time', timestamp); fd.append('teacher_id', teacherId);
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
        setPosts(prev => prev.filter(p => p.created_at !== timestamp));
        showModal("Deleted", "Post removed.", "success");
    };

    const requestDeleteItem = (itemId, pIdx, iIdx) => showModal("Delete Item?", "Remove this item?", "danger", () => deleteItem(itemId, pIdx, iIdx));
    const deleteItem = async (itemId, postIndex, itemIndex) => {
        const fd = new FormData(); fd.append('action', 'delete_item'); fd.append('item_id', itemId); fd.append('teacher_id', teacherId);
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
        const newPosts = [...posts];
        newPosts[postIndex].items.splice(itemIndex, 1);
        if(newPosts[postIndex].items.length === 0) newPosts.splice(postIndex, 1);
        setPosts(newPosts);
        showModal("Deleted", "Item removed.", "success");
    };

    return (
        <div className="pb-20">
            <div className="sticky top-0 bg-white dark:bg-[#151515] z-40 px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4 shadow-sm">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><X size={20} className="dark:text-white" /></button>
                <h2 className="text-lg font-black text-gray-800 dark:text-white">History</h2>
            </div>
            <div className="p-4 space-y-4">
                {posts.length === 0 && <div className="text-center text-gray-400 py-10">No recent updates found.</div>}
                {posts.map((post, pIdx) => (
                    <div key={pIdx} className="bg-white dark:bg-[#151515] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                        <div className="flex justify-between items-start mb-3 border-b border-gray-50 dark:border-gray-800 pb-2">
                            <div>
                                <h4 className="font-bold text-gray-800 dark:text-white text-sm">{new Date(post.date).toDateString()}</h4>
                                <p className="text-[10px] text-gray-400 font-bold uppercase">{post.classes.join(', ')}</p>
                            </div>
                            <button onClick={() => requestDeleteBatch(post.created_at)} className="text-red-400 bg-red-50 dark:bg-red-900/20 p-1.5 rounded-lg"><Trash2 size={14}/></button>
                        </div>
                        <div className="space-y-3">
                            {post.items.map((item, iIdx) => (
                                <div key={iIdx} className="flex justify-between items-start text-sm bg-gray-50 dark:bg-[#1a1a1a] p-2 rounded-lg">
                                    <div>
                                        <span className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded ${item.item_type==='classwork'?'bg-blue-100 text-blue-700':item.item_type==='homework'?'bg-purple-100 text-purple-700':item.item_type==='defaulter'?'bg-red-100 text-red-700':'bg-green-100 text-green-700'}`}>{item.item_type}</span>
                                        <p className="font-medium mt-1 leading-snug dark:text-gray-300">{item.heading}</p>
                                        {item.files && item.files.length > 0 && <div className="mt-1 flex gap-1"><ImageIcon size={12} className="text-gray-400"/> <span className="text-[10px] text-gray-400">{item.files.length} file(s)</span></div>}
                                    </div>
                                    <button onClick={() => requestDeleteItem(item.item_id, pIdx, iIdx)} className="text-gray-300 hover:text-red-500"><X size={14}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Helper: Repeater
function RepeaterSection({ title, color, items, setter, fileKey, placeholder, icon: Icon }) {
    const add = () => setter(prev => [...prev, {heading:'', content:''}]);
    const remove = (i) => setter(prev => prev.filter((_, idx) => idx !== i));
    const update = (i, f, v) => setter(prev => prev.map((item, idx) => idx===i ? {...item, [f]:v} : item));
    const colorClasses = { blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400", purple: "text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400", green: "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400" };

    return (
        <div>
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2"><div className={`p-1.5 rounded-lg ${colorClasses[color]}`}><Icon size={16}/></div><h4 className={`font-bold ${color === 'blue' ? 'text-blue-700 dark:text-blue-400' : color==='purple'?'text-purple-700 dark:text-purple-400':'text-green-700 dark:text-green-400'}`}>{title}</h4></div>
                <button onClick={add} className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"><Plus size={18}/></button>
            </div>
            <div className="space-y-3">
                {items.map((item, i) => (
                    <div key={i} className="bg-white dark:bg-[#151515] p-3 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm relative group">
                        <input className="w-full font-bold text-gray-800 dark:text-white bg-transparent outline-none mb-2 placeholder-gray-300" placeholder={placeholder} value={item.heading} onChange={e => update(i, 'heading', e.target.value)} />
                        <textarea className="w-full text-sm text-gray-600 dark:text-gray-300 bg-transparent outline-none resize-none placeholder-gray-300 mb-2" rows={2} placeholder="Details..." value={item.content} onChange={e => update(i, 'content', e.target.value)}></textarea>
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#0a0a0a] p-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                            <ImageIcon size={16} className="text-gray-400"/>
                            <input type="file" id={`${fileKey}_${i}`} multiple className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400"/>
                        </div>
                        {items.length > 1 && <button onClick={() => remove(i)} className="absolute top-2 right-2 text-red-300 hover:text-red-500"><X size={16}/></button>}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Helper: Defaulters
function DefaulterSection({ items, setter, students }) {
    const add = () => setter(prev => [...prev, {heading:'', students:[]}]);
    const remove = (i) => setter(prev => prev.filter((_, idx) => idx !== i));
    const update = (i, f, v) => setter(prev => prev.map((item, idx) => idx===i ? {...item, [f]:v} : item));
    const [openDropdown, setOpenDropdown] = useState(null);

    return (
        <div>
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2"><div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"><User size={16}/></div><h4 className="font-bold text-red-700 dark:text-red-400">Defaulters List</h4></div>
                <button onClick={add} className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"><Plus size={18}/></button>
            </div>
            <div className="space-y-3">
                {items.map((item, i) => (
                    <div key={i} className="bg-white dark:bg-[#151515] p-3 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm relative">
                        <input className="w-full font-bold text-red-600 dark:text-red-400 bg-transparent outline-none mb-2 placeholder-red-200" placeholder="Issue (e.g. Incomplete Math Copy)" value={item.heading} onChange={e => update(i, 'heading', e.target.value)}/>
                        <button onClick={() => setOpenDropdown(openDropdown === i ? null : i)} className="w-full flex justify-between items-center px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs font-bold text-red-600 dark:text-red-400">
                            <span>{item.students.length} Students Selected</span>
                            {openDropdown === i ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                        </button>
                        {openDropdown === i && (
                            <div className="mt-2 p-2 border border-gray-100 dark:border-gray-800 rounded-lg max-h-40 overflow-y-auto bg-white dark:bg-[#1a1a1a] shadow-lg z-10 relative">
                                {students.map(stu => (
                                    <label key={stu.id} className="flex items-center gap-2 text-xs py-1 border-b border-gray-50 dark:border-gray-800 last:border-0 dark:text-gray-300">
                                        <input type="checkbox" checked={item.students.includes(stu.id)} onChange={e => { const newSet = e.target.checked ? [...item.students, stu.id] : item.students.filter(id => id !== stu.id); update(i, 'students', newSet); }}/>
                                        {stu.name}
                                    </label>
                                ))}
                            </div>
                        )}
                        {items.length > 1 && <button onClick={() => remove(i)} className="absolute top-2 right-2 text-red-300 hover:text-red-500"><X size={16}/></button>}
                    </div>
                ))}
            </div>
        </div>
    );
}

function InfoRow({ label, value, icon: Icon }) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5 text-gray-400 dark:text-gray-500"><Icon size={16} /></div>
            <div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">{label}</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value || 'N/A'}</p>
            </div>
        </div>
    );
}

// --- SKELETON COMPONENT ---
function TeacherSkeleton() {
    return (
        <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] pb-24">
            <div className="sticky top-0 z-40 bg-white dark:bg-[#151515] p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded skeleton"></div>
                <div className="h-8 w-20 bg-gray-200 dark:bg-gray-800 rounded-full skeleton"></div>
            </div>
            
            <div className="px-4 mt-6">
                <div className="h-64 w-full bg-gray-200 dark:bg-gray-800 rounded-[2rem] skeleton mb-6"></div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl skeleton col-span-2"></div>
                    <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl skeleton"></div>
                    <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl skeleton"></div>
                </div>
            </div>
        </div>
    )
}