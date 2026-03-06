"use client";
import React, { useEffect, useState, useRef } from 'react';
import * as faceapi from 'face-api.js';
import { Lock, Shield, ArrowLeft, Camera, Check, LogOut, ScanFace, ScanLine, Search, User, X, AlertTriangle, ChevronDown, Maximize } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TERMINAL_PIN = "62126636"; 
const SESSION_DURATION = 2 * 60 * 60 * 1000; 

export default function TerminalPage() {
    const [view, setView] = useState('locked'); 
    const [auth, setAuth] = useState(false);
    
    const [pinInput, setPinInput] = useState('');
    const [secureAction, setSecureAction] = useState(null); 
    const [alertModal, setAlertModal] = useState(null); 
    
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [teachers, setTeachers] = useState([]);
    const [stats, setStats] = useState({ total: 0, present: 0 });
    const [scanType, setScanType] = useState('in'); 
    const [statusMsg, setStatusMsg] = useState('');
    const [scanResult, setScanResult] = useState(null); // Combined Success/Error data
    const [selectedTeacher, setSelectedTeacher] = useState('');

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const scanIntervalRef = useRef(null);
    const isScanningRef = useRef(false); // RACE-CONDITION LOCK

    // --- ANTI-BACK BUTTON & HISTORY TRAP ---
    useEffect(() => {
        const blockBack = () => {
            window.history.pushState(null, '', window.location.href);
        };
        window.history.pushState(null, '', window.location.href);
        window.addEventListener('popstate', blockBack);
        return () => window.removeEventListener('popstate', blockBack);
    }, []);

    // --- SESSION MANAGEMENT ---
    useEffect(() => {
        const storedTime = localStorage.getItem('gmps_terminal_auth');
        if (storedTime && (Date.now() - parseInt(storedTime)) < SESSION_DURATION) {
            setAuth(true);
            setView('hub');
        } else {
            handleLogout();
        }

        const sessionChecker = setInterval(() => {
            const currentStored = localStorage.getItem('gmps_terminal_auth');
            if (currentStored && (Date.now() - parseInt(currentStored)) >= SESSION_DURATION) {
                handleLogout();
                setAlertModal({ title: "Session Expired", msg: "Security timeout. Please log in again.", type: "warning" });
            }
        }, 60000);

        return () => clearInterval(sessionChecker);
    }, []);

    const handleLogin = (val) => {
        if (val === TERMINAL_PIN) {
            localStorage.setItem('gmps_terminal_auth', Date.now().toString());
            setAuth(true);
            setView('hub');
            setPinInput('');
        } else {
            setAlertModal({ title: "Unauthorized", msg: "Incorrect PIN entered.", type: "error" });
            setPinInput('');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('gmps_terminal_auth');
        setAuth(false);
        setView('locked');
        stopCamera();
    };

    // --- DATA & MODELS ---
    useEffect(() => {
        if (auth) {
            fetchInitialData();
            loadModels();
        }
    }, [auth]);

    const fetchInitialData = async () => {
        try {
            const resT = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/terminal.php`, { method: 'POST', body: JSON.stringify({ action: 'get_teachers' }) });
            const jsonT = await resT.json();
            if (jsonT.status === 'success') setTeachers(jsonT.data);

            const resS = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/terminal.php`, { method: 'POST', body: JSON.stringify({ action: 'get_today_stats' }) });
            const jsonS = await resS.json();
            if (jsonS.status === 'success') setStats(jsonS.data);
        } catch (e) { console.error(e); }
    };

    const loadModels = async () => {
        try {
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
                faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                faceapi.nets.faceRecognitionNet.loadFromUri('/models')
            ]);
            setModelsLoaded(true);
        } catch (e) { console.error(e); }
    };

    // --- FULLSCREEN KIOSK ---
    const enableFullscreen = () => {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(e => console.error(e));
        }
    };

    // --- CAMERA & SCAN LOGIC ---
    const startCamera = async () => {
        setStatusMsg("Initializing Hardware...");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
            if (videoRef.current) videoRef.current.srcObject = stream;
            streamRef.current = stream;
        } catch (e) { setStatusMsg("Camera Access Denied."); }
    };

    const stopCamera = () => {
        isScanningRef.current = false;
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    };

    const beginLiveScan = async (type) => {
        if (!modelsLoaded) return setAlertModal({ title: "Loading", msg: "AI Models are still initializing.", type: "warning" });
        setScanType(type);
        setView('scan');
        await startCamera();
        
        const labeledDescriptors = teachers
            .filter(t => t.face_descriptor)
            .map(t => new faceapi.LabeledFaceDescriptors(t.id.toString(), [new Float32Array(JSON.parse(t.face_descriptor))]));

        if (labeledDescriptors.length === 0) {
            setStatusMsg("No faces registered yet.");
            return;
        }

        const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.45);
        setStatusMsg("Analyzing biometrics...");
        
        // OPEN THE LOCK
        isScanningRef.current = true;

        scanIntervalRef.current = setInterval(async () => {
            // If the lock is closed, do absolutely nothing (prevents double-firing)
            if (!videoRef.current || videoRef.current.readyState !== 4 || !isScanningRef.current) return;
            
            const detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();
            
            // Double check lock after the async promise resolves
            if (detection && isScanningRef.current) {
                const match = faceMatcher.findBestMatch(detection.descriptor);
                if (match.label !== 'unknown') {
                    // CLOSE THE LOCK IMMEDIATELY
                    isScanningRef.current = false; 
                    clearInterval(scanIntervalRef.current);
                    executePunch(match.label, type);
                } else {
                    setStatusMsg("Face not recognized.");
                }
            }
        }, 1000);
    };

    const executePunch = async (teacherId, type) => {
        setStatusMsg("Verifying Identity...");
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/terminal.php`, {
                method: 'POST', body: JSON.stringify({ action: 'punch', teacher_id: teacherId, type: type })
            });
            const json = await res.json();
            
            // Show combined result screen (success or error)
            setScanResult(json);
            setView('result');
            fetchInitialData(); 
            stopCamera();

            // --- AI VOICE ANNOUNCEMENT ---
            if ('speechSynthesis' in window) {
                let speechText = '';
                if (json.status === 'success') {
                    // Grab the first TWO words to include "Mr." or "Ms." plus their first name
                    const spokenName = json.name.split(' ').slice(0, 2).join(' ');
                    speechText = `Punch ${type === 'in' ? 'In' : 'Out'} successful, ${spokenName}.`;
                } else {
                    speechText = `Punch Denied. ${json.message}`;
                }
                const utterance = new SpeechSynthesisUtterance(speechText);
                utterance.rate = 1.0; 
                utterance.pitch = 1.1; 
                window.speechSynthesis.speak(utterance);
            }

            // Auto-close after 5 seconds hands-free
            setTimeout(() => {
                setScanResult(null);
                setView('selection');
            }, 5000);

        } catch (e) { 
            setAlertModal({ title: "Network Error", msg: "Failed to connect to server.", type: "error" });
            setView('selection');
            stopCamera();
        }
    };

    const executeFaceRegistration = async () => {
        setStatusMsg("Capturing mapping data...");
        const detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();
        if (!detection) return setAlertModal({ title: "Failed", msg: "No clear face detected. Ensure lighting is good.", type: "error" });

        const descStr = JSON.stringify(Array.from(detection.descriptor));
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/terminal.php`, {
                method: 'POST', body: JSON.stringify({ action: 'register_face', teacher_id: selectedTeacher, descriptor: descStr })
            });
            const json = await res.json();
            if (json.status === 'success') {
                setAlertModal({ title: "Success", msg: "Biometric Profile Updated.", type: "success" });
                fetchInitialData();
                setView('hub');
                stopCamera();
            }
        } catch (e) { setAlertModal({ title: "Error", msg: "Failed to save data.", type: "error" }); }
    };

    // --- REUSABLE COMPONENTS ---
    const UTArtsBadge = () => (
        <div className="flex items-center justify-center gap-3 bg-[#0A101C]/90 px-6 py-3 rounded-2xl backdrop-blur-xl border border-[#00F0FF]/30 mx-auto w-max shadow-[0_0_20px_rgba(0,240,255,0.15)] z-10 my-6">
            <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 bg-[#00F0FF] blur-md opacity-50 rounded-full"></div>
                <img src="https://www.utarts.in/images/UTArt_Logo.webp" alt="UT Arts" className="h-8 w-8 rounded-full object-cover border-2 border-[#00F0FF] relative z-10" />
            </div>
            <div className="flex flex-col text-left">
                <span className="text-[8px] text-[#00F0FF] font-mono tracking-[0.3em] uppercase leading-none mb-1">Architected & Secured By</span>
                <span className="text-sm text-white font-black tracking-widest uppercase leading-none">UT ARTS</span>
            </div>
        </div>
    );

    const SecurePinModal = () => {
        const [localPin, setLocalPin] = useState('');
        if (!secureAction) return null;
        return (
            <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="bg-[#0F192E] p-8 rounded-3xl border border-[#1E293B] shadow-2xl text-center w-full max-w-sm">
                    <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><Lock size={24}/></div>
                    <h3 className="text-xl font-black mb-2 text-white">{secureAction.title}</h3>
                    <p className="text-sm text-gray-400 mb-6">{secureAction.desc}</p>
                    <input 
                        type="password" inputMode="numeric" maxLength={8} 
                        value={localPin} onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            setLocalPin(val);
                            if (val.length === 8) {
                                if (val === TERMINAL_PIN) { setSecureAction(null); secureAction.onConfirm(); } 
                                else { setAlertModal({title: "Denied", msg: "Incorrect PIN", type:"error"}); setLocalPin(''); }
                            }
                        }}
                        className="w-full bg-[#060B14] border border-[#1E293B] rounded-xl p-4 text-center font-bold tracking-[0.5em] mb-6 outline-none text-xl focus:border-blue-500 text-white" 
                        placeholder="••••••••" autoFocus
                    />
                    <button onClick={() => setSecureAction(null)} className="w-full py-4 bg-gray-800 text-white rounded-xl font-bold">Cancel</button>
                </motion.div>
            </div>
        );
    };

    const AppAlertModal = () => {
        if (!alertModal) return null;
        const isErr = alertModal.type === 'error';
        const isWarn = alertModal.type === 'warning';
        return (
            <div className="absolute inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <motion.div initial={{y:20, opacity:0}} animate={{y:0, opacity:1}} className="bg-[#0F192E] border border-[#1E293B] w-full max-w-xs rounded-3xl p-6 text-center shadow-2xl">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isErr ? 'bg-red-500/20 text-red-500' : isWarn ? 'bg-orange-500/20 text-orange-500' : 'bg-green-500/20 text-green-500'}`}>
                        {isErr ? <X size={32}/> : isWarn ? <AlertTriangle size={32}/> : <Check size={32}/>}
                    </div>
                    <h3 className="text-xl font-black text-white mb-2">{alertModal.title}</h3>
                    <p className="text-sm text-gray-400 mb-6">{alertModal.msg}</p>
                    <button onClick={() => setAlertModal(null)} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl active:scale-95">Acknowledge</button>
                </motion.div>
            </div>
        );
    };

    const CustomDropdown = () => {
        const [isOpen, setIsOpen] = useState(false);
        const [search, setSearch] = useState('');
        const selectedObj = teachers.find(t => t.id.toString() === selectedTeacher);

        return (
            <div className="relative mb-6">
                <div onClick={() => setIsOpen(!isOpen)} className="w-full bg-[#1A2235] border border-[#2D3A54] rounded-xl py-4 px-4 text-sm font-bold text-white flex justify-between items-center cursor-pointer">
                    <span>{selectedObj ? selectedObj.name : 'Select Staff Member...'}</span>
                    <ChevronDown size={18} className="text-gray-400" />
                </div>
                <AnimatePresence>
                    {isOpen && (
                        <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="absolute top-full left-0 w-full mt-2 bg-[#0F192E] border border-[#1E293B] rounded-xl shadow-2xl z-50 overflow-hidden">
                            <div className="p-2 border-b border-[#1E293B] bg-[#0A101C]">
                                <input type="text" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full bg-[#1A2235] text-white p-3 rounded-lg outline-none text-xs" autoFocus />
                            </div>
                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                {teachers.filter(t => t.name.toLowerCase().includes(search.toLowerCase())).map(t => (
                                    <div key={t.id} onClick={() => { setSelectedTeacher(t.id.toString()); setIsOpen(false); setSearch(''); }} className={`p-4 text-sm cursor-pointer hover:bg-blue-600/20 border-b border-[#1E293B] last:border-0 flex justify-between ${selectedTeacher === t.id.toString() ? 'bg-blue-600/20 text-blue-400 font-bold' : 'text-gray-300'}`}>
                                        <span>{t.name}</span>
                                        {t.face_descriptor && <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded">Registered</span>}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    // --- GLOBAL KIOSK WRAPPER ---
    return (
        <div className="fixed inset-0 z-[9999] bg-[#060B14] text-white font-sans overflow-hidden flex flex-col select-none">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#22c55e08_1px,transparent_1px),linear-gradient(to_bottom,#22c55e08_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

            <SecurePinModal />
            <AppAlertModal />

            <AnimatePresence mode="wait">
                
                {/* VIEW 1: LOCKED PIN SCREEN */}
                {view === 'locked' && (
                    <motion.div key="locked" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
                        <div className="w-20 h-20 bg-[#0F192E] rounded-full flex items-center justify-center border border-[#1E293B] shadow-[0_0_30px_rgba(59,130,246,0.15)] mb-8">
                            <Lock size={32} className="text-blue-500" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-widest text-white mb-2">GMPS SECURE ACCESS</h1>
                        <p className="text-gray-400 text-xs mb-10">Enter your authorized PIN to continue</p>
                        
                        <div className="relative flex gap-2 justify-center mb-10 w-full max-w-sm">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className={`w-10 h-12 rounded-lg border flex items-center justify-center text-xl font-bold ${pinInput.length > i ? 'border-blue-500 text-blue-500 bg-blue-500/10' : 'border-[#1E293B] text-transparent bg-[#0F192E]'}`}>
                                    {pinInput.length > i ? '•' : ''}
                                </div>
                            ))}
                            <input 
                                type="tel" maxLength={8} autoFocus
                                className="absolute inset-0 w-full h-full opacity-0 cursor-text"
                                value={pinInput} onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    setPinInput(val);
                                    if(val.length === 8) handleLogin(val);
                                }}
                            />
                        </div>
                        <UTArtsBadge />
                    </motion.div>
                )}

                {/* VIEW 2: ADMIN HUB */}
                {view === 'hub' && (
                    <motion.div key="hub" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex-1 flex flex-col p-6 max-w-md mx-auto w-full relative z-10 h-full overflow-y-auto no-scrollbar">
                        <div className="flex justify-between items-center bg-[#0F192E] border border-[#1E293B] p-4 rounded-2xl mb-8 mt-6">
                            <div className="flex items-center gap-3">
                                <Shield size={24} className="text-blue-400" />
                                <div>
                                    <h2 className="text-sm font-bold text-white leading-none">Admin Hub</h2>
                                    <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-1">GMPS Terminal</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={enableFullscreen} className="text-gray-400 hover:text-white bg-[#1A2235] p-2 rounded-lg transition-colors" title="Go Fullscreen"><Maximize size={18}/></button>
                                <button onClick={() => setSecureAction({title:"Lock Terminal", desc:"Enter PIN to confirm logout.", onConfirm: handleLogout})} className="text-gray-400 hover:text-red-400 bg-red-500/10 p-2 rounded-lg transition-colors"><LogOut size={18}/></button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-[#0F192E] border border-[#1E293B] rounded-2xl p-5">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total Staff</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-3xl font-bold text-white">{stats.total}</span><User size={16} className="text-gray-600"/>
                                </div>
                            </div>
                            <div className="bg-[#0F192E] border border-[#1E293B] rounded-2xl p-5">
                                <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest mb-1">Present Today</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-3xl font-bold text-white">{stats.present}</span><Check size={16} className="text-green-500"/>
                                </div>
                            </div>
                        </div>

                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">Select Action</h3>
                        
                        <button onClick={() => setView('selection')} className="w-full bg-gradient-to-r from-[#075369] to-[#0A2E44] border border-[#0B7D9E] rounded-2xl p-6 flex flex-col items-start mb-4 shadow-[0_0_30px_rgba(11,125,158,0.2)] active:scale-[0.98] transition-transform relative overflow-hidden">
                            <ScanLine size={32} className="text-[#00F0FF] mb-3 opacity-80" />
                            <h2 className="text-lg font-bold text-white mb-1">Launch Live Terminal</h2>
                            <p className="text-xs text-[#00F0FF] opacity-70 text-left">Start facial recognition mode.</p>
                            <span className="mt-6 text-[10px] font-bold text-[#00F0FF] uppercase tracking-widest flex items-center gap-1">Initiate System <ArrowLeft size={12} className="rotate-180"/></span>
                        </button>

                        <button onClick={() => {setView('enrollment'); startCamera();}} className="w-full bg-[#0F192E] border border-[#1E293B] rounded-2xl p-6 flex flex-col items-start active:scale-[0.98] transition-transform">
                            <User size={24} className="text-gray-400 mb-3" />
                            <h2 className="text-lg font-bold text-white mb-1">Register Facial Data</h2>
                            <p className="text-xs text-gray-500 text-left">Enroll new employees or update profiles.</p>
                        </button>
                        
                        <UTArtsBadge />
                    </motion.div>
                )}

                {/* VIEW 3: BIOMETRIC ENROLLMENT */}
                {view === 'enrollment' && (
                    <motion.div key="enrollment" initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} className="flex-1 flex flex-col p-4 max-w-md mx-auto w-full relative z-10 bg-[#090E17]">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xs font-bold tracking-widest uppercase text-gray-300">Enrollment</h2>
                            <button onClick={() => {stopCamera(); setView('hub');}} className="p-2 bg-[#0F192E] rounded-full border border-[#1E293B] text-red-500"><X size={16}/></button>
                        </div>

                        <div className="relative w-full max-h-[40vh] aspect-square mx-auto bg-black rounded-3xl overflow-hidden border border-[#1E293B] mb-4">
                            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform -scale-x-100" />
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-500/20 border border-blue-500 text-blue-400 text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div> Face Detected
                            </div>
                            <div className="absolute inset-6 border-2 border-blue-500/30 rounded-2xl"></div>
                            <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
                            <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
                            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
                            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
                        </div>

                        <div className="bg-[#0F192E] border border-[#1E293B] rounded-3xl p-5 flex-1 flex flex-col justify-between">
                            <div>
                                <h3 className="text-base font-bold mb-1">Face Registration</h3>
                                <p className="text-[10px] text-gray-400 mb-4">Align subject within the frame.</p>
                                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Select Employee</p>
                                <CustomDropdown />
                            </div>
                            <button onClick={() => {
                                if(!selectedTeacher) return setAlertModal({title:"Missing Info", msg:"Select a teacher first.", type:"warning"});
                                setSecureAction({title: "Authorize Change", desc: "Enter PIN to save biometric data.", onConfirm: executeFaceRegistration});
                            }} className="w-full bg-blue-600 text-white rounded-xl py-3.5 font-bold flex justify-center items-center gap-2 active:scale-[0.98] transition-transform">
                                <ScanFace size={18} /> Capture & Save
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* VIEW 4: PUNCH SELECTION */}
                {view === 'selection' && (
                    <motion.div key="selection" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full relative z-10">
                        <div className="w-full flex justify-between items-center mb-36">
                            <div>
                                <h1 className="text-3xl font-black mb-1">Terminal</h1>
                                <p className="text-xs text-gray-400 uppercase tracking-widest text-green-500/80">Active Mode</p>
                            </div>
                            <button onClick={() => setSecureAction({title:"Exit Terminal", desc:"Enter PIN to return to Admin Hub.", onConfirm: () => setView('hub')})} className="p-3 bg-red-500/10 text-red-500 rounded-full border border-red-500/30 active:scale-95"><X size={20}/></button>
                        </div>

                        <button onClick={() => beginLiveScan('in')} className="w-full bg-[#22C55E] text-black rounded-3xl py-16 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(34,197,94,0.3)] mb-6 active:scale-[0.98] transition-transform">
                            <span className="text-5xl font-black tracking-tighter flex items-center gap-4"><ArrowLeft size={40} className="rotate-180 opacity-80" strokeWidth={4}/> PUNCH IN</span>
                        </button>

                        <button onClick={() => beginLiveScan('out')} className="w-full bg-[#0F192E] border border-red-500/30 text-white rounded-3xl py-8 flex flex-col items-center justify-center active:scale-[0.98] transition-transform">
                            <span className="text-2xl font-bold tracking-tighter flex items-center gap-3 text-red-400"><ArrowLeft size={24} className="opacity-80" strokeWidth={3}/> PUNCH OUT</span>
                        </button>
                        <UTArtsBadge />
                    </motion.div>
                )}

                {/* VIEW 5: LIVE SCAN */}
                {view === 'scan' && (
                    <motion.div key="scan" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex-1 flex flex-col p-4 relative z-10 h-full max-w-md mx-auto w-full">
                        <div className="flex justify-between items-center mb-4 px-2 mt-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-green-400">Live Feed</span>
                            </div>
                            <button onClick={() => setSecureAction({title:"Stop Camera", desc:"Enter PIN to abort scan and exit.", onConfirm: () => {stopCamera(); setView('selection');}})} className="p-2 bg-red-500/10 text-red-500 rounded-full border border-red-500/30"><X size={16}/></button>
                        </div>

                        <div className="flex-1 w-full bg-black rounded-[3rem] overflow-hidden relative border border-[#1E293B]">
                            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform -scale-x-100" />
                            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent z-10"></div>
                            <div className="absolute top-10 left-10 text-[8px] text-blue-500/50 font-mono tracking-widest z-10">SYS.ON <br/> FRM.RATE: 30 <br/> LCK.ST: SECURE</div>
                            <div className={`absolute top-0 left-0 w-full h-full border-t-2 animate-[scan_2s_ease-in-out_infinite] z-20 pointer-events-none ${scanType === 'in' ? 'border-green-500 bg-gradient-to-b from-green-500/10 to-transparent' : 'border-red-500 bg-gradient-to-b from-red-500/10 to-transparent'}`}></div>
                            
                            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-[#0F192E]/80 backdrop-blur-md border border-blue-500/30 px-6 py-3 rounded-full z-20 flex items-center gap-3">
                                <ScanFace size={18} className="text-blue-400 animate-pulse" />
                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest whitespace-nowrap">{statusMsg}</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* VIEW 6: AUTO-HANDLING RESULT MODAL (SUCCESS OR ERROR) */}
                {view === 'result' && scanResult && (
                    <motion.div key="result" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 bg-black/90 backdrop-blur-md">
                        <motion.div initial={{scale:0.9, y:20}} animate={{scale:1, y:0}} className={`bg-[#0F192E] border w-full max-w-sm rounded-[2rem] p-8 text-center relative overflow-hidden ${scanResult.status === 'success' ? 'border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.15)]' : 'border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.15)]'}`}>
                            
                            <div className="absolute top-4 left-4 bg-blue-600 text-[8px] font-bold uppercase px-2 py-1 rounded flex items-center gap-1"><Shield size={10}/> BIOAUTH</div>

                            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mt-8 mb-6 ${scanResult.status === 'success' ? 'bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]' : 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]'}`}>
                                {scanResult.status === 'success' ? <Check size={48} className="text-white" strokeWidth={3} /> : <X size={48} className="text-white" strokeWidth={3} />}
                            </div>
                            
                            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-1 ${scanResult.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                {scanResult.status === 'success' ? 'Scan Verified' : 'Access Denied'}
                            </p>
                            
                            <h2 className="text-2xl font-black text-white mb-1">
                                {scanResult.status === 'success' ? scanResult.name : 'Record Exists'}
                            </h2>
                            
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-8">
                                {scanResult.status === 'success' ? `PUNCH ${scanResult.type === 'in' ? 'IN' : 'OUT'} LOGGED` : scanResult.message}
                            </p>

                            <div className="flex bg-[#090E17] rounded-xl p-4 mb-6 border border-[#1E293B]">
                                <div className="flex-1 border-r border-[#1E293B]">
                                    <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-1">Action</p>
                                    <p className="text-sm font-bold text-white">{scanResult.status === 'success' ? `PUNCH ${scanResult.type.toUpperCase()}` : 'REJECTED'}</p>
                                </div>
                                <div className="flex-1">
                                    <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-1">Time</p>
                                    <p className={`text-sm font-bold ${scanResult.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>{scanResult.time || 'N/A'}</p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                @keyframes scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(1000px); } }
                body { overscroll-behavior: none; }
            `}</style>
        </div>
    );
}