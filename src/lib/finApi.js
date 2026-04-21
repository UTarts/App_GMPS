/**
 * GMPS Finance API Helper
 * File: src/lib/finApi.js
 * 
 * Uses NEXT_PUBLIC_API_URL exactly like all other pages in the app.
 * Token is passed in — call as: feeApi.getMyDues(token)
 */

const API = () => process.env.NEXT_PUBLIC_API_URL;

async function finApi(action, params = {}, token = null, method = 'POST') {
  // 1. Send token in URL to bypass header-stripping
  const url = `${API()}/fin_api.php?action=${action}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
  
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`; // Keep as backup
  
  const options = {
    method,
    headers,
    ...(method === 'POST' ? { body: JSON.stringify(params) } : {}),
  };
  
  const res = await fetch(url, options);
  const text = await res.text(); 
  
  if (!text) {
      throw new Error("The server returned an empty response. Check PHP error logs.");
  }

  let data;
  try {
      data = JSON.parse(text);
  } catch (e) {
      console.error("API CRASH RESPONSE:", text);
      throw new Error("Server error: Failed to parse data. Please check the console.");
  }

  if (!data.success && data.message) {
      throw new Error(data.message);
  }
  
  return data;
}

export const feeApi = {
  // Student/Parent
  getMyDues:             (token)         => finApi('get_my_dues',             {}, token, 'GET'),
  getMyReceipts:         (token)         => finApi('get_my_receipts',          {}, token, 'GET'),
  submitPayment:         (token, data)   => finApi('submit_online_payment',    data, token),

  // Accountant
  getDashboardStats:     (token)         => finApi('get_dashboard_stats',      {}, token, 'GET'),
  getClassFeeMatrix:     (token, session)=> finApi('get_class_fee_matrix',     { session }, token),
  saveClassFee:          (token, data)   => finApi('save_class_fee',           data, token),
  generateInvoices:      (token, data)   => finApi('generate_invoices',        data, token),
  saveStudentOverride:   (token, data)   => finApi('save_student_override',    data, token),
  searchStudent:         (token, q)      => finApi('search_student',           { q }, token),
  getStudentDues:        (token, sid)    => finApi('get_student_dues',         { student_id: sid }, token),
  collectCash:           (token, data)   => finApi('collect_cash',             data, token),
  getPendingSubmissions: (token)         => finApi('get_pending_submissions',  {}, token, 'GET'),
  getAllSubmissions:      (token, status) => finApi(`get_all_submissions&status=${status}`, {}, token, 'GET'),
  verifySubmission:      (token, data)   => finApi('verify_submission',        data, token),
  rejectSubmission:      (token, data)   => finApi('reject_submission',        data, token),
  getDefaulters:         (token, m, y)   => finApi(`get_defaulters&month=${m}&year=${y}`, {}, token, 'GET'),
  getReports:            (token, type, date) => finApi(`get_reports&type=${type}${date ? `&date=${date}` : ''}`, {}, token, 'GET'),

  // Superadmin
  saveFeeHead:           (token, data)   => finApi('save_fee_head',            data, token),
  setSession:            (token, session)=> finApi('set_session',              { session }, token),
};

export default feeApi;
