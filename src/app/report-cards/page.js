"use client";
import { useEffect, useState } from 'react';
import { useAuth } from "../../context/AuthContext";
import { useSession } from "../../context/SessionContext";
import { ArrowLeft, Printer, FileText, Download } from 'lucide-react';
import Link from 'next/link';

export default function ReportCards() {
  const { user } = useAuth();
  const { activeSession } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/student.php`, {
            method: 'POST', body: JSON.stringify({ user_id: user?.id, role: user?.role, session: activeSession })
          });
          const json = await res.json();
          if(json.status === 'success') setData(json.data);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
    }
    if (user) fetchData();
  }, [user, activeSession]);

  if (loading) return <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] flex justify-center pt-20"><div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div></div>;

  const profile = data?.profile;

  return (
    <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] pb-24 font-sans">
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-[#151515]/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 px-4 py-4 flex items-center gap-4 shadow-sm">
        <Link href="/profile" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><ArrowLeft size={20} className="dark:text-white" /></Link>
        <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight leading-none">Report Cards</h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Official Documents</p>
        </div>
      </div>

      <div className="p-4 mt-2 space-y-4">
        {data?.exams?.map((exam) => (
            <div key={exam.id} className="bg-white dark:bg-[#151515] rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 flex items-center justify-center shrink-0">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h4 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-wide leading-tight">{exam.name}</h4>
                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">
                            Session: {activeSession}
                        </p>
                    </div>
                </div>
                
                <Link 
                    href={`/print_report?class_id=${profile?.class_id}&exam_id=${exam.id}&student_id=${profile?.id}`}
                    className="w-full sm:w-auto bg-purple-600 text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 hover:bg-purple-700 active:scale-95 transition-all"
                >
                    <Printer size={18} /> View PDF
                </Link>
            </div>
        ))}

        {(!data?.exams || data.exams.length === 0) && (
            <div className="flex flex-col items-center justify-center pt-20 opacity-50">
                <Printer size={48} className="mb-4 text-gray-400" />
                <p className="font-bold text-lg text-gray-900 dark:text-white">No Official Records</p>
                <p className="text-xs text-gray-500 mt-1">Report cards will be published here.</p>
            </div>
        )}
      </div>
    </div>
  );
}