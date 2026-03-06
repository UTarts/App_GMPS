"use client";
import { useEffect, useState, useRef } from 'react';
import { useAuth } from "../../context/AuthContext";
import { useAppModal } from "../../context/ModalContext";
import { useSession } from "../../context/SessionContext";
import { ArrowLeft, Calendar, Paperclip, Send, CheckCircle, Clock, XCircle, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

export default function ApplyLeave() {
  const { user } = useAuth();
  const { showModal } = useAppModal();
  const { activeSession } = useSession();
  
  const [activeTab, setActiveTab] = useState('apply'); // 'apply' or 'history'
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  
  const formRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Fetch History
  useEffect(() => {
      if (activeTab === 'history' && user) {
          fetchHistory();
      }
  }, [activeTab, user, activeSession]);

  const fetchHistory = async () => {
      setLoading(true);
      try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/leave.php?action=get_my_leaves&user_id=${user.id}&role=${user.role}&session=${activeSession}`);
          const json = await res.json();
          if(json.status === 'success') setHistory(json.data);
      } catch (e) { console.error(e); }
      setLoading(false);
  };

  const handleApply = async (e) => {
      e.preventDefault();
      const fd = new FormData(formRef.current);
      fd.append('action', 'apply_leave');
      fd.append('user_id', user.id);
      fd.append('role', user.role);

      setLoading(true);
      try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/leave.php`, { method: 'POST', body: fd });
          const json = await res.json();
          if (json.status === 'success') {
              showModal("Success", "Your leave application has been submitted for approval.", "success");
              formRef.current.reset();
              setSelectedFile(null);
              setActiveTab('history');
          } else {
              showModal("Error", json.message, "danger");
          }
      } catch (e) {
          showModal("Error", "Network error. Please try again.", "danger");
      }
      setLoading(false);
  };

  const getStatusStyle = (status) => {
      if (status === 'approved') return "bg-green-100 text-green-700 border-green-200";
      if (status === 'rejected') return "bg-red-100 text-red-700 border-red-200";
      return "bg-orange-100 text-orange-700 border-orange-200";
  };

  const getStatusIcon = (status) => {
      if (status === 'approved') return <CheckCircle size={16} />;
      if (status === 'rejected') return <XCircle size={16} />;
      return <Clock size={16} />;
  };

  if (!user) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] pb-24">
      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-4 flex items-center gap-4">
        <button onClick={() => window.history.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft size={20} className="dark:text-white" /></button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Leave Application</h1>
      </div>

      <div className="p-4 mt-2">
        {/* TABS */}
        <div className="flex p-1 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 mb-6">
            <button onClick={() => setActiveTab('apply')} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'apply' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}>Apply Leave</button>
            <button onClick={() => setActiveTab('history')} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}>History</button>
        </div>

        {/* APPLY TAB */}
        {activeTab === 'apply' && (
            <div className="bg-white dark:bg-[#151515] p-5 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm animate-in fade-in zoom-in duration-300">
                <form ref={formRef} onSubmit={handleApply} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Start Date</label>
                            <input type="date" name="start_date" required className="w-full p-3 bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-bold outline-none dark:text-white focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">End Date</label>
                            <input type="date" name="end_date" required className="w-full p-3 bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-bold outline-none dark:text-white focus:border-blue-500" />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Reason for Leave</label>
                        <textarea name="reason" rows="4" required placeholder="Describe your reason in detail..." className="w-full p-3 bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl text-sm outline-none dark:text-white focus:border-blue-500 resize-none"></textarea>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Proof / Document (Optional)</label>
                        <label className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center">
                                <Paperclip size={18} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold dark:text-white">{selectedFile ? selectedFile.name : 'Upload Medical/Proof'}</p>
                                <p className="text-[10px] text-gray-500">Tap to select image</p>
                            </div>
                            <input 
                                type="file" 
                                name="proof_image" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => setSelectedFile(e.target.files[0])}
                            />
                        </label>
                    </div>

                    <button disabled={loading} type="submit" className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 mt-4 active:scale-95 transition-transform">
                        {loading ? 'Submitting...' : <><Send size={18} /> Submit Application</>}
                    </button>
                </form>
            </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
            <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                {loading ? <p className="text-center text-gray-500 py-10">Loading history...</p> : history.length === 0 ? (
                    <div className="text-center py-10 bg-white dark:bg-[#151515] rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                        <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-sm font-bold text-gray-400">No leave applications found.</p>
                    </div>
                ) : (
                    history.map(item => (
                        <div key={item.id} className="bg-white dark:bg-[#151515] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                            <div className="flex justify-between items-start mb-3 border-b border-gray-50 dark:border-gray-800 pb-3">
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                                        {new Date(item.start_date).toLocaleDateString('en-GB', {day:'numeric', month:'short'})} 
                                        {item.start_date !== item.end_date && ` - ${new Date(item.end_date).toLocaleDateString('en-GB', {day:'numeric', month:'short'})}`}
                                    </h4>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Applied on {new Date(item.applied_on).toLocaleDateString()}</p>
                                </div>
                                <span className={`flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${getStatusStyle(item.status)}`}>
                                    {getStatusIcon(item.status)} {item.status}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3">{item.reason}</p>
                            
                            {item.proof_image && (
                                <a href={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${item.proof_image}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg">
                                    <ImageIcon size={14} /> View Attached Proof
                                </a>
                            )}
                        </div>
                    ))
                )}
            </div>
        )}
      </div>
    </div>
  );
}