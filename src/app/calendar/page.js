"use client";
import { useState, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import { Calendar as CalendarIcon, PartyPopper, BookOpen, AlertCircle } from 'lucide-react';

export default function CalendarPage() {
    const { activeSession } = useSession();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCalendar();
    }, [activeSession]);

    const fetchCalendar = async () => {
        setLoading(true);
        try {
            const res = await fetch(`https://www.govindmadhav.com/api/calendar.php?session=${activeSession}`);
            const data = await res.json();
            if (data.status === 'success') {
                setEvents(data.data);
            }
        } catch (error) {
            console.error("Error fetching calendar:", error);
        }
        setLoading(false);
    };

    const getTypeStyles = (type) => {
        switch(type) {
            case 'holiday': return { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', icon: PartyPopper };
            case 'exam': return { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', icon: BookOpen };
            case 'activity': return { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', icon: AlertCircle };
            default: return { color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', icon: CalendarIcon };
        }
    };

    if (loading) return <div className="p-6 text-center mt-20 text-gray-500">Loading Academic Calendar...</div>;

    return (
        <div className="p-4 pt-6 max-w-lg mx-auto">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Academic Calendar</h1>
                    <p className="text-sm text-gray-500 mt-1">Session {activeSession}</p>
                </div>
            </div>

            <div className="relative border-l-2 border-gray-200 dark:border-gray-800 ml-3 md:ml-4 space-y-6">
                {events.map((ev, index) => {
                    const styles = getTypeStyles(ev.type);
                    const Icon = styles.icon;
                    const dateObj = new Date(ev.date_start);
                    
                    return (
                        <div key={index} className="relative pl-6">
                            {/* Timeline Dot */}
                            <div className={`absolute -left-[11px] top-1 w-5 h-5 rounded-full border-4 border-white dark:border-[#121212] ${styles.bg} flex items-center justify-center`}>
                                <div className={`w-2 h-2 rounded-full bg-current ${styles.color}`}></div>
                            </div>

                            {/* Card */}
                            <div className={`p-4 rounded-2xl border ${styles.border} ${styles.bg} shadow-sm`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white text-[15px]">{ev.title}</h3>
                                        <p className="text-xs font-medium mt-1 text-gray-600 dark:text-gray-400">
                                            {dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            {ev.date_end && ` - ${new Date(ev.date_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                                        </p>
                                    </div>
                                    <div className={`p-2 rounded-xl bg-white dark:bg-black/50 ${styles.color} shadow-sm`}>
                                        <Icon size={20} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                
                {events.length === 0 && (
                    <p className="pl-6 text-gray-500 text-sm">No events found for this session.</p>
                )}
            </div>
        </div>
    );
}