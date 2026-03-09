"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]); // Store all family accounts
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 1. Initialize & Migration Logic
  useEffect(() => {
    const initAuth = () => {
      const storedAccounts = JSON.parse(localStorage.getItem('gmps_family_accounts') || '[]');
      const activeIndex = parseInt(localStorage.getItem('gmps_active_index') || '0');
      const oldSingleUser = JSON.parse(localStorage.getItem('gmps_user'));

      // MIGRATION: If user has old single account but no family list, convert them.
      if (storedAccounts.length === 0 && oldSingleUser) {
        const initialFamily = [oldSingleUser];
        setAccounts(initialFamily);
        setUser(oldSingleUser);
        localStorage.setItem('gmps_family_accounts', JSON.stringify(initialFamily));
        localStorage.setItem('gmps_active_index', '0');
      } 
      // NORMAL LOAD
      else if (storedAccounts.length > 0) {
        setAccounts(storedAccounts);
        setUser(storedAccounts[activeIndex] || storedAccounts[0]);
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  // 2. Standard Login
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
        
        // Start a fresh family list
        const newFamily = [userData];
        setAccounts(newFamily);
        setUser(userData);
        
        localStorage.setItem('gmps_family_accounts', JSON.stringify(newFamily));
        localStorage.setItem('gmps_active_index', '0');
        localStorage.setItem('gmps_user', JSON.stringify(userData)); 

        // Redirect logic
        const isTWA = window.location.search.includes('source=twa') || localStorage.getItem('view_mode') === 'twa';
        router.push(isTWA ? '/?source=twa' : '/profile');
        
        return { success: true };
      } else {
        return { success: false, message: data.message || "Login failed" };
      }
    } catch (error) {
      return { success: false, message: "Network error. Check connection." };
    }
  };

  // 3. Add Student Account
  const addStudentAccount = async (userid, password, class_id) => {
    try {
      const payload = { userid, password, role: 'student', class_id };
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.status === 'success') {
        const newStudent = { ...data.user, role: 'student' };
        
        // Check duplicates
        const exists = accounts.some(acc => acc.id === newStudent.id && acc.role === 'student');
        if (exists) return { success: false, message: "Student already added." };

        // Append and Save
        const updatedAccounts = [...accounts, newStudent];
        setAccounts(updatedAccounts);
        localStorage.setItem('gmps_family_accounts', JSON.stringify(updatedAccounts));
        
        // Auto-switch to new user (This will trigger the redirect in switchAccount)
        switchAccount(updatedAccounts.length - 1);
        
        return { success: true };
      } else {
        return { success: false, message: data.message || "Invalid credentials" };
      }
    } catch (error) {
      return { success: false, message: "Network Error" };
    }
  };

  // 3.5 Add Generic Account (For Teachers/Admins/Students)
  const addAccount = async (userid, password, role, class_id = null) => {
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
        const newUser = { ...data.user, role };
        
        // Check duplicates
        const exists = accounts.some(acc => acc.id === newUser.id && acc.role === role);
        if (exists) return { success: false, message: "Profile already added." };

        // Append and Save
        const updatedAccounts = [...accounts, newUser];
        setAccounts(updatedAccounts);
        localStorage.setItem('gmps_family_accounts', JSON.stringify(updatedAccounts));
        
        // Auto-switch to new user
        switchAccount(updatedAccounts.length - 1);
        
        return { success: true };
      } else {
        return { success: false, message: data.message || "Invalid credentials" };
      }
    } catch (error) {
      return { success: false, message: "Network Error" };
    }
  };

  // 4. Switch Account (UPDATED)
  const switchAccount = (index) => {
    if (!accounts[index]) return;
    
    const newUser = accounts[index];
    setUser(newUser);
    localStorage.setItem('gmps_active_index', index.toString());
    localStorage.setItem('gmps_user', JSON.stringify(newUser)); 
    
    // --- FIX: Redirect to Profile Page ---
    // We use window.location.href to force a "fresh load" of the Profile page.
    // We also preserve the '?source=twa' query if it exists, so the app stays in App Mode.
    const query = window.location.search; 
    window.location.href = `/profile${query}`;
  };
  
  // 5. Logout
  const logout = () => {
    setUser(null);
    setAccounts([]);
    localStorage.removeItem('gmps_user');
    localStorage.removeItem('gmps_family_accounts');
    localStorage.removeItem('gmps_active_index');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, accounts, login, logout, switchAccount, addStudentAccount, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}