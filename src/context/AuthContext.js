"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 1. Check if user is already logged in (on page refresh)
  useEffect(() => {
    const storedUser = localStorage.getItem('gmps_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // 2. Login Function
  const login = async (userid, password, role, class_id = null) => {
    try {
      const payload = { userid, password, role };
      if (role === 'student') payload.class_id = class_id;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.status === 'success') {
        const userData = { ...data.user, role };
        setUser(userData);
        localStorage.setItem('gmps_user', JSON.stringify(userData));
        
        // --- STRICT REDIRECTION LOGIC (Matches your PHP) ---
        // 1. Check if we are in TWA mode
        const isTWA = window.location.search.includes('source=twa') || localStorage.getItem('view_mode') === 'twa';

        if (isTWA) {
          // APP USER -> Goes to Home (App Home)
          router.push('/?source=twa');
        } else {
          // WEBSITE USER -> Goes to Profile (Website Dashboard)
          // We will map this to a new page '/dashboard' or '/profile'
          router.push('/profile'); 
        }
        
        return { success: true };
      } else {
        return { success: false, message: data.message || "Login failed" };
      }
    } catch (error) {
      return { success: false, message: "Network error. Check connection." };
    }
  };
  
  // 3. Logout Function
  const logout = () => {
    setUser(null);
    localStorage.removeItem('gmps_user');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}