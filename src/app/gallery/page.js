"use client";
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Image as ImageIcon, PlayCircle, X, Maximize2 } from 'lucide-react';
import Link from 'next/link';

export default function GalleryPage() {
  const [data, setData] = useState({ images: [], videos: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('photos'); // 'photos' | 'videos'
  const [lightboxItem, setLightboxItem] = useState(null); // { type, src, caption }

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gallery.php`);
        const json = await res.json();
        if(json.status === 'success') setData(json.data);
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    }
    fetchData();
  }, []);

  // Helper: Extract YouTube ID for Thumbnails
  const getYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#F2F6FA] dark:bg-[#0a0a0a]">
      <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] text-gray-800 dark:text-gray-100 font-sans pb-24 relative">
      
      {/* --- CINEMA LIGHTBOX --- */}
      <AnimatePresence>
        {lightboxItem && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md"
            onClick={() => setLightboxItem(null)}
          >
            <button className="absolute top-6 right-6 text-white/80 hover:text-white bg-white/10 p-2 rounded-full transition-colors">
                <X size={24} />
            </button>
            
            <div className="w-full max-w-4xl max-h-[80vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                {lightboxItem.type === 'img' ? (
                    <motion.img 
                        initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                        src={lightboxItem.src} 
                        className="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain"
                    />
                ) : (
                    <div className="w-full aspect-video rounded-xl overflow-hidden shadow-2xl bg-black">
                        <iframe 
                            width="100%" height="100%" 
                            src={`https://www.youtube.com/embed/${getYouTubeId(lightboxItem.src)}?autoplay=1`} 
                            title="Video player" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen
                            className="w-full h-full"
                        ></iframe>
                    </div>
                )}
            </div>

            {lightboxItem.caption && (
                <motion.p 
                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    className="mt-4 text-white/90 text-sm font-medium text-center max-w-md"
                >
                    {lightboxItem.caption}
                </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- HEADER --- */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 px-4 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
            <Link href="/?source=twa" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <ChevronLeft size={24} className="text-gray-700 dark:text-gray-200" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Campus Gallery</h1>
        </div>
      </div>

      {/* --- TABS --- */}
      <div className="px-4 mt-6">
        <div className="bg-gray-200/80 dark:bg-gray-800/80 p-1 rounded-xl flex shadow-inner relative">
            {/* Animated Slider Background */}
            <motion.div 
                className="absolute top-1 bottom-1 bg-white dark:bg-gray-700 rounded-lg shadow-sm z-0"
                layoutId="tab-bg"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                style={{ 
                    left: activeTab === 'photos' ? '4px' : '50%', 
                    right: activeTab === 'photos' ? '50%' : '4px' 
                }}
            />
            
            <button onClick={() => setActiveTab('photos')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg relative z-10 flex items-center justify-center gap-2 transition-colors ${activeTab === 'photos' ? 'text-purple-600 dark:text-white' : 'text-gray-500'}`}>
                <ImageIcon size={16} /> Moments
            </button>
            <button onClick={() => setActiveTab('videos')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg relative z-10 flex items-center justify-center gap-2 transition-colors ${activeTab === 'videos' ? 'text-red-500 dark:text-white' : 'text-gray-500'}`}>
                <PlayCircle size={16} /> Reels
            </button>
        </div>
      </div>

      {/* --- GALLERY CONTENT --- */}
      <div className="px-4 mt-6 min-h-[60vh]">
        <AnimatePresence mode='wait'>
            
            {/* === 1. IMAGES (MASONRY LAYOUT) === */}
            {activeTab === 'photos' && (
                <motion.div 
                    key="photos"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                    className="columns-2 gap-4 space-y-4"
                >
                    {data.images.map((img, i) => (
                        <div 
                            key={i} 
                            className="break-inside-avoid relative group rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-800 cursor-zoom-in"
                            onClick={() => setLightboxItem({ type: 'img', src: `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${img.image_url}`, caption: img.caption })}
                        >
                            <img 
                                src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${img.image_url}`} 
                                className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-110" 
                                loading="lazy"
                                alt="Gallery"
                            />
                            {/* Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                <p className="text-white text-xs font-medium line-clamp-2">{img.caption}</p>
                            </div>
                        </div>
                    ))}
                    {data.images.length === 0 && <p className="col-span-2 text-center text-gray-400 py-10">No photos added yet.</p>}
                </motion.div>
            )}

            {/* === 2. VIDEOS (GRID LAYOUT) === */}
            {activeTab === 'videos' && (
                <motion.div 
                    key="videos"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                    {data.videos.map((vid, i) => {
                        const ytId = getYouTubeId(vid.video_url);
                        const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;

                        return (
                            <div 
                                key={i} 
                                className="relative rounded-2xl overflow-hidden shadow-md bg-black group cursor-pointer aspect-video"
                                onClick={() => setLightboxItem({ type: 'vid', src: vid.video_url, caption: vid.caption })}
                            >
                                {thumb ? (
                                    <img src={thumb} className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" />
                                ) : (
                                    <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white/50">No Preview</div>
                                )}
                                
                                {/* Play Button Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40 group-hover:scale-110 transition-transform">
                                        <PlayCircle size={24} className="text-white fill-white" />
                                    </div>
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                    <p className="text-white text-sm font-semibold line-clamp-1">{vid.caption}</p>
                                </div>
                            </div>
                        );
                    })}
                    {data.videos.length === 0 && <p className="text-center text-gray-400 py-10 w-full">No videos added yet.</p>}
                </motion.div>
            )}

        </AnimatePresence>
      </div>

    </div>
  );
}