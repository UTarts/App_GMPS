"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Calendar, Image as ImageIcon, User, CheckSquare, Shield } from 'lucide-react';
import { useAuth } from "../context/AuthContext";

export default function AppBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth(); 

  if (pathname === '/login') return null;

  // Determine Profile Path based on Role
  let profilePath = '/profile?source=twa';
  if (user?.role === 'teacher') profilePath = '/teacher?source=twa';
  if (user?.role === 'admin') profilePath = '/admin';

  // Determine active state for profile
  const profileActive = user?.role === 'admin' 
    ? pathname.startsWith('/admin') && !pathname.startsWith('/admin/posts') // Don't highlight profile when on posts
    : user?.role === 'teacher' 
        ? pathname.startsWith('/teacher') 
        : pathname.startsWith('/profile');

  return (
    <div className="fixed bottom-0 left-0 w-full h-[70px] bg-white border-t border-gray-200 z-50 flex justify-around items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] pb-2">
      
      <NavItem href="/?source=twa" icon={Home} label="Home" isActive={pathname === '/'} />
      
      {/* Role Based Middle Button */}
      {user?.role === 'student' && (
          <NavItem href="/work?source=twa" icon={BookOpen} label="Work" isActive={pathname === '/work'} />
      )}

      {user?.role === 'teacher' && user?.assigned_class_id && (
          <NavItem href="/attendance?source=twa" icon={CheckSquare} label="Attendance" isActive={pathname === '/attendance'} />
      )}

      {/* Admin Post Button */}
      {user?.role === 'admin' && (
          <NavItem href="/admin/posts" icon={Shield} label="Posts" isActive={pathname === '/admin/posts'} />
      )}

      <NavItem href="/events?source=twa" icon={Calendar} label="Updates" isActive={pathname === '/events'} />
      <NavItem href="/gallery?source=twa" icon={ImageIcon} label="Gallery" isActive={pathname === '/gallery'} />
      
      {/* Profile Button */}
      <NavItem href={profilePath} icon={User} label="Profile" isActive={profileActive} />

    </div>
  );
}

function NavItem({ href, icon: Icon, label, isActive }) {
  return (
    <Link href={href} className="flex flex-col items-center justify-center w-full h-full text-center group">
      <Icon size={24} className={`mb-1 transition-colors duration-200 ${isActive ? 'text-blue-600 stroke-[2.5px]' : 'text-gray-500 group-hover:text-gray-600'}`} />
      <span className={`text-[10px] font-medium transition-colors duration-200 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>
    </Link>
  );
}