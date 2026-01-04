"use client";
import { useEffect, useState } from 'react';
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, MapPin, Phone, User, Calendar as CalendarIcon, 
  ChevronLeft, ChevronRight , ChevronUp, ChevronDown, Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); 
  const [expandedExam, setExpandedExam] = useState(null); 
  const [selectedDay, setSelectedDay] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long' }));

  // Calendar State
  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/student.php`, {
          method: 'POST',
          body: JSON.stringify({ user_id: user?.id, role: user?.role })
        });
        const json = await res.json();
        if(json.status === 'success') setData(json.data);
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    }
    if (user) fetchData();
  }, [user]);

  // --- HELPER: Convert Image URL to Base64 (Using Proxy) ---
  const getImageData = async (dbPath) => {
    if (!dbPath) return null;
    // Use the PHP Proxy to bypass CORS
    const proxyUrl = `${process.env.NEXT_PUBLIC_API_URL}/proxy_image.php?path=${encodeURIComponent(dbPath)}`;
    try {
        const res = await fetch(proxyUrl);
        const blob = await res.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn("Image load failed", e);
        return null;
    }
  };

  // --- PDF GENERATION LOGIC ---
  const handleDownloadReport = async (exam) => {
     const doc = new jsPDF();
     const p = data.profile;
     const pageWidth = doc.internal.pageSize.getWidth();
     const pageHeight = doc.internal.pageSize.getHeight();
     
     // 1. Determine Style
     let style = 'Standard';
     const cls = p.class_name || '';
     if (cls.match(/Nur|K1|K2|LKG|UKG/i)) style = 'Playful';
     else if (cls.match(/^(6|7|8|9|10|11|12)/)) style = 'Professional';

     // 2. Load Images (Async via Proxy)
     // Note: dbPath is what is stored in DB, e.g. "GMPSimages/logo.png"
     const [logoBase64, profileBase64] = await Promise.all([
         getImageData('GMPSimages/GMPS.header.logo.png'), 
         getImageData(p.profile_pic)
     ]);

     // 3. Dynamic Session
     const curMonth = new Date().getMonth() + 1; 
     const curYear = new Date().getFullYear();
     const session = curMonth < 4 ? `${curYear-1}-${curYear}` : `${curYear}-${curYear+1}`;

     // --- HEADER (Universal) ---
     if (logoBase64) {
        // Logo Found: Draw it centered
        const imgProps = doc.getImageProperties(logoBase64);
        const imgWidth = 80;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        doc.addImage(logoBase64, 'PNG', (pageWidth - imgWidth)/2, 10, imgWidth, imgHeight);
        
        // Add Address below Logo just in case, or as subtitle
        doc.setFontSize(9); doc.setTextColor(100);
        // doc.text("Gondey, Pratapgarh, U.P.", pageWidth/2, 10 + imgHeight + 5, { align: 'center' }); // Optional if logo has it
     } else {
        // Fallback Text
        doc.setFontSize(18); doc.setTextColor(0); doc.setFont("helvetica", "bold");
        doc.text("GOVIND MADHAV PUBLIC SCHOOL", pageWidth/2, 20, { align: 'center' });
        doc.setFontSize(12); doc.setFont("helvetica", "normal");
        doc.text("Gondey, Pratapgarh, U.P.", pageWidth/2, 28, { align: 'center' });
     }

     // Session & Title
     const headerY = logoBase64 ? 38 : 40;
     doc.setFontSize(10); doc.setTextColor(100);
     doc.text(`Academic Session: ${session}`, pageWidth/2, headerY, { align: 'center' });
     
     doc.setFontSize(12); doc.setTextColor(0); doc.setFont("helvetica", "bold");
     doc.text(`REPORT CARD: ${exam.name.toUpperCase()}`, pageWidth/2, headerY + 8, { align: 'center' });

     let yPos = headerY + 20;

     // --- STYLE: PLAYFUL (Colorful & Adjusted) ---
     if (style === 'Playful') {
         // Border
         doc.setDrawColor(255, 165, 0); 
         doc.setLineWidth(1.5);
         doc.rect(5, 5, pageWidth-10, pageHeight-10);
         
         // Profile Box (Widened & Heightened)
         doc.setFillColor(255, 250, 224); 
         doc.roundedRect(10, yPos, pageWidth-20, 55, 3, 3, 'F');
         
         // Profile Pic
         if(profileBase64) {
             doc.addImage(profileBase64, 'JPEG', 15, yPos+7, 40, 40);
         } else {
             doc.setDrawColor(200); doc.setFillColor(255);
             doc.rect(15, yPos+7, 40, 40, 'FD'); // Placeholder
         }

         doc.setFontSize(10); doc.setTextColor(0, 100, 0); doc.setFont("helvetica", "bold");
         const col1 = 60, col2 = 120;
         const lineGap = 9;
         
         // Left Column
         doc.text(`Name:`, col1, yPos+12); doc.setTextColor(0); doc.text(p.name, col1+15, yPos+12);
         
         doc.setTextColor(0,100,0);
         doc.text(`Class:`, col1, yPos+12 + lineGap); doc.setTextColor(0); doc.text(p.class_name, col1+15, yPos+12 + lineGap);
         
         doc.setTextColor(0,100,0);
         doc.text(`Roll No:`, col1, yPos+12 + lineGap*2); doc.setTextColor(0); doc.text(p.roll_no||'-', col1+15, yPos+12 + lineGap*2);
         
         doc.setTextColor(0,100,0);
         doc.text(`DOB:`, col1, yPos+12 + lineGap*3); doc.setTextColor(0); doc.text(p.dob||'-', col1+15, yPos+12 + lineGap*3);
         
         // Right Column
         doc.setTextColor(0,100,0);
         doc.text(`Father:`, col2, yPos+12); doc.setTextColor(0); doc.text(p.father_name, col2+18, yPos+12);
         
         doc.setTextColor(0,100,0);
         doc.text(`Mother:`, col2, yPos+12 + lineGap); doc.setTextColor(0); doc.text(p.mother_name, col2+18, yPos+12 + lineGap);
         
         doc.setTextColor(0,100,0);
         doc.text(`Teacher:`, col2, yPos+12 + lineGap*2); doc.setTextColor(0); 
         // Allow more space for teacher name
         doc.text(p.teacher_name, col2+18, yPos+12 + lineGap*2, { maxWidth: 50 }); 

         // Table
         autoTable(doc, {
             startY: yPos + 60,
             head: [['Subject', 'Marks', 'Total']],
             body: exam.subjects.map(s => [s.subject, s.marks_obtained, exam.max_marks_per_sub]),
             theme: 'grid',
             headStyles: { fillColor: [255, 105, 180], textColor: 255, fontSize: 11, halign: 'center' }, 
             styles: { fontSize: 10, cellPadding: 5, halign: 'center' },
             foot: [['Total', exam.total_obtained, exam.max_marks_per_sub * exam.subjects.length]],
             footStyles: { fillColor: [255, 228, 181], textColor: 0, fontStyle: 'bold' }
         });
     } 
     
     // --- STYLE: STANDARD (Clean Blue) ---
     else if (style === 'Standard') {
         doc.setDrawColor(200); doc.setLineWidth(0.5);
         doc.rect(15, yPos, pageWidth-30, 50);
         
         if(profileBase64) {
             doc.addImage(profileBase64, 'JPEG', pageWidth - 45, yPos+5, 35, 40);
         }

         doc.setFontSize(10); doc.setTextColor(50);
         const lineH = 10;
         
         // Left
         doc.text(`Name:`, 20, yPos+12);  doc.setFont("helvetica", "bold"); doc.text(p.name, 45, yPos+12);
         doc.setFont("helvetica", "normal");
         
         doc.text(`Class:`, 20, yPos+12+lineH); doc.setFont("helvetica", "bold"); doc.text(p.class_name, 45, yPos+12+lineH);
         doc.setFont("helvetica", "normal");
         
         doc.text(`Roll No:`, 20, yPos+12+lineH*2); doc.text(`${p.roll_no||'-'}`, 45, yPos+12+lineH*2);
         doc.text(`DOB:`, 20, yPos+12+lineH*3); doc.text(`${p.dob||'-'}`, 45, yPos+12+lineH*3);
         
         // Middle
         doc.text(`Father:`, 90, yPos+12); doc.text(p.father_name, 110, yPos+12);
         doc.text(`Mother:`, 90, yPos+12+lineH); doc.text(p.mother_name, 110, yPos+12+lineH);
         doc.text(`Teacher:`, 90, yPos+12+lineH*2); doc.text(p.teacher_name, 110, yPos+12+lineH*2);

         autoTable(doc, {
             startY: yPos + 60,
             head: [['Subject', 'Marks Obtained', 'Max Marks']],
             body: exam.subjects.map(s => [s.subject, s.marks_obtained, exam.max_marks_per_sub]),
             theme: 'striped',
             headStyles: { fillColor: [65, 105, 225], halign: 'center' },
             styles: { halign: 'center', cellPadding: 4 },
             foot: [['Grand Total', exam.total_obtained, exam.max_marks_per_sub * exam.subjects.length]],
             footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' }
         });
     }

     // --- STYLE: PROFESSIONAL (Minimalist) ---
     else {
         doc.setDrawColor(0); doc.setLineWidth(0.2);
         doc.line(15, yPos, pageWidth-15, yPos); 
         doc.line(15, yPos+50, pageWidth-15, yPos+50); 
         
         if(profileBase64) {
             doc.addImage(profileBase64, 'JPEG', pageWidth - 45, yPos+5, 30, 40);
         }

         doc.setFont("times", "normal"); doc.setFontSize(11); doc.setTextColor(0);
         
         const col1 = 20, col2 = 60, col3 = 100, col4 = 140;
         const r1=yPos+12, r2=yPos+24, r3=yPos+36;

         doc.text("Name:", col1, r1); doc.setFont("times", "bold"); doc.text(p.name.toUpperCase(), col2, r1); doc.setFont("times", "normal");
         doc.text("Class:", col1, r2); doc.text(p.class_name, col2, r2);
         doc.text("Roll No:", col1, r3); doc.text(`${p.roll_no||'-'}`, col2, r3);

         doc.text("Father:", col3, r1); doc.text(p.father_name, col4, r1);
         doc.text("Teacher:", col3, r2); doc.text(p.teacher_name, col4, r2);
         doc.text("DOB:", col3, r3); doc.text(`${p.dob||'-'}`, col4, r3);

         autoTable(doc, {
             startY: yPos + 60,
             head: [['SUBJECT', 'OBTAINED MARKS', 'MAX MARKS']],
             body: exam.subjects.map(s => [s.subject, s.marks_obtained, exam.max_marks_per_sub]),
             theme: 'plain',
             styles: { fontSize: 10, font: 'times', lineColor: 0, lineWidth: 0.1, halign: 'center' },
             headStyles: { fillColor: 255, textColor: 0, fontStyle: 'bold', lineWidth: 0.2, lineColor: 0 },
             foot: [['TOTAL', exam.total_obtained, exam.max_marks_per_sub * exam.subjects.length]],
             footStyles: { fontStyle: 'bold', textColor: 0, lineWidth: 0.2, lineColor: 0, fillColor: 245 }
         });
     }

     // 5. Footer (Universal)
     const finalY = doc.lastAutoTable.finalY + 30;
     doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(0);
     doc.text("Class Teacher", 20, finalY);
     doc.setFont("helvetica", "normal"); 
     doc.text(p.teacher_name, 20, finalY + 5);

     doc.setFontSize(8); doc.setTextColor(150);
     doc.text("This is a computer-generated report card authorized by Govind Madhav Public School.", pageWidth/2, pageHeight - 10, { align: 'center' });
     
     // Save
     doc.save(`${p.name}_${exam.name}_Report.pdf`);
  };

  // --- CALENDAR LOGIC ---

  const renderCalendar = () => {
      const daysCount = getDaysInMonth(calMonth, calYear);
      const firstDay = getFirstDayOfMonth(calMonth, calYear);
      const days = [];

      // Empty slots for alignment
      for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} />);

      // Days generation
      for (let d = 1; d <= daysCount; d++) {
          const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const status = data?.attendance_map?.[dateStr]; // 'present', 'absent', 'holiday'
          const dateObj = new Date(calYear, calMonth, d);
          const isSunday = dateObj.getDay() === 0;
          const isToday = dateStr === new Date().toISOString().split('T')[0];

          let bgColor = "bg-gray-50 dark:bg-gray-800 text-gray-700";
          
          if (status === 'present') bgColor = "bg-green-100 text-green-700 border border-green-200";
          else if (status === 'absent') bgColor = "bg-red-100 text-red-700 border border-red-200";
          else if (status === 'holiday') bgColor = "bg-orange-100 text-orange-700 border border-orange-200";
          else if (isSunday) bgColor = "bg-gray-100 text-gray-400 opacity-50";

          if (isToday) bgColor += " ring-2 ring-blue-500 ring-offset-1";

          days.push(
              <div key={d} className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-bold ${bgColor}`}>
                  {d}
              </div>
          );
      }
      return days;
  };

  // Calculate Monthly Stats for the VIEWED month
  const getMonthlyStats = () => {
      let p = 0, total = 0;
      const daysCount = getDaysInMonth(calMonth, calYear);
      
      for(let d=1; d<=daysCount; d++) {
          const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const status = data?.attendance_map?.[dateStr];
          
          if (status === 'present') { p++; total++; }
          else if (status === 'absent') { total++; }
          // Holidays and Sundays don't count towards 'Total Working Days' denominator
      }
      return { p, total, pct: total > 0 ? Math.round((p/total)*100) : 0 };
  };

  const currentStats = getMonthlyStats();

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#F2F6FA] dark:bg-[#0a0a0a]">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const p = data?.profile;
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  
  return (
    <div className="min-h-screen bg-[#F2F6FA] dark:bg-[#0a0a0a] text-gray-800 dark:text-gray-100 font-sans pb-24">
      
      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-5 py-4 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">My Profile</h1>
        <button onClick={logout} className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-full text-xs font-bold transition-colors hover:bg-red-100">
            <LogOut size={14} /> Logout
        </button>
      </div>

      <div className="px-4 mt-6">
        
        {/* --- IDENTITY CARD --- */}
        <div className="relative mb-8">
            <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-[2rem] p-6 text-white shadow-xl shadow-orange-500/25 relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full border-4 border-white/30 p-1 mb-3">
                        <img 
                            src={p?.profile_pic ? `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${p.profile_pic}` : `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}GMPSimages/default_student.png`} 
                            className="w-full h-full rounded-full object-cover bg-gray-200" 
                            alt="Profile"
                        />
                    </div>
                    <h2 className="text-2xl font-black leading-tight">{p?.name}</h2>
                    <p className="text-orange-100 text-sm font-medium mb-3">Roll No: {p?.roll_no || 'N/A'} | ID: {p?.login_id}</p>
                    <div className="flex gap-2 mb-4">
                        <span className="bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/10">Class {p?.class_name}</span>
                        <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/10">{p?.admission_year} Batch</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 w-full border border-white/10 flex items-center justify-between">
                        <div className="text-left">
                            <p className="text-[10px] opacity-70 uppercase tracking-wide font-bold">Class Teacher</p>
                            <p className="text-sm font-bold">{p?.teacher_name}</p>
                        </div>
                        {p?.teacher_contact && (
                            <a href={`tel:${p.teacher_contact}`} className="bg-white text-orange-600 p-2 rounded-full shadow-sm hover:scale-105 transition-transform">
                                <Phone size={16} fill="currentColor" />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* --- TABS --- */}
        <div className="flex p-1 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 mb-6">
            {['overview', 'academics', 'schedule'].map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg capitalize transition-all ${
                        activeTab === tab 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                    }`}
                >
                    {tab}
                </button>
            ))}
        </div>

        <AnimatePresence mode="wait">
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white dark:bg-[#151515] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col items-center text-center">
                            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{data?.stats?.last_month_percent}%</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Last Month Attendance</span>
                        </div>
                        <div className="bg-white dark:bg-[#151515] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col items-center text-center">
                            <span className="text-xl font-bold text-gray-800 dark:text-gray-200 line-clamp-1">{data?.stats?.overall_percent}%</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Overall Attendance</span>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-[#151515] p-5 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Personal Details</h3>
                        <div className="space-y-4">
                            <InfoRow label="Father's Name" value={p?.father_name} icon={User} />
                            <InfoRow label="Mother's Name" value={p?.mother_name} icon={User} />
                            <InfoRow label="Contact" value={p?.contact} icon={Phone} />
                            <InfoRow label="Address" value={p?.address} icon={MapPin} />
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ACADEMICS TAB */}
            {activeTab === 'academics' && (
                <motion.div key="academics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                    <div className="bg-white dark:bg-[#151515] p-5 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <button onClick={() => { if(calMonth===0){ setCalMonth(11); setCalYear(calYear-1); } else { setCalMonth(calMonth-1); } }} className="p-1 hover:bg-gray-100 rounded-full"><ChevronLeft size={20}/></button>
                            <h3 className="text-sm font-bold uppercase tracking-widest">{new Date(calYear, calMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                            <button onClick={() => { if(calMonth===11){ setCalMonth(0); setCalYear(calYear+1); } else { setCalMonth(calMonth+1); } }} className="p-1 hover:bg-gray-100 rounded-full"><ChevronRight size={20}/></button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                            {['S','M','T','W','T','F','S'].map((d,i) => (<span key={i} className="text-[10px] font-bold text-gray-400">{d}</span>))}
                        </div>
                        <div className="grid grid-cols-7 gap-1.5">{renderCalendar()}</div>
                        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-bold text-gray-500">Monthly Attendance</span>
                                <span className="text-sm font-black text-blue-600">{currentStats.p} / {currentStats.total} Days</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${currentStats.pct}%` }}></div>
                            </div>
                            <div className="flex gap-4 mt-3 justify-center">
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-[10px] text-gray-500">Present</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-[10px] text-gray-500">Absent</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500"></div><span className="text-[10px] text-gray-500">Holiday</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest pl-2">Exam Results</h3>
                        {data?.exams?.map((exam) => (
                            <div key={exam.id} className="bg-white dark:bg-[#151515] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                                <div className="p-4 flex justify-between items-center cursor-pointer bg-gray-50 dark:bg-[#1a1a1a]" onClick={() => setExpandedExam(expandedExam === exam.id ? null : exam.id)}>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">{exam.name}</h4>
                                        <p className="text-[10px] text-gray-500">Total: {exam.total_obtained}</p>
                                    </div>
                                    {expandedExam === exam.id ? <ChevronUp size={18} className="text-gray-400"/> : <ChevronDown size={18} className="text-gray-400"/>}
                                </div>
                                {expandedExam === exam.id && (
                                    <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                                        {exam.is_published && (
                                            <button onClick={() => handleDownloadReport(exam)} className="w-full mb-4 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                                                <Download size={14} /> Download Report Card
                                            </button>
                                        )}
                                        <div className="space-y-2">
                                            {exam.subjects.map((sub, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-600 dark:text-gray-300 font-medium">{sub.subject}</span>
                                                    <span className="font-bold text-gray-900 dark:text-white">{sub.marks_obtained} <span className="text-gray-400 font-normal">/ {exam.max_marks_per_sub}</span></span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                         {(!data?.exams || data.exams.length === 0) && (
                             <p className="text-center text-gray-400 text-xs py-4">No exam results available.</p>
                         )}
                    </div>
                </motion.div>
            )}

            {/* SCHEDULE TAB */}
            {activeTab === 'schedule' && (
                <motion.div key="schedule" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar mb-2">
                        {daysOfWeek.map(day => (
                            <button key={day} onClick={() => setSelectedDay(day)} className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all ${selectedDay === day ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white' : 'bg-white dark:bg-[#151515] text-gray-500 border-gray-200 dark:border-gray-800'}`}>
                                {day.substring(0,3)}
                            </button>
                        ))}
                    </div>
                    <div className="bg-white dark:bg-[#151515] rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden min-h-[300px]">
                        <div className="p-4 bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-gray-800">
                             <h3 className="text-sm font-bold text-gray-800 dark:text-white">{selectedDay}'s Timetable</h3>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {data?.timetable?.[selectedDay] ? (
                                data.timetable[selectedDay].map((p, i) => (
                                    <div key={i} className="p-4 flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">{p.period}</div>
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{p.subject}</h4>
                                            <p className="text-[10px] text-gray-500">Period {p.period}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 text-gray-400"><CalendarIcon size={32} className="mb-2 opacity-50"/><p className="text-xs">No classes scheduled.</p></div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon: Icon }) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5 text-gray-400"><Icon size={16} /></div>
            <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">{label}</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value || 'N/A'}</p>
            </div>
        </div>
    );
}