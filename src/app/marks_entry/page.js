"use client";
import { useEffect, useState, useRef } from 'react';
import { useAuth } from "../../context/AuthContext";
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, CheckCircle2, AlertCircle, Loader2, UserX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Helper: Custom Select Dropdown
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

// Helper: Standard CBSE Grading Logic
const calculateGrade = (marks, maxMarks) => {
    if (!marks || isNaN(marks)) return '-';
    const percentage = (marks / maxMarks) * 100;
    if (percentage >= 91) return 'A1';
    if (percentage >= 81) return 'A2';
    if (percentage >= 71) return 'B1';
    if (percentage >= 61) return 'B2';
    if (percentage >= 51) return 'C1';
    if (percentage >= 41) return 'C2';
    if (percentage >= 33) return 'D';
    return 'E'; // Failed
};

// --- SINGLE STUDENT ROW COMPONENT (Handles Auto-Save Logic) ---
function StudentMarkRow({ student, studentIndex, examId, subjectCode, isUT, classId, teacherId }) {
    const [marks, setMarks] = useState({
        pt: student.pt_marks || '',
        nb: student.notebook_marks || '',
        se: student.enrichment_marks || '',
        exam: student.exam_marks || '',
        is_absent: parseInt(student.is_absent) === 1
    });
    
    const [status, setStatus] = useState('idle'); // idle, saving, success, error

    // Total Calculation
    const total = isUT 
        ? (parseFloat(marks.exam) || 0) 
        : (parseFloat(marks.pt) || 0) + (parseFloat(marks.nb) || 0) + (parseFloat(marks.se) || 0) + (parseFloat(marks.exam) || 0);
    
    const maxTotal = isUT ? 20 : 100;
    const grade = marks.is_absent ? 'AB' : calculateGrade(total, maxTotal);

    // Dynamic Input Handler with Strict Limits
    const handleInput = (field, value, max) => {
        if (value === '') {
            setMarks(prev => ({ ...prev, [field]: '' }));
            return;
        }
        let num = parseFloat(value);
        if (num < 0) num = 0;
        if (num > max) num = max; // Auto-corrects if teacher types 15 in a 10 mark box!
        setMarks(prev => ({ ...prev, [field]: num }));
    };

    // MAGIC: Auto-jump to next row on Enter Key
    const handleKeyDown = (e, field) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission or jumping randomly
            const nextInput = document.getElementById(`input_${field}_${studentIndex + 1}`);
            if (nextInput) {
                nextInput.focus();
                nextInput.select(); // Highlights the text in the next box so they can just type over it
            } else {
                e.target.blur(); // If it's the last student, just blur to trigger the save
            }
        }
    };

    // The Magic Auto-Save Function
    const handleBlur = async () => {
        setStatus('saving');
        const fd = new FormData();
        fd.append('action', 'save_single_mark');
        fd.append('student_id', student.id);
        fd.append('exam_id', examId);
        fd.append('subject_code', subjectCode);
        
        if (isUT) {
            fd.append('exam', marks.exam); // UT maps to exam_marks column
        } else {
            fd.append('pt', marks.pt);
            fd.append('nb', marks.nb);
            fd.append('se', marks.se);
            fd.append('exam', marks.exam);
        }
        fd.append('is_absent', marks.is_absent ? 1 : 0);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
            const json = await res.json();
            if (json.status === 'success') {
                setStatus('success');
                setTimeout(() => setStatus('idle'), 2000); // Reset icon after 2s
            } else {
                setStatus('error');
            }
        } catch (e) {
            setStatus('error');
        }
    };

    const toggleAbsent = () => {
        setMarks(prev => {
            const newAbsent = !prev.is_absent;
            if (newAbsent) {
                // If marked absent, clear all numbers
                return { pt: '', nb: '', se: '', exam: '', is_absent: true };
            }
            return { ...prev, is_absent: false };
        });
    };

    // Use an effect to auto-save immediately if Absent is toggled
    useEffect(() => {
        if (status !== 'idle') handleBlur();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [marks.is_absent]);

    const InputCell = ({ field, max }) => (
        <input 
            id={`input_${field}_${studentIndex}`}
            type="number" 
            inputMode="decimal" // Forces number keypad on mobile
            pattern="[0-9]*"
            value={marks[field]} 
            onChange={(e) => handleInput(field, e.target.value, max)}
            onBlur={handleBlur}
            onKeyDown={(e) => handleKeyDown(e, field)}
            disabled={marks.is_absent}
            placeholder="-"
            className={`w-full h-10 text-center font-bold text-sm bg-transparent outline-none transition-all ${marks.is_absent ? 'opacity-30' : 'focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:text-blue-700 dark:focus:text-blue-400'}`}
        />
    );

    return (
        <div className={`flex items-center border-b border-gray-100 dark:border-gray-800 transition-colors ${marks.is_absent ? 'bg-red-50/50 dark:bg-red-900/10' : 'hover:bg-gray-50 dark:hover:bg-[#1a1a1a]'}`}>
            
            {/* Left: Sticky Student Info */}
            <div className="w-40 shrink-0 p-3 bg-white dark:bg-[#151515] sticky left-0 z-10 border-r border-gray-100 dark:border-gray-800 flex items-center justify-between shadow-[4px_0_10px_rgba(0,0,0,0.02)]">
                <div className="overflow-hidden pr-2">
                    <p className={`font-bold text-xs truncate ${marks.is_absent ? 'text-red-500 line-through opacity-70' : 'text-gray-900 dark:text-white'}`}>{student.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold">Roll: {student.roll_no}</p>
                </div>
                {/* Save Status Indicator */}
                <div className="shrink-0 w-4 h-4 flex items-center justify-center">
                    {status === 'saving' && <Loader2 size={14} className="text-blue-500 animate-spin" />}
                    {status === 'success' && <CheckCircle2 size={14} className="text-green-500" />}
                    {status === 'error' && <AlertCircle size={14} className="text-red-500" />}
                </div>
            </div>

            {/* Right: Spreadsheet Cells */}
            <div className="flex-1 flex min-w-max divide-x divide-gray-100 dark:divide-gray-800">
                {isUT ? (
                    <div className="w-20 shrink-0"><InputCell field="exam" max={20} /></div>
                ) : (
                    <>
                        <div className="w-16 shrink-0"><InputCell field="pt" max={10} /></div>
                        <div className="w-16 shrink-0"><InputCell field="nb" max={5} /></div>
                        <div className="w-16 shrink-0"><InputCell field="se" max={5} /></div>
                        <div className="w-16 shrink-0"><InputCell field="exam" max={80} /></div>
                    </>
                )}

                {/* Total & Grade Columns */}
                <div className="w-16 shrink-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-black">
                    <span className={`text-sm font-black ${marks.is_absent ? 'text-red-500' : 'text-gray-800 dark:text-gray-200'}`}>
                        {marks.is_absent ? 'AB' : (total > 0 ? total : '-')}
                    </span>
                </div>
                <div className="w-16 shrink-0 flex items-center justify-center bg-gray-50 dark:bg-black font-black text-blue-600 dark:text-blue-400 text-sm">
                    {grade}
                </div>

                {/* Absent Toggle */}
                <div className="w-16 shrink-0 flex items-center justify-center">
                    <button onClick={toggleAbsent} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${marks.is_absent ? 'bg-red-500 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-red-100 hover:text-red-500'}`}>
                        AB
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function MarksEntryPage() {
    const { user } = useAuth();
    const router = useRouter();
    
    const [loading, setLoading] = useState(true);
    const [exams, setExams] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [classId, setClassId] = useState(null);

    const [selectedExam, setSelectedExam] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
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
                if(exJson.status === 'success') setExams(exJson.data.map(e => ({ value: e.id, label: e.name })));

                // Fetch Subjects
                const fdSub = new FormData(); fdSub.append('action', 'fetch_work_upload_data'); fdSub.append('teacher_id', user.id);
                const subRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fdSub });
                const subJson = await subRes.json();
                if(subJson.status === 'success') setSubjects(subJson.subjects.map(s => ({ value: s.code, label: s.name })));
            } else {
                alert("Only class teachers can enter marks.");
                router.push('/teacher');
            }
            setLoading(false);
        };
        initData();
    }, [user, router]);

    // Load spreadsheet when both are selected
    useEffect(() => {
        const loadSheet = async () => {
            if (!selectedExam || !selectedSubject) { setStudents([]); return; }
            setSheetLoading(true);
            const fd = new FormData();
            fd.append('action', 'fetch_marks_sheet');
            fd.append('class_id', classId);
            fd.append('exam_id', selectedExam);
            fd.append('subject_code', selectedSubject);
            
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
            const json = await res.json();
            if(json.status === 'success') setStudents(json.data);
            setSheetLoading(false);
        };
        loadSheet();
    }, [selectedExam, selectedSubject, classId]);

    // Check if the selected exam is a UT (out of 20)
    const activeExamName = exams.find(e => e.value == selectedExam)?.label || '';
    const isUT = activeExamName.toLowerCase().includes('ut') || activeExamName.toLowerCase().includes('periodic');

    if (loading) return <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={32}/></div>;

    return (
        <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] text-gray-800 dark:text-gray-100 font-sans flex flex-col pb-6">
            
            {/* Fixed Header */}
            <div className="sticky top-0 z-40 bg-white dark:bg-[#151515] px-4 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-col gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/teacher')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft size={20}/></button>
                    <div>
                        <h1 className="text-lg font-black leading-none">Marks Entry Engine</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 text-green-500 flex items-center gap-1"><CheckCircle2 size={10}/> Auto-Saving Enabled</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <div className="flex-1"><CustomSelect options={exams} value={selectedExam} onChange={setSelectedExam} placeholder="Select Exam" /></div>
                    <div className="flex-1"><CustomSelect options={subjects} value={selectedSubject} onChange={setSelectedSubject} placeholder="Select Subject" /></div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-2">
                {!selectedExam || !selectedSubject ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center opacity-50">
                        <BookOpen size={48} className="mb-4 text-gray-400" />
                        <p className="font-bold text-lg">Select Exam & Subject</p>
                        <p className="text-xs font-medium">The intelligent spreadsheet will load automatically.</p>
                    </div>
                ) : sheetLoading ? (
                    <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" size={32}/></div>
                ) : (
                    <div className="bg-white dark:bg-[#151515] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden mt-2">
                        
                        {/* FIX: Moved Header INSIDE the overflow container so it scrolls in sync, and added pb-32 so bottom nav doesn't block it */}
                        <div className="overflow-x-auto custom-scrollbar relative pb-32">
                            <div className="min-w-max">
                                
                                {/* Spreadsheet Header */}
                                <div className="flex items-center border-b-2 border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1a1a1a]">
                                    <div className="w-40 shrink-0 p-3 sticky left-0 z-20 bg-gray-50 dark:bg-[#1a1a1a] shadow-[4px_0_10px_rgba(0,0,0,0.02)] border-r border-gray-200 dark:border-gray-800">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Student Name</span>
                                    </div>
                                    <div className="flex-1 flex min-w-max divide-x divide-gray-200 dark:divide-gray-800">
                                        {isUT ? (
                                            <div className="w-20 shrink-0 p-3 text-center"><span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Marks (20)</span></div>
                                        ) : (
                                            <>
                                                <div className="w-16 shrink-0 p-3 text-center"><span className="text-[10px] font-black uppercase tracking-widest text-blue-600">PT (10)</span></div>
                                                <div className="w-16 shrink-0 p-3 text-center"><span className="text-[10px] font-black uppercase tracking-widest text-purple-600">NB (5)</span></div>
                                                <div className="w-16 shrink-0 p-3 text-center"><span className="text-[10px] font-black uppercase tracking-widest text-orange-600">SE (5)</span></div>
                                                <div className="w-16 shrink-0 p-3 text-center"><span className="text-[10px] font-black uppercase tracking-widest text-green-600">Exam (80)</span></div>
                                            </>
                                        )}
                                        <div className="w-16 shrink-0 p-3 text-center"><span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Total</span></div>
                                        <div className="w-16 shrink-0 p-3 text-center"><span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Grade</span></div>
                                        <div className="w-16 shrink-0 p-3 text-center"><span className="text-[10px] font-black uppercase tracking-widest text-red-500">Absent</span></div>
                                    </div>
                                </div>

                                {/* Spreadsheet Rows */}
                                {students.map((student, idx) => (
                                    <StudentMarkRow 
                                        key={student.id} 
                                        student={student}
                                        studentIndex={idx} 
                                        examId={selectedExam} 
                                        subjectCode={selectedSubject} 
                                        isUT={isUT} 
                                        classId={classId}
                                        teacherId={user.id}
                                    />
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