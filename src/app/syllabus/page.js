"use client";
import { useEffect, useState, useRef } from 'react';
import { useAuth } from "../../context/AuthContext";
import { ArrowLeft, BookOpen, Save, ChevronDown, ChevronUp, Clock, Book, Mic } from 'lucide-react';
import Link from 'next/link';
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
            return { status: 'error', message: 'Server error.' };
        }
    } catch (err) {
        console.error("Network Error:", err);
        return { status: 'error', message: 'Network error.' };
    }
};

export default function SyllabusPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    
    // Data States
    const [syllabusData, setSyllabusData] = useState({});
    const [expandedExam, setExpandedExam] = useState(null);
    
    // Teacher Form & Mic States
    const [exams, setExams] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [formData, setFormData] = useState({ exam_id: '', subject_code: '', syllabus_text: '' });
    const [saving, setSaving] = useState(false);
    const [isListening, setIsListening] = useState(false);
    
    const recognitionRef = useRef(null);
    const classId = user?.role === 'student' ? user?.class_id : user?.assigned_class_id;

    const loadSyllabus = async () => {
        if (!classId) return;
        const fd = new FormData();
        fd.append('action', 'get_syllabus');
        fd.append('class_id', classId);
        const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/syllabus.php`, { method: 'POST', body: fd });
        if (json.status === 'success') {
            setSyllabusData(json.data || {});
            if (json.data && Object.keys(json.data).length > 0) {
                setExpandedExam(Object.keys(json.data)[0]);
            }
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                if (user?.role === 'teacher' && classId) {
                    const fd = new FormData(); 
                    fd.append('action', 'get_form_data');
                    fd.append('class_id', classId); // Passes classId to filter subjects!
                    
                    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/syllabus.php`, { method: 'POST', body: fd });
                    if (json.status === 'success') {
                        setExams(json.exams || []);
                        setSubjects(json.subjects || []);
                    }
                }
                await loadSyllabus();
            } catch (error) {
                console.error("Syllabus fetch error", error);
            } finally {
                setLoading(false);
            }
        };
        if (user) init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, classId]);

    // --- VOICE TYPING ENGINE ---
    const handleMicClick = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Voice typing is not supported in this browser. Please use Chrome or Edge.");
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = 'en-IN'; // Indian English
        recognition.continuous = false; // Stops automatically after a sentence
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setFormData(prev => ({ 
                ...prev, 
                syllabus_text: prev.syllabus_text + (prev.syllabus_text ? ' ' : '') + transcript 
            }));
        };

        recognition.onerror = (e) => {
            console.error("Mic error:", e);
            setIsListening(false);
        };

        recognition.onend = () => setIsListening(false);
        recognition.start();
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        const fd = new FormData();
        fd.append('action', 'save_syllabus');
        fd.append('class_id', classId);
        fd.append('exam_id', formData.exam_id);
        fd.append('subject_code', formData.subject_code);
        fd.append('syllabus_text', formData.syllabus_text);

        await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/syllabus.php`, { method: 'POST', body: fd });
        setFormData({ ...formData, syllabus_text: '' }); // Reset text, keep exam/sub selected
        await loadSyllabus();
        setSaving(false);
        alert("Syllabus Published! Students have been notified.");
    };

    if (loading) return <SyllabusSkeleton />;

    if (!classId) return (
        <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center">
            <BookOpen size={48} className="text-gray-400 mb-4" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">No Class Assigned</h2>
            <p className="text-gray-500 text-sm mt-2">Only Class Teachers can manage the syllabus for their specific class.</p>
            <Link href="/" className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-full font-bold">Go Back</Link>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] pb-24 font-sans text-gray-800 dark:text-gray-100">
            
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white/90 dark:bg-[#151515]/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 px-4 py-4 flex items-center gap-4 shadow-sm">
                <button onClick={() => window.history.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><ArrowLeft size={20} /></button>
                <div>
                    <h1 className="text-xl font-black tracking-tight leading-none text-fuchsia-600 dark:text-fuchsia-500">Class Syllabus</h1>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Official Curriculum</p>
                </div>
            </div>

            <div className="p-4 mt-2 max-w-lg mx-auto space-y-6">
                
                {/* TEACHER UPLOAD FORM */}
                {user?.role === 'teacher' && (
                    <div className="bg-white dark:bg-[#151515] p-5 rounded-[2rem] shadow-sm border border-fuchsia-100 dark:border-fuchsia-900/30 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none"></div>
                        <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Book size={16} className="text-fuchsia-500" /> Update Syllabus
                        </h2>
                        
                        <form onSubmit={handleSave} className="space-y-4 relative z-10">
                            <div className="grid grid-cols-2 gap-3">
                                <select required value={formData.exam_id} onChange={e => setFormData({...formData, exam_id: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-bold outline-none text-gray-700 dark:text-gray-300 focus:ring-2 ring-fuchsia-500/20">
                                    <option value="" disabled>Select Exam...</option>
                                    {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                                </select>
                                <select required value={formData.subject_code} onChange={e => setFormData({...formData, subject_code: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-bold outline-none text-gray-700 dark:text-gray-300 focus:ring-2 ring-fuchsia-500/20">
                                    <option value="" disabled>Select Subject...</option>
                                    {subjects.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                                </select>
                            </div>
                            
                            {/* Voice-Enabled Text Area */}
                            <div className="relative">
                                <textarea 
                                    required 
                                    value={formData.syllabus_text} 
                                    onChange={e => setFormData({...formData, syllabus_text: e.target.value})} 
                                    placeholder="Type or click the mic to speak..."
                                    className="w-full p-4 pb-12 bg-gray-50 dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-medium outline-none min-h-[120px] custom-scrollbar text-gray-800 dark:text-gray-200 leading-relaxed focus:ring-2 ring-fuchsia-500/20"
                                />
                                <button 
                                    type="button" 
                                    onClick={handleMicClick}
                                    className={`absolute bottom-3 right-3 p-2.5 rounded-full shadow-sm transition-all ${isListening ? 'bg-red-500 text-white animate-pulse shadow-red-500/40' : 'bg-white dark:bg-[#1a1a1a] text-gray-500 hover:text-fuchsia-500 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/20'}`}
                                    title="Click to speak"
                                >
                                    <Mic size={18} />
                                </button>
                            </div>

                            <button disabled={saving} className="w-full bg-fuchsia-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-fuchsia-500/30 flex items-center justify-center gap-2 hover:bg-fuchsia-700 transition-colors disabled:opacity-50">
                                {saving ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Publishing...</span> : <><Save size={18} /> Publish to Students</>}
                            </button>
                        </form>
                    </div>
                )}

                {/* SYLLABUS VIEWER (ACCORDION) */}
                <div className="space-y-4">
                    {Object.keys(syllabusData).length === 0 ? (
                        <div className="text-center p-10 opacity-50">
                            <BookOpen size={48} className="mx-auto mb-3 text-gray-400" />
                            <p className="font-bold text-gray-600 dark:text-gray-400">No Syllabus Posted Yet</p>
                        </div>
                    ) : (
                        Object.entries(syllabusData).map(([examName, subjects]) => (
                            <div key={examName} className="bg-white dark:bg-[#151515] rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                                <div 
                                    className="p-4 flex justify-between items-center cursor-pointer bg-gradient-to-r from-fuchsia-50 to-white dark:from-fuchsia-900/10 dark:to-[#151515] active:scale-[0.99] transition-transform"
                                    onClick={() => setExpandedExam(expandedExam === examName ? null : examName)}
                                >
                                    <h3 className="font-black text-fuchsia-700 dark:text-fuchsia-400 tracking-wide uppercase">{examName}</h3>
                                    <div className="bg-white dark:bg-black p-1.5 rounded-full shadow-sm border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300">
                                        {expandedExam === examName ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                </div>
                                
                                <AnimatePresence>
                                    {expandedExam === examName && (
                                        <motion.div initial={{height: 0}} animate={{height: 'auto'}} exit={{height: 0}} className="overflow-hidden">
                                            <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-4 bg-gray-50/50 dark:bg-transparent">
                                                {subjects.map((sub, i) => (
                                                    <div key={i} className="bg-white dark:bg-black p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                                        <div className="flex justify-between items-start mb-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                                                            <h4 className="font-black text-sm text-gray-800 dark:text-gray-200 uppercase">{sub.subject_name}</h4>
                                                            <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold bg-gray-50 dark:bg-[#1a1a1a] px-2 py-1 rounded-md">
                                                                <Clock size={10} /> {sub.formatted_date}
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-medium">
                                                            {sub.syllabus_text}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))
                    )}
                </div>

            </div>
        </div>
    );
}

// --- SKELETON COMPONENT ---
function SyllabusSkeleton() {
    return (
        <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] pb-24">
            <div className="sticky top-0 z-40 bg-white/90 dark:bg-[#151515]/90 p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-4">
                 <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 skeleton"></div>
                 <div>
                     <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded skeleton mb-1"></div>
                     <div className="h-3 w-20 bg-gray-200 dark:bg-gray-800 rounded skeleton"></div>
                 </div>
            </div>
            
            <div className="p-4 mt-2 max-w-lg mx-auto space-y-6">
                <div className="h-56 w-full bg-gray-200 dark:bg-gray-800 rounded-[2rem] skeleton"></div>
                <div className="space-y-4">
                    <div className="h-16 w-full bg-gray-200 dark:bg-gray-800 rounded-[1.5rem] skeleton"></div>
                    <div className="h-16 w-full bg-gray-200 dark:bg-gray-800 rounded-[1.5rem] skeleton"></div>
                </div>
            </div>
        </div>
    )
}