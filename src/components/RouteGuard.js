"use client";
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

export default function RouteGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname?.includes('/login');
  // ADDED: Define terminal page check
  const isTerminalPage = pathname?.startsWith('/terminal');

  useEffect(() => {
    if (!loading) {
      // ADDED: Do not redirect if on the terminal page
      if (!user && !isLoginPage && !isTerminalPage) {
        router.replace('/login');
      }
      if (user && isLoginPage) {
        router.replace('/?source=twa'); 
      }
    }
  }, [user, loading, isLoginPage, isTerminalPage, router]);

  if (loading) return <div className="h-screen w-screen bg-white dark:bg-black" />;
  
  if (isTerminalPage) return children;

  if (isLoginPage || user) {
    return children;
  }

  return null; 
}