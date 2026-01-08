"use client";
import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PullToRefresh({ children }) {
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef(null);

  const THRESHOLD = 120; // How far to pull to trigger refresh
  const MAX_PULL = 180;  // Max visual stretch

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    const currentY = e.touches[0].clientY;
    
    // Only pull if we are at the top of the page and scrolling down
    if (window.scrollY === 0 && currentY > startY) {
      const diff = currentY - startY;
      // Add resistance (logarithmic feeling)
      const move = Math.min(diff * 0.5, MAX_PULL); 
      setPullDistance(move);
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > THRESHOLD) {
      setRefreshing(true);
      setPullDistance(THREAD_HEIGHT); // Snap to loading position
      
      // TRIGGER RELOAD
      window.location.reload();
    } else {
      setPullDistance(0); // Snap back to 0 if not pulled enough
    }
  };

  const THREAD_HEIGHT = 60;

  return (
    <div 
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="min-h-screen"
    >
      {/* LOADING INDICATOR */}
      <div 
        className="fixed top-0 left-0 w-full flex justify-center pointer-events-none z-50 transition-all duration-200"
        style={{ 
          height: `${pullDistance}px`, 
          opacity: pullDistance > 0 ? 1 : 0 
        }}
      >
        <div className="flex flex-col items-center justify-end pb-4">
          <div className="bg-white dark:bg-neutral-800 p-2 rounded-full shadow-lg border border-gray-100 dark:border-neutral-700">
            <motion.div 
              animate={refreshing ? { rotate: 360 } : { rotate: pullDistance * 2 }}
              transition={refreshing ? { repeat: Infinity, duration: 1, ease: "linear" } : { duration: 0 }}
            >
              <Loader2 size={24} className="text-blue-600 dark:text-blue-400" />
            </motion.div>
          </div>
        </div>
      </div>

      {/* CONTENT WITH TRANSFORMATION */}
      <div 
        style={{ 
          transform: `translateY(${pullDistance}px)`,
          transition: refreshing ? 'transform 0.2s' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' 
        }}
      >
        {children}
      </div>
    </div>
  );
}