"use client";
import { useEffect, useState, useRef } from 'react';
import { useAuth } from "../../context/AuthContext";
import { useAppModal } from "../../context/ModalContext";
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Camera, Check, FileText, Image as ImageIcon, Paperclip, Send, UserX, X, Megaphone, Plus, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WorkUploadPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { showModal } = useAppModal();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [data, setData] = useState({ is_class_teacher: false, subjects: [], students: [], classes: [] });
    
    const [activeTab, setActiveTab] = useState('classwork');
    
    // The "Batch" Array. This holds multiple rows of updates.
    const [items, setItems] = useState([{ id: Date.now(), subject: '', heading: '', content: '', students: [], attachments: [] }]);
    
    // For General Notices
    const [selectedClasses, setSelectedClasses] = useState([]);

    // Voice Dictation State
    const [listeningId, setListeningId] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            if (!user?.id) return;
            const fd = new FormData();
            fd.append('action', 'fetch_work_upload_data');
            fd.append('teacher_id', user.id);
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
                const json = await res.json();
                if(json.status === 'success') {
                    setData(json);
                    if (!json.is_class_teacher) setActiveTab('general');
                } else {
                    console.error("Failed to load: ", json.message);
                }
            } catch (e) {
                console.error("Network error");
            }
            setLoading(false);
        };
        loadData();
    }, [user]);

    // Handle Tab Switch (Reset Form)
    const handleTabSwitch = (tabId) => {
        setActiveTab(tabId);
        setItems([{ id: Date.now(), subject: '', heading: '', content: '', students: [], attachments: [] }]);
        setSelectedClasses([]);
    };

    // Row Management
    const addRow = () => setItems(prev => [...prev, { id: Date.now(), subject: '', heading: '', content: '', students: [], attachments: [] }]);
    const removeRow = (idToRemove) => setItems(prev => prev.filter(i => i.id !== idToRemove));
    
    const updateItem = (id, field, value) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    // Voice to Text Dictation
    const toggleDictation = (id, currentText) => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return showModal("Not Supported", "Voice typing is not supported on this browser. Try Chrome or Safari.", "warning");
        
        if (listeningId === id) {
            setListeningId(null);
            return; // Stops automatically
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-IN'; // Optimized for Indian English accents
        recognition.interimResults = false;
        
        setListeningId(id);
        recognition.start();

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            updateItem(id, 'content', currentText + (currentText ? ' ' : '') + transcript);
            setListeningId(null);
        };

        recognition.onerror = () => setListeningId(null);
        recognition.onend = () => setListeningId(null);
    };

    // File Management
    const handleFileChange = (e, itemId) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files).map(file => ({
                file, url: URL.createObjectURL(file), isImage: file.type.startsWith('image/')
            }));
            const targetItem = items.find(i => i.id === itemId);
            updateItem(itemId, 'attachments', [...targetItem.attachments, ...newFiles]);
        }
    };
    const removeAttachment = (itemId, attIndex) => {
        const targetItem = items.find(i => i.id === itemId);
        updateItem(itemId, 'attachments', targetItem.attachments.filter((_, idx) => idx !== attIndex));
    };

    const handleSubmit = async () => {
        // Validations
        if (activeTab === 'general' && selectedClasses.length === 0) return showModal("Required", "Select at least one target class.", "warning");
        
        for (let item of items) {
            if (['classwork', 'homework'].includes(activeTab) && !item.subject) return showModal("Required", "Please select a subject for all items.", "warning");
            if (activeTab === 'defaulter' && item.students.length === 0) return showModal("Required", "Please select students for all defaulter items.", "warning");
        }

        setSubmitting(true);
        const fd = new FormData();
        fd.append('action', 'submit_smart_work');
        fd.append('teacher_id', user.id);
        fd.append('post_type', activeTab);
        fd.append('item_count', items.length);

        if (activeTab === 'general') {
            fd.append('target_classes', JSON.stringify(selectedClasses));
        }

        items.forEach((item, idx) => {
            fd.append(`subject_${idx}`, item.subject);
            fd.append(`heading_${idx}`, item.heading);
            fd.append(`content_${idx}`, item.content);
            if (item.students.length > 0) fd.append(`students_${idx}`, JSON.stringify(item.students));
            item.attachments.forEach(att => fd.append(`files_${idx}[]`, att.file));
        });

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teacher_app.php`, { method: 'POST', body: fd });
            const json = await res.json();
            if (json.status === 'success') {
                showModal("Published!", `Updates published and notifications sent successfully.`, "success");
                router.push('/teacher?tab=recent_posts');
            } else {
                showModal("Error", "Server error. Please try again.", "danger");
            }
        } catch (e) {
            showModal("Error", "Network error. Check connection.", "danger");
        }
        setSubmitting(false);
    };

    if (loading) return <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

    const tabs = data.is_class_teacher 
        ? [{id:'classwork', icon:BookOpen, label:'Classwork'}, {id:'homework', icon:FileText, label:'Homework'}, {id:'defaulter', icon:UserX, label:'Defaulter'}, {id:'general', icon:Megaphone, label:'Notice'}]
        : [{id:'general', icon:Megaphone, label:'Notice'}];

    return (
        <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] font-sans flex flex-col pb-24 relative">
            
            {/* FIXED HEADER */}
            <div className="fixed top-0 left-0 w-full z-50 bg-white dark:bg-[#151515] px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4 shadow-sm">
                <button onClick={() => router.push('/teacher')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft size={20} className="dark:text-white"/></button>
                <div>
                    <h1 className="text-lg font-black text-gray-900 dark:text-white leading-tight">Create Post</h1>
                    {data.is_class_teacher && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">My Class Updates</p>}
                </div>
            </div>

            {/* MAIN CONTENT (Added pt-20 to clear the fixed header) */}
            <div className="p-3 pt-20 flex flex-col gap-6 max-w-lg mx-auto w-full">
                {/* Horizontal Tab Navigation */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 snap-x">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => handleTabSwitch(tab.id)} className={`snap-center shrink-0 flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold transition-all shadow-sm ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-blue-500/30' : 'bg-white dark:bg-[#151515] text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800'}`}>
                            <tab.icon size={16} /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* --- GENERAL NOTICE CLASS SELECTOR --- */}
                {activeTab === 'general' && (
                    <div className="bg-white dark:bg-[#151515] p-5 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Notify Classes</label>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => setSelectedClasses(prev => prev.includes('all') ? [] : ['all'])} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedClasses.includes('all') ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>All Classes</button>
                            {!selectedClasses.includes('all') && data.classes.map(c => (
                                <button key={c.id} onClick={() => setSelectedClasses(prev => prev.includes(c.id) ? prev.filter(id=>id!==c.id) : [...prev, c.id])} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedClasses.includes(c.id) ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>{c.name}</button>
                            ))}
                        </div>
                    </div>
                )}

                <AnimatePresence>
                    {items.map((item, index) => (
                        <motion.div key={item.id} initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, height:0}} className="bg-white dark:bg-[#151515] rounded-[2rem] p-5 shadow-sm border border-gray-100 dark:border-gray-800 relative">
                            
                            {/* Delete Row Button */}
                            {items.length > 1 && (
                                <button onClick={() => removeRow(item.id)} className="absolute -top-3 -right-3 bg-red-100 text-red-600 p-2 rounded-full shadow-md"><X size={14}/></button>
                            )}

                            {/* 1. SUBJECT SELECTOR (CW/HW Only) */}
                            {['classwork', 'homework'].includes(activeTab) && (
                                <div className="mb-4">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Subject</label>
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                        {data.subjects.map(sub => (
                                            <button key={sub.code} onClick={() => updateItem(item.id, 'subject', sub.code)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${item.subject === sub.code ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-[#1a1a1a] text-gray-500 border border-transparent'}`}>
                                                {sub.name}
                                            </button>
                                        ))}
                                        {data.subjects.length === 0 && <span className="text-xs text-red-500">No subjects mapped to this class.</span>}
                                    </div>
                                </div>
                            )}

                            {/* 2. DEFAULTER SELECTOR */}
                            {activeTab === 'defaulter' && (
                                <div className="mb-4">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex justify-between">
                                        <span>Select Defaulters</span><span className="text-red-500">{item.students.length} Selected</span>
                                    </label>
                                    <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                                        {data.students.map(stu => (
                                            <label key={stu.id} className="flex items-center justify-between p-2 rounded-lg border border-gray-50 dark:border-gray-800 cursor-pointer">
                                                <div className="flex items-center gap-2">
                                                    <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${stu.profile_pic}`} className="w-6 h-6 rounded-full object-cover" />
                                                    <span className="text-xs font-bold dark:text-white">{stu.name}</span>
                                                </div>
                                                <input type="checkbox" checked={item.students.includes(stu.id)} onChange={(e) => {
                                                    const newArr = e.target.checked ? [...item.students, stu.id] : item.students.filter(id => id !== stu.id);
                                                    updateItem(item.id, 'students', newArr);
                                                }} className="w-4 h-4"/>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 3. TEXT EDITOR */}
                            <div className="bg-gray-50 dark:bg-[#1a1a1a] p-4 rounded-2xl mb-4">
                                <input type="text" placeholder={activeTab === 'defaulter' ? "Issue (e.g. No Copy)" : "Title (Optional)"} value={item.heading} onChange={e => updateItem(item.id, 'heading', e.target.value)} className="w-full bg-transparent font-black text-gray-900 dark:text-white outline-none mb-2 placeholder-gray-400" />
                                {activeTab !== 'defaulter' && (
                                    <div className="relative">
                                        <textarea rows={3} placeholder="Type description or tap mic to speak..." value={item.content} onChange={e => updateItem(item.id, 'content', e.target.value)} className="w-full bg-transparent text-sm text-gray-600 dark:text-gray-300 outline-none resize-none pr-10" />
                                        {/* THE VOICE DICTATION MIC BUTTON */}
                                        <button onClick={() => toggleDictation(item.id, item.content)} className={`absolute bottom-2 right-0 p-2 rounded-full shadow-md transition-all ${listeningId === item.id ? 'bg-red-500 text-white animate-pulse' : 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400'}`}>
                                            {listeningId === item.id ? <MicOff size={16}/> : <Mic size={16}/>}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* 4. ATTACHMENTS (Camera/Gallery) */}
                            {activeTab !== 'defaulter' && (
                                <div>
                                    <div className="flex gap-2 mb-3">
                                        <label className="flex-1 flex items-center justify-center gap-2 bg-blue-100/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-3 rounded-xl cursor-pointer text-xs font-bold transition-all active:scale-95">
                                            <Camera size={16} /> Take Photo
                                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileChange(e, item.id)} />
                                        </label>
                                        <label className="flex-1 flex items-center justify-center gap-2 bg-purple-100/50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 p-3 rounded-xl cursor-pointer text-xs font-bold transition-all active:scale-95">
                                            <Paperclip size={16} /> Attach Files
                                            <input type="file" className="hidden" onChange={(e) => handleFileChange(e, item.id)} multiple />
                                        </label>
                                    </div>
                                    {item.attachments.length > 0 && (
                                        <div className="flex gap-2 overflow-x-auto pb-1">
                                            {item.attachments.map((att, attIdx) => (
                                                <div key={attIdx} className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gray-200">
                                                    {att.isImage ? <img src={att.url} className="w-full h-full object-cover" /> : <FileText size={20} className="text-gray-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"/>}
                                                    <button onClick={() => removeAttachment(item.id, attIdx)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"><X size={10}/></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* ADD ANOTHER ROW BUTTON */}
                <button onClick={addRow} className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                    <Plus size={18} /> Add Another Item
                </button>
            </div>

            {/* FIXED BOTTOM SUBMIT BAR */}
            <div className="fixed bottom-16 left-0 w-full dark:bg-[#151515] p-0 border-t border-gray-200 dark:border-gray-800 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-50">
                <div className="max-w-lg mx-auto bg-[#F2F6FA] dark:bg-[#151515] p-1">
                    <button onClick={handleSubmit} disabled={submitting} className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 active:scale-[0.98] transition-transform">
                        {submitting ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Send size={20}/> Publish {items.length} Update{items.length > 1 ? 's' : ''}</>}
                    </button>
                </div>
            </div>
        </div>
    );
}