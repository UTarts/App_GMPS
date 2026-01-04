"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export function useDeviceType() {
  const [isMobile, setIsMobile] = useState(null);
  const [isTWA, setIsTWA] = useState(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const source = searchParams.get('source');
    
    // 1. Strict TWA Check: Only if URL has ?source=twa
    if (source === 'twa') {
      setIsTWA(true);
      setIsMobile(true);
    } 
    // 2. Otherwise, check physical screen size
    else {
      setIsTWA(false); 
      const checkScreen = () => {
        // If screen is smaller than 768px (Tablet/Mobile), treat as mobile layout
        setIsMobile(window.innerWidth <= 768);
      };
      
      checkScreen();
      window.addEventListener('resize', checkScreen);
      return () => window.removeEventListener('resize', checkScreen);
    }
  }, [searchParams]);

  const isReady = isMobile !== null && isTWA !== null;

  return { isMobile, isTWA, isReady };
}