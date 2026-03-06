"use client";
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Printer, ArrowLeft, Calendar } from 'lucide-react';
import Link from 'next/link';

// --- HELPER: Detect if Class is Junior ---
const isJuniorClass = (className) => {
    const n = (className || '').toLowerCase();
    return n.includes('nursery') || n.includes('k1') || n.includes('k2') || n.includes('lkg') || n.includes('ukg') || n.includes('play');
};

export default function PrintReportPage() {
    const searchParams = useSearchParams();
    const classId = searchParams.get('class_id');
    const examId = searchParams.get('exam_id');
    const studentId = searchParams.get('student_id');

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const today = new Date();
    const formattedToday = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const [reportDate, setReportDate] = useState(formattedToday);

    useEffect(() => {
        const fetchCards = async () => {
            if (!classId || !examId) return;
            const fd = new FormData();
            fd.append('action', 'generate_class_reports');
            fd.append('class_id', classId);
            fd.append('exam_id', examId);
            if (studentId) fd.append('student_id', studentId);

            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/report_card.php`, { method: 'POST', body: fd });
                const text = await res.text();
                const match = text.match(/\{[\s\S]*\}/);
                if (match) {
                    const json = JSON.parse(match[0]);
                    if (json.status === 'success') setData(json);
                }
            } catch (e) { console.error(e); }
            setLoading(false);
        };
        fetchCards();
    }, [classId, examId, studentId]);

    const handlePrint = () => window.print();

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-100"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
    if (!data || data.cards.length === 0) return <div className="text-center p-10 font-bold bg-gray-100 min-h-screen">No report cards found for this selection.</div>;

    const part2A = ['Work Education', 'Art Education', 'Health and Physical Education', 'ICT Skills'];
    const part2B = ['Regularity and Punctuality', 'Behaviour and Value', 'Attitude towards Teachers', 'Attitude towards School Mates'];

    return (
        <div className="bg-gray-100 min-h-screen pb-10 flex flex-col">
            
            {/* FLOATING ACTION BAR (HIDDEN DURING PRINT) */}
            <div className="print:hidden sticky top-0 left-0 w-full bg-white shadow-md p-4 flex justify-between items-center z-50">
                <div className="flex items-center gap-4">
                    <button onClick={() => window.history.back()} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><ArrowLeft size={20}/></button>
                    <div>
                        <h1 className="font-black text-lg">Report Card Engine</h1>
                        <p className="text-xs text-gray-500">Class {data.class_name} • {data.exam_name}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
                        <Calendar size={16} className="text-gray-500" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Issue Date:</span>
                        <input type="text" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="bg-transparent font-bold text-sm outline-none w-24 text-center text-blue-800"/>
                    </div>
                    <button onClick={handlePrint} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg active:scale-95 text-sm transition-transform">
                        <Printer size={16} /> <span className="hidden sm:inline">Print {studentId ? 'Report' : `All (${data.cards.length})`}</span><span className="sm:hidden">Print</span>
                    </button>
                </div>
            </div>

            {/* PRINTABLE PAGES WRAPPER */}
            <div className="w-full overflow-x-auto pt-6 px-4 print:p-0 print:overflow-visible flex-1 custom-scrollbar">
                
                {/* CSS TO FORCE PERFECT A4 PRINTING AND HIDE APP NAVIGATION */}
                <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                        @page { size: A4 portrait; margin: 0; }
                        body, html { margin: 0 !important; padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        body * { visibility: hidden; }
                        #print-root, #print-root * { visibility: visible; }
                        #print-root { position: absolute; top: 0; left: 0; width: 100%; }
                        nav, footer, aside, [class*="bottom-nav"], [class*="fixed bottom-0"] { display: none !important; }
                        .page-break { page-break-after: always; page-break-inside: avoid; width: 210mm; height: 296.5mm; margin: 0 !important; box-shadow: none !important; border: none !important; position: relative; overflow: hidden; }
                    }
                `}} />

                <div id="print-root" className="flex flex-col items-center gap-8 print:gap-0 print:block">
                    {data.cards.map((card, idx) => {
                        // Dynamically render Playful Junior Theme or Standard Theme based on Class Name!
                        if (isJuniorClass(data.class_name)) {
                            return <JuniorReportCard key={idx} data={data} card={card} reportDate={reportDate} part2A={part2A} part2B={part2B} />;
                        } else {
                            return <StandardReportCard key={idx} data={data} card={card} reportDate={reportDate} part2A={part2A} part2B={part2B} />;
                        }
                    })}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// COMPONENT 1: THE PLAYFUL JUNIOR THEME (For Nursery, K1, K2)
// ============================================================================
function JuniorReportCard({ data, card, reportDate, part2A, part2B }) {
    return (
        <div className="page-break w-[210mm] min-w-[210mm] h-[296.5mm] bg-[#fffaf0] relative flex flex-col shadow-2xl print:shadow-none box-border p-2">
            
            {/* Playful Dotted & Rounded Borders */}
            <div className="absolute inset-[10px] border-[14px] border-pink-400 rounded-[3rem] z-0 opacity-90"></div>
            <div className="absolute inset-[28px] border-[6px] border-dashed border-cyan-400 rounded-[2.5rem] bg-white/60 z-0"></div>

            {/* CONTENT WRAPPER */}
            <div className="relative z-10 px-12 pt-12 pb-10 flex-1 flex flex-col">
                
                {/* Cute Header */}
                <div className="flex items-start justify-between mb-5 border-b-[3px] border-dashed border-pink-300 pb-4">
                    <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}GMPSimages/logo.png`} className="w-24 h-24 object-contain shrink-0 drop-shadow-md" alt="Logo" />
                    
                    <div className="text-center flex-1 px-4 overflow-hidden pt-1">
                        <h1 className="text-[1.4rem] font-black text-pink-600 uppercase tracking-widest font-sans leading-none whitespace-nowrap drop-shadow-sm">Govind Madhav Public School</h1>
                        <p className="text-[10px] font-bold text-cyan-700 uppercase mt-1.5 tracking-widest">Gondey, Pratapgarh, UP-230403</p>
                        <p className="text-[9px] font-bold text-purple-600 mt-0.5 tracking-wide">+91 99846 61166 | info@govindmadhav.com</p>
                        <div className="inline-block mt-2">
                            <h2 className="text-sm font-black bg-gradient-to-r from-yellow-300 to-yellow-400 text-purple-900 px-6 py-1.5 rounded-full border-4 border-yellow-200 shadow-md uppercase">
                                Report Card: {data.exam_name}
                            </h2>
                        </div>
                    </div>
                    
                    {/* NEW: SESSION BADGE OPPOSITE LOGO */}
                    <div className="w-24 shrink-0 flex justify-end pt-2">
                        <div className="bg-cyan-100 text-cyan-900 text-[10px] font-black px-3 py-1.5 rounded-xl border-2 border-cyan-300 shadow-sm text-center leading-tight transform rotate-2">
                            SESSION<br/><span className="text-xs text-pink-600">2026-27</span>
                        </div>
                    </div>
                </div>

                {/* Bubbly Student Info Container */}
                <div className="flex justify-between items-center mb-6 bg-pink-50 rounded-[2rem] border-4 border-pink-100 p-4 shadow-inner">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-[12px] font-bold text-purple-900 flex-1">
                        <div className="flex justify-between border-b-2 border-dotted border-pink-200 pb-0.5"><span>Student:</span> <span className="uppercase text-pink-600 font-black">{card.student.name}</span></div>
                        <div className="flex justify-between border-b-2 border-dotted border-pink-200 pb-0.5"><span>Class:</span> <span className="uppercase">{data.class_name}</span></div>
                        <div className="flex justify-between border-b-2 border-dotted border-pink-200 pb-0.5"><span>Father:</span> <span className="uppercase text-gray-700">Mr. {card.student.father_name}</span></div>
                        <div className="flex justify-between border-b-2 border-dotted border-pink-200 pb-0.5"><span>Roll No:</span> <span className="bg-white px-2 rounded-md border border-pink-200">{card.student.roll_no}</span></div>
                        <div className="flex justify-between border-b-2 border-dotted border-pink-200 pb-0.5"><span>Mother:</span> <span className="uppercase text-gray-700">Mrs. {card.student.mother_name}</span></div>
                        <div className="flex justify-between border-b-2 border-dotted border-pink-200 pb-0.5"><span>D.O.B:</span> <span className="text-cyan-700">{card.student.dob}</span></div>
                    </div>
                    {/* Bubbly Profile Photo */}
                    <div className="ml-6 w-[90px] h-[90px] rounded-full border-[4px] border-cyan-400 p-1 bg-white shrink-0 shadow-lg relative overflow-hidden rotate-2">
                        <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${card.student.profile_pic || 'GMPSimages/default_student.png'}`} className="w-full h-full object-cover rounded-full" alt="Student" />
                    </div>
                </div>

                {/* Playful Scholastic Table */}
                <div className="mb-6 bg-white rounded-3xl border-4 border-cyan-100 overflow-hidden shadow-sm">
                    <table className="w-full border-collapse text-center">
                        <thead>
                            <tr className="bg-cyan-100 text-cyan-900 font-black">
                                <th className="p-2 text-left pl-4 text-sm border-b-2 border-r-2 border-cyan-200">📚 Learning Areas</th>
                                <th colSpan={data.is_ut ? "2" : "6"} className="p-2 text-sm border-b-2 border-cyan-200 uppercase">{data.exam_name} Performance</th>
                            </tr>
                            <tr className="bg-pink-100 text-[10px] uppercase font-black text-pink-900 leading-tight">
                                <th className="p-2 text-left pl-4 border-b-2 border-r-2 border-pink-200">Subject</th>
                                {data.is_ut ? (
                                    <>
                                        <th className="p-2 border-b-2 border-pink-200 border-r-2">Marks (20)</th>
                                        <th className="p-2 border-b-2 border-pink-200">Grade</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="p-2 border-b-2 border-pink-200 border-r-2 w-11">PT<br/>(10)</th>
                                        <th className="p-2 border-b-2 border-pink-200 border-r-2 w-11">Note<br/>Book</th>
                                        <th className="p-2 border-b-2 border-pink-200 border-r-2 w-11">Sub.<br/>Enrich</th>
                                        <th className="p-2 border-b-2 border-pink-200 border-r-2 w-11">Exam<br/>(80)</th>
                                        <th className="p-2 border-b-2 border-pink-200 border-r-2 w-14 text-purple-700">Total<br/>(100)</th>
                                        <th className="p-2 border-b-2 border-pink-200">Grade</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {card.marks.map((m, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-orange-50/50'}>
                                    <td className="p-1.5 text-left pl-4 font-black uppercase text-[11px] text-purple-900 border-r-2 border-b border-gray-100">{m.subject}</td>
                                    {data.is_ut ? (
                                        <>
                                            <td className="p-1.5 font-bold text-[13px] border-r-2 border-b border-gray-100">{m.total}</td>
                                            <td className="p-1.5 font-black text-[13px] text-pink-600 border-b border-gray-100">{m.grade}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="p-1.5 font-bold text-xs text-gray-700 border-r-2 border-b border-gray-100">{m.pt}</td>
                                            <td className="p-1.5 font-bold text-xs text-gray-700 border-r-2 border-b border-gray-100">{m.nb}</td>
                                            <td className="p-1.5 font-bold text-xs text-gray-700 border-r-2 border-b border-gray-100">{m.se}</td>
                                            <td className="p-1.5 font-bold text-xs text-gray-700 border-r-2 border-b border-gray-100">{m.exam}</td>
                                            <td className="p-1.5 font-black text-xs text-blue-700 border-r-2 border-b border-gray-100">{m.total}</td>
                                            <td className="p-1.5 font-black text-xs text-pink-600 border-b border-gray-100">{m.grade}</td>
                                        </>
                                    )}
                                </tr>
                            ))}
                            <tr className="bg-yellow-100 uppercase font-black text-[11px] text-yellow-900 border-t-2 border-yellow-200">
                                <td className="p-2 text-left pl-4 border-r-2 border-yellow-200">🌟 Grand Total</td>
                                <td colSpan={data.is_ut ? "1" : "4"} className={`border-r-2 border-yellow-200 ${!data.is_ut && 'bg-white/50'}`}></td>
                                <td className="p-2 text-pink-600 text-xs border-r-2 border-yellow-200">{card.aggregates.grand_total}</td>
                                <td className="p-2 border-yellow-200"></td>
                            </tr>
                            <tr className="bg-yellow-200 uppercase font-black text-[11px] text-yellow-900 border-t border-yellow-300">
                                <td className="p-2 text-left pl-4 border-r-2 border-yellow-300">🎯 Percentage</td>
                                <td colSpan={data.is_ut ? "2" : "6"} className="p-2 text-left pl-4 text-purple-700 text-xs tracking-wider">
                                    {card.aggregates.percentage}%
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Co-Scholastic & Remarks Grid */}
                {!data.is_ut && (
                    <div className="flex gap-4 mb-4">
                        <div className="w-1/2 bg-white rounded-2xl border-4 border-green-100 overflow-hidden">
                            <table className="w-full text-[11px] text-center border-collapse">
                                <thead>
                                    <tr className="bg-green-100 text-green-900"><th className="p-1.5 text-left pl-2 font-black border-r border-b border-green-200">🎨 Activities</th><th className="p-1.5 border-b border-green-200 w-14">Grade</th></tr>
                                </thead>
                                <tbody>
                                    {part2A.map((skill, i) => (
                                        <tr key={skill} className="border-b border-gray-100 last:border-0"><td className="p-1 pl-2 text-left font-bold uppercase text-[9px] text-gray-700 border-r border-gray-100">{skill}</td><td className="p-1 font-black text-pink-500">{card.co_scholastic[skill] || '-'}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="w-1/2 bg-white rounded-2xl border-4 border-purple-100 overflow-hidden">
                            <table className="w-full text-[11px] text-center border-collapse">
                                <thead>
                                    <tr className="bg-purple-100 text-purple-900"><th className="p-1.5 text-left pl-2 font-black border-r border-b border-purple-200">🤝 Behaviour</th><th className="p-1.5 border-b border-purple-200 w-14">Grade</th></tr>
                                </thead>
                                <tbody>
                                    {part2B.map((skill, i) => (
                                        <tr key={skill} className="border-b border-gray-100 last:border-0"><td className="p-1 pl-2 text-left font-bold uppercase text-[9px] text-gray-700 border-r border-gray-100">{skill}</td><td className="p-1 font-black text-cyan-600">{card.co_scholastic[skill] || '-'}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Fun Remarks & Attendance */}
                <div className="border-[3px] border-dashed border-pink-300 rounded-2xl p-3 mb-6 mx-2 text-[13px] font-bold bg-white flex flex-col gap-1 shadow-sm">
                    <div className="flex justify-between">
                        <span className="text-purple-900">Teacher's Remarks: <span className="text-pink-600 font-black ml-2 font-serif text-[15px] italic">"{card.metadata.remarks || 'Keep shining!'}"</span></span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-purple-900">Attendance: <span className="text-cyan-700 ml-2 font-black">{card.metadata.attendance_present} / {card.metadata.attendance_total} Days</span></span>
                    </div>
                </div>

                {/* Signatures */}
                <div className="mt-auto pt-4 flex justify-between items-end px-6 text-[11px] font-black uppercase text-purple-800 relative">
                    <div className="text-center w-32 pt-2 relative">
                        <div className="absolute left-0 w-full"></div>
                        <span className="text-gray-900 text-[13px]">{reportDate}</span>
                        <div className="text-[9px] mb-5 m-2  border-t-2 border-dotted border-purple-300 text-purple-500">Date</div>
                    </div>
                    <div className="text-center w-36 pt-2 relative">
                        <div className="absolute -top-3 left-0 w-full border-t-2 border-dotted border-purple-300"></div>
                        Class Teacher
                    </div>
                    <div className="text-center w-36 pt-2 text-pink-600 relative">
                        <div className="absolute -top-3 left-0 w-full border-t-2 border-dotted border-purple-300"></div>
                        <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}GMPSimages/gmps_stamp.png`} className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 opacity-80 mix-blend-multiply pointer-events-none" alt="Stamp" />
                        <span className="relative z-10 bg-[#fffaf0]/80 px-2 rounded-lg py-0.5">Principal</span>
                    </div>
                    <div className="text-center w-36 pt-2 relative">
                        <div className="absolute -top-3 left-0 w-full border-t-2 border-dotted border-purple-300"></div>
                        Parent's Signature
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// COMPONENT 2: THE STANDARD CBSE THEME (For Class 1 to 12)
// ============================================================================
function StandardReportCard({ data, card, reportDate, part2A, part2B }) {
    return (
        <div className="page-break w-[210mm] min-w-[210mm] h-[296.5mm] bg-white relative flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.15)] print:shadow-none box-border">
            
            {/* THE DUAL BORDER */}
            <div className="absolute inset-[8px] border-[10px] border-orange-500 z-0"></div>
            <div className="absolute inset-[22px] border-[5px] border-yellow-400 z-0"></div>

            {/* CONTENT WRAPPER */}
            <div className="relative z-10 px-10 pt-12 pb-10 flex-1 flex flex-col">
                
                {/* HEADER: Logo + Details */}
                <div className="flex items-start justify-between mb-4 border-b-2 border-red-600 pb-3">
                    <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}GMPSimages/logo.png`} className="w-20 h-20 object-contain shrink-0" alt="Logo" />
                    
                    <div className="text-center flex-1 px-4 overflow-hidden pt-1">
                        <h1 className="text-[1.35rem] font-black text-red-600 uppercase tracking-widest font-serif leading-none whitespace-nowrap">Govind Madhav Public School</h1>
                        <p className="text-[10px] font-bold text-gray-800 uppercase mt-1 tracking-widest">Gondey, Pratapgarh, UP-230403</p>
                        <p className="text-[9px] font-bold text-gray-700 mt-0.5 tracking-wide">+91 99846 61166 | info@govindmadhav.com | www.govindmadhav.com</p>
                        <h2 className="text-sm font-bold bg-blue-100 text-blue-800 inline-block px-6 py-1 rounded-full mt-2 border border-blue-300 uppercase shadow-sm">
                            Report Card: {data.exam_name}
                        </h2>
                    </div>
                    
                    {/* NEW: SESSION BADGE OPPOSITE LOGO */}
                    <div className="w-20 shrink-0 flex justify-end pt-1">
                        <div className="text-right border-2 border-gray-200 bg-gray-50 px-2 py-1 rounded-lg shadow-sm">
                            <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">Session</p>
                            <p className="text-[11px] font-black text-blue-800 leading-none">2026-27</p>
                        </div>
                    </div> 
                </div>

                {/* STUDENT INFO + PROFILE PIC */}
                <div className="flex justify-between items-start mb-5">
                    <div className="grid grid-cols-2 gap-x-10 gap-y-2.5 text-[13px] font-bold text-gray-800 flex-1 pr-6 pt-2">
                        <div className="flex justify-between border-b border-gray-300 pb-0.5"><span>Student's Name:</span> <span className="uppercase text-blue-800">{card.student.name}</span></div>
                        <div className="flex justify-between border-b border-gray-300 pb-0.5"><span>Class/Section:</span> <span className="uppercase">{data.class_name}</span></div>
                        <div className="flex justify-between border-b border-gray-300 pb-0.5"><span>Father's Name:</span> <span className="uppercase">{card.student.father_name}</span></div>
                        <div className="flex justify-between border-b border-gray-300 pb-0.5"><span>Roll No:</span> <span>{card.student.roll_no}</span></div>
                        <div className="flex justify-between border-b border-gray-300 pb-0.5"><span>Mother's Name:</span> <span className="uppercase">{card.student.mother_name}</span></div>
                        <div className="flex justify-between border-b border-gray-300 pb-0.5"><span>D.O.B:</span> <span>{card.student.dob}</span></div>
                    </div>
                    
                    <div className="w-[85px] h-[85px] rounded-full border-[3px] border-gray-300 p-0.5 bg-white shrink-0 shadow-sm relative overflow-hidden">
                        <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${card.student.profile_pic || 'GMPSimages/default_student.png'}`} className="w-full h-full object-cover rounded-full" alt="Student" />
                    </div>
                </div>

                {/* CONDITIONAL RENDERING: UT vs TERM EXAM */}
                {data.is_ut ? (
                    <div className="mb-4">
                        <table className="w-full border-collapse border-2 border-black text-sm text-center">
                            <thead>
                                <tr className="bg-orange-100">
                                    <th className="border border-black p-2.5 text-left font-black text-base">Scholastic Performance</th>
                                    <th className="border border-black p-2.5 font-black text-red-600 uppercase text-base">Max Marks: 20</th>
                                    <th className="border border-black p-2.5 font-black text-blue-800 uppercase text-base">Grade</th>
                                </tr>
                            </thead>
                            <tbody>
                                {card.marks.map((m, i) => (
                                    <tr key={i}>
                                        <td className="border border-black p-2 text-left font-bold uppercase text-sm">{m.subject}</td>
                                        <td className="border border-black p-2 font-black text-base">{m.total}</td>
                                        <td className="border border-black p-2 font-black text-red-600 text-base">{m.grade}</td>
                                    </tr>
                                ))}
                                <tr className="bg-gray-100 uppercase font-black text-sm">
                                    <td className="border border-black p-2 text-left">Grand Total</td>
                                    <td className="border border-black p-2 text-blue-800 text-base">{card.aggregates.grand_total} / {card.aggregates.max_total}</td>
                                    <td className="border border-black p-2 bg-white"></td>
                                </tr>
                                <tr className="bg-gray-100 uppercase font-black text-sm">
                                    <td className="border border-black p-2 text-left">Percentage</td>
                                    <td colSpan="2" className="border border-black p-2 text-left pl-6 text-blue-800 bg-white text-base">
                                        {card.aggregates.percentage}%
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <>
                        <div className="mb-5">
                            <table className="w-full border-collapse border-2 border-black text-center">
                                <thead>
                                    <tr className="bg-orange-100">
                                        <th className="border border-black p-1.5 text-left w-[28%] font-black text-sm">PART I: Scholastic Areas</th>
                                        <th colSpan="6" className="border border-black p-1.5 font-black text-red-600 uppercase text-sm">{data.exam_name} (100)</th>
                                    </tr>
                                    <tr className="bg-gray-100 text-[10px] uppercase font-bold leading-tight">
                                        <th className="border border-black p-1 text-left pl-2">A. Subject</th>
                                        <th className="border border-black p-1 w-11">Periodic<br/>Test (10)</th>
                                        <th className="border border-black p-1 w-11">Note<br/>Book (5)</th>
                                        <th className="border border-black p-1 w-11">Sub.<br/>Enrich (5)</th>
                                        <th className="border border-black p-1 w-11">Exam<br/>(80)</th>
                                        <th className="border border-black p-1 w-14">Marks<br/>Obt. (100)</th>
                                        <th className="border border-black p-1 w-12">Grade</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {card.marks.map((m, i) => (
                                        <tr key={i}>
                                            <td className="border border-black p-1 text-left pl-2 font-bold uppercase text-[11px]">{m.subject}</td>
                                            <td className="border border-black p-1 text-blue-800 font-bold text-xs">{m.pt}</td>
                                            <td className="border border-black p-1 text-blue-800 font-bold text-xs">{m.nb}</td>
                                            <td className="border border-black p-1 text-blue-800 font-bold text-xs">{m.se}</td>
                                            <td className="border border-black p-1 text-blue-800 font-bold text-xs">{m.exam}</td>
                                            <td className="border border-black p-1 font-black text-xs">{m.total}</td>
                                            <td className="border border-black p-1 font-black text-red-600 text-xs">{m.grade}</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-100 uppercase font-black text-[11px]">
                                        <td className="border border-black p-1.5 text-left pl-2">Grand Total</td>
                                        <td colSpan="4" className="border border-black p-1.5 bg-white"></td>
                                        <td className="border border-black p-1.5 text-blue-800 text-xs">{card.aggregates.grand_total}</td>
                                        <td className="border border-black p-1.5"></td>
                                    </tr>
                                    <tr className="bg-gray-100 uppercase font-black text-[11px]">
                                        <td className="border border-black p-1.5 text-left pl-2">Percentage</td>
                                        <td colSpan="6" className="border border-black p-1.5 text-left pl-4 text-blue-800 bg-white text-xs">
                                            {card.aggregates.percentage}%
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* CO-SCHOLASTIC TABLES */}
                        <div className="flex gap-4 mb-5">
                            <table className="w-1/2 border-collapse border-2 border-black text-[11px]">
                                <thead>
                                    <tr className="bg-gray-100"><th className="border border-black p-1.5 text-left font-bold pl-2">Part II-A Co-scholastic Areas</th><th className="border border-black p-1.5 w-14 text-center">Grade</th></tr>
                                </thead>
                                <tbody>
                                    {part2A.map(skill => (
                                        <tr key={skill}><td className="border border-black p-1 pl-2 font-medium uppercase text-[10px]">{skill}</td><td className="border border-black p-1 text-center font-black text-blue-800 text-xs">{card.co_scholastic[skill] || '-'}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                            <table className="w-1/2 border-collapse border-2 border-black text-[11px]">
                                <thead>
                                    <tr className="bg-gray-100"><th className="border border-black p-1.5 text-left font-bold pl-2">Part II-B Co-Scholastic Areas</th><th className="border border-black p-1.5 w-14 text-center">Grade</th></tr>
                                </thead>
                                <tbody>
                                    {part2B.map(skill => (
                                        <tr key={skill}><td className="border border-black p-1 pl-2 font-medium uppercase text-[10px]">{skill}</td><td className="border border-black p-1 text-center font-black text-blue-800 text-xs">{card.co_scholastic[skill] || '-'}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* REMARKS & ATTENDANCE */}
                <div className="border border-black p-3 mb-8 text-[13px] font-bold bg-gray-50 flex flex-col gap-1.5 mx-4">
                    <div className="flex justify-between">
                        <span>Class Teacher's Remarks: <span className="text-blue-800 font-black ml-2 font-serif text-[15px] italic">{card.metadata.remarks || '-'}</span></span>
                    </div>
                    <div className="flex justify-between">
                        <span>Attendance: <span className="text-blue-800 ml-2 font-black">{card.metadata.attendance_present} / {card.metadata.attendance_total}</span></span>
                    </div>
                </div>

                {/* SIGNATURES */}
                <div className="mt-auto pt-6 border-t border-gray-300 flex justify-between items-end text-[11px] font-bold uppercase text-gray-500 relative px-8">
                    <div className="text-center mt-12 text-gray-900 font-black text-[13px]">
                        {reportDate}
                        <div className="text-[9px] border-t border-gray-400 w-32 pt-2.5 text-gray-400 mt-1 font-medium">Date</div>
                    </div>
                    <div className="text-center border-t border-gray-400 w-36 pt-2 mt-12">Class Teacher</div>
                    <div className="text-center border-t border-gray-400 w-36 pt-2 mt-12 text-red-600 relative">
                        <img src={`${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}GMPSimages/gmps_stamp.png`} className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 opacity-90 mix-blend-multiply pointer-events-none" alt="Stamp" />
                        <span className="relative z-10 bg-white/50 px-1 rounded">Principal</span>
                    </div>
                    <div className="text-center border-t border-gray-400 w-36 pt-2 mt-12">Parent's Signature</div>
                </div>

            </div>
        </div>
    );
}