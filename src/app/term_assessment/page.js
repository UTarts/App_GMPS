"use client";
import { useEffect, useState, useRef } from 'react';
import { useAuth } from "../../context/AuthContext";
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, CheckCircle2, AlertCircle, Loader2, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Defined directly from your physical report card photo!
const CO_SCHOLASTIC_SKILLS = [
    'Work Education', 
    'Art Education', 
    'Health and Physical Education', 
    'Regularity and Punctuality', 
    'Behaviour and Value', 
    'Attitude towards Teachers', 
    'Attitude towards School Mates'
];

const GRADES = ['A+', 'A', 'B', 'C', 'D'];

function CustomSelect({ options, value, onChange, placeholder }) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedLabel = options.find(o => o.value == value)?.label || placeholder;

    return (
        <div className="relative w-full" ref={ref}>
            <div onClick={() => setIsOpen(!isOpen)} className="w-full p-3.5 bg-gray-50 dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-800 flex justify-between items-center cursor-pointer active:scale-[0.98] transition-transform">
                <span className={`text-sm font-bold truncate ${!value ? 'text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>{selectedLabel}</span>
                <span className="text-gray-400 text-xs">▼</span>
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                        {options.map((opt) => (
                            <div key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }} className={`px-4 py-3 text-sm cursor-pointer border-b border-gray-50 dark:border-gray-800 last:border-0 transition-colors ${value == opt.value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                {opt.label}
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function StudentTermRow({ student, examId }) {
    const [meta, setMeta] = useState({
        att_present: student.meta.attendance_present || '',
        att_total: student.meta.attendance_total || '',
        remarks: student.meta.remarks || ''
    });
    const [skills, setSkills] = useState(student.skills || {});
    const [status, setStatus] = useState('idle'); 

    const handleMetaChange = (field, value) => {
        setMeta(prev => ({ ...prev, [field]: value }));
    };

    const handleSkillChange = (skill, value) => {
        const newSkills = { ...skills, [skill]: value };
        setSkills(newSkills);
        handleSave(newSkills);
    };

    const handleSave = async (skillsToSave = skills) => {
        setStatus('saving');
        const fd = new FormData();
        fd.append('action', 'save_term_assessment');
        fd.append('student_id', student.id);
        fd.append('exam_id', examId);
        fd.append('att_present', meta.att_present);
        fd.append('att_total', meta.att_total);
        fd.append('remarks', meta.remarks);
        fd.append('skills', JSON.stringify(skillsToSave));

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
            const json = await res.json();
            if (json.status === 'success') {
                setStatus('success');
                setTimeout(() => setStatus('idle'), 2000);
            } else { setStatus('error'); }
        } catch (e) { setStatus('error'); }
    };

    return (
        <div className="flex items-stretch border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors">
            
            {/* Sticky Student Name */}
            <div className="w-40 shrink-0 p-3 bg-white dark:bg-[#151515] sticky left-0 z-10 border-r border-gray-100 dark:border-gray-800 flex items-center justify-between shadow-[4px_0_10px_rgba(0,0,0,0.02)]">
                <div className="overflow-hidden pr-2">
                    <p className="font-bold text-xs truncate text-gray-900 dark:text-white">{student.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold">Roll: {student.roll_no}</p>
                </div>
                <div className="shrink-0 w-4 h-4 flex items-center justify-center">
                    {status === 'saving' && <Loader2 size={14} className="text-purple-500 animate-spin" />}
                    {status === 'success' && <CheckCircle2 size={14} className="text-green-500" />}
                    {status === 'error' && <AlertCircle size={14} className="text-red-500" />}
                </div>
            </div>

            {/* Scrollable Entry Cells */}
            <div className="flex-1 flex min-w-max divide-x divide-gray-100 dark:divide-gray-800">
                
                {/* Attendance */}
                <div className="w-20 shrink-0 p-1 flex items-center">
                    <input type="number" inputMode="numeric" placeholder="P" value={meta.att_present} onChange={e => handleMetaChange('att_present', e.target.value)} onBlur={() => handleSave()} className="w-full text-center font-bold text-sm bg-transparent outline-none focus:bg-purple-50 dark:focus:bg-purple-900/20" />
                </div>
                <div className="w-20 shrink-0 p-1 flex items-center">
                    <input type="number" inputMode="numeric" placeholder="T" value={meta.att_total} onChange={e => handleMetaChange('att_total', e.target.value)} onBlur={() => handleSave()} className="w-full text-center font-bold text-sm bg-transparent outline-none focus:bg-purple-50 dark:focus:bg-purple-900/20" />
                </div>

                {/* Remarks */}
                <div className="w-40 shrink-0 p-1 flex items-center">
                    <input type="text" placeholder="e.g. Excellent" value={meta.remarks} onChange={e => handleMetaChange('remarks', e.target.value)} onBlur={() => handleSave()} className="w-full px-3 text-sm font-medium bg-transparent outline-none focus:bg-purple-50 dark:focus:bg-purple-900/20 h-full" />
                </div>

                {/* Co-Scholastic Grades (A+, A, B, C) */}
                {CO_SCHOLASTIC_SKILLS.map(skill => (
                    <div key={skill} className="w-28 shrink-0 flex items-center justify-center p-1 relative group">
                        <select 
                            value={skills[skill] || ''} 
                            onChange={e => handleSkillChange(skill, e.target.value)}
                            className="w-full h-full text-center font-black text-sm bg-transparent outline-none cursor-pointer appearance-none text-purple-600 dark:text-purple-400 py-3"
                        >
                            <option value="">-</option>
                            {GRADES.map(g => <option key={g} value={g} className="text-black dark:text-white">{g}</option>)}
                        </select>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function TermAssessmentPage() {
    const { user } = useAuth();
    const router = useRouter();
    
    const [loading, setLoading] = useState(true);
    const [exams, setExams] = useState([]);
    const [classId, setClassId] = useState(null);

    const [selectedExam, setSelectedExam] = useState('');
    const [students, setStudents] = useState([]);
    const [sheetLoading, setSheetLoading] = useState(false);

    useEffect(() => {
        const initData = async () => {
            if (!user?.id) return;
            const fd = new FormData();
            fd.append('action', 'fetch_dashboard');
            fd.append('teacher_id', user.id);
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
            const json = await res.json();
            
            if (json.status === 'success' && json.profile.assigned_class_id) {
                const cid = json.profile.assigned_class_id;
                setClassId(cid);

                // Fetch Exams
                const fdEx = new FormData(); fdEx.append('action', 'fetch_exams_status'); fdEx.append('class_id', cid);
                const exRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fdEx });
                const exJson = await exRes.json();
                if(exJson.status === 'success') {
                    // Filter out UTs
                    const termExams = exJson.data.filter(e => !e.name.toLowerCase().includes('ut') && !e.name.toLowerCase().includes('periodic'));
                    setExams(termExams.map(e => ({ value: e.id, label: e.name })));
                }
            } else {
                alert("Only class teachers can enter Co-Scholastic data.");
                router.push('/teacher');
            }
            setLoading(false);
        };
        initData();
    }, [user, router]);

    useEffect(() => {
        const loadSheet = async () => {
            if (!selectedExam) { setStudents([]); return; }
            setSheetLoading(true);
            const fd = new FormData();
            fd.append('action', 'fetch_term_assessment');
            fd.append('class_id', classId);
            fd.append('exam_id', selectedExam);
            
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
            const json = await res.json();
            if(json.status === 'success') setStudents(json.data);
            setSheetLoading(false);
        };
        loadSheet();
    }, [selectedExam, classId]);

    if (loading) return <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="animate-spin text-purple-600" size={32}/></div>;

    return (
        <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] text-gray-800 dark:text-gray-100 font-sans flex flex-col pb-6">
            
            {/* Fixed Header */}
            <div className="sticky top-0 z-40 bg-white dark:bg-[#151515] px-4 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-col gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/teacher')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft size={20}/></button>
                    <div>
                        <h1 className="text-lg font-black leading-none">Co-Scholastics & Remarks</h1>
                        <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mt-1 flex items-center gap-1"><Star size={10}/> Class Teacher Only</p>
                    </div>
                </div>

                <div><CustomSelect options={exams} value={selectedExam} onChange={setSelectedExam} placeholder="Select Term Exam" /></div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-2">
                {!selectedExam ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center opacity-50">
                        <Star size={48} className="mb-4 text-purple-400" />
                        <p className="font-bold text-lg">Select a Term Exam</p>
                        <p className="text-xs font-medium">To enter Attendance, Remarks, and Discipline grades.</p>
                    </div>
                ) : sheetLoading ? (
                    <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-purple-600" size={32}/></div>
                ) : (
                    <div className="bg-white dark:bg-[#151515] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden mt-2">
                        
                        <div className="overflow-x-auto custom-scrollbar relative pb-32">
                            <div className="min-w-max">
                                
                                {/* Header - WITH WRAPPING TEXT FIX */}
                                <div className="flex items-stretch border-b-2 border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1a1a1a]">
                                    <div className="w-40 shrink-0 p-3 sticky left-0 z-20 bg-gray-50 dark:bg-[#1a1a1a] shadow-[4px_0_10px_rgba(0,0,0,0.02)] border-r border-gray-200 dark:border-gray-800 flex items-center">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Student</span>
                                    </div>
                                    <div className="flex-1 flex min-w-max divide-x divide-gray-200 dark:divide-gray-800">
                                        <div className="w-20 shrink-0 p-2 flex items-center justify-center text-center"><span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Att. (P)</span></div>
                                        <div className="w-20 shrink-0 p-2 flex items-center justify-center text-center"><span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Att. (T)</span></div>
                                        <div className="w-40 shrink-0 p-2 flex items-center justify-center text-center"><span className="text-[10px] font-black uppercase tracking-widest text-orange-600">T. Remarks</span></div>
                                        
                                        {/* Wraps long text perfectly onto multiple lines */}
                                        {CO_SCHOLASTIC_SKILLS.map(skill => (
                                            <div key={skill} className="w-28 shrink-0 p-2 flex items-center justify-center text-center">
                                                <span className="text-[9px] font-black uppercase text-purple-600 leading-snug whitespace-normal break-words">{skill}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Rows */}
                                {students.map((student) => (
                                    <StudentTermRow key={student.id} student={student} examId={selectedExam} />
                                ))}
                                {students.length === 0 && <p className="p-6 text-center text-sm font-bold text-gray-400">No active students found in your class.</p>}
                            
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}