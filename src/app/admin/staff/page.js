"use client";
import { useState, useEffect } from 'react';
import { Briefcase, Users, Trash2, Plus, X } from 'lucide-react';
import { useAppModal } from "../../../context/ModalContext";

export default function StaffManagementModule() {
    const { showModal } = useAppModal();
    const [activeTab, setActiveTab] = useState('directory'); // 'roles' or 'directory'
    
    const [roles, setRoles] = useState([]);
    const [staff, setStaff] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => { loadData(); }, [activeTab]);

    const loadData = async () => {
        const url = `${process.env.NEXT_PUBLIC_API_URL}/admin_data.php`;
        if (activeTab === 'roles') {
            const res = await fetch(`${url}?action=get_staff_roles`);
            const json = await res.json();
            if(json.status === 'success') setRoles(json.data);
        } else {
            const res = await fetch(`${url}?action=get_staff_users`);
            const json = await res.json();
            if(json.status === 'success') setStaff(json.data);
            
            // Also fetch roles for the add dropdown
            const rRes = await fetch(`${url}?action=get_staff_roles`);
            const rJson = await rRes.json();
            if(rJson.status === 'success') setRoles(rJson.data);
        }
    };

    const handleAddRole = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        fd.append('action', 'add_staff_role');
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php`, { method: 'POST', body: fd });
        e.target.reset();
        loadData();
    };

    const handleDelete = async (action, id) => {
        showModal("Confirm Delete", "Are you sure you want to delete this?", "danger", async () => {
            const fd = new FormData();
            fd.append('action', action);
            fd.append('id', id);
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php`, { method: 'POST', body: fd });
            loadData();
        });
    };

    const handleAddStaff = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        fd.append('action', 'add_staff_user');
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin_data.php`, { method: 'POST', body: fd });
        setIsAddModalOpen(false);
        loadData();
        showModal("Success", "Staff registered successfully.", "success");
    };

    const inputStyle = "w-full p-3 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl text-sm font-bold outline-none";

    return (
        <div className="space-y-4">
            {/* TABS */}
            <div className="flex gap-2 bg-white dark:bg-[#151515] p-1.5 rounded-2xl border border-gray-100 dark:border-neutral-800 shadow-sm">
                <button onClick={() => setActiveTab('directory')} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'directory' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-neutral-900'}`}>
                    <Users size={16}/> Staff Directory
                </button>
                <button onClick={() => setActiveTab('roles')} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'roles' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-neutral-900'}`}>
                    <Briefcase size={16}/> Roles / Designations
                </button>
            </div>

            {/* TAB: ROLES */}
            {activeTab === 'roles' && (
                <div className="bg-white dark:bg-[#151515] border border-gray-100 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900/50">
                        <form onSubmit={handleAddRole} className="flex gap-3">
                            <input name="title" placeholder="New Role Name (e.g. Driver, Guard)" className={inputStyle} required />
                            <button className="bg-emerald-600 text-white px-6 rounded-xl font-bold text-sm shrink-0">Add Role</button>
                        </form>
                    </div>
                    <div className="p-0">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-neutral-900 border-b border-gray-100 dark:border-neutral-800 text-gray-500">
                                    <th className="p-4 font-bold">Role Title</th>
                                    <th className="p-4 font-bold text-right w-24">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                                {roles.length === 0 ? <tr><td colSpan="2" className="p-8 text-center text-gray-400">No roles added yet.</td></tr> : 
                                roles.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-neutral-900/50">
                                        <td className="p-4 font-bold">{r.title}</td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => handleDelete('delete_staff_role', r.id)} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: DIRECTORY */}
            {activeTab === 'directory' && (
                <div className="bg-white dark:bg-[#151515] border border-gray-100 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center bg-gray-50 dark:bg-neutral-900/50">
                        <h3 className="font-black text-sm text-gray-800 dark:text-gray-200">Enrolled Staff</h3>
                        <button onClick={() => setIsAddModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md hover:bg-indigo-700">
                            <Plus size={16}/> Onboard Staff
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-neutral-900 border-b border-gray-100 dark:border-neutral-800 text-gray-500">
                                    <th className="p-4 font-bold">Name</th>
                                    <th className="p-4 font-bold">Designation</th>
                                    <th className="p-4 font-bold">Login ID</th>
                                    <th className="p-4 font-bold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                                {staff.length === 0 ? <tr><td colSpan="4" className="p-8 text-center text-gray-400">No staff found.</td></tr> : 
                                staff.map(s => (
                                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-neutral-900/50">
                                        <td className="p-4 font-bold">{s.name}</td>
                                        <td className="p-4"><span className="text-[10px] font-black uppercase bg-gray-100 dark:bg-neutral-800 px-2 py-1 rounded-lg text-gray-600">{s.role_name}</span></td>
                                        <td className="p-4 font-mono text-xs text-gray-500">{s.login_id}</td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => handleDelete('delete_staff_user', s.id)} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ADD STAFF MODAL */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#151515] w-full max-w-md rounded-[2rem] p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-lg">Onboard New Staff</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="bg-gray-100 dark:bg-neutral-800 p-2 rounded-full"><X size={18}/></button>
                        </div>
                        <form onSubmit={handleAddStaff} className="space-y-3">
                            <div><label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">Full Name</label><input name="name" className={inputStyle} required /></div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">Designation</label>
                                <select name="role_id" className={inputStyle} required>
                                    <option value="">Select Role...</option>
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">Login ID</label><input name="login_id" className={inputStyle} required /></div>
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">Password</label><input name="password" type="password" className={inputStyle} required /></div>
                            </div>
                            <button className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black mt-2 shadow-lg hover:bg-indigo-700 transition-colors">Register Account</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}