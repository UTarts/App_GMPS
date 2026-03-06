"use client";
import { useEffect, useState, useRef } from 'react';
import { useAuth } from "../../context/AuthContext";
import { ArrowLeft, Video, Radio, Upload, Trash2, Loader2, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const safeFetchJson = async (url, options = {}) => {
    try {
        const res = await fetch(url, options);
        let text = await res.text(); 
        const match = text.match(/\{[\s\S]*\}/);
        return match ? JSON.parse(match[0]) : { status: 'error' };
    } catch (err) { return { status: 'error' }; }
};

export default function VirtualClassPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [videos, setVideos] = useState([]);
    const [classes, setClasses] = useState([]);
    
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ title: '', description: '', youtube_url: '', type: 'recorded' });
    const [selectedClasses, setSelectedClasses] = useState([]);
    
    // Player State
    const [activeVideo, setActiveVideo] = useState(null);

    const loadData = async () => {
        const fd = new FormData();
        fd.append('action', 'fetch_init');
        fd.append('role', user?.role);
        fd.append('user_id', user?.id);
        if (user?.role === 'student') fd.append('class_id', user?.class_id);

        const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/virtual_class.php`, { method: 'POST', body: fd });
        if (json.status === 'success') {
            setVideos(json.videos || []);
            setClasses(json.classes || []);
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
        
        setSaving(true);
        const fd = new FormData();
        fd.append('action', 'upload_video');
        fd.append('teacher_id', user.id);
        fd.append('teacher_name', user.name);
        fd.append('type', formData.type);
        fd.append('title', formData.title);
        fd.append('description', formData.description);
        fd.append('youtube_url', formData.youtube_url);
        fd.append('class_ids', selectedClasses.join(','));

        const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/virtual_class.php`, { method: 'POST', body: fd });
        if(json.status === 'success') {
            setFormData({ title: '', description: '', youtube_url: '', type: 'recorded' });
            setSelectedClasses([]);
            setShowForm(false);
            loadData();
            alert("Published! Students have been notified via Push Notification.");
        } else {
            alert(json.message || "Invalid Link or Error.");
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this video?")) return;
        const fd = new FormData(); fd.append('action', 'delete_video'); fd.append('id', id); fd.append('teacher_id', user.id);
        await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/virtual_class.php`, { method: 'POST', body: fd });
        loadData();
    };

    if (loading) return <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="animate-spin text-red-600" size={32} /></div>;

    return (
        <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] pb-24 font-sans text-gray-800 dark:text-gray-100">
            
            <div className="sticky top-0 z-40 bg-white/90 dark:bg-[#151515]/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 px-4 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => window.history.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><ArrowLeft size={20} /></button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight leading-none text-red-600 dark:text-red-500">Virtual Class</h1>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Live & Recorded Lectures</p>
                    </div>
                </div>
                {user?.role === 'teacher' && (
                    <button onClick={() => setShowForm(!showForm)} className="bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-4 py-2 rounded-full text-xs font-bold active:scale-95 transition-transform">
                        {showForm ? 'Cancel' : '+ New Lecture'}
                    </button>
                )}
            </div>

            <div className="p-4 max-w-lg mx-auto mt-2 space-y-6">
                
                {/* TEACHER UPLOAD FORM */}
                <AnimatePresence>
                    {showForm && user?.role === 'teacher' && (
                        <motion.div initial={{opacity:0, y:-20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} className="bg-white dark:bg-[#151515] p-5 rounded-[2rem] shadow-xl border border-red-100 dark:border-red-900/30">
                            
                            <div className="flex bg-gray-100 dark:bg-black p-1 rounded-xl mb-4">
                                <button onClick={() => setFormData({...formData, type: 'recorded'})} type="button" className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${formData.type === 'recorded' ? 'bg-white dark:bg-[#1a1a1a] shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'}`}><Video size={14}/> Recorded</button>
                                <button onClick={() => setFormData({...formData, type: 'live'})} type="button" className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${formData.type === 'live' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500'}`}><Radio size={14}/> Live Stream</button>
                            </div>

                            <form onSubmit={handleUpload} className="space-y-4">
                                <input required type="text" placeholder="Lecture Title (e.g., Algebra Basics)" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-bold outline-none focus:ring-2 ring-red-500/20" />
                                <input required type="url" placeholder="Paste YouTube Link here..." value={formData.youtube_url} onChange={e => setFormData({...formData, youtube_url: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-medium outline-none focus:ring-2 ring-red-500/20 text-blue-600" />
                                <textarea placeholder="Description & Topics covered..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-3 bg-gray-50 dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-medium outline-none min-h-[80px] focus:ring-2 ring-red-500/20" />
                                
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Target Classes</label>
                                    <div className="flex flex-wrap gap-2">
                                        {classes.map(c => (
                                            <button type="button" key={c.id} onClick={() => handleClassToggle(c.id)} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${selectedClasses.includes(c.id) ? 'bg-red-500 border-red-500 text-white shadow-md' : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>{c.name}</button>
                                        ))}
                                    </div>
                                </div>

                                <button disabled={saving} className="w-full bg-red-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 hover:bg-red-700 transition-colors mt-2">
                                    {saving ? <Loader2 size={18} className="animate-spin" /> : <><Upload size={18}/> Publish & Notify Class</>}
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* CINEMATIC VIDEO FEED */}
                <div className="space-y-6">
                    {videos.length === 0 ? (
                        <div className="text-center p-10 opacity-50 flex flex-col items-center">
                            <Video size={48} className="mb-4 text-gray-400" />
                            <p className="font-bold text-gray-600 dark:text-gray-400">No Videos Found</p>
                        </div>
                    ) : (
                        videos.map((vid) => (
                            <div key={vid.id} className="bg-white dark:bg-[#151515] rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
                                
                                {/* Video Thumbnail / Player Area */}
                                <div className="relative w-full aspect-video bg-black group">
                                    {activeVideo === vid.id ? (
                                        <iframe 
                                            className="w-full h-full" 
                                            src={`https://www.youtube.com/embed/${vid.youtube_video_id}?autoplay=1&rel=0`} 
                                            title="YouTube video player" 
                                            frameBorder="0" 
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                            allowFullScreen
                                        ></iframe>
                                    ) : (
                                        <>
                                            <img src={`https://img.youtube.com/vi/${vid.youtube_video_id}/maxresdefault.jpg`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => setActiveVideo(vid.id)} />
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="w-16 h-16 bg-red-600/90 text-white rounded-full flex items-center justify-center backdrop-blur-sm shadow-xl group-hover:scale-110 transition-transform">
                                                    <PlayCircle size={32} />
                                                </div>
                                            </div>
                                            {vid.type === 'live' && (
                                                <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                                                    <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span> Live Stream
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Video Info */}
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-black text-lg text-gray-900 dark:text-white leading-tight pr-4">{vid.title}</h3>
                                        {user?.role === 'teacher' && (
                                            <button onClick={() => handleDelete(vid.id)} className="text-gray-400 hover:text-red-600 shrink-0"><Trash2 size={16} /></button>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 font-bold mb-3">{vid.formatted_date}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{vid.description}</p>
                                    
                                    {user?.role === 'student' && vid.teacher_name && (
                                        <div className="mt-4 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800 pt-4">
                                            <img src={vid.teacher_pic ? `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${vid.teacher_pic}` : `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}GMPSimages/default_teacher.png`} className="w-8 h-8 rounded-full object-cover" />
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Teacher</p>
                                                <p className="text-xs font-bold text-gray-900 dark:text-white">{vid.teacher_name}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}