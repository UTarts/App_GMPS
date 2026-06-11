"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from "../../../context/AuthContext";
import { useAppModal } from "../../../context/ModalContext";
import {
  BookMarked, CreditCard, FileText, Users, BarChart3,
  Settings, Wallet, Clock, ChevronDown, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

const safeFetchJson = async (url, options = {}) => {
  try {
    const res = await fetch(url, options);
    let text = await res.text();
    try {
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) text = text.substring(firstBrace, lastBrace + 1);
      return JSON.parse(text);
    } catch (e) {
      console.error("API returned non-JSON:", text);
      return { success: false, message: 'Server error.' };
    }
  } catch (err) {
    console.error("Network Error:", err);
    return { success: false, message: 'Network error.' };
  }
};

export default function AccountantProfile() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { showModal } = useAppModal();

  const [profile, setProfile] = useState(user || {});
  const [stats, setStats] = useState({ today_collected: 0, month_collected: 0, pending_submissions: 0, total_students: 0 });
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState('2025-2026');

  useEffect(() => {
    if (!user) return;
    // Security: Only accountant (admin level 3) can access this page
    if (user.role !== 'admin' || user.level != 3) {
      router.replace('/');
      return;
    }
    loadDashboard();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadDashboard = async () => {
    try {
      const json = await safeFetchJson(
        `${process.env.NEXT_PUBLIC_API_URL}/fin_api.php?action=get_dashboard_stats`
      );
      if (json.success) {
        setStats(json.stats);
        setSession(json.current_session || '2025-2026');
      }
      // Load latest profile info
      const aJson = await safeFetchJson(
        `${process.env.NEXT_PUBLIC_API_URL}/admin_data.php?action=get_admins`
      );
      if (aJson.status === 'success') {
        const me = aJson.data.find(a => a.id == user.id);
        if (me) setProfile(me);
      }
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    showModal("Logout", "Are you sure you want to logout?", "danger", () => {
      if (logout) logout();
      router.push('/login');
    });
  };

  const getProfilePic = (pic) => {
    if (!pic) return `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}GMPSimages/default-admin.jpg`;
    return `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}${pic}`;
  };

  const shortcuts = [
    { icon: BookMarked,  label: "Fee Ledger",    href: "/accountant/ledger",            color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    { icon: CreditCard,  label: "Collect Fee",   href: "/accountant/ledger",            color: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
    { icon: FileText,    label: "Invoices",       href: "/accountant/invoices/generate", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    { icon: Users,       label: "Defaulters",     href: "/accountant/defaulters",        color: "bg-red-500/10 text-red-600 dark:text-red-400" },
    { icon: BarChart3,   label: "Reports",        href: "/accountant/reports",           color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
    { icon: Settings,    label: "Fee Setup",      href: "/accountant/fees/matrix",       color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    { icon: Wallet,      label: "Expenses",       href: "/accountant/expenses",          color: "bg-pink-500/10 text-pink-600 dark:text-pink-400" },
    { icon: Clock,       label: "Pending",        href: "/accountant/submissions",       color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  ];

  if (loading) return <AccountantSkeleton />;

  return (
    <div className="min-h-screen pb-24 font-sans text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-[#0a0a0a]">

      {/* ── HEADER CARD ─────────────────────────────────────── */}
      <div className="relative pt-12 pb-10 px-6 flex flex-col items-center">

        {/* Settings / Logout */}
        <Link
          href="/settings"
          className="absolute top-6 right-6 p-2 rounded-full bg-gray-100 text-gray-500 dark:bg-neutral-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
        >
          <Settings size={20} />
        </Link>

        {/* Badge */}
        <div className="absolute top-6 left-6">
          <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-lg backdrop-blur-md bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400">
            Accountant
          </span>
        </div>

        {/* Avatar */}
        <div className="relative w-32 h-32 rounded-full border-4 border-emerald-500 bg-white dark:bg-neutral-900 p-1 shadow-2xl mb-4">
          <div className="w-full h-full rounded-full overflow-hidden">
            <img
              src={getProfilePic(profile?.profile_pic)}
              className="w-full h-full object-cover"
              onError={(e) => e.target.src = `${process.env.NEXT_PUBLIC_IMAGE_BASE_URL}GMPSimages/default-admin.jpg`}
              loading="lazy"
            />
          </div>
        </div>

        <h1 className="text-3xl font-black tracking-tighter text-center mb-1 text-gray-900 dark:text-white">
          {profile?.name || "Accountant"}
        </h1>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
          {profile?.contact || "No Contact Info"}
        </p>
        <p className="mt-1 text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full">
          Session: {session}
        </p>
      </div>

      <div className="px-4 max-w-lg mx-auto space-y-3">

        {/* ── STATS GRID ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Today's Collection"
            value={`₹${Number(stats.today_collected || 0).toLocaleString('en-IN')}`}
            color="text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            label="This Month"
            value={`₹${Number(stats.month_collected || 0).toLocaleString('en-IN')}`}
            color="text-teal-600 dark:text-teal-400"
          />
          <StatCard
            label="Total Students"
            value={stats.total_students || 0}
            color="text-blue-600 dark:text-blue-400"
          />
          <StatCard
            label="Pending Submissions"
            value={stats.pending_submissions || 0}
            color="text-orange-500 dark:text-orange-400"
          />
        </div>

        {/* ── MAIN CTA — LEDGER ───────────────────────────────── */}
        <Link
          href="/accountant/ledger"
          className="w-full p-6 rounded-3xl flex flex-col items-start gap-4 shadow-xl transition-all relative overflow-hidden group bg-gradient-to-br from-emerald-600 to-teal-700 text-white block"
        >
          <div className="absolute right-[-20px] top-[-20px] opacity-20 rotate-12 group-hover:scale-110 transition-transform duration-500">
            <BookMarked size={120} />
          </div>
          <div className="w-12 h-12 rounded-full bg-black/10 backdrop-blur-sm flex items-center justify-center">
            <BookMarked size={24} />
          </div>
          <div>
            <h3 className="font-black text-xl">Fee Ledger</h3>
            <p className="opacity-70 text-xs font-medium">Search student → collect fee → print receipt</p>
          </div>
        </Link>

        {/* ── SHORTCUTS GRID ──────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3">
          {shortcuts.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-neutral-800 shadow-sm hover:scale-[1.03] active:scale-95 transition-transform"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color} bg-opacity-10`}>
                <item.icon size={20} />
              </div>
              <span className="text-[9px] font-bold text-gray-600 dark:text-gray-400 text-center leading-tight">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* ── FEE MATRIX QUICK LINK ───────────────────────────── */}
        <Link
          href="/accountant/fees/matrix"
          className="w-full bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-neutral-800 p-4 rounded-3xl flex items-center justify-between group hover:border-amber-500/50 transition-all shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Settings size={20} />
            </div>
            <div className="text-left">
              <h3 className="text-gray-900 dark:text-white font-bold text-sm">Fee Structure Setup</h3>
              <p className="text-gray-500 text-[10px]">Edit class fees, heads & yearly charges</p>
            </div>
          </div>
          <ChevronDown className="-rotate-90 text-gray-400 group-hover:text-amber-500 transition-colors" size={20} />
        </Link>

        <Link
          href="/accountant/submissions"
          className="w-full bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-neutral-800 p-4 rounded-3xl flex items-center justify-between group hover:border-orange-500/50 transition-all shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Clock size={20} />
            </div>
            <div className="text-left">
              <h3 className="text-gray-900 dark:text-white font-bold text-sm">Pending Submissions</h3>
              <p className="text-gray-500 text-[10px]">{stats.pending_submissions || 0} awaiting approval</p>
            </div>
          </div>
          <ChevronDown className="-rotate-90 text-gray-400 group-hover:text-orange-500 transition-colors" size={20} />
        </Link>

      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="p-5 rounded-3xl border flex flex-col items-center justify-center gap-1 shadow-sm bg-white dark:bg-[#151515] border-gray-100 dark:border-neutral-800">
      <span className={`text-2xl font-black ${color}`}>{value}</span>
      <span className="text-[9px] text-gray-500 font-bold uppercase text-center leading-tight">{label}</span>
    </div>
  );
}

function AccountantSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24">
      <div className="pt-12 pb-10 px-6 flex flex-col items-center">
        <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-800 skeleton mb-4"></div>
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-full skeleton mb-2"></div>
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded-full skeleton"></div>
      </div>
      <div className="px-4 max-w-lg mx-auto">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-3xl skeleton"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-3xl skeleton"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-3xl skeleton"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-3xl skeleton"></div>
        </div>
        <div className="h-36 bg-gray-200 dark:bg-gray-800 rounded-3xl skeleton mb-3"></div>
        <div className="grid grid-cols-4 gap-3 mb-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-2xl skeleton"></div>
          ))}
        </div>
      </div>
    </div>
  );
}