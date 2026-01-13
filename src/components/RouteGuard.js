"use client";
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

export default function RouteGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // ROBUST FIX: Remove the slash from the end if it exists.
  // This ensures '/login/' is treated exactly the same as '/login'
  const normalizedPath = pathname?.endsWith('/') && pathname.length > 1 
    ? pathname.slice(0, -1) 
    : pathname;

  useEffect(() => {
    if (!loading) {
      // 1. Not logged in + trying to access a protected page -> Go to Login
      if (!user && normalizedPath !== '/login') {
        router.replace('/login');
      }
      // 2. Logged in + trying to access login page -> Go to Home
      if (user && normalizedPath === '/login') {
        router.replace('/?source=twa'); 
      }
    }
  }, [user, loading, normalizedPath, router]);

  // Loading Screen
  if (loading) return <div className="h-screen w-screen bg-white dark:bg-black" />;

  // Render Check
  if (normalizedPath === '/login' || user) {
    return children;
  }

  // Block rendering while redirecting
  return null; 
}