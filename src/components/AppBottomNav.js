"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Calendar, Image as ImageIcon, User, CheckSquare, Shield } from 'lucide-react';
import { useAuth } from "../context/AuthContext";

export default function AppBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth(); 

  // ROBUST FIX: Do not show nav on ANY login-related path or the terminal kiosk
  if (pathname?.includes('/login') || pathname?.includes('/terminal')) return null;

  // Determine Profile Path based on Role
  let profilePath = '/profile?source=twa';
  if (user?.role === 'teacher') profilePath = '/teacher?source=twa';
  if (user?.role === 'admin') profilePath = '/admin';

  // Determine active state for profile
  const profileActive = user?.role === 'admin' 
    ? pathname.startsWith('/admin') && !pathname.includes('/posts') 
    : user?.role === 'teacher' 
        ? pathname.startsWith('/teacher') 
        : pathname.startsWith('/profile');

  // --- HYBRID NAVIGATION LOGIC ---
  const useReplace = pathname !== '/';

  return (
    <div className="fixed bottom-0 left-0 w-full h-[60px] bg-white/80 dark:bg-[#151515]/80 backdrop-blur-xl border-t border-white/20 dark:border-gray-800/50 z-50 flex justify-around items-center shadow-[0_-8px_30px_-5px_rgba(0,0,0,0.1)] rounded-t-3xl transition-all duration-300">
      
      <NavItem href="/?source=twa" icon={Home} label="Home" isActive={pathname === '/' || pathname === '/'} useReplace={useReplace} />
      
      {user?.role === 'student' && (
          <NavItem href="/work?source=twa" icon={BookOpen} label="Work" isActive={pathname.startsWith('/work')} useReplace={useReplace} />
      )}

      {user?.role === 'teacher' && user?.assigned_class_id && (
          <NavItem href="/attendance?source=twa" icon={CheckSquare} label="Attendance" isActive={pathname.startsWith('/attendance')} useReplace={useReplace} />
      )}

      {user?.role === 'admin' && (
          <NavItem href="/admin/posts" icon={Shield} label="Posts" isActive={pathname.includes('/posts')} useReplace={useReplace} />
      )}

      {/* Prominent Center Updates Icon */}
      <NavItem href="/events?source=twa" icon={Calendar} label="Updates" isActive={pathname.startsWith('/events')} useReplace={useReplace} isProminent />
      
      <NavItem href="/gallery?source=twa" icon={ImageIcon} label="Gallery" isActive={pathname.startsWith('/gallery')} useReplace={useReplace} />
      
      <NavItem href={profilePath} icon={User} label="Profile" isActive={profileActive} useReplace={useReplace} />

    </div>
  );
}

function NavItem({ href, icon: Icon, label, isActive, useReplace, isProminent }) {
  // --- SPECIAL STYLING FOR PROMINENT CENTER ICON ---
  if (isProminent) {
    return (
      <Link 
        href={href} 
        replace={useReplace} 
        className="relative flex flex-col items-center justify-center w-full h-full text-center group"
      >
        <div className={`absolute -top-5 flex items-center justify-center w-14 h-14 rounded-full shadow-lg border-[3px] border-white/50 dark:border-[#151515]/50 backdrop-blur-md transition-transform duration-300 group-hover:-translate-y-1 ${isActive ? 'bg-blue-600 border-transparent dark:border-transparent' : 'bg-gray-100 dark:bg-gray-800'}`}>
          <Icon size={26} className={`${isActive ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} />
        </div>
        {/* mt-7 acts as a spacer so the label aligns perfectly with the non-prominent item labels */}
        <span className={`mt-8 text-[10px] font-medium transition-colors duration-200 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-600'}`}>
          {label}
        </span>
      </Link>
    );
  }

  // --- STANDARD NAV ITEM ---
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