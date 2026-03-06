"use client";
import { useEffect, useState, useRef } from 'react';
import { useAuth } from "../../context/AuthContext";
import { ArrowLeft, PenTool, Upload, Calendar, Download, Trash2, Loader2, FileText, CheckSquare } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const safeFetchJson = async (url, options = {}) => {
    try {
        const res = await fetch(url, options);
        let text = await res.text(); 
        const match = text.match(/\{[\s\S]*\}/);
        return match ? JSON.parse(match[0]) : { status: 'error' };
    } catch (err) {
        return { status: 'error' };
    }
};

export default function AssignmentsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [assignments, setAssignments] = useState([]);
    const [classes, setClasses] = useState([]);
    
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ title: '', description: '', due_date: '' });
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [file, setFile] = useState(null);
    const fileInputRef = useRef(null);

    const loadData = async () => {
        const fd = new FormData();
        fd.append('action', 'fetch_init');
        fd.append('role', user?.role);
        fd.append('user_id', user?.id);
        if (user?.role === 'student') fd.append('class_id', user?.class_id);

        const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/assignments.php`, { method: 'POST', body: fd });
        if (json.status === 'success') {
            setAssignments(json.assignments || []);
            setClasses(json.classes || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (user) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleClassToggle = (classId) => {
        setSelectedClasses(prev => 
            prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
        );
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (selectedClasses.length === 0) return alert("Please select at least one class.");
        
        setSaving(true);
        const fd = new FormData();
        fd.append('action', 'upload_assignment');
        fd.append('teacher_id', user.id);
        fd.append('title', formData.title);
        fd.append('description', formData.description);
        fd.append('due_date', formData.due_date);
        fd.append('class_ids', selectedClasses.join(','));
        if (file) fd.append('file', file);

        const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/assignments.php`, { method: 'POST', body: fd });
        if(json.status === 'success') {
            setFormData({ title: '', description: '', due_date: '' });
            setSelectedClasses([]);
            setFile(null);
            setShowForm(false);
            loadData();
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this assignment?")) return;
        const fd = new FormData();
        fd.append('action', 'delete_assignment');
        fd.append('id', id);
        fd.append('teacher_id', user.id);
        await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/assignments.php`, { method: 'POST', body: fd });
        loadData();
    };

    if (loading) return <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="animate-spin text-teal-600" size={32} /></div>;

    return (
        <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] pb-24 font-sans text-gray-800 dark:text-gray-100">
            
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white/90 dark:bg-[#151515]/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 px-4 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => window.history.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><ArrowLeft size={20} /></button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight leading-none text-teal-600 dark:text-teal-500">Assignments</h1>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Special Projects & Tasks</p>
                    </div>
                </div>
                {user?.role === 'teacher' && (
                    <button onClick={() => setShowForm(!showForm)} className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 px-4 py-2 rounded-full text-xs font-bold active:scale-95 transition-transform">
                        {showForm ? 'Cancel' : '+ New Task'}
                    </button>
                )}
            </div>

            <div className="p-4 max-w-lg mx-auto mt-2 space-y-6">
                
                {/* TEACHER UPLOAD FORM */}
                <AnimatePresence>
                    {showForm && user?.role === 'teacher' && (
                        <motion.div initial={{opacity:0, y:-20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} className="bg-white dark:bg-[#151515] p-5 rounded-[2rem] shadow-xl border border-teal-100 dark:border-teal-900/30">
                            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Upload size={16} className="text-teal-500" /> Create Assignment
                            </h2>
                            
                            <form onSubmit={handleUpload} className="space-y-4">
                                <input required type="text" placeholder="Assignment Title (e.g., Summer Holiday Homework)" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-bold outline-none focus:ring-2 ring-teal-500/20" />
                                
                                <textarea required placeholder="Detailed instructions..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-medium outline-none min-h-[100px] focus:ring-2 ring-teal-500/20" />
                                
                                <div className="flex items-center gap-3 bg-gray-50 dark:bg-black p-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm">
                                    <Calendar size={18} className="text-gray-400" />
                                    <input type="date" required value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} className="bg-transparent font-bold outline-none text-gray-700 dark:text-gray-300 w-full" />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Target Classes</label>
                                    <div className="flex flex-wrap gap-2">
                                        {classes.map(c => (
                                            <button type="button" key={c.id} onClick={() => handleClassToggle(c.id)} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${selectedClasses.includes(c.id) ? 'bg-teal-500 border-teal-500 text-white shadow-md' : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <input type="file" ref={fileInputRef} onChange={e => setFile(e.target.files[0])} className="hidden" />
                                    <button type="button" onClick={() => fileInputRef.current.click()} className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 p-4 rounded-xl text-xs font-bold text-gray-500 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                        <FileText size={24} className={file ? "text-teal-500" : "text-gray-400"} />
                                        {file ? file.name : 'Attach Document or Image (Optional)'}
                                    </button>
                                </div>

                                <button disabled={saving} className="w-full bg-teal-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2 hover:bg-teal-700 transition-colors mt-2">
                                    {saving ? <Loader2 size={18} className="animate-spin" /> : 'Publish Assignment'}
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ASSIGNMENT FEED */}
                <div className="space-y-4">
                    {assignments.length === 0 ? (
                        <div className="text-center p-10 opacity-50 flex flex-col items-center">
                            <CheckSquare size={48} className="mb-4 text-gray-400" />
                            <p className="font-bold text-gray-600 dark:text-gray-400">No Assignments Yet</p>
                        </div>
                    ) : (
                        assignments.map((task) => (
                            <div key={task.id} className="bg-white dark:bg-[#151515] p-5 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
                                {/* Decorative shape */}
                                <div className="absolute -right-4 -top-4 w-16 h-16 bg-teal-500/10 rounded-full blur-xl"></div>
                                
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-black text-lg text-gray-900 dark:text-white leading-tight">{task.title}</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Posted: {task.formatted_date}</p>
                                    </div>
                                    {user?.role === 'teacher' && (
                                        <button onClick={() => handleDelete(task.id)} className="text-red-400 hover:text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded-full transition-colors"><Trash2 size={16} /></button>
                                    )}
                                </div>

                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 whitespace-pre-wrap leading-relaxed">{task.description}</p>

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                                            <Calendar size={14} />
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Deadline</p>
                                            <p className="text-xs font-black text-gray-800 dark:text-gray-200">{task.due_date_formatted}</p>
                                        </div>
                                    </div>
                                    
                                    {task.attachment_url && (
                                        <a href={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${task.attachment_url}`} target="_blank" rel="noopener noreferrer" className="bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-teal-100 transition-colors">
                                            <Download size={14} /> Download File
                                        </a>
                                    )}
                                </div>

                                {/* Student specific: Show teacher name */}
                                {user?.role === 'student' && task.teacher_name && (
                                    <div className="mt-4 flex items-center gap-2 bg-gray-50 dark:bg-black p-2 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <img src={task.teacher_pic ? `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${task.teacher_pic}` : `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}GMPSimages/default_teacher.png`} className="w-6 h-6 rounded-full object-cover" alt="Teacher" />
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Posted by <span className="text-gray-900 dark:text-white">{task.teacher_name}</span></p>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

            </div>
        </div>
    );
}