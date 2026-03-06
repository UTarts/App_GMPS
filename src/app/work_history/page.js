"use client";
import { useEffect, useState } from 'react';
import { useAuth } from "../../context/AuthContext";
import { useAppModal } from "../../context/ModalContext";
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, FileText, Image as ImageIcon, Trash2, UserX, Megaphone, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WorkHistoryPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { showModal } = useAppModal();

    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState({});
    const [dates, setDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);

    useEffect(() => {
        fetchHistory();
    }, [user]);

    const fetchHistory = async () => {
        if (!user?.id) return;
        setLoading(true);
        const fd = new FormData();
        fd.append('action', 'fetch_work_history');
        fd.append('teacher_id', user.id);
        
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
            const json = await res.json();
            if (json.status === 'success') {
                setHistory(json.history);
                const availableDates = Object.keys(json.history);
                setDates(availableDates);
                if (availableDates.length > 0 && !selectedDate) {
                    setSelectedDate(availableDates[0]); // Select newest date by default
                }
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const confirmDelete = (itemId) => {
        showModal("Delete Item?", "Are you sure you want to delete this post? It will be removed from student devices immediately.", "danger", () => executeDelete(itemId));
    };

    const executeDelete = async (itemId) => {
        const fd = new FormData();
        fd.append('action', 'delete_history_item');
        fd.append('teacher_id', user.id);
        fd.append('item_id', itemId);

        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
        
        // Remove item from UI state instantly
        setHistory(prev => {
            const newHistory = { ...prev };
            newHistory[selectedDate] = newHistory[selectedDate].filter(item => item.id !== itemId);
            return newHistory;
        });
        showModal("Deleted", "The item has been permanently removed.", "success");
    };

    const getTypeConfig = (type) => {
        switch (type) {
            case 'classwork': return { icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200' };
            case 'homework': return { icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200' };
            case 'defaulter': return { icon: UserX, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200' };
            case 'general': return { icon: Megaphone, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200' };
            default: return { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };
        }
    };

    const formatDateTab = (dateStr) => {
        const d = new Date(dateStr);
        return {
            day: d.toLocaleDateString('en-US', { weekday: 'short' }),
            num: d.getDate(),
            month: d.toLocaleDateString('en-US', { month: 'short' })
        };
    };

    if (loading) return <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] font-sans flex flex-col pb-24">
            
            <div className="sticky top-0 z-40 bg-white dark:bg-[#151515] px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4 shadow-sm">
                <button onClick={() => router.push('/teacher')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft size={20} className="dark:text-white"/></button>
                <div>
                    <h1 className="text-lg font-black text-gray-900 dark:text-white leading-tight">Work History</h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Timeline & Management</p>
                </div>
            </div>

            {dates.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                    <Clock size={48} className="mb-4 opacity-50"/>
                    <p className="font-bold text-lg text-gray-600 dark:text-gray-300">No History Found</p>
                    <p className="text-sm">Your published work and notices will appear here.</p>
                </div>
            ) : (
                <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">
                    
                    {/* SCROLLING DATE CALENDAR */}
                    <div className="bg-white dark:bg-[#151515] border-b border-gray-100 dark:border-gray-800 shadow-sm sticky top-[68px] z-30">
                        <div className="flex gap-3 overflow-x-auto no-scrollbar p-4 snap-x">
                            {dates.map(date => {
                                const { day, num, month } = formatDateTab(date);
                                const isSelected = selectedDate === date;
                                return (
                                    <button key={date} onClick={() => setSelectedDate(date)} className={`snap-center shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-2xl transition-all shadow-sm border ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 dark:bg-[#1a1a1a] text-gray-500 border-gray-200 dark:border-gray-800 hover:bg-gray-100'}`}>
                                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{day}</span>
                                        <span className="text-xl font-black leading-none my-1">{num}</span>
                                        <span className="text-[10px] font-bold uppercase opacity-80">{month}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* VERTICAL TIMELINE */}
                    <div className="p-4 relative mt-2">
                        {/* Timeline Line */}
                        <div className="absolute top-0 bottom-0 left-[31px] w-0.5 bg-gray-200 dark:bg-gray-800 rounded-full z-0"></div>

                        <AnimatePresence mode="popLayout">
                            {(history[selectedDate] || []).map((item, idx) => {
                                const config = getTypeConfig(item.type);
                                return (
                                    <motion.div key={item.id} initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} exit={{opacity:0, scale:0.9}} className="relative pl-14 mb-6 z-10">
                                        
                                        {/* Timeline Dot */}
                                        <div className={`absolute left-0 top-4 w-12 h-12 rounded-full border-4 border-[#F2F6FA] dark:border-[#0a0a0a] flex items-center justify-center shadow-sm ${config.bg} ${config.color}`}>
                                            <config.icon size={18} />
                                        </div>

                                        {/* Content Card */}
                                        <div className="bg-white dark:bg-[#151515] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                                            
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${config.bg} ${config.color} ${config.border}`}>{item.type}</span>
                                                        <span className="text-[10px] font-bold text-gray-400">{item.time}</span>
                                                    </div>
                                                    {item.subject && <span className="text-xs font-black text-gray-800 dark:text-gray-200 block mt-1">{item.subject}</span>}
                                                </div>
                                                <button onClick={() => confirmDelete(item.id)} className="p-2 text-red-400 hover:text-red-600 bg-red-50 dark:bg-red-900/10 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                            </div>

                                            <h3 className="font-bold text-gray-900 dark:text-white mt-2">{item.heading}</h3>
                                            
                                            {item.content && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed whitespace-pre-wrap">{item.content}</p>}

                                            {item.type === 'defaulter' && item.defaulters.length > 0 && (
                                                <div className="mt-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-3 rounded-xl">
                                                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-2 border-b border-red-200 dark:border-red-800/50 pb-1">Flagged Students ({item.defaulters.length})</p>
                                                    <ul className="text-xs text-red-700 dark:text-red-400 space-y-1 font-medium">
                                                        {item.defaulters.map((stu, i) => <li key={i}>• {stu}</li>)}
                                                    </ul>
                                                </div>
                                            )}

                                            {item.files.length > 0 && (
                                                <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
                                                    {item.files.map((file, i) => (
                                                        <div key={i} className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                                            <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${file}`} className="w-full h-full object-cover" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                            {history[selectedDate]?.length === 0 && <p className="text-center text-gray-400 py-10 font-bold">No posts found for this date.</p>}
                        </AnimatePresence>
                    </div>
                </div>
            )}
        </div>
    );
}