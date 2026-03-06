"use client";
import { useSession } from '../context/SessionContext';
import { CalendarDays } from 'lucide-react';

export default function SessionSwitcher() {
    const { activeSession, changeSession } = useSession();

    // Future-proof: Add past sessions here as they occur
    const availableSessions = ["2026-2027"];

    return (
        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded-xl border border-blue-100 dark:border-blue-800">
            <CalendarDays size={18} className="text-blue-600 dark:text-blue-400" />
            <select 
                value={activeSession}
                onChange={(e) => changeSession(e.target.value)}
                className="bg-transparent text-sm font-semibold text-blue-700 dark:text-blue-300 outline-none cursor-pointer appearance-none"
            >
                {availableSessions.map(sess => (
                    <option key={sess} value={sess} className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
                        Session: {sess} {sess !== "2026-2027" ? "(Archive)" : ""}
                    </option>
                ))}
            </select>
        </div>
    );
}