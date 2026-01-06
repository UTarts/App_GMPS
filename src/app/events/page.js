"use client";
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Calendar, Bell, X, ZoomIn, 
  CheckCircle2, AlertCircle 
} from 'lucide-react';
import Link from 'next/link';

export default function UpdatesPage() {
  const [data, setData] = useState({ updates: [], announcements: [], events: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('feed'); 
  const [lightboxItem, setLightboxItem] = useState(null); 

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/updates.php`);
        const json = await res.json();
        if(json.status === 'success') setData(json.data);
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    }
    fetchData();
  }, []);

  const storyUpdates = data.updates.filter(u => u.image_url);

  // Time Formatter
  const formatTime = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // seconds

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) return <UpdatesSkeleton />;

  return (
    <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] text-gray-800 dark:text-gray-100 font-sans pb-24 relative">
      
      {/* LIGHTBOX */}
      <AnimatePresence>
        {lightboxItem && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setLightboxItem(null)}
          >
            <button className="absolute top-6 right-6 text-white bg-white/10 p-2 rounded-full"><X size={24} /></button>
            <motion.img 
                initial={{ scale: 0.8 }} animate={{ scale: 1 }} 
                src={lightboxItem.src} 
                className="max-w-full max-h-[70vh] rounded-lg shadow-2xl object-contain mb-4" 
                onClick={(e) => e.stopPropagation()} 
            />
            {lightboxItem.text && (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white/10 backdrop-blur-md p-4 rounded-xl text-white text-sm text-center max-w-md w-full border border-white/10" onClick={(e) => e.stopPropagation()}>
                    {lightboxItem.text}
                </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 px-4 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
            <Link href="/?source=twa" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <ChevronLeft size={24} className="text-gray-700 dark:text-gray-200" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">School Updates</h1>
        </div>
      </div>

      <div className="px-0 mt-4 space-y-6">

        {/* STORIES */}
        {storyUpdates.length > 0 && (
            <div className="pl-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Highlights</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar pr-4">
                    {storyUpdates.map((upd, i) => (
                        <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer group" 
                             onClick={() => setLightboxItem({ src: `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${upd.image_url}`, text: upd.update_text })}>
                            <div className="w-[4.5rem] h-[4.5rem] rounded-full p-[3px] bg-gradient-to-tr from-green-400 via-emerald-500 to-teal-600 group-active:scale-95 transition-transform">
                                <div className="w-full h-full rounded-full border-[3px] border-white dark:border-[#0a0a0a] overflow-hidden">
                                    <img 
                                        src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${upd.image_url}`} 
                                        className="w-full h-full object-cover" 
                                        loading="lazy"
                                        alt="Story" 
                                    />
                                </div>
                            </div>
                            <span className="text-[10px] font-bold text-center max-w-[4.5rem] truncate text-gray-600 dark:text-gray-400">
                                {formatTime(upd.created_at)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* TABS */}
        <div className="px-4 sticky top-[72px] z-30">
            <div className="bg-gray-200/80 dark:bg-gray-800/80 backdrop-blur-md p-1 rounded-xl flex shadow-inner">
                <button onClick={() => setActiveTab('feed')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'feed' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}>Notice Board</button>
                <button onClick={() => setActiveTab('timeline')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'timeline' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500'}`}>Events</button>
            </div>
        </div>

        {/* FEED */}
        <div className="px-4 min-h-[50vh]">
            <AnimatePresence mode="wait">
                
                {activeTab === 'feed' && (
                    <motion.div key="feed" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                        
                        {/* Daily Text Updates */}
                        {data.updates.filter(u => !u.image_url).map((upd, i) => (
                            <div key={`upd-${i}`} className="bg-white dark:bg-[#151515] p-4 rounded-2xl border-l-4 border-l-green-500 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded">UPDATE</span>
                                    <span className="text-[10px] text-gray-400">{formatTime(upd.created_at)}</span>
                                </div>
                                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{upd.update_text}</p>
                            </div>
                        ))}

                        {/* Announcements */}
                        {data.announcements.map((ann, i) => (
                            <div key={`ann-${i}`} className="bg-white dark:bg-[#151515] p-5 rounded-[1.5rem] shadow-sm border border-gray-100 dark:border-gray-800">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-1 rounded-full font-bold">NOTICE</span>
                                    <span className="text-[10px] text-gray-400">{formatTime(ann.created_at)}</span>
                                </div>
                                {ann.image_url && (
                                    <div className="mb-3 w-full h-40 rounded-xl overflow-hidden relative cursor-pointer" onClick={() => setLightboxItem({ src: `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${ann.image_url}`, text: ann.title })}>
                                        <img 
                                            src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${ann.image_url}`} 
                                            className="w-full h-full object-cover" 
                                            loading="lazy"
                                        />
                                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><ZoomIn className="text-white"/></div>
                                    </div>
                                )}
                                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">{ann.title}</h3>
                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{ann.content}</p>
                            </div>
                        ))}
                    </motion.div>
                )}

                {activeTab === 'timeline' && (
                    <motion.div key="timeline" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="relative pl-2 pt-2">
                        <div className="absolute left-[27px] top-4 bottom-0 w-[2px] bg-gray-200 dark:bg-gray-800"></div>
                        {data.events.map((evt, i) => {
                            const d = new Date(evt.event_date);
                            return (
                                <div key={i} className="relative flex gap-5 mb-8">
                                    <div className="z-10 flex-shrink-0 w-14 h-16 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-2xl flex flex-col items-center justify-center shadow-sm">
                                        <span className="text-[10px] font-bold text-blue-500 uppercase">{d.toLocaleString('default', { month: 'short' })}</span>
                                        <span className="text-xl font-black text-gray-800 dark:text-white">{d.getDate()}</span>
                                    </div>
                                    <div className="flex-grow bg-white dark:bg-[#151515] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                        {evt.image_url && <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${evt.image_url}`} className="w-full h-28 object-cover rounded-lg mb-3" loading="lazy" />}
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{evt.title}</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{evt.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </motion.div>
                )}

            </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// --- SKELETON COMPONENT ---
function UpdatesSkeleton() {
    return (
        <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] p-4 space-y-6">
            {/* Header Skeleton */}
            <div className="flex items-center gap-3 py-4 border-b border-gray-200 dark:border-gray-800">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 skeleton" />
                <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded skeleton" />
            </div>

            {/* Stories Skeleton */}
            <div className="flex gap-4 overflow-hidden">
                {[1,2,3,4].map(i => (
                    <div key={i} className="flex flex-col items-center gap-2">
                        <div className="w-[4.5rem] h-[4.5rem] rounded-full bg-gray-200 dark:bg-gray-800 skeleton" />
                        <div className="w-10 h-2 bg-gray-200 dark:bg-gray-800 rounded skeleton" />
                    </div>
                ))}
            </div>

            {/* Tabs Skeleton */}
            <div className="bg-gray-200 dark:bg-gray-800 h-10 rounded-xl skeleton w-full" />

            {/* Feed Skeleton */}
            <div className="space-y-4">
                {[1, 2].map((i) => (
                    <div key={i} className="bg-white dark:bg-[#151515] p-5 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 space-y-3">
                        <div className="flex justify-between">
                            <div className="w-16 h-4 bg-gray-200 dark:bg-gray-800 rounded skeleton" />
                            <div className="w-10 h-3 bg-gray-200 dark:bg-gray-800 rounded skeleton" />
                        </div>
                        <div className="w-full h-32 bg-gray-200 dark:bg-gray-800 rounded-xl skeleton" />
                        <div className="space-y-2">
                            <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-800 rounded skeleton" />
                            <div className="w-full h-3 bg-gray-200 dark:bg-gray-800 rounded skeleton" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}