import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Home, 
  Bot, 
  Pill, 
  Calendar, 
  FileText, 
  Users, 
  PhoneCall, 
  Activity, 
  Stethoscope, 
  Building2, 
  Store, 
  Menu, 
  X, 
  LogOut, 
  UserCircle,
  Settings,
  FolderOpen,
  PartyPopper,
  MessageSquare,
  Truck
} from 'lucide-react';
import UserProfile from '../common/UserProfile';
import MedicineAlarmModal from '../common/MedicineAlarmModal';

export default function DashboardLayout({ currentUser, activeTab, onSelectTab, onLogout, children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const role = currentUser?.role || 'elder';

  // Role color & theme background mappings
  const bgClasses = {
    elder: 'bg-[#FAF7F2] text-[#2E2E2E]',
    caregiver: 'bg-[#FAFBFC] text-[#1A1D23]',
    doctor: 'bg-[#F8FAF9] text-[#131917]',
    hospital: 'bg-[#F8F7FA] text-[#1A1520]',
    pharmacy: 'bg-[#F6FAF8] text-[#10221B]'
  };

  const activeBorderClasses = {
    elder: 'bg-white/20 text-white font-bold border-l-4 border-[#FFE8D6] shadow-sm',
    caregiver: 'border-l-4 border-[#D4A24C] bg-white/10 text-white font-bold shadow-sm',
    doctor: 'border-l-4 border-[#C79A4B] bg-[#0F6B5C] text-white font-bold shadow-sm',
    hospital: 'border-l-4 border-[#B57EDC] bg-[#5B2A86] text-white font-bold shadow-sm',
    pharmacy: 'border-l-4 border-[#4FD1A5] bg-[#1E9E6B] text-white font-bold shadow-sm'
  };

  const navMenus = {
    elder: [
      { id: 'home',         label: 'Dashboard',        icon: Home },
      { id: 'medicines',    label: 'Medicines',         icon: Pill },
      { id: 'vitals',       label: 'Vitals',            icon: Activity },
      { id: 'appointments', label: 'Appointments',      icon: Calendar },
      { id: 'reports',      label: 'Medical Reports',   icon: FolderOpen },
      { id: 'community',    label: 'Community Events',  icon: PartyPopper },
      { id: 'aiassistant',  label: 'AI Assistant',     icon: Bot },
      { id: 'settings',     label: 'Settings',          icon: Settings },
    ],
    caregiver: [
      { id: 'overview',     label: 'Overview',            icon: Home },
      { id: 'vitals',       label: 'Vitals & Trends',     icon: Activity },
      { id: 'medications',  label: 'Medications',         icon: Pill },
      { id: 'appointments', label: 'Appointments',       icon: Calendar },
      { id: 'alerts',       label: 'Alerts & SOS History',icon: ShieldAlert },
      { id: 'careteam',     label: 'Care Team & Messages',icon: Users },
      { id: 'elders',       label: 'Manage Elders',       icon: UserCircle },
      { id: 'settings',     label: 'Settings',            icon: Settings },
    ],
    doctor: [
      { id: 'dashboard',    label: 'Dashboard',                   icon: Home },
      { id: 'mypatients',   label: 'My Patients',                 icon: Users },
      { id: 'appointments', label: 'Appointments & Consults',     icon: Calendar },
      { id: 'messages',     label: 'Messages',                    icon: MessageSquare },
      { id: 'settings',     label: 'Settings',                    icon: Settings },
    ],
    hospital: [
      { id: 'overview',    label: 'Overview Dashboard',       icon: Home },
      { id: 'doctors',     label: 'Doctor Management',        icon: Stethoscope },
      { id: 'emergency',   label: 'Emergency & SOS Dispatch', icon: ShieldAlert },
      { id: 'departments', label: 'Departments & Resources',  icon: Building2 },
      { id: 'settings',    label: 'Settings',                 icon: Settings },
    ],
    pharmacy: [
      { id: 'overview',      label: 'Overview Dashboard',       icon: Home },
      { id: 'orders',        label: 'Orders & Prescriptions',   icon: Pill },
      { id: 'inventory',     label: 'Inventory Management',     icon: Store },
      { id: 'delivery',      label: 'Delivery & Dispatch',      icon: Truck },
      { id: 'subscriptions', label: 'Patients & Subscriptions', icon: Users },
      { id: 'settings',      label: 'Settings',                 icon: Settings },
    ]
  };

  const currentNav = navMenus[role] || navMenus.elder;

  const roleMeta = {
    elder:     { title: 'SENIOR CONCIERGE', color: 'text-[#FFE8D6]', icon: ShieldAlert },
    caregiver: { title: 'CAREGIVER PORTAL', color: 'text-[#D4A24C]', icon: Users },
    doctor:    { title: 'DOCTOR PORTAL',    color: 'text-[#C79A4B]', icon: Stethoscope },
    hospital:  { title: 'HOSPITAL PORTAL',  color: 'text-[#B57EDC]', icon: Building2 },
    pharmacy:  { title: 'PHARMACY PORTAL',  color: 'text-[#4FD1A5]', icon: Store }
  };
  const currentMeta = roleMeta[role] || roleMeta.elder;
  const RoleIcon = currentMeta.icon;

  return (
    <div className={`h-screen w-full flex flex-col md:flex-row font-inter overflow-hidden transition-colors duration-300 ${bgClasses[role] || bgClasses.elder}`}>
      
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#241832] text-white border-b border-[#E8E3ED]/20 sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="ElderGuard AI Logo" className="w-8 h-8 object-contain rounded-lg border border-white/10" />
          <div>
            <span className="font-bold text-lg text-white block leading-none">ElderGuard AI</span>
            <span className={`text-[10px] ${currentMeta.color} block font-semibold uppercase tracking-wider`}>{currentMeta.title}</span>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-white/10 text-white min-h-[48px] min-w-[48px] flex items-center justify-center cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Component (Fixed Left Panel) */}
      <aside className={`
        fixed md:sticky md:top-0 inset-y-0 left-0 z-30 w-60 h-screen p-5 flex flex-col justify-between transition-transform duration-300 shrink-0 overflow-y-auto select-none
        ${role === 'elder' 
          ? 'bg-gradient-to-b from-[#134B68] via-[#1B6B93] to-[#0F3A52] text-white shadow-xl border-r border-[#1B6B93]/40' 
          : role === 'caregiver'
            ? 'bg-gradient-to-b from-[#0F1B2D] via-[#16253B] to-[#0A121F] text-white shadow-2xl border-r border-[#D4A24C]/20'
            : role === 'doctor'
              ? 'bg-[#102621] text-white border-r border-[#E2E9E4]/10 shadow-lg'
              : role === 'hospital'
                ? 'bg-[#241832] text-white border-r border-[#E8E3ED]/10 shadow-xl'
                : role === 'pharmacy'
                  ? 'bg-[#10221B] text-white border-r border-[#E1EDE6]/10 shadow-xl'
                  : 'bg-slate-900/95 md:bg-slate-900/80 backdrop-blur-xl border-r border-slate-800/80 text-white'
        }
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pr-1 space-y-6">
          {/* Logo & Platform Info */}
          <div className="hidden md:flex items-center gap-3 pb-5 border-b border-white/15 shrink-0">
            <img src="/logo.png" alt="ElderGuard AI Logo" className="w-10 h-10 object-contain rounded-xl shadow-md border border-white/10 shrink-0" />
            <div>
              <h2 className="font-bold text-lg text-white tracking-tight leading-tight">ElderGuard AI</h2>
              <span className={`text-[10px] ${currentMeta.color} font-semibold uppercase tracking-widest block`}>
                {currentMeta.title}
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5 flex-1">
            {currentNav.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id 
                || (activeTab === 'home' && (item.id === 'overview' || item.id === 'dashboard'))
                || (activeTab === 'overview' && (item.id === 'home' || item.id === 'dashboard'))
                || (activeTab === 'dashboard' && (item.id === 'home' || item.id === 'overview'))
                || (activeTab === 'fulfillment' && item.id === 'orders');

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 min-h-[48px] cursor-pointer
                    ${isActive 
                      ? activeBorderClasses[role] || activeBorderClasses.elder
                      : role === 'elder' 
                        ? 'text-sky-100/80 hover:text-white hover:bg-white/10'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }
                  `}
                >
                  <IconComp className="w-5 h-5 shrink-0" />
                  <span className="text-base font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Session Footer (Pinned Stagnant at Bottom) */}
        <div className="pt-4 border-t border-white/15 shrink-0 mt-auto">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-white text-xs font-bold transition min-h-[48px] cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0 text-red-200" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content View Container (Scrollable Right Side Main Page) */}
      <main className="flex-1 h-full overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Connected Profile Modal */}
      {showProfileModal && (
        <UserProfile
          currentUser={currentUser}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* Global Medicine Alarm Reminder Overlay */}
      <MedicineAlarmModal currentUser={currentUser} />
    </div>
  );
}
