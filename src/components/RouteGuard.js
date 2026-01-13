"use client";
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

export default function RouteGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // FIX: Normalize path by removing trailing slash for consistent comparison
  const normalizedPath = pathname?.endsWith('/') && pathname.length > 1 
    ? pathname.slice(0, -1) 
    : pathname;

  useEffect(() => {
    if (!loading) {
      // 1. Not logged in + trying to access protected page -> Redirect to Login
      if (!user && normalizedPath !== '/login') {
        router.replace('/login');
      }
      // 2. Logged in + trying to access login page -> Redirect to Home
      if (user && normalizedPath === '/login') {
        router.replace('/?source=twa'); 
      }
    }
  }, [user, loading, normalizedPath, router]);

  // Loading Screen
  if (loading) return <div className="h-screen w-screen bg-white dark:bg-black" />;

  // Render Check
  // Allow render if: User is on Login page OR User is logged in
  if (normalizedPath === '/login' || user) {
    return children;
  }

  // Otherwise block (returns blank while redirecting)
  return null; 
}