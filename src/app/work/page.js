"use client";
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, 
  BookOpen, FileText, UserX, Megaphone, CheckCircle2, 
  X, ZoomIn, Download, AlertCircle, Clock, Image as ImageIcon
} from 'lucide-react';
import Link from 'next/link';

export default function WorkPage() {
    const { user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lightboxSrc, setLightboxSrc] = useState(null);

    // Filters & Navigation State
    const [activeDate, setActiveDate] = useState(null);
    const [activeCategory, setActiveCategory] = useState('all');
    const [activeSubject, setActiveSubject] = useState('All');
    
    // UI Toggles
    const [showCalendar, setShowCalendar] = useState(false);
    const [showSubjectModal, setShowSubjectModal] = useState(false);

    // Safe Date Parser for iOS/Safari Compatibility
    const safeDate = (dateStr) => {
        if (!dateStr) return new Date();
        return new Date(dateStr.replace(/-/g, '/'));
    };

    useEffect(() => {
        async function fetchWork() {
            if (!user?.id) return;
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/work.php`, {
                    method: 'POST',
                    body: JSON.stringify({ user_id: user.id, role: user.role }),
                    headers: { 'Content-Type': 'application/json' }
                });
                const json = await res.json();
                if (json.status === 'success') {
                    setPosts(json.data);
                }
            } catch (e) { console.error(e); } 
            finally { setLoading(false); }
        }
        fetchWork();
    }, [user]);

    // Data Processing
    const sortedDates = useMemo(() => {
        const dates = [...new Set(posts.map(p => p.post_date))];
        return dates.sort((a, b) => safeDate(b) - safeDate(a)); // Newest first
    }, [posts]);

    // Auto-select newest date on load
    useEffect(() => {
        if (sortedDates.length > 0 && !activeDate) setActiveDate(sortedDates[0]);
    }, [sortedDates, activeDate]);

    // Flatten all items for the specific ACTIVE DATE
    const currentDayItems = useMemo(() => {
        if (!activeDate) return [];
        const dayPosts = posts.filter(p => p.post_date === activeDate);
        return dayPosts.flatMap(post => 
            (post.items || []).map(item => ({
                ...item,
                post_id: post.post_id,
                teacher_name: post.teacher_name,
                teacher_pic: post.teacher_pic,
                teacher_role: post.teacher_role,
                created_at: post.created_at
            }))
        );
    }, [posts, activeDate]);

    // Calculate Counts for Red Dots
    const counts = useMemo(() => ({
        homework: currentDayItems.filter(i => i.item_type === 'homework').length,
        classwork: currentDayItems.filter(i => i.item_type === 'classwork').length,
        update: currentDayItems.filter(i => i.item_type === 'update').length,
        defaulter: currentDayItems.filter(i => i.item_type === 'defaulter').length,
    }), [currentDayItems]);

    // Available Subjects for the filter
    const availableSubjects = useMemo(() => {
        return [...new Set(currentDayItems.map(i => i.subject_name).filter(Boolean))];
    }, [currentDayItems]);

    // Final Filtered Items to Display
    const filteredItems = useMemo(() => {
        return currentDayItems.filter(item => {
            const catMatch = activeCategory === 'all' || item.item_type === activeCategory;
            const subMatch = activeSubject === 'All' || item.subject_name === activeSubject;
            return catMatch && subMatch;
        });
    }, [currentDayItems, activeCategory, activeSubject]);

    // Date Navigation Handlers
    const currentIndex = sortedDates.indexOf(activeDate);
    const handlePrevDay = () => { if (currentIndex < sortedDates.length - 1) setActiveDate(sortedDates[currentIndex + 1]); }; 
    const handleNextDay = () => { if (currentIndex > 0) setActiveDate(sortedDates[currentIndex - 1]); }; 

    const getTypeConfig = (type) => {
        switch(type) {
            case 'classwork': return { icon: BookOpen, label: 'Classwork', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' };
            case 'homework': return { icon: FileText, label: 'Homework', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' };
            case 'defaulter': return { icon: UserX, label: 'Defaulter', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' };
            case 'update': return { icon: Megaphone, label: 'Notice', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800' };
            default: return { icon: FileText, label: 'Update', color: 'text-gray-600', bg: 'bg-gray-50 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700' };
        }
    };

    const formatDateChip = (dateStr) => {
        if (!dateStr) return { day: '', num: '', month: '' };
        const d = safeDate(dateStr);
        const isToday = new Date().toDateString() === d.toDateString();
        return {
            day: isToday ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
            num: d.getDate() || '',
            month: d.toLocaleDateString('en-US', { month: 'short' })
        };
    };

    const isPdf = (path) => path?.toLowerCase().endsWith('.pdf');

    // Safety check for the overall day banner
    const isDefaulterToday = currentDayItems.some(item => 
        item.item_type === 'defaulter' && (item.defaulters || []).includes(user?.name)
    );

    if (loading) return <WorkSkeleton />;

    return (
        <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] text-gray-800 dark:text-gray-100 font-sans pb-24 flex flex-col">
            
            {/* LIGHTBOX FOR IMAGES */}
            <AnimatePresence>
                {lightboxSrc && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setLightboxSrc(null)}>
                        <button className="absolute top-6 right-6 text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"><X size={24} /></button>
                        <a href={lightboxSrc} download onClick={(e) => e.stopPropagation()} className="absolute bottom-10 bg-white text-black px-6 py-3 rounded-full flex items-center gap-2 font-bold shadow-2xl z-50 active:scale-95 transition-transform"><Download size={18} /> Save</a>
                        <motion.img initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} src={lightboxSrc} className="max-w-full max-h-[75vh] rounded-2xl shadow-2xl object-contain" onClick={(e) => e.stopPropagation()} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 1. SLIM HEADER */}
            <div className="sticky top-0 z-50 bg-white/90 dark:bg-[#151515]/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between shadow-sm">
                <Link href="/?source=twa" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><ChevronLeft size={24}/></Link>
                <h1 className="text-lg font-black tracking-tight">Class Feed</h1>
                <div className="w-8"></div> {/* Spacer to center title */}
            </div>

            {posts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 opacity-60">
                    <CheckCircle2 size={64} className="mb-4 text-gray-300" strokeWidth={1.5} />
                    <h2 className="text-xl font-bold text-gray-500 mb-1">All Caught Up!</h2>
                    <p className="text-sm text-gray-400">No work has been assigned yet.</p>
                </div>
            ) : (
                <>
                    {/* 2. DATE NAVIGATION BAR */}
                    <div className="bg-white dark:bg-[#151515] px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shadow-sm sticky top-[52px] z-40">
                        <button onClick={handlePrevDay} disabled={currentIndex >= sortedDates.length - 1} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-all"><ChevronLeft size={20}/></button>
                        
                        <div className="relative">
                            <button onClick={() => setShowCalendar(!showCalendar)} className="flex items-center gap-2 font-black text-[15px] bg-gray-50 dark:bg-[#1a1a1a] px-4 py-1.5 rounded-full active:scale-95 transition-transform border border-gray-200 dark:border-gray-700">
                                {activeDate ? safeDate(activeDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Loading...'}
                                <CalendarIcon size={14} className="text-blue-600 dark:text-blue-400"/>
                            </button>
                            
                            {/* Calendar Dropdown Modal */}
                            <AnimatePresence>
                                {showCalendar && (
                                    <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="absolute top-12 left-1/2 -translate-x-1/2 w-48 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-2 z-50 max-h-64 overflow-y-auto custom-scrollbar">
                                        {sortedDates.map(d => (
                                            <button key={d} onClick={() => {setActiveDate(d); setShowCalendar(false);}} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${activeDate === d ? 'bg-blue-600 text-white font-bold' : 'font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                                {safeDate(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <button onClick={handleNextDay} disabled={currentIndex <= 0} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-all"><ChevronRight size={20}/></button>
                    </div>

                    {/* 3. CATEGORY TABS & SUBJECT FILTER */}
                    <div className="bg-white dark:bg-[#151515] px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 sticky top-[105px] z-30 shadow-[0_4px_10px_rgba(0,0,0,0.03)] flex gap-2 overflow-x-auto no-scrollbar items-center">
                        
                        <button onClick={() => setActiveCategory('all')} className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${activeCategory === 'all' ? 'bg-gray-800 text-white border-gray-800 dark:bg-white dark:text-black dark:border-white' : 'bg-transparent text-gray-500 border-gray-200 dark:border-gray-700'}`}>All</button>
                        
                        {[
                            { id: 'homework', label: 'Homework', count: counts.homework, color: 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800' },
                            { id: 'classwork', label: 'Classwork', count: counts.classwork, color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' },
                            { id: 'update', label: 'Notice', count: counts.update, color: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' },
                            { id: 'defaulter', label: 'Defaulters', count: counts.defaulter, color: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' }
                        ].map(cat => (
                            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`relative shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${activeCategory === cat.id ? cat.color : 'bg-transparent text-gray-500 border-gray-200 dark:border-gray-700'}`}>
                                {cat.label}
                                {cat.count > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white dark:border-[#151515] shadow-sm">{cat.count}</span>}
                            </button>
                        ))}

                        {/* Subject Filter Button (Only shows if subjects exist) */}
                        {availableSubjects.length > 0 && (
                            <div className="ml-auto pl-2 border-l border-gray-200 dark:border-gray-800 shrink-0 flex items-center">
                                <button onClick={() => setShowSubjectModal(true)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${activeSubject !== 'All' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800' : 'bg-gray-50 text-gray-600 border-transparent dark:bg-[#1a1a1a] dark:text-gray-300'}`}>
                                    <Filter size={12}/> {activeSubject === 'All' ? 'Filter' : activeSubject}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Subject Select Modal */}
                    <AnimatePresence>
                        {showSubjectModal && (
                            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                                <motion.div initial={{y:100}} animate={{y:0}} exit={{y:100}} className="bg-white dark:bg-[#151515] w-full max-w-sm rounded-[2rem] p-5 shadow-2xl">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-black text-lg">Filter by Subject</h3>
                                        <button onClick={() => setShowSubjectModal(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"><X size={18}/></button>
                                    </div>
                                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                                        <button onClick={() => {setActiveSubject('All'); setShowSubjectModal(false)}} className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-colors ${activeSubject === 'All' ? 'bg-blue-600 text-white' : 'bg-gray-50 dark:bg-[#1a1a1a] hover:bg-gray-100 dark:hover:bg-gray-800'}`}>All Subjects</button>
                                        {availableSubjects.map(sub => (
                                            <button key={sub} onClick={() => {setActiveSubject(sub); setShowSubjectModal(false)}} className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-colors ${activeSubject === sub ? 'bg-blue-600 text-white' : 'bg-gray-50 dark:bg-[#1a1a1a] hover:bg-gray-100 dark:hover:bg-gray-800'}`}>{sub}</button>
                                        ))}
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* 4. FEED CONTENT */}
                    <div className="p-4 space-y-5 max-w-lg mx-auto w-full">
                        
                        {/* RED FLAG DEFAULTER BANNER */}
                        {isDefaulterToday && (
                            <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-2xl shadow-sm flex items-start gap-3">
                                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                                <div>
                                    <h3 className="font-bold text-red-800 dark:text-red-300 text-sm">Action Required</h3>
                                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">You have been flagged for incomplete work today. Please review the missing items below.</p>
                                </div>
                            </motion.div>
                        )}

                        <AnimatePresence mode="popLayout">
                            {filteredItems.length === 0 ? (
                                <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="text-center text-gray-400 py-10 font-bold text-sm bg-white dark:bg-[#151515] rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed">
                                    No {activeCategory !== 'all' ? activeCategory : ''} updates found {activeSubject !== 'All' ? `for ${activeSubject}` : ''}.
                                </motion.div>
                            ) : (
                                filteredItems.map((item, idx) => {
                                    const config = getTypeConfig(item.item_type);
                                    const amIDefaulter = item.item_type === 'defaulter' && (item.defaulters || []).includes(user?.name);

                                    return (
                                        <motion.div 
                                            key={`${item.post_id}_${item.item_id}`}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className={`bg-white dark:bg-[#151515] rounded-[1.5rem] shadow-sm border overflow-hidden ${amIDefaulter ? 'border-red-300 dark:border-red-800/50 shadow-[0_5px_20px_rgba(239,68,68,0.1)]' : 'border-gray-100 dark:border-gray-800'}`}
                                        >
                                            {/* Teacher Header */}
                                            <div className="px-4 py-3 bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <img 
                                                        src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${item.teacher_pic || 'GMPSimages/default-teacher.jpg'}`} 
                                                        className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                                                        alt={item.teacher_name} loading="lazy" decoding="async"
                                                    />
                                                    <div>
                                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-none mb-1">{item.teacher_name}</h4>
                                                        <p className="text-[9px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest">{item.teacher_role}</p>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 bg-white dark:bg-black px-2 py-1 rounded-md border border-gray-100 dark:border-gray-800"><Clock size={10}/> {safeDate(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>

                                            {/* Content Body */}
                                            <div className="p-4">
                                                
                                                <div className="flex items-center flex-wrap gap-2 mb-3">
                                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border ${config.bg} ${config.color} ${config.border}`}>
                                                        {config.label}
                                                    </span>
                                                    {item.subject_name && (
                                                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-700">
                                                            {item.subject_name}
                                                        </span>
                                                    )}
                                                </div>

                                                {item.heading && <h3 className={`font-bold text-[15px] mb-2 leading-snug ${amIDefaulter ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{item.heading}</h3>}
                                                
                                                {item.content && (
                                                    <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{item.content}</p>
                                                )}

                                                {/* Defaulter List Display */}
                                                {item.item_type === 'defaulter' && (item.defaulters || []).length > 0 && (
                                                    <div className="mt-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-3">
                                                        <p className="text-[10px] font-bold text-red-800 dark:text-red-300 uppercase tracking-widest mb-2 flex items-center gap-1 border-b border-red-200 dark:border-red-800/50 pb-1">
                                                            <UserX size={12}/> Flagged Students
                                                        </p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {item.defaulters.map((name, nIdx) => (
                                                                <span key={nIdx} className={`text-[11px] font-bold px-2 py-1 rounded-lg border ${name === user?.name ? 'bg-red-500 text-white border-red-600 shadow-md' : 'bg-white dark:bg-black text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50'}`}>
                                                                    {name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Attachments (Fast Loading Thumbnails + PDFs) */}
                                                {(item.attachments || []).length > 0 && (
                                                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                        {item.attachments.map((src, k) => {
                                                            const fullUrl = `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${src}`;
                                                            const fileName = src.split('/').pop();
                                                            return isPdf(src) ? (
                                                                <a key={k} href={fullUrl} download={fileName} target="_blank" rel="noopener noreferrer" className="col-span-1 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-3 flex flex-col items-center justify-center text-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/20 active:scale-95 transition-transform shadow-sm">
                                                                    <div className="bg-red-500 text-white p-2.5 rounded-xl shadow-sm"><FileText size={20}/></div>
                                                                    <span className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-widest line-clamp-1 w-full">Open PDF</span>
                                                                </a>
                                                            ) : (
                                                                <div key={k} onClick={() => setLightboxSrc(fullUrl)} className="col-span-1 aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 relative group cursor-pointer shadow-sm active:scale-95 transition-transform">
                                                                    <img src={fullUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" decoding="async" alt="Attachment" />
                                                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><ZoomIn size={24} className="text-white drop-shadow-md" /></div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </AnimatePresence>
                    </div>
                </>
            )}
        </div>
    );
}

function WorkSkeleton() {
    return (
        <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] flex flex-col">
            <div className="bg-white dark:bg-[#151515] px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 skeleton" />
                <div className="h-5 w-24 bg-gray-200 dark:bg-gray-800 rounded skeleton" />
                <div className="w-8" />
            </div>
            <div className="p-4 max-w-lg mx-auto w-full">
                <div className="flex justify-between py-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 skeleton" />
                    <div className="w-32 h-8 rounded-full bg-gray-200 dark:bg-gray-800 skeleton" />
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 skeleton" />
                </div>
                <div className="flex gap-2 mb-6">
                    {[1,2,3,4].map(i => <div key={i} className="h-8 w-16 rounded-full bg-gray-200 dark:bg-gray-800 skeleton shrink-0" />)}
                </div>
                <div className="space-y-6">
                    {[1, 2].map(i => (
                        <div key={i} className="bg-white dark:bg-[#151515] rounded-[1.5rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 skeleton" />
                                <div className="space-y-2">
                                    <div className="h-3 w-24 bg-gray-200 dark:bg-gray-800 rounded skeleton" />
                                    <div className="h-2 w-16 bg-gray-200 dark:bg-gray-800 rounded skeleton" />
                                </div>
                            </div>
                            <div className="p-5 space-y-3">
                                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded skeleton" />
                                <div className="h-3 w-full bg-gray-200 dark:bg-gray-800 rounded skeleton" />
                                <div className="h-3 w-5/6 bg-gray-200 dark:bg-gray-800 rounded skeleton" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}