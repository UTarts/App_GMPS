"use client";
import React, { createContext, useState, useContext, useEffect } from 'react';

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
    // Default to the current live session
    const [activeSession, setActiveSession] = useState('2026-2027');

    // Remember the user's choice even if they close the app
    useEffect(() => {
        const stored = localStorage.getItem('gmps_active_session');
        if (stored) setActiveSession(stored);
    }, []);

    const changeSession = (newSession) => {
        setActiveSession(newSession);
        localStorage.setItem('gmps_active_session', newSession);
        // Refresh the page data seamlessly
        window.dispatchEvent(new Event('sessionChanged')); 
    };

    return (
        <SessionContext.Provider value={{ activeSession, changeSession }}>
            {children}
        </SessionContext.Provider>
    );
};

export const useSession = () => useContext(SessionContext);