"use client";
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Image as ImageIcon, PlayCircle, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image'; // Import Next.js Image for optimization

export default function GalleryPage() {
  const [data, setData] = useState({ images: [], videos: [] });
  const [loading, setLoading] = useState(true);
  
  // Tabs & Filters
  const [activeTab, setActiveTab] = useState('photos'); // 'photos' | 'videos'
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'academic' | 'sports' ...
  
  const [lightboxItem, setLightboxItem] = useState(null);

  // Categories Configuration
  const categories = [
    { id: 'all', label: 'All' },
    { id: 'academic', label: 'Academic' },
    { id: 'sports', label: 'Sports' },
    { id: 'cultural', label: 'Cultural' },
    { id: 'infrastructure', label: 'Campus' },
  ];

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

  // Filter Logic
  const filteredImages = data.images.filter(item => activeCategory === 'all' || item.category === activeCategory);
  const filteredVideos = data.videos.filter(item => activeCategory === 'all' || item.category === activeCategory);

  // Helper: Extract YouTube ID
  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (loading) return <GallerySkeleton />;

  return (
    <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] text-gray-800 dark:text-gray-100 font-sans pb-24 relative">
      
      {/* --- CINEMA LIGHTBOX --- */}
      <AnimatePresence>
        {lightboxItem && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md"
            onClick={() => setLightboxItem(null)}
          >
            <button className="absolute top-6 right-6 text-white/80 hover:text-white bg-white/10 p-2 rounded-full transition-colors z-50">
                <X size={24} />
            </button>
            
            <div className="w-full max-w-4xl max-h-[80vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                {lightboxItem.type === 'img' ? (
                    <motion.img 
                        initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                        src={lightboxItem.src} 
                        className="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain"
                        // We use standard img here to load the FULL QUALITY version on demand
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

      {/* --- MAIN TABS (Photos/Videos) --- */}
      <div className="px-4 mt-6">
        <div className="bg-gray-200/80 dark:bg-gray-800/80 p-1 rounded-xl flex shadow-inner relative">
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

      {/* --- CATEGORY FILTERS --- */}
      <div className="px-4 mt-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {categories.map((cat) => (
                <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                        activeCategory === cat.id 
                        ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white' 
                        : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                >
                    {cat.label}
                </button>
            ))}
        </div>
      </div>

      {/* --- GALLERY CONTENT --- */}
      <div className="px-4 mt-4 min-h-[60vh]">
        <AnimatePresence mode='wait'>
            
            {/* === 1. IMAGES (MASONRY LAYOUT) === */}
            {activeTab === 'photos' && (
                <motion.div 
                    key="photos"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="columns-2 gap-4 space-y-4"
                >
                    {filteredImages.map((img, i) => (
                        <div 
                            key={i} 
                            className="break-inside-avoid relative group rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-800 cursor-zoom-in"
                            onClick={() => setLightboxItem({ type: 'img', src: `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${img.image_url}`, caption: img.caption })}
                        >
                            {/* PERFORMANCE: Use Next.js Image for Grid (Low Quality/Optimized) */}
                            <Image 
                                src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${img.image_url}`} 
                                alt={img.caption || "Gallery Image"}
                                width={400} 
                                height={300}
                                className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-110"
                                loading="lazy"
                            />
                            
                            {/* Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                <span className="text-[10px] text-white/80 bg-white/20 px-2 py-0.5 rounded-md w-fit mb-1 backdrop-blur-sm uppercase">{img.category}</span>
                                <p className="text-white text-xs font-medium line-clamp-2">{img.caption}</p>
                            </div>
                        </div>
                    ))}
                    {filteredImages.length === 0 && (
                        <div className="col-span-2 py-20 text-center">
                            <p className="text-gray-400 text-sm">No photos found in this category.</p>
                        </div>
                    )}
                </motion.div>
            )}

            {/* === 2. VIDEOS (GRID LAYOUT) === */}
            {activeTab === 'videos' && (
                <motion.div 
                    key="videos"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                    {filteredVideos.map((vid, i) => {
                        const ytId = getYouTubeId(vid.video_url);
                        const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;

                        return (
                            <div 
                                key={i} 
                                className="relative rounded-2xl overflow-hidden shadow-md bg-black group cursor-pointer aspect-video border border-gray-200 dark:border-gray-800"
                                onClick={() => setLightboxItem({ type: 'vid', src: vid.video_url, caption: vid.caption })}
                            >
                                {thumb ? (
                                    <img src={thumb} className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" loading="lazy" />
                                ) : (
                                    <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white/50">No Preview</div>
                                )}
                                
                                <div className="absolute top-3 left-3">
                                    <span className="text-[10px] text-white bg-black/50 px-2 py-1 rounded-full backdrop-blur-sm uppercase font-bold tracking-wide border border-white/10">{vid.category}</span>
                                </div>

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
                    {filteredVideos.length === 0 && (
                        <div className="col-span-1 md:col-span-2 py-20 text-center">
                            <p className="text-gray-400 text-sm">No videos found in this category.</p>
                        </div>
                    )}
                </motion.div>
            )}

        </AnimatePresence>
      </div>

    </div>
  );
}

// --- SKELETON COMPONENT ---
function GallerySkeleton() {
    return (
        <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] p-4 space-y-6">
            {/* Header Skeleton */}
            <div className="flex items-center gap-3 py-4 border-b border-gray-200 dark:border-gray-800">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 skeleton" />
                <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded skeleton" />
            </div>

            {/* Tabs Skeleton */}
            <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl skeleton w-full" />

            {/* Filter Pills Skeleton */}
            <div className="flex gap-2 overflow-hidden">
                {[1,2,3,4].map(i => (
                    <div key={i} className="h-8 w-20 rounded-full bg-gray-200 dark:bg-gray-800 skeleton" />
                ))}
            </div>

            {/* Grid Skeleton */}
            <div className="columns-2 gap-4 space-y-4">
                {[1,2,3,4,5,6].map(i => (
                    <div key={i} className={`rounded-xl bg-gray-200 dark:bg-gray-800 skeleton w-full ${i % 2 === 0 ? 'h-48' : 'h-32'}`} />
                ))}
            </div>
        </div>
    )
}