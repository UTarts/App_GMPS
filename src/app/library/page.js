"use client";
import { useEffect, useState, useRef } from 'react';
import { useAuth } from "../../context/AuthContext";
import { ArrowLeft, Upload, Trash2, Loader2, Download, Search, Filter, Book, FileText, Image as ImageIcon, FileArchive, LibraryBig } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// --- BULLETPROOF JSON PARSER WITH CACHE BUSTING ---
const safeFetchJson = async (url, options = {}) => {
    try {
        // FORCE Next.js to skip the cache and hit the live server
        const res = await fetch(url, { ...options, cache: 'no-store' });
        let text = await res.text(); 
        
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
            const cleanJson = text.substring(firstBrace, lastBrace + 1);
            return JSON.parse(cleanJson);
        } else {
            console.error("RAW API CRASH OUTPUT:", text);
            return { status: 'error', message: 'Invalid API response format' };
        }
    } catch (err) {
        console.error("Network Error:", err);
        return { status: 'error' }; 
    }
};

// Helper for file icons
const getFileIcon = (ext) => {
    if (['pdf'].includes(ext)) return <FileText className="text-red-500" size={28} />;
    if (['jpg', 'jpeg', 'png'].includes(ext)) return <ImageIcon className="text-blue-500" size={28} />;
    if (['zip', 'rar'].includes(ext)) return <FileArchive className="text-yellow-600" size={28} />;
    return <FileText className="text-gray-500" size={28} />;
};

export default function LibraryPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [resources, setResources] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('ALL');
    
    // Form States
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ title: '', description: '', subject_code: '' });
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [file, setFile] = useState(null);
    const fileInputRef = useRef(null);

    const loadData = async () => {
        const fd = new FormData();
        fd.append('action', 'fetch_init');
        fd.append('role', user?.role);
        fd.append('user_id', user?.id);
        if (user?.role === 'student') fd.append('class_id', user?.class_id);

        const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/library.php`, { method: 'POST', body: fd });
        
        if (json.status === 'success') {
            setResources(json.resources || []);
            setClasses(json.classes || []);
            setSubjects(json.subjects || []);
        } else {
            console.error("Library fetch failed. JSON Output:", json);
        }
        setLoading(false);
    };

    useEffect(() => { if (user) loadData(); }, [user]);

    const handleClassToggle = (classId) => {
        setSelectedClasses(prev => prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (selectedClasses.length === 0) return alert("Please select at least one class.");
        if (!file) return alert("Please select a file to upload.");
        
        setSaving(true);
        const fd = new FormData();
        fd.append('action', 'upload_resource');
        fd.append('teacher_id', user.id);
        fd.append('teacher_name', user.name);
        fd.append('title', formData.title);
        fd.append('description', formData.description);
        fd.append('subject_code', formData.subject_code);
        fd.append('class_ids', selectedClasses.join(','));
        fd.append('file', file);

        const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/library.php`, { method: 'POST', body: fd });
        if(json.status === 'success') {
            setFormData({ title: '', description: '', subject_code: '' });
            setSelectedClasses([]);
            setFile(null);
            setShowForm(false);
            loadData();
            alert("Resource Uploaded! Students have been notified.");
        } else {
            alert(json.message || "Upload Failed");
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this library resource?")) return;
        const fd = new FormData(); fd.append('action', 'delete_resource'); fd.append('id', id); fd.append('teacher_id', user.id);
        await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/library.php`, { method: 'POST', body: fd });
        loadData();
    };

    // Apply Smart Filters
    const filteredResources = resources.filter(res => {
        const matchesSearch = res.title.toLowerCase().includes(searchQuery.toLowerCase()) || (res.description && res.description.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesSubject = subjectFilter === 'ALL' || res.subject_code === subjectFilter;
        return matchesSearch && matchesSubject;
    });

    if (loading) return <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;

    return (
        <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] pb-24 font-sans text-gray-800 dark:text-gray-100">
            
            <div className="sticky top-0 z-40 bg-white/90 dark:bg-[#151515]/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 px-4 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => window.history.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><ArrowLeft size={20} /></button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight leading-none text-blue-700 dark:text-blue-500">Digital Library</h1>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Study Materials & Notes</p>
                    </div>
                </div>
                {(user?.role === 'teacher' || user?.role === 'admin') && (
                    <button onClick={() => setShowForm(!showForm)} className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-4 py-2 rounded-full text-xs font-bold active:scale-95 transition-transform">
                        {showForm ? 'Cancel' : '+ Upload'}
                    </button>
                )}
            </div>

            <div className="p-4 max-w-lg mx-auto mt-2 space-y-6">
                
                {/* TEACHER UPLOAD FORM */}
                <AnimatePresence>
                    {showForm && (user?.role === 'teacher' || user?.role === 'admin') && (
                        <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}} className="overflow-hidden">
                            <div className="bg-white dark:bg-[#151515] p-5 rounded-[2rem] shadow-xl border border-blue-100 dark:border-blue-900/30 mb-6">
                                <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Upload size={16} className="text-blue-500" /> Add to Library
                                </h2>
                                
                                <form onSubmit={handleUpload} className="space-y-4">
                                    <input required type="text" placeholder="Resource Title (e.g., Physics Chapter 1 Notes)" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-bold outline-none focus:ring-2 ring-blue-500/20" />
                                    
                                    <div className="grid grid-cols-1 gap-3">
                                        <select required value={formData.subject_code} onChange={e => setFormData({...formData, subject_code: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-bold outline-none text-gray-700 dark:text-gray-300">
                                            <option value="" disabled>Select Subject Category...</option>
                                            {subjects.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                                        </select>
                                    </div>

                                    <textarea placeholder="Short description..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-medium outline-none min-h-[80px] focus:ring-2 ring-blue-500/20" />
                                    
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Available To Classes</label>
                                        <div className="flex flex-wrap gap-2">
                                            {classes.map(c => (
                                                <button type="button" key={c.id} onClick={() => handleClassToggle(c.id)} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${selectedClasses.includes(c.id) ? 'bg-blue-500 border-blue-500 text-white shadow-md' : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>{c.name}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <input type="file" required ref={fileInputRef} onChange={e => setFile(e.target.files[0])} className="hidden" />
                                        <button type="button" onClick={() => fileInputRef.current.click()} className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 p-4 rounded-xl text-xs font-bold text-gray-500 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                            <FileText size={24} className={file ? "text-blue-500" : "text-gray-400"} />
                                            {file ? file.name : 'Click to Browse & Attach File'}
                                        </button>
                                    </div>

                                    <button disabled={saving} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors mt-2">
                                        {saving ? <Loader2 size={18} className="animate-spin" /> : 'Upload Resource'}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* SMART FILTERS */}
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search resources..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-xl py-3 pl-10 pr-4 text-sm font-medium outline-none focus:ring-2 ring-blue-500/20"
                        />
                    </div>
                    <div className="relative w-[120px] shrink-0">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                        <select 
                            value={subjectFilter} 
                            onChange={e => setSubjectFilter(e.target.value)} 
                            className="w-full h-full bg-white dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-xl pl-9 pr-2 text-[11px] font-bold text-gray-700 dark:text-gray-300 outline-none appearance-none truncate"
                        >
                            <option value="ALL">All Subjects</option>
                            {subjects.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* RESOURCE FEED */}
                <div className="space-y-4 pt-2">
                    {filteredResources.length === 0 ? (
                        <div className="text-center p-10 opacity-50 flex flex-col items-center">
                            <LibraryBig size={48} className="mb-4 text-gray-400" />
                            <p className="font-bold text-gray-600 dark:text-gray-400">No Resources Found</p>
                        </div>
                    ) : (
                        filteredResources.map((res) => (
                            <div key={res.id} className="bg-white dark:bg-[#151515] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-3">
                                
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 bg-gray-50 dark:bg-black rounded-xl flex items-center justify-center shrink-0 border border-gray-100 dark:border-gray-800">
                                        {getFileIcon(res.file_type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-black text-sm text-gray-900 dark:text-white leading-tight pr-4">{res.title}</h3>
                                            {(user?.role === 'teacher' || user?.role === 'admin') && user?.id === res.teacher_id && (
                                                <button onClick={() => handleDelete(res.id)} className="text-gray-400 hover:text-red-500 shrink-0"><Trash2 size={16} /></button>
                                            )}
                                        </div>
                                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1">{res.subject_name}</p>
                                        {res.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{res.description}</p>}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3 mt-1">
                                    <div className="flex items-center gap-2">
                                        <img src={res.teacher_pic ? `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${res.teacher_pic}` : `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}GMPSimages/default_teacher.png`} className="w-6 h-6 rounded-full object-cover" />
                                        <div>
                                            <p className="text-[9px] font-bold text-gray-400 leading-none">{res.teacher_name}</p>
                                            <p className="text-[9px] text-gray-400 leading-none mt-0.5">{res.formatted_date}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">{res.file_size}</span>
                                        <a href={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${res.file_url}`} target="_blank" rel="noopener noreferrer" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 p-2 rounded-lg hover:bg-blue-100 transition-colors">
                                            <Download size={18} />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

            </div>
        </div>
    );
}