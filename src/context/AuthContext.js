"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]); 
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 1. Initialize & Load Accounts
  useEffect(() => {
    const initAuth = () => {
      const storedAccounts = JSON.parse(localStorage.getItem('gmps_family_accounts') || '[]');
      const activeIndex = parseInt(localStorage.getItem('gmps_active_index') || '0');
      const oldSingleUser = JSON.parse(localStorage.getItem('gmps_user'));

      // MIGRATION: Convert old single accounts to the new family array system
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

  // 2. Initial Standard Login (Wipes previous accounts)
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

        const isTWA = window.location.search.includes('source=twa') || localStorage.getItem('view_mode') === 'twa';
        router.push(isTWA ? '/?source=twa' : '/');
        
        return { success: true };
      } else {
        return { success: false, message: data.message || "Login failed" };
      }
    } catch (error) {
      return { success: false, message: "Network error. Check connection." };
    }
  };

  // 3. Add Additional Account (From Settings)
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
        
        // Convert IDs to strings to ensure perfect matching
        const existsIndex = accounts.findIndex(acc => String(acc.id) === String(newUser.id) && acc.role === role);
        
        if (existsIndex !== -1) {
          // Account already exists, just switch to it
          switchAccount(existsIndex);
          return { success: true };
        }

        // Append to existing array
        const updatedAccounts = [...accounts, newUser];
        
        // Save everywhere
        setAccounts(updatedAccounts);
        localStorage.setItem('gmps_family_accounts', JSON.stringify(updatedAccounts));
        
        // FIX: Pass the updated array DIRECTLY to switchAccount so it doesn't rely on delayed React state
        switchAccount(updatedAccounts.length - 1, updatedAccounts);
        
        return { success: true };
      } else {
        return { success: false, message: data.message || "Invalid credentials" };
      }
    } catch (error) {
      return { success: false, message: "Network Error" };
    }
  };

  // 4. Switch Account Core Logic
  // Added "forcedAccountsList" to bypass React's asynchronous state delays
  const switchAccount = (index, forcedAccountsList = null) => {
    const listToUse = forcedAccountsList || accounts;
    
    if (!listToUse[index]) {
        console.error("Switch failed: Account index not found.");
        return;
    }
    
    const newUser = listToUse[index];
    setUser(newUser);
    localStorage.setItem('gmps_active_index', index.toString());
    localStorage.setItem('gmps_user', JSON.stringify(newUser)); 
    
    // Hard-Reboot to Home Page to reconstruct the app for the new user
    const query = window.location.search; 
    window.location.href = `/${query}`;
  };
  
  // 5. Logout All
  const logout = () => {
    setUser(null);
    setAccounts([]);
    localStorage.removeItem('gmps_user');
    localStorage.removeItem('gmps_family_accounts');
    localStorage.removeItem('gmps_active_index');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, accounts, login, logout, addAccount, switchAccount, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}