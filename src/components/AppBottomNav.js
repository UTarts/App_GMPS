"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Calendar, Image as ImageIcon, User, CheckSquare, Shield } from 'lucide-react';
import { useAuth } from "../context/AuthContext";

export default function AppBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth(); 

  // ROBUST FIX: Normalize path here too
  const normalizedPath = pathname?.endsWith('/') && pathname.length > 1 
    ? pathname.slice(0, -1) 
    : pathname;

  // Don't show nav on login page
  if (normalizedPath === '/login') return null;

  // Determine Profile Path based on Role
  let profilePath = '/profile?source=twa';
  if (user?.role === 'teacher') profilePath = '/teacher?source=twa';
  if (user?.role === 'admin') profilePath = '/admin';

  // Determine active state for profile
  const profileActive = user?.role === 'admin' 
    ? normalizedPath.startsWith('/admin') && !normalizedPath.startsWith('/admin/posts') 
    : user?.role === 'teacher' 
        ? normalizedPath.startsWith('/teacher') 
        : normalizedPath.startsWith('/profile');

  // --- HYBRID NAVIGATION LOGIC ---
  const useReplace = normalizedPath !== '/';

  return (
    <div className="fixed bottom-0 left-0 w-full h-[70px] bg-white dark:bg-[#151515] border-t border-gray-200 dark:border-gray-800 z-50 flex justify-around items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] pb-2 transition-colors duration-300">
      <NavItem href="/?source=twa" icon={Home} label="Home" isActive={normalizedPath === '/'} useReplace={useReplace} />
      
      {user?.role === 'student' && (
          <NavItem href="/work?source=twa" icon={BookOpen} label="Work" isActive={normalizedPath === '/work'} useReplace={useReplace} />
      )}

      {user?.role === 'teacher' && user?.assigned_class_id && (
          <NavItem href="/attendance?source=twa" icon={CheckSquare} label="Attendance" isActive={normalizedPath === '/attendance'} useReplace={useReplace} />
      )}

      {user?.role === 'admin' && (
          <NavItem href="/admin/posts" icon={Shield} label="Posts" isActive={normalizedPath === '/admin/posts'} useReplace={useReplace} />
      )}

      <NavItem href="/events?source=twa" icon={Calendar} label="Updates" isActive={normalizedPath === '/events'} useReplace={useReplace} />
      <NavItem href="/gallery?source=twa" icon={ImageIcon} label="Gallery" isActive={normalizedPath === '/gallery'} useReplace={useReplace} />
      
      <NavItem href={profilePath} icon={User} label="Profile" isActive={profileActive} useReplace={useReplace} />
    </div>
  );
}

function NavItem({ href, icon: Icon, label, isActive, useReplace }) {
  return (
    <Link 
      href={href} 
      replace={useReplace} 
      className="flex flex-col items-center justify-center w-full h-full text-center group"
    >
      <Icon size={24} className={`mb-1 transition-colors duration-200 ${isActive ? 'text-blue-600 dark:text-blue-400 stroke-[2.5px]' : 'text-gray-500 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} />
      <span className={`text-[10px] font-medium transition-colors duration-200 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-600'}`}>{label}</span>
    </Link>
  );
}