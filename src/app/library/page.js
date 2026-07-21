"use client";
import { useEffect, useState, useRef } from 'react';
import { useAuth } from "../../context/AuthContext";
import { ArrowLeft, Upload, Trash2, Loader2, Download, Search, Filter, Book, FileText, Image as ImageIcon, FileArchive, LibraryBig, Globe, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- BULLETPROOF JSON PARSER ---
const safeFetchJson = async (url, options = {}) => {
    try {
        const res = await fetch(url, { ...options, cache: 'no-store' });
        let text = await res.text(); 
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
            const cleanJson = text.substring(firstBrace, lastBrace + 1);
            return JSON.parse(cleanJson);
        }
        return { status: 'error', message: 'Invalid API response format' };
    } catch (err) {
        return { status: 'error', message: 'Network connection failed' }; 
    }
};

// Modern UI File Icon Helper
const getFileIcon = (ext) => {
    if (['pdf'].includes(ext)) return <FileText className="text-rose-500" size={24} />;
    if (['jpg', 'jpeg', 'png'].includes(ext)) return <ImageIcon className="text-blue-500" size={24} />;
    if (['zip', 'rar'].includes(ext)) return <FileArchive className="text-amber-500" size={24} />;
    return <Book className="text-indigo-500" size={24} />;
};

export default function LibraryPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [resources, setResources] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    
    // Filters & Toggles
    const [searchQuery, setSearchQuery] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('ALL');
    const [exploreMode, setExploreMode] = useState(false);
    
    // Form States
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ title: '', description: '', subject_code: '' });
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [shareToAll, setShareToAll] = useState(false);
    const [file, setFile] = useState(null);
    const fileInputRef = useRef(null);

    const loadData = async () => {
        setLoading(true);
        const fd = new FormData();
        fd.append('action', 'fetch_init');
        fd.append('role', user?.role);
        fd.append('user_id', user?.id);
        if (user?.role === 'student') {
            fd.append('class_id', user?.class_id);
            fd.append('explore_mode', exploreMode ? 'true' : 'false');
        }

        const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/library.php`, { method: 'POST', body: fd });
        
        if (json.status === 'success') {
            setResources(json.resources || []);
            setClasses(json.classes || []);
            setSubjects(json.subjects || []);
        } else {
            console.error("Library fetch failed", json);
        }
        setLoading(false);
    };

    // Re-fetch data if student toggles Explore Mode
    useEffect(() => { if (user) loadData(); }, [user, exploreMode]);

    const handleClassToggle = (classId) => {
        setSelectedClasses(prev => prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!shareToAll && selectedClasses.length === 0) return alert("Please select at least one class or choose 'Share to All'.");
        if (!file) return alert("Please select a file to upload.");
        
        setSaving(true);
        const fd = new FormData();
        fd.append('action', 'upload_resource');
        fd.append('teacher_id', user.id);
        fd.append('teacher_name', user.name);
        fd.append('title', formData.title);
        fd.append('description', formData.description);
        fd.append('subject_code', formData.subject_code);
        fd.append('class_ids', shareToAll ? 'ALL' : selectedClasses.join(','));
        fd.append('file', file);

        const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/library.php`, { method: 'POST', body: fd });
        
        if(json.status === 'success') {
            setFormData({ title: '', description: '', subject_code: '' });
            setSelectedClasses([]);
            setShareToAll(false);
            setFile(null);
            setShowForm(false);
            loadData();
        } else {
            alert(json.message || "Upload Failed");
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to permanently delete this resource?")) return;
        const fd = new FormData(); 
        fd.append('action', 'delete_resource'); 
        fd.append('id', id); 
        fd.append('teacher_id', user.id);
        await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/library.php`, { method: 'POST', body: fd });
        loadData();
    };

    // Apply Local Search & Subject Filters
    const filteredResources = resources.filter(res => {
        const matchesSearch = res.title.toLowerCase().includes(searchQuery.toLowerCase()) || (res.description && res.description.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesSubject = subjectFilter === 'ALL' || res.subject_code === subjectFilter;
        return matchesSearch && matchesSubject;
    });

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0a0a0a] pb-24 font-sans text-gray-800 dark:text-gray-100">
            
            {/* Glassmorphic Header */}
            <div className="sticky top-0 z-40 bg-white/80 dark:bg-[#151515]/80 backdrop-blur-2xl border-b border-gray-200/50 dark:border-gray-800/50 px-4 py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => window.history.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight leading-none text-gray-900 dark:text-white">Digital Library</h1>
                        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">Study Materials & Assets</p>
                    </div>
                </div>
                {(user?.role === 'teacher' || user?.role === 'admin') && (
                    <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 px-5 py-2.5 rounded-full text-xs font-bold active:scale-95 transition-all flex items-center gap-2">
                        {showForm ? 'Cancel' : <><Upload size={14} /> Upload</>}
                    </button>
                )}
            </div>

            <div className="p-4 max-w-2xl mx-auto mt-2 space-y-6">
                
                {/* TEACHER UPLOAD FORM */}
                <AnimatePresence>
                    {showForm && (user?.role === 'teacher' || user?.role === 'admin') && (
                        <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="overflow-hidden">
                            <div className="bg-white dark:bg-[#111111] p-6 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 mb-6">
                                <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Upload size={16} className="text-indigo-500" /> Upload New Resource
                                </h2>
                                
                                <form onSubmit={handleUpload} className="space-y-5">
                                    <input required type="text" placeholder="Resource Title (e.g., Physics Chapter 1 Notes)" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-gray-800 text-sm font-bold outline-none focus:ring-2 ring-indigo-500/20 transition-all" />
                                    
                                    <select required value={formData.subject_code} onChange={e => setFormData({...formData, subject_code: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-gray-800 text-sm font-bold outline-none text-gray-700 dark:text-gray-300">
                                        <option value="" disabled>Select Subject Category...</option>
                                        {subjects.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                                    </select>

                                    <textarea placeholder="Brief description or instructions..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-black/50 rounded-2xl border border-gray-200 dark:border-gray-800 text-sm font-medium outline-none min-h-[100px] focus:ring-2 ring-indigo-500/20 transition-all" />
                                    
                                    {/* Class Targeting Area */}
                                    <div className="space-y-3 bg-gray-50 dark:bg-[#151515] p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                                <Users size={12} /> Target Audience
                                            </label>
                                            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                                                <input type="checkbox" checked={shareToAll} onChange={e => setShareToAll(e.target.checked)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                                                Share to ALL Classes
                                            </label>
                                        </div>
                                        
                                        {!shareToAll && (
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {classes.map(c => (
                                                    <button type="button" key={c.id} onClick={() => handleClassToggle(c.id)} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${selectedClasses.includes(c.id) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-gray-200 dark:bg-[#111111] dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-300'}`}>{c.name}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <input type="file" required ref={fileInputRef} onChange={e => setFile(e.target.files[0])} className="hidden" />
                                        <button type="button" onClick={() => fileInputRef.current.click()} className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 p-6 rounded-2xl text-sm font-bold text-gray-500 flex flex-col items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center text-indigo-500">
                                                <Upload size={20} />
                                            </div>
                                            {file ? <span className="text-indigo-600 dark:text-indigo-400">{file.name}</span> : 'Click to Browse & Attach Document'}
                                        </button>
                                    </div>

                                    <button disabled={saving} className="w-full bg-gray-900 dark:bg-white text-white dark:text-black py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity mt-2 disabled:opacity-50">
                                        {saving ? <Loader2 size={18} className="animate-spin" /> : 'Publish to Library'}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* FILTERS & TOGGLES */}
                <div className="space-y-4">
                    {user?.role === 'student' && (
                        <div className="bg-white dark:bg-[#111111] p-1.5 rounded-full border border-gray-200 dark:border-gray-800 flex shadow-sm">
                            <button onClick={() => setExploreMode(false)} className={`flex-1 py-2 text-xs font-bold rounded-full transition-all ${!exploreMode ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                My Class Content
                            </button>
                            <button onClick={() => setExploreMode(true)} className={`flex-1 py-2 text-xs font-bold rounded-full transition-all flex items-center justify-center gap-1.5 ${exploreMode ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                                <Globe size={14} /> Explore Entire Library
                            </button>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search by title or description..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium outline-none focus:ring-2 ring-indigo-500/20 shadow-sm"
                            />
                        </div>
                        <div className="relative w-[130px] shrink-0">
                            <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                            <select 
                                value={subjectFilter} 
                                onChange={e => setSubjectFilter(e.target.value)} 
                                className="w-full h-full bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-2xl pl-10 pr-2 text-[11px] font-bold text-gray-700 dark:text-gray-300 outline-none appearance-none truncate shadow-sm"
                            >
                                <option value="ALL">All Subjects</option>
                                {subjects.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* RESOURCE FEED */}
                <div className="space-y-4 pt-2">
                    {loading ? (
                         <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
                    ) : filteredResources.length === 0 ? (
                        <div className="text-center p-12 bg-white dark:bg-[#111111] rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col items-center">
                            <div className="w-20 h-20 bg-gray-50 dark:bg-black rounded-full flex items-center justify-center mb-4">
                                <LibraryBig size={32} className="text-gray-400" />
                            </div>
                            <h3 className="font-black text-gray-900 dark:text-white text-lg">No Resources Found</h3>
                            <p className="text-sm text-gray-500 mt-2 font-medium">Try adjusting your filters or search query.</p>
                        </div>
                    ) : (
                        filteredResources.map((res) => (
                            <div key={res.id} className="bg-white dark:bg-[#111111] p-5 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4 group">
                                
                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl flex flex-col items-center justify-center shrink-0 border border-gray-100 dark:border-gray-800 relative overflow-hidden">
                                        {getFileIcon(res.file_type)}
                                        {/* Visual File Badge */}
                                        <div className="absolute bottom-0 w-full bg-black/5 dark:bg-white/5 text-[9px] font-black text-center py-1 uppercase text-gray-600 dark:text-gray-400">
                                            {res.file_type}
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-4">
                                            <h3 className="font-black text-base text-gray-900 dark:text-white leading-tight truncate">{res.title}</h3>
                                            {(user?.role === 'teacher' || user?.role === 'admin') && user?.id === res.teacher_id && (
                                                <button onClick={() => handleDelete(res.id)} className="text-gray-400 hover:text-red-500 shrink-0 bg-gray-50 dark:bg-[#1a1a1a] p-2 rounded-full transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                                                {res.subject_name}
                                            </span>
                                            {res.class_ids === 'ALL' && (
                                                <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                                    <Globe size={10} /> Universal
                                                </span>
                                            )}
                                        </div>
                                        {res.description && <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">{res.description}</p>}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-4 mt-2">
                                    <div className="flex items-center gap-3">
                                        <img src={res.teacher_pic ? `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${res.teacher_pic}` : `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}GMPSimages/default_teacher.png`} className="w-8 h-8 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm" />
                                        <div>
                                            <p className="text-[11px] font-bold text-gray-900 dark:text-gray-200 leading-none">{res.teacher_name}</p>
                                            <p className="text-[9px] font-medium text-gray-400 mt-1">{res.formatted_date}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-[#1a1a1a] px-2 py-1 rounded-md">{res.file_size}</span>
                                        <a href={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${res.file_url}`} target="_blank" rel="noopener noreferrer" className="bg-gray-900 text-white dark:bg-white dark:text-black px-4 py-2 rounded-xl text-xs font-bold hover:scale-105 transition-transform flex items-center gap-2 shadow-md">
                                            <Download size={14} /> Open
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