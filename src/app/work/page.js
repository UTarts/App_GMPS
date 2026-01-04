"use client";
import { useEffect, useState } from 'react';
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, BookOpen, AlertCircle, 
  Clock, X, ZoomIn, Download, CheckCircle2 
} from 'lucide-react';
import Link from 'next/link';

export default function WorkPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  useEffect(() => {
    async function fetchWork() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/work.php`, {
          method: 'POST',
          body: JSON.stringify({ user_id: user?.id, role: user?.role })
        });
        const json = await res.json();
        if(json.status === 'success') setPosts(json.data);
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    }
    if (user) fetchWork();
  }, [user]);

  // Group posts by Date
  const groupedPosts = posts.reduce((acc, post) => {
    const date = new Date(post.post_date).toLocaleDateString('en-US', { 
        weekday: 'long', month: 'short', day: 'numeric' 
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(post);
    return acc;
  }, {});

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#F2F6FA] dark:bg-[#0a0a0a]">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] text-gray-800 dark:text-gray-100 font-sans pb-24 relative">
      
      {/* --- LIGHTBOX WITH DOWNLOAD --- */}
      <AnimatePresence>
        {lightboxSrc && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setLightboxSrc(null)}
          >
            <button className="absolute top-6 right-6 text-white bg-white/10 p-2 rounded-full"><X size={24} /></button>
            <a 
                href={lightboxSrc} 
                download 
                className="absolute bottom-10 bg-white text-black px-6 py-3 rounded-full flex items-center gap-2 font-bold shadow-lg"
                onClick={(e) => e.stopPropagation()}
            >
                <Download size={18} /> Download
            </a>
            <motion.img 
                initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                src={lightboxSrc} 
                className="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain"
                onClick={(e) => e.stopPropagation()} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- HEADER --- */}
      <div className="sticky top-0 z-50 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 px-4 py-4 flex items-center gap-3 shadow-sm">
        <Link href="/?source=twa" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ChevronLeft size={24} className="text-gray-700 dark:text-gray-200" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Daily Work</h1>
      </div>

      <div className="px-4 mt-2">
        {Object.keys(groupedPosts).length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-20 opacity-50">
                <BookOpen size={48} className="mb-2" />
                <p>No work updates yet.</p>
            </div>
        ) : (
            Object.entries(groupedPosts).map(([date, dayPosts]) => (
                <div key={date} className="mb-8 relative">
                    
                    {/* STICKY DATE HEADER (Fixed z-index and top position) */}
                    <div className="sticky top-[80px] z-40 py-4 flex justify-center pointer-events-none">
                        <span className="bg-gray-800/90 dark:bg-gray-700/90 backdrop-blur-md text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg border border-white/10">
                            {date}
                        </span>
                    </div>

                    <div className="space-y-6">
                        {dayPosts.map((post, i) => {
                            // 1. Sort Items: CW -> HW -> Update -> Defaulter
                            const cw = post.items.filter(it => it.item_type === 'classwork');
                            const hw = post.items.filter(it => it.item_type === 'homework');
                            const up = post.items.filter(it => it.item_type === 'update');
                            const def = post.items.filter(it => it.item_type === 'defaulter');
                            
                            // Combine sorted list
                            const sortedItems = [...cw, ...hw, ...up]; 

                            return (
                                <motion.div 
                                    key={post.post_id}
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="bg-white dark:bg-[#151515] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden"
                                >
                                    {/* TEACHER HEADER */}
                                    <div className="px-4 py-3 bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <img 
                                                src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${post.teacher_pic || 'GMPSimages/default-teacher.jpg'}`} 
                                                className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                                                alt={post.teacher_name}
                                            />
                                            <div>
                                                <h3 className="text-xs font-bold text-gray-900 dark:text-white leading-none">{post.teacher_name}</h3>
                                                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">{post.teacher_role}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                            <Clock size={12} />
                                            {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>

                                    {/* CONTENT BODY */}
                                    <div className="p-0">
                                        {sortedItems.map((item, idx) => (
                                            <div key={idx} className="relative pl-5 pr-4 py-4 border-b border-gray-50 dark:border-gray-800 last:border-0">
                                                
                                                
                                                {/* Dot Badge */}
                                                <span className={`absolute left-[5px] top-5 w-3 h-3 rounded-full border-2 border-white dark:border-[#151515] z-10 ${
                                                    item.item_type === 'classwork' ? 'bg-blue-500' : 
                                                    item.item_type === 'homework' ? 'bg-orange-500' : 
                                                    'bg-green-500'
                                                }`}></span>
                                                
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">{item.heading}</h4>
                                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase ${
                                                        item.item_type === 'classwork' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 
                                                        item.item_type === 'homework' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    }`}>
                                                        {item.item_type === 'classwork' ? 'Classwork' : item.item_type === 'homework' ? 'Homework' : 'Update'}
                                                    </span>
                                                </div>

                                                {item.content && (
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line mb-3">
                                                        {item.content}
                                                    </p>
                                                )}

                                                {/* Attachments */}
                                                {item.attachments.length > 0 && (
                                                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                                        {item.attachments.map((src, k) => (
                                                            <div key={k} className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 relative group cursor-pointer"
                                                                 onClick={() => setLightboxSrc(`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${src}`)}>
                                                                <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${src}`} className="w-full h-full object-cover" alt="Attachment" />
                                                                <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><ZoomIn size={16} className="text-white" /></div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {/* CONSOLIDATED DEFAULTER TABLE */}
                                        {def.length > 0 && (
                                            <div className="m-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl overflow-hidden">
                                                <div className="bg-red-100 dark:bg-red-900/30 px-4 py-2 flex items-center gap-2">
                                                    <AlertCircle size={16} className="text-red-600 dark:text-red-400" />
                                                    <h5 className="text-xs font-bold text-red-800 dark:text-red-200 uppercase tracking-wide">Incomplete Work List</h5>
                                                </div>
                                                <div className="p-0 overflow-x-auto">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className="border-b border-red-100 dark:border-red-800/30">
                                                                <th className="p-3 text-[10px] font-bold text-red-700 dark:text-red-300 uppercase">Reason</th>
                                                                <th className="p-3 text-[10px] font-bold text-red-700 dark:text-red-300 uppercase">Students</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {def.map((d, idx) => (
                                                                <tr key={idx} className="border-b border-red-50 dark:border-red-800/20 last:border-0">
                                                                    <td className="p-3 text-xs font-bold text-gray-800 dark:text-gray-200 align-top w-1/3 border-r border-red-100 dark:border-red-800/30">
                                                                        {d.heading}
                                                                    </td>
                                                                    <td className="p-3 align-top">
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {d.defaulters.map((name, nIdx) => (
                                                                                <span key={nIdx} className="bg-white dark:bg-red-900/40 border border-red-100 dark:border-red-800 text-[10px] text-red-700 dark:text-red-200 px-2 py-0.5 rounded-md">
                                                                                    {name}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
}