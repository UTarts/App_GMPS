"use client";
import { useEffect, useState } from 'react';
import { useAuth } from "../../context/AuthContext";
import { useSession } from "../../context/SessionContext";
import { ArrowLeft, ChevronDown, ChevronUp, FileSpreadsheet, Award } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function ExamResults() {
  const { user } = useAuth();
  const { activeSession } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedExam, setExpandedExam] = useState(null); 

  useEffect(() => {
    async function fetchData() {
      try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/student.php`, {
            method: 'POST', body: JSON.stringify({ user_id: user?.id, role: user?.role, session: activeSession })
          });
          const json = await res.json();
          if(json.status === 'success') {
              setData(json.data);
              // Auto-expand the first exam if available
              if (json.data.exams && json.data.exams.length > 0) {
                  setExpandedExam(json.data.exams[0].id);
              }
          }
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
    }
    if (user) fetchData();
  }, [user, activeSession]);

  if (loading) return <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] flex justify-center pt-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] pb-24 font-sans">
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-[#151515]/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 px-4 py-4 flex items-center gap-4 shadow-sm">
        <Link href="/profile" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><ArrowLeft size={20} className="dark:text-white" /></Link>
        <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight leading-none">Academic Results</h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Session: {activeSession}</p>
        </div>
      </div>

      <div className="p-4 mt-2 space-y-5">
        {data?.exams?.map((exam) => (
            <div key={exam.id} className="bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                
                <div 
                    className="p-5 flex justify-between items-center cursor-pointer bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/10 dark:to-[#151515] active:scale-[0.99] transition-transform" 
                    onClick={() => setExpandedExam(expandedExam === exam.id ? null : exam.id)}
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                            <Award size={20} />
                        </div>
                        <div>
                            <h4 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-wide">{exam.name}</h4>
                            <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-0.5 uppercase tracking-widest">
                                {exam.is_ut ? 'Unit Test / Periodic' : 'Term Examination'}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-black p-2 rounded-full shadow-sm border border-gray-100 dark:border-gray-800">
                        {expandedExam === exam.id ? <ChevronUp size={18} className="text-gray-900 dark:text-white"/> : <ChevronDown size={18} className="text-gray-900 dark:text-white"/>}
                    </div>
                </div>

                <AnimatePresence>
                    {expandedExam === exam.id && (
                        <motion.div initial={{height: 0, opacity: 0}} animate={{height: 'auto', opacity: 1}} exit={{height: 0, opacity: 0}} className="overflow-hidden">
                            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#151515]">
                                
                                {/* TABLE HEADER */}
                                <div className="flex text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-2 mb-2 px-2">
                                    <div className="flex-1">Subject</div>
                                    <div className="w-16 text-center">{exam.is_ut ? 'Marks' : 'Total'}</div>
                                </div>

                                {/* SUBJECT ROWS */}
                                <div className="space-y-1">
                                    {exam.subjects.map((sub, idx) => (
                                        <div key={idx} className="group">
                                            <div className="flex justify-between items-center px-2 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors">
                                                <span className="font-bold text-xs text-gray-800 dark:text-gray-200 uppercase">{sub.subject}</span>
                                                <span className={`font-black text-sm ${sub.is_absent == 1 ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`}>
                                                    {sub.is_absent == 1 ? 'AB' : sub.total}
                                                </span>
                                            </div>
                                            
                                            {/* Advanced Breakdown for Term Exams */}
                                            {!exam.is_ut && sub.is_absent == 0 && (
                                                <div className="grid grid-cols-4 gap-2 px-2 pb-3 hidden group-hover:grid animate-in fade-in slide-in-from-top-1">
                                                    <div className="bg-gray-50 dark:bg-black rounded-lg p-2 text-center">
                                                        <div className="text-[9px] text-gray-400 font-bold uppercase">PT</div>
                                                        <div className="text-xs font-black">{sub.pt || '-'}</div>
                                                    </div>
                                                    <div className="bg-gray-50 dark:bg-black rounded-lg p-2 text-center">
                                                        <div className="text-[9px] text-gray-400 font-bold uppercase">NB</div>
                                                        <div className="text-xs font-black">{sub.nb || '-'}</div>
                                                    </div>
                                                    <div className="bg-gray-50 dark:bg-black rounded-lg p-2 text-center">
                                                        <div className="text-[9px] text-gray-400 font-bold uppercase">SE</div>
                                                        <div className="text-xs font-black">{sub.se || '-'}</div>
                                                    </div>
                                                    <div className="bg-gray-50 dark:bg-black rounded-lg p-2 text-center">
                                                        <div className="text-[9px] text-gray-400 font-bold uppercase">Exam</div>
                                                        <div className="text-xs font-black text-blue-600">{sub.exam || '-'}</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        ))}

        {(!data?.exams || data.exams.length === 0) && (
            <div className="flex flex-col items-center justify-center pt-20 opacity-50">
                <FileSpreadsheet size={48} className="mb-4 text-gray-400" />
                <p className="font-bold text-lg text-gray-900 dark:text-white">No Results Yet</p>
                <p className="text-xs text-gray-500 mt-1">Your published exam results will appear here.</p>
            </div>
        )}
      </div>
    </div>
  );
}