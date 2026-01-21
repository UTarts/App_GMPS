"use client";
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

export default function RouteGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // --- THIS IS THE FIX ---
  const isLoginPage = pathname?.includes('/login');

  useEffect(() => {
    if (!loading) {
      if (!user && !isLoginPage) {
        router.replace('/login');
      }
      if (user && isLoginPage) {
        router.replace('/?source=twa'); 
      }
    }
  }, [user, loading, isLoginPage, router]);

  if (loading) return <div className="h-screen w-screen bg-white dark:bg-black" />;

  // --- THIS IS THE FIX ---
  if (isLoginPage || user) {
    return children;
  }

  return null; 
}