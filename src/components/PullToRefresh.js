"use client";
import { useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PullToRefresh({ children }) {
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef(null);

  const THRESHOLD = 120; 
  const MAX_PULL = 160; 

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    const currentY = e.touches[0].clientY;
    if (window.scrollY === 0 && currentY > startY) {
      // Pulling down
      const diff = currentY - startY;
      const move = Math.min(diff * 0.5, MAX_PULL); 
      setPullDistance(move);
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > THRESHOLD) {
      setRefreshing(true);
      setPullDistance(80); // Snap spinner to visible position
      window.location.reload();
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div 
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="min-h-screen relative"
    >
      {/* SPINNER OVERLAY (Moves independently) */}
      <div 
        className="fixed left-0 w-full flex justify-center pointer-events-none z-[60] transition-all duration-200"
        style={{ 
          // Start slightly above screen (-50px) and slide down
          top: refreshing ? '80px' : `${pullDistance - 50}px`, 
          opacity: pullDistance > 0 ? 1 : 0 
        }}
      >
        <div className="bg-white dark:bg-black p-2.5 rounded-full shadow-xl border border-gray-100 dark:border-gray-800">
          <motion.div 
            animate={refreshing ? { rotate: 360 } : { rotate: pullDistance * 2 }}
            transition={refreshing ? { repeat: Infinity, duration: 1, ease: "linear" } : { duration: 0 }}
          >
            <Loader2 size={24} className="text-blue-600 dark:text-blue-400" />
          </motion.div>
        </div>
      </div>

      {/* CONTENT (Stays Static - No stretching) */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
}