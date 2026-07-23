'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useAppModal } from '../../../context/ModalContext';
import { ArrowLeft, Loader2, Bus, Plus, Droplet, Fuel, Calendar, Wallet, CheckCircle2, History, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getToken = () => { try { return JSON.parse(localStorage.getItem('gmps_user') || '{}')?.token || ''; } catch { return ''; } };
const safeFetchJson = async (url, options = {}) => {
  try {
    const token = getToken();
    const headers = { ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const res = await fetch(url, { ...options, headers });
    return JSON.parse(await res.text());
  } catch { return { success: false, message: 'Network/server error.' }; }
};

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });
const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function TransportLedger() {
  const { user } = useAuth();
  const router = useRouter();
  const { showModal } = useAppModal();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ vehicles: [], pending_advances: [], fuel_logs: [], last_rate: 89.50 });
  
  const [activeTab, setActiveTab] = useState('advances'); // advances, logs, vehicles
  const [processing, setProcessing] = useState(false);

  // Modals
  const [addVehicleModal, setAddVehicleModal] = useState(false);
  const [advanceModal, setAdvanceModal] = useState({ show: false, vehicle_id: '' });
  const [billModal, setBillModal] = useState({ show: false, advance: null, vehicle_id: '' });

  // Forms
  const [vForm, setVForm] = useState({ vehicle_no: '', driver_name: '' });
  const [advForm, setAdvForm] = useState({ amount: '', date_given: new Date().toISOString().slice(0,10), remarks: '' });
  const [billForm, setBillForm] = useState({ amount: '', rate: '', litres: '', fuel_date: new Date().toISOString().slice(0,10), remarks: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=get_transport_data`);
    if (json.success) setData(json);
    setLoading(false);
  }, []);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  // SMART AUTO-CALCULATION FOR LITRES
  useEffect(() => {
      if (billForm.amount && billForm.rate) {
          const l = (Number(billForm.amount) / Number(billForm.rate)).toFixed(2);
          setBillForm(prev => ({ ...prev, litres: l }));
      } else {
          setBillForm(prev => ({ ...prev, litres: '' }));
      }
  }, [billForm.amount, billForm.rate]);

  const handleSaveVehicle = async (e) => {
      e.preventDefault();
      setProcessing(true);
      const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save_vehicle', ...vForm })
      });
      setProcessing(false);
      if (json.success) { setAddVehicleModal(false); setVForm({ vehicle_no: '', driver_name: '' }); loadData(); }
  };

  const handleGiveAdvance = async (e) => {
      e.preventDefault();
      setProcessing(true);
      const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'give_fuel_advance', vehicle_id: advanceModal.vehicle_id, ...advForm })
      });
      setProcessing(false);
      if (json.success) { setAdvanceModal({ show: false, vehicle_id: '' }); setAdvForm({ amount: '', date_given: new Date().toISOString().slice(0,10), remarks: '' }); loadData(); }
  };

  const handleLogBill = async (e) => {
      e.preventDefault();
      setProcessing(true);
      const json = await safeFetchJson(`${process.env.NEXT_PUBLIC_API_URL}/fin_api.php`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ action: 'log_fuel_bill', vehicle_id: billModal.vehicle_id, advance_id: billModal.advance?.id || 0, ...billForm })
      });
      setProcessing(false);
      if (json.success) { 
          showModal('Bill Logged', 'Fuel expense recorded and injected into Master Expenses.', 'success');
          setBillModal({ show: false, advance: null, vehicle_id: '' }); 
          loadData(); 
      }
  };

  // Open Bill Modal & Inject Smart Defaults
  const openBillModal = (vehicleId, linkedAdvance = null) => {
      setBillForm({
          amount: linkedAdvance ? linkedAdvance.amount : '', // Predict they spent the exact advance
          rate: data.last_rate, // Smart grab last known diesel rate
          litres: '',
          fuel_date: new Date().toISOString().slice(0,10), // Defaults to today
          remarks: ''
      });
      setBillModal({ show: true, vehicle_id: vehicleId, advance: linkedAdvance });
  };

  if (loading && data.vehicles.length === 0) return <div className="min-h-screen flex justify-center items-center bg-[#F2F6FA] dark:bg-[#0a0a0a]"><Loader2 className="animate-spin text-amber-500 w-10 h-10" /></div>;

  return (
    <div className="min-h-screen pb-28 bg-[#F2F6FA] dark:bg-[#0a0a0a] font-sans">
      
      {/* HEADER */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-[#151515]/90 backdrop-blur-xl border-b border-gray-100 dark:border-neutral-800 px-4 py-4 flex items-center gap-3 shadow-sm">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black truncate leading-none">Transport Ledger</h1>
          <p className="text-[10px] uppercase tracking-widest text-amber-600 font-bold mt-1 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full inline-block">Fuel & Advance Tracker</p>
        </div>
      </div>

      <div className="px-4 pt-5 max-w-3xl mx-auto space-y-5">
        
        {/* TABS */}
        <div className="flex bg-white dark:bg-[#151515] p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800">
          <button onClick={() => setActiveTab('advances')} className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all ${activeTab === 'advances' ? 'bg-amber-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'}`}>
            <AlertTriangle size={14} /> Pending Advances {data.pending_advances.length > 0 && `(${data.pending_advances.length})`}
          </button>
          <button onClick={() => setActiveTab('logs')} className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all ${activeTab === 'logs' ? 'bg-amber-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'}`}>
            <History size={14} /> Fuel Logbook
          </button>
          <button onClick={() => setActiveTab('vehicles')} className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all ${activeTab === 'vehicles' ? 'bg-amber-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'}`}>
            <Bus size={14} /> Vehicles
          </button>
        </div>

        {/* TAB 1: PENDING ADVANCES */}
        {activeTab === 'advances' && (
            <div className="space-y-4">
                {data.pending_advances.length === 0 ? (
                    <div className="bg-white dark:bg-[#151515] p-10 rounded-[2rem] border border-dashed border-gray-200 dark:border-neutral-800 text-center">
                        <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-3" />
                        <p className="font-bold text-gray-500 text-sm">No pending cash advances.</p>
                        <p className="text-xs text-gray-400 mt-1">All drivers have submitted their fuel bills.</p>
                    </div>
                ) : (
                    data.pending_advances.map(adv => (
                        <div key={adv.id} className="bg-white dark:bg-[#151515] border border-amber-200 dark:border-amber-900/30 rounded-3xl p-5 shadow-sm">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-2xl flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-800/50">
                                        <Wallet size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Unresolved Cash Advance</p>
                                        <p className="font-black text-lg text-gray-900 dark:text-white leading-tight">{adv.driver_name}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{adv.vehicle_no} • Given {formatDate(adv.date_given)}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-black text-xl text-gray-900 dark:text-white">{fmt(adv.amount)}</p>
                                </div>
                            </div>
                            <button onClick={() => openBillModal(adv.vehicle_id, adv)} className="w-full py-3.5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-black flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md">
                                <Droplet size={16} /> Driver Brought Fuel Bill (Clear Advance)
                            </button>
                        </div>
                    ))
                )}
            </div>
        )}

        {/* TAB 2: FUEL LOGBOOK */}
        {activeTab === 'logs' && (
            <div className="space-y-3">
                <button onClick={() => openBillModal(data.vehicles[0]?.id || 0)} className="w-full py-4 bg-amber-500 text-white rounded-[2rem] font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 active:scale-95 transition-transform mb-6">
                    <Droplet size={20} /> Direct Fuel Entry (No Advance)
                </button>
                {data.fuel_logs.length === 0 ? (
                    <p className="text-center text-sm font-bold text-gray-400 py-6">No fuel logs found.</p>
                ) : (
                    data.fuel_logs.map(log => (
                        <div key={log.id} className="bg-white dark:bg-[#151515] p-4 rounded-3xl border border-gray-100 dark:border-neutral-800 flex items-center gap-4 shadow-sm">
                            <div className="w-12 h-12 bg-gray-50 dark:bg-neutral-900 text-gray-500 rounded-2xl flex items-center justify-center shrink-0">
                                <Droplet size={20} className="fill-gray-300 dark:fill-gray-700" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-base text-gray-900 dark:text-white">{fmt(log.amount)}</p>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">{log.driver_name} • {log.vehicle_no}</p>
                                <p className="text-[10px] font-bold text-amber-600 mt-1">{log.litres}L @ ₹{log.rate}/L</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{formatDate(log.fuel_date)}</p>
                                {log.advance_id ? <span className="text-[8px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase font-black mt-1 inline-block">Adv Cleared</span> : <span className="text-[8px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase font-black mt-1 inline-block">Direct Bill</span>}
                            </div>
                        </div>
                    ))
                )}
            </div>
        )}

        {/* TAB 3: VEHICLES DIRECTORY */}
        {activeTab === 'vehicles' && (
            <div className="space-y-4">
                <button onClick={() => setAddVehicleModal(true)} className="w-full py-4 bg-white dark:bg-[#151515] border-2 border-dashed border-gray-200 dark:border-neutral-800 text-gray-600 dark:text-gray-300 rounded-[2rem] font-black flex items-center justify-center gap-2 active:scale-95 transition-transform hover:border-amber-400 hover:text-amber-500">
                    <Plus size={20} /> Register New Transport Vehicle
                </button>
                {data.vehicles.map(v => (
                    <div key={v.id} className="bg-white dark:bg-[#151515] p-5 rounded-3xl border border-gray-100 dark:border-neutral-800 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-100 dark:bg-neutral-900 rounded-full flex items-center justify-center text-gray-400"><Bus size={20} /></div>
                            <div>
                                <p className="font-black text-lg text-gray-900 dark:text-white uppercase tracking-wider">{v.vehicle_no}</p>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Operated By: <span className="text-amber-600">{v.driver_name}</span></p>
                            </div>
                        </div>
                        <button onClick={() => { setAdvForm(p=>({...p, amount: ''})); setAdvanceModal({ show: true, vehicle_id: v.id }); }} className="p-3 bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 rounded-xl hover:bg-amber-500 hover:text-white transition-colors">
                            <Wallet size={18} />
                        </button>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* --- GIVE ADVANCE MODAL --- */}
      <AnimatePresence>
        {advanceModal.show && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%', opacity: 0 }} className="w-full max-w-md bg-white dark:bg-[#1a1a1a] p-6 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl relative">
              <button onClick={() => setAdvanceModal({ show: false, vehicle_id: '' })} className="absolute top-5 right-5 p-2 bg-gray-100 dark:bg-neutral-800 rounded-full"><X size={16} className="text-gray-500"/></button>
              <h3 className="text-lg font-black mb-1">Issue Cash Advance</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">Handing cash to driver before fuel</p>
              
              <form onSubmit={handleGiveAdvance} className="space-y-4">
                <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider ml-1 block mb-1.5">Advance Amount (₹) <span className="text-amber-500">*</span></label>
                    <input type="number" required placeholder="e.g. 2000" value={advForm.amount} onChange={e => setAdvForm({...advForm, amount: e.target.value})} className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl px-4 py-3.5 text-lg font-black outline-none focus:border-amber-500" />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider ml-1 block mb-1.5">Date Given</label>
                    <input type="date" required value={advForm.date_given} onChange={e => setAdvForm({...advForm, date_given: e.target.value})} className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:border-amber-500" />
                </div>
                <button type="submit" disabled={processing} className="w-full py-4 bg-amber-500 text-white font-black rounded-xl shadow-lg mt-2">
                    {processing ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Log Pending Advance'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- LOG BILL MODAL (SMART CALC) --- */}
      <AnimatePresence>
        {billModal.show && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%', opacity: 0 }} className="w-full max-w-md bg-white dark:bg-[#1a1a1a] p-6 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl relative">
              <button onClick={() => setBillModal({ show: false, advance: null, vehicle_id: '' })} className="absolute top-5 right-5 p-2 bg-gray-100 dark:bg-neutral-800 rounded-full"><X size={16} className="text-gray-500"/></button>
              
              <h3 className="text-lg font-black mb-1">{billModal.advance ? 'Clear Advance with Bill' : 'Direct Fuel Bill'}</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                  {billModal.advance ? `Resolving advance of ${fmt(billModal.advance.amount)}` : 'Logging direct fuel expense'}
              </p>
              
              {data.vehicles.length > 1 && !billModal.advance && (
                  <div className="mb-4">
                      <select value={billModal.vehicle_id} onChange={e => setBillModal(p => ({...p, vehicle_id: e.target.value}))} className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-amber-500">
                          <option value="">Select Vehicle...</option>
                          {data.vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_no} ({v.driver_name})</option>)}
                      </select>
                  </div>
              )}

              <form onSubmit={handleLogBill} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider ml-1 block mb-1.5">Bill Amount (₹) <span className="text-amber-500">*</span></label>
                        <input type="number" required placeholder="0.00" value={billForm.amount} onChange={e => setBillForm({...billForm, amount: e.target.value})} className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl px-4 py-3.5 text-lg font-black outline-none focus:border-amber-500" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider ml-1 block mb-1.5">Rate / Litre (₹) <span className="text-amber-500">*</span></label>
                        <input type="number" step="0.01" required value={billForm.rate} onChange={e => setBillForm({...billForm, rate: e.target.value})} className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl px-4 py-3.5 text-lg font-black text-amber-600 outline-none focus:border-amber-500" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider ml-1 block mb-1.5">Total Litres (Auto)</label>
                        <div className="w-full bg-gray-100 dark:bg-black border border-gray-200 dark:border-neutral-800 rounded-xl px-4 py-3.5 text-sm font-black text-gray-500 flex items-center justify-between">
                            {billForm.litres || '0.00'} <span className="text-[10px]">Ltrs</span>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider ml-1 block mb-1.5">Fuel Date</label>
                        <input type="date" required value={billForm.fuel_date} onChange={e => setBillForm({...billForm, fuel_date: e.target.value})} className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl px-3 py-3.5 text-sm font-bold outline-none focus:border-amber-500" />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider ml-1 block mb-1.5">Remarks / Bill No.</label>
                    <input type="text" placeholder="Optional notes..." value={billForm.remarks} onChange={e => setBillForm({...billForm, remarks: e.target.value})} className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:border-amber-500" />
                </div>

                <button type="submit" disabled={processing} className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-black font-black rounded-xl flex items-center justify-center gap-2 shadow-lg mt-2">
                    {processing ? <Loader2 size={18} className="animate-spin mx-auto" /> : <><CheckCircle2 size={18} /> {billModal.advance ? 'Verify Bill & Clear Advance' : 'Log Expense'}</>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD VEHICLE MODAL --- */}
      <AnimatePresence>
        {addVehicleModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-sm bg-white dark:bg-[#1a1a1a] p-6 rounded-[2rem] shadow-2xl relative">
              <button onClick={() => setAddVehicleModal(false)} className="absolute top-5 right-5 p-2 bg-gray-100 dark:bg-neutral-800 rounded-full"><X size={16} className="text-gray-500"/></button>
              <h3 className="text-lg font-black mb-6">Register Vehicle</h3>
              <form onSubmit={handleSaveVehicle} className="space-y-4">
                <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Vehicle Registration Number</label>
                    <input type="text" required placeholder="e.g. UP 32 AB 1234" value={vForm.vehicle_no} onChange={e => setVForm({...vForm, vehicle_no: e.target.value})} className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl px-4 py-3 font-bold uppercase outline-none focus:border-amber-500" />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Assigned Driver Name</label>
                    <input type="text" required placeholder="e.g. Rajesh Kumar" value={vForm.driver_name} onChange={e => setVForm({...vForm, driver_name: e.target.value})} className="w-full bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl px-4 py-3 font-bold outline-none focus:border-amber-500" />
                </div>
                <button type="submit" disabled={processing} className="w-full py-4 bg-amber-500 text-white font-black rounded-xl mt-2">
                    Save Vehicle
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}