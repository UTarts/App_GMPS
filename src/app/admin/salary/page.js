"use client";
import { useState, useEffect } from 'react';
import { useAppModal } from "../../../context/ModalContext";
import { IndianRupee, Save, Loader2, CheckCircle2 } from 'lucide-react';

export default function SalarySetupModule() {
    const { showModal } = useAppModal();
    const [activeTab, setActiveTab] = useState('teacher'); // 'teacher', 'staff', 'admin'
    
    const [users, setUsers] = useState([]);
    const [salaries, setSalaries] = useState({}); // Local state for input values
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php?action=get_all_salaries`);
        const json = await res.json();
        if(json.status === 'success') {
            setUsers(json.data);
            // Pre-fill local inputs with database values
            const initialSalaries = {};
            json.data.forEach(u => {
                initialSalaries[`${u.user_type}_${u.id}`] = u.monthly_salary;
            });
            setSalaries(initialSalaries);
        }
        setLoading(false);
    };

    const handleSalaryChange = (uid, type, val) => {
        setSalaries(prev => ({...prev, [`${type}_${uid}`]: val}));
    };

    const handleSaveAll = async () => {
        setSaving(true);
        // Prepare array of updates
        const updates = users.map(u => ({
            user_id: u.id,
            user_type: u.user_type,
            monthly_salary: salaries[`${u.user_type}_${u.id}`] || 0
        }));

        const fd = new FormData();
        fd.append('action', 'save_salaries');
        fd.append('updates', JSON.stringify(updates));

        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php`, { method: 'POST', body: fd });
        setSaving(false);
        showModal("Saved", "All salary structures updated successfully.", "success");
    };

    const filteredUsers = users.filter(u => u.user_type === activeTab);

    return (
        <div className="space-y-4">
            
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white dark:bg-[#151515] p-5 rounded-3xl border border-gray-100 dark:border-neutral-800 shadow-sm">
                <div>
                    <h2 className="text-lg font-black flex items-center gap-2"><IndianRupee size={20} className="text-emerald-500"/> Fixed Salary Setup</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">Master Payroll Mapping</p>
                </div>
                <button onClick={handleSaveAll} disabled={saving} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18}/>} Save All Changes
                </button>
            </div>

            {/* TABS */}
            <div className="flex gap-2 bg-white dark:bg-[#151515] p-1.5 rounded-2xl border border-gray-100 dark:border-neutral-800 shadow-sm overflow-x-auto">
                {['teacher', 'staff', 'admin'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 min-w-[100px] py-2.5 rounded-xl text-xs font-black capitalize transition-all ${activeTab === tab ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 shadow-sm border border-emerald-200 dark:border-emerald-800' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-neutral-900'}`}>
                        {tab}s
                    </button>
                ))}
            </div>

            {/* SALARY TABLE */}
            <div className="bg-white dark:bg-[#151515] border border-gray-100 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-neutral-900 border-b border-gray-100 dark:border-neutral-800 text-gray-500">
                                <th className="p-4 font-bold">Employee Name</th>
                                {activeTab === 'staff' && <th className="p-4 font-bold">Designation</th>}
                                <th className="p-4 font-bold text-right w-48">Monthly Salary (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                            {loading ? <tr><td colSpan="3" className="p-8 text-center text-gray-400">Loading...</td></tr> : 
                            filteredUsers.length === 0 ? <tr><td colSpan="3" className="p-8 text-center text-gray-400">No records found.</td></tr> : 
                            filteredUsers.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-neutral-900/50">
                                    <td className="p-4 font-bold text-gray-800 dark:text-gray-200">{u.name}</td>
                                    {activeTab === 'staff' && <td className="p-4 text-xs font-bold text-gray-500">{u.subtitle}</td>}
                                    <td className="p-4 text-right">
                                        <div className="relative flex items-center justify-end">
                                            <span className="absolute left-3 text-gray-400 font-bold z-10 hidden sm:block">₹</span>
                                            <input 
                                                type="number" 
                                                value={salaries[`${u.user_type}_${u.id}`] || ''}
                                                onChange={e => handleSalaryChange(u.id, u.user_type, e.target.value)}
                                                className="w-full sm:w-40 sm:pl-8 pr-4 py-2.5 bg-white dark:bg-black border-2 border-gray-200 dark:border-neutral-800 rounded-xl text-right font-black text-emerald-600 dark:text-emerald-400 focus:border-emerald-500 outline-none transition-colors"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}