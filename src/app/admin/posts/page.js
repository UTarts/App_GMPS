"use client";
import { useEffect, useState, useRef } from 'react';
import { useAuth } from "../../../context/AuthContext";
import { 
    Camera, Calendar, FileText, Bell, Trash2, X, UploadCloud, 
    CheckCircle2, AlertCircle, Loader2, Image as ImageIcon, Video, Plus, PlayCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminPosts() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('updates'); 
    const [data, setData] = useState({ notices: [], updates: [], events: [], whats_today: null });
    const [galleryHistory, setGalleryHistory] = useState([]); // Separate state for gallery
    const [loading, setLoading] = useState(true);
    const [refresh, setRefresh] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    // Forms
    const [formData, setFormData] = useState({});
    const fileInputRef = useRef(null);
    const todayInputRef = useRef(null);

    // Gallery
    const [galleryType, setGalleryType] = useState('photo'); 
    const [galleryFiles, setGalleryFiles] = useState([]); 
    const [galleryPreviews, setGalleryPreviews] = useState([]); 
    const galleryInputRef = useRef(null);

    // UI
    const [toast, setToast] = useState(null); 
    const [confirmModal, setConfirmModal] = useState(null);

    // 1. Fetch Main Data (Updates/Notices)
    useEffect(() => {
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_posts.php?action=fetch_all_posts`)
            .then(res => res.json())
            .then(json => {
                if(json.status === 'success') setData(json.data);
                setLoading(false);
            });
    }, [refresh]);

    // 2. Fetch Gallery History (Only when tab is active)
    useEffect(() => {
        if (activeTab === 'gallery') {
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_posts.php?action=fetch_gallery_history`)
                .then(res => res.json())
                .then(json => {
                    if(json.status === 'success') setGalleryHistory(json.data);
                });
        }
    }, [activeTab, refresh]);

    // --- UTILS ---
    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // YOUTUBE LINK CONVERTER
    const getEmbedUrl = (url) => {
        if (!url) return '';
        // Handles standard watch?v=, share youtu.be/, and embed/ links
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11)
            ? `https://www.youtube.com/embed/${match[2]}`
            : url; // Return original if regex fails (though it shouldn't for valid links)
    };

    // Clean up previews
    useEffect(() => {
        return () => galleryPreviews.forEach(url => URL.revokeObjectURL(url));
    }, [galleryPreviews]);

    // --- HANDLERS ---

    const handleUploadToday = async (e) => {
        const file = e.target.files[0];
        if(!file) return;
        setSubmitting(true);
        const fd = new FormData();
        fd.append('action', 'save_whats_today');
        fd.append('image', file);
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_posts.php`, { method: 'POST', body: fd });
            showToast("Daily poster updated!", "success");
            setRefresh(prev => prev + 1);
        } catch (err) {
            showToast("Failed to upload.", "error");
        } finally {
            setSubmitting(false);
            if(todayInputRef.current) todayInputRef.current.value = "";
        }
    };

    const handleGallerySelect = (e) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            setGalleryFiles(prev => [...prev, ...filesArray]);
            const newPreviews = filesArray.map(file => URL.createObjectURL(file));
            setGalleryPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeGalleryImage = (index) => {
        setGalleryFiles(prev => prev.filter((_, i) => i !== index));
        setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleCreatePost = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const fd = new FormData();
        let typeAction = '';

        if (activeTab === 'gallery') {
            typeAction = 'save_gallery_item';
            fd.append('category', formData.category || 'academic');
            fd.append('caption', formData.caption || '');
            
            if (galleryType === 'photo') {
                if (galleryFiles.length === 0) {
                    showToast("Select at least one image.", "error");
                    setSubmitting(false);
                    return;
                }
                galleryFiles.forEach(file => fd.append('images[]', file));
            } else {
                // Auto-convert YouTube link here
                const embedUrl = getEmbedUrl(formData.video_url);
                fd.append('video_url', embedUrl);
            }
        } else {
            if(activeTab === 'notices') typeAction = 'save_notice';
            if(activeTab === 'updates') typeAction = 'save_update';
            if(activeTab === 'events') typeAction = 'save_event';
            Object.keys(formData).forEach(key => fd.append(key, formData[key]));
            if(fileInputRef.current?.files[0]) fd.append('image', fileInputRef.current.files[0]);
        }
        
        fd.append('action', typeAction);

        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_posts.php`, { method: 'POST', body: fd });
            showToast("Posted successfully!");
            setFormData({});
            if(fileInputRef.current) fileInputRef.current.value = "";
            setGalleryFiles([]);
            setGalleryPreviews([]);
            setRefresh(prev => prev + 1);
        } catch (err) {
            showToast("Something went wrong.", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        if (!confirmModal) return;
        const fd = new FormData();
        
        // Determine action based on tab
        if (activeTab === 'gallery') {
            fd.append('action', 'delete_gallery_item');
            fd.append('id', confirmModal.id);
            fd.append('type', confirmModal.type); // 'photo' or 'video'
        } else {
            fd.append('action', 'delete_post');
            fd.append('id', confirmModal.id);
            fd.append('type', confirmModal.type);
        }

        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_posts.php`, { method: 'POST', body: fd });
        showToast("Item deleted.");
        setRefresh(prev => prev + 1);
        setConfirmModal(null);
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
            <Loader2 className="animate-spin text-blue-600" size={30} />
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 font-sans text-gray-800 dark:text-gray-100 transition-colors duration-300">
            
            {/* Header */}
            <div className="bg-white dark:bg-[#151515] p-4 sticky top-0 z-10 border-b border-gray-100 dark:border-gray-800 shadow-sm">
                <h1 className="font-bold text-lg">Manage Posts</h1>
            </div>

            <div className="p-4 space-y-6 max-w-2xl mx-auto">
                
                {/* --- 1. WHAT'S TODAY CARD --- */}
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 dark:from-indigo-900 dark:to-violet-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <div className="relative z-10 flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Calendar size={18} className="text-indigo-200" />
                                <h2 className="text-lg font-bold">What's Today?</h2>
                            </div>
                            <p className="text-xs text-indigo-100 mb-4 opacity-90 max-w-[180px]">Upload daily poster. Auto-deletes at midnight.</p>
                            <label className="flex items-center gap-3 bg-white/20 backdrop-blur-md border border-white/20 text-white rounded-xl px-4 py-2.5 cursor-pointer hover:bg-white/30 transition-colors w-fit">
                                {submitting ? <Loader2 size={18} className="animate-spin"/> : <Camera size={18} />}
                                <span className="text-xs font-bold">Change Poster</span>
                                <input ref={todayInputRef} type="file" className="hidden" accept="image/*" onChange={handleUploadToday} disabled={submitting} />
                            </label>
                        </div>
                        <div className="relative group">
                            {data.whats_today ? (
                                <div className="w-20 h-20 rounded-2xl border-2 border-white/30 overflow-hidden shadow-lg bg-black/20">
                                    <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${data.whats_today.image_url}`} className="w-full h-full object-cover" alt="Today" />
                                </div>
                            ) : (
                                <div className="w-20 h-20 rounded-2xl border-2 border-white/20 bg-white/10 flex items-center justify-center"><span className="text-[10px] opacity-60">No Image</span></div>
                            )}
                            <div className="absolute -bottom-2 -right-1 bg-green-500 text-white text-[9px] px-2 py-0.5 rounded-full shadow-sm font-bold">{data.whats_today ? 'LIVE' : 'EMPTY'}</div>
                        </div>
                    </div>
                </div>

                {/* --- 2. TABS --- */}
                <div className="flex bg-white dark:bg-[#151515] p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-x-auto">
                    {[ { id: 'updates', label: 'Updates', icon: Bell }, { id: 'notices', label: 'Notices', icon: FileText }, { id: 'events', label: 'Events', icon: Calendar }, { id: 'gallery', label: 'Gallery', icon: ImageIcon } ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 min-w-[80px] flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 text-[10px] sm:text-xs font-bold rounded-xl transition-all ${activeTab === tab.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                        >
                            <tab.icon size={16} />{tab.label}
                        </button>
                    ))}
                </div>

                {/* --- 3. CREATE FORM --- */}
                <div className="bg-white dark:bg-[#151515] p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <UploadCloud size={16} className="text-indigo-600 dark:text-indigo-400"/>
                        {activeTab === 'gallery' ? 'Upload to Gallery' : `Create New ${activeTab.slice(0, -1)}`}
                    </h3>
                    
                    <form onSubmit={handleCreatePost} className="space-y-4">
                        {activeTab === 'gallery' ? (
                            <>
                                <div className="flex bg-gray-50 dark:bg-[#0a0a0a] p-1 rounded-xl border border-gray-100 dark:border-gray-800">
                                    <button type="button" onClick={() => setGalleryType('photo')} className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 ${galleryType === 'photo' ? 'bg-white dark:bg-[#202020] shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`}><ImageIcon size={14}/> Photos</button>
                                    <button type="button" onClick={() => setGalleryType('video')} className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 ${galleryType === 'video' ? 'bg-white dark:bg-[#202020] shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`}><Video size={14}/> Video URL</button>
                                </div>
                                <select className="w-full p-3 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-100 dark:border-gray-800 rounded-xl text-sm outline-none font-medium dark:text-white" onChange={e => setFormData({...formData, category: e.target.value})} value={formData.category || 'academic'}>
                                    <option value="academic">Academic</option><option value="sports">Sports</option><option value="cultural">Cultural</option><option value="infrastructure">Campus</option>
                                </select>
                                <input type="text" placeholder="Caption / Event Name" className="w-full p-3 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-100 dark:border-gray-800 rounded-xl text-sm outline-none font-medium dark:text-white" onChange={e => setFormData({...formData, caption: e.target.value})} required />
                                {galleryType === 'photo' ? (
                                    <div className="space-y-3">
                                        {galleryPreviews.length > 0 && (
                                            <div className="grid grid-cols-4 gap-2">
                                                {galleryPreviews.map((url, i) => (
                                                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                                        <img src={url} className="w-full h-full object-cover" />
                                                        <button type="button" onClick={() => removeGalleryImage(i)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-red-500"><X size={12} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div onClick={() => galleryInputRef.current.click()} className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#202020] transition-colors">
                                            <UploadCloud size={24} className="text-gray-400" /><span className="text-xs text-gray-500 font-medium">Click to select photos (Bulk supported)</span>
                                            <input ref={galleryInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleGallerySelect} />
                                        </div>
                                    </div>
                                ) : (
                                    <input type="url" placeholder="Paste Any YouTube Link" className="w-full p-3 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-100 dark:border-gray-800 rounded-xl text-sm outline-none dark:text-white" onChange={e => setFormData({...formData, video_url: e.target.value})} required />
                                )}
                            </>
                        ) : (
                            <>
                                {activeTab !== 'updates' && <input type="text" placeholder="Title" className="w-full p-3 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-100 dark:border-gray-800 rounded-xl text-sm outline-none font-bold dark:text-white placeholder:text-gray-400" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} required />}
                                {activeTab === 'events' && <input type="date" className="w-full p-3 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-100 dark:border-gray-800 rounded-xl text-sm outline-none text-gray-600 dark:text-gray-300" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} required />}
                                <textarea rows="3" placeholder={activeTab === 'updates' ? "Write a quick update..." : "Description..."} className="w-full p-3 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-100 dark:border-gray-800 rounded-xl text-sm outline-none transition-colors resize-none dark:text-white placeholder:text-gray-400" value={formData[activeTab === 'updates' ? 'text' : activeTab === 'events' ? 'description' : 'content'] || ''} onChange={e => setFormData({...formData, [activeTab === 'updates' ? 'text' : activeTab === 'events' ? 'description' : 'content']: e.target.value})} required></textarea>
                                <div className="flex items-center gap-3">
                                    <label className="flex-1 flex items-center justify-center gap-2 p-3 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-[#202020] transition-colors"><Camera size={16} className="text-gray-400" /><span className="text-xs text-gray-500 font-medium truncate" id="fileNameDisplay">Add Image (Optional)</span><input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => { if(e.target.files[0]) document.getElementById('fileNameDisplay').innerText = e.target.files[0].name; }} /></label>
                                </div>
                            </>
                        )}
                        <button type="submit" disabled={submitting} className="w-full bg-black dark:bg-white text-white dark:text-black p-3 rounded-xl text-sm font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform">
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />} Post Now
                        </button>
                    </form>
                </div>

                {/* --- 4. HISTORY LIST (Conditional) --- */}
                <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            {activeTab === 'gallery' ? 'Latest Gallery Uploads' : 'Recent History'}
                        </h3>
                        <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                            {activeTab === 'gallery' ? galleryHistory.length : data[activeTab].length} Items
                        </span>
                    </div>

                    <div className="space-y-3">
                        {/* GALLERY HISTORY GRID */}
                        {activeTab === 'gallery' ? (
                            <div className="grid grid-cols-4 gap-2">
                                {galleryHistory.map(item => (
                                    // FIX: Combined ID and Type for unique key
                                    <div key={`${item.type}-${item.id}`} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 group">
                                        {item.type === 'photo' ? (
                                            <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${item.url}`} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-black/10 dark:bg-black/30">
                                                <PlayCircle size={24} className="text-gray-500 opacity-80"/>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
                                            <button 
                                                onClick={() => setConfirmModal({ id: item.id, type: item.type })} 
                                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={12}/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* STANDARD HISTORY LIST */
                            data[activeTab].map(item => (
                                <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={item.id} className="bg-white dark:bg-[#151515] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex gap-4 relative overflow-hidden transition-colors">
                                    {item.image_url ? (
                                        <div className="w-16 h-16 shrink-0 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden cursor-pointer" onClick={() => window.open(`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${item.image_url}`, '_blank')}>
                                            <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${item.image_url}`} className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 shrink-0 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-300 dark:text-gray-600"><FileText size={24} /></div>
                                    )}
                                    <div className="flex-1 min-w-0 pr-8">
                                        <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate">{item.title || "Daily Update"}</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 leading-relaxed">{item.content || item.update_text || item.description}</p>
                                        {item.event_date && <span className="text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-md mt-2 inline-block">{new Date(item.event_date).toLocaleDateString()}</span>}
                                    </div>
                                    <button onClick={() => setConfirmModal({ id: item.id, type: activeTab === 'notices' ? 'notice' : activeTab === 'events' ? 'event' : 'update' })} className="absolute top-4 right-4 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 p-1 transition-colors"><Trash2 size={18} /></button>
                                </motion.div>
                            ))
                        )}
                        
                        {((activeTab === 'gallery' && galleryHistory.length === 0) || (activeTab !== 'gallery' && data[activeTab].length === 0)) && (
                            <div className="text-center py-12 text-gray-400 text-xs bg-white dark:bg-[#151515] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                                No posts found.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- CONFIRMATION MODAL --- */}
            <AnimatePresence>
                {confirmModal && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/20 backdrop-blur-sm p-4 pb-24 sm:pb-4">
                        <motion.div 
                            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} 
                            className="bg-white dark:bg-[#1a1a1a] w-full max-w-sm rounded-3xl p-6 shadow-2xl"
                        >
                            <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-4 mx-auto">
                                <AlertCircle size={24} />
                            </div>
                            <h3 className="text-center font-bold text-lg mb-2 dark:text-white">Delete this item?</h3>
                            <p className="text-center text-xs text-gray-500 mb-6">This action cannot be undone.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setConfirmModal(null)} className="flex-1 py-3 text-gray-500 dark:text-gray-300 font-bold text-sm bg-gray-50 dark:bg-gray-800 rounded-xl">Cancel</button>
                                <button onClick={confirmDelete} className="flex-1 py-3 bg-red-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-500/30">Delete</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* --- CUSTOM TOAST --- */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-24 left-4 right-4 z-50 flex justify-center">
                        <div className={`flex items-center gap-3 px-5 py-3 rounded-full shadow-2xl text-white text-xs font-bold ${toast.type === 'error' ? 'bg-red-500' : 'bg-black dark:bg-white dark:text-black'}`}>
                            {toast.type === 'error' ? <AlertCircle size={16}/> : <CheckCircle2 size={16}/>} {toast.msg}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}