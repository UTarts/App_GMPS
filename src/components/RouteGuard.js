"use client";
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

export default function RouteGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      // If NOT logged in AND trying to access a page that isn't login
      if (!user && pathname !== '/login') {
        router.replace('/login');
      }
      // If LOGGED IN and trying to access login page
      if (user && pathname === '/login') {
        router.replace('/?source=twa'); // Send to home
      }
    }
  }, [user, loading, pathname, router]);

  // Show nothing while checking (prevents flickering)
  if (loading) return <div className="h-screen w-screen bg-white dark:bg-black" />;

  // If on login page, or if we have a user, render the page
  if (pathname === '/login' || user) {
    return children;
  }

  return null; // Block rendering otherwise
}