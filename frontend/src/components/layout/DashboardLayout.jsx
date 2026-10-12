import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { enterCards, EASE, SPRING } from '../ui/motionKit';
import {
  Activity,
  Bot,
  Building2,
  Calendar,
  FolderOpen,
  Home,
  List,
  LogOut,
  MessageSquare,
  PartyPopper,
  Pill,
  Settings,
  ShieldAlert,
  Stethoscope,
  Store,
  Truck,
  UserCircle,
  Users,
  X,
} from './portalIcons';
import UserProfile from '../common/UserProfile';
import MedicineAlarmModal from '../common/MedicineAlarmModal';

// Root type size per role: the elder portal is extra large, the working desks are compact.
const ROOT_SCALE = { elder: '118%', caregiver: '95%', doctor: '93.75%', hospital: '93.75%', pharmacy: '93.75%' };

const NAV_MENUS = {
  elder: [
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'medicines', label: 'Medicines', icon: Pill },
    { id: 'vitals', label: 'Vitals', icon: Activity },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'reports', label: 'Medical Reports', icon: FolderOpen },
    { id: 'community', label: 'Events', icon: PartyPopper },
    { id: 'aiassistant', label: 'AI Assistant', icon: Bot },
    { id: 'settings', label: 'Settings', icon: Settings },
  ],
  caregiver: [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'vitals', label: 'Vitals & Trends', icon: Activity },
    { id: 'medications', label: 'Medications', icon: Pill },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'alerts', label: 'Alerts & SOS History', icon: ShieldAlert },
    { id: 'careteam', label: 'Care Team & Messages', icon: Users },
    { id: 'elders', label: 'Manage Elders', icon: UserCircle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ],
  doctor: [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'mypatients', label: 'My Patients', icon: Users },
    { id: 'appointments', label: 'Appointments & Consults', icon: Calendar },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ],
  hospital: [
    { id: 'overview', label: 'Overview Dashboard', icon: Home },
    { id: 'doctors', label: 'Doctor Management', icon: Stethoscope },
    { id: 'emergency', label: 'Emergency & SOS Dispatch', icon: ShieldAlert },
    { id: 'departments', label: 'Departments & Resources', icon: Building2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ],
  pharmacy: [
    { id: 'overview', label: 'Overview Dashboard', icon: Home },
    { id: 'orders', label: 'Orders & Prescriptions', icon: Pill },
    { id: 'inventory', label: 'Inventory Management', icon: Store },
    { id: 'delivery', label: 'Delivery & Dispatch', icon: Truck },
    { id: 'subscriptions', label: 'Patients & Subscriptions', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ],
};

const ROLE_LABEL = {
  elder: 'Elder portal',
  caregiver: 'Caregiver portal',
  doctor: 'Doctor portal',
  hospital: 'Hospital portal',
  pharmacy: 'Pharmacy portal',
};

const isItemActive = (activeTab, id) =>
  activeTab === id
  || (activeTab === 'home' && (id === 'overview' || id === 'dashboard'))
  || (activeTab === 'overview' && (id === 'home' || id === 'dashboard'))
  || (activeTab === 'dashboard' && (id === 'home' || id === 'overview'))
  || (activeTab === 'fulfillment' && id === 'orders');

export default function DashboardLayout({ currentUser, activeTab, onSelectTab, onLogout, children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const reduceMotion = useReducedMotion();
  const role = currentUser?.role || 'elder';
  const currentNav = NAV_MENUS[role] || NAV_MENUS.elder;
  const quickNav = currentNav.slice(0, 4);
  const pageRef = useRef(null);

  // Scale the whole interface by role, and put it back on the way out.
  useEffect(() => {
    document.documentElement.style.fontSize = ROOT_SCALE[role] || '';
    return () => { document.documentElement.style.fontSize = ''; };
  }, [role]);

  const choose = (id) => {
    onSelectTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="eg-public eg-portal flex h-[100dvh] w-full flex-col overflow-hidden md:flex-row">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:font-semibold focus:text-black">Skip to main content</a>

      {/* Phone top bar */}
      <header className="sticky top-0 z-40 flex shrink-0 items-center justify-between border-b border-eg-line bg-white px-4 py-2.5 md:hidden">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" className="h-9 w-9 rounded-lg object-contain" />
          <div>
            <span className="block font-['Geist'] text-lg font-bold leading-none">ElderGuard</span>
            <span className="block text-xs font-semibold text-eg-muted">{ROLE_LABEL[role]}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-eg-line text-eg-ink"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <List className="h-6 w-6" />}
        </button>
      </header>

      {/* Scrim behind the phone drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-20 bg-eg-ink/40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 shrink-0 flex-col justify-between overflow-y-auto border-r border-eg-line bg-white p-4 transition-transform duration-300 md:sticky md:top-0 md:h-[100dvh] md:w-64 md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-6 hidden items-center gap-3 px-2 pt-1 md:flex">
            <img src="/logo.png" alt="" className="h-10 w-10 shrink-0 rounded-xl object-contain" />
            <div>
              <h2 className="font-['Geist'] text-lg font-bold leading-tight tracking-tight">ElderGuard</h2>
              <span className="block text-xs font-semibold text-eg-muted">{ROLE_LABEL[role]}</span>
            </div>
          </div>

          <nav aria-label="Main" className="mt-14 space-y-1 md:mt-0">
            {currentNav.map((item, i) => {
              const Icon = item.icon;
              const active = isItemActive(activeTab, item.id);
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => choose(item.id)}
                  initial={reduceMotion ? false : { opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.45, delay: 0.05 + i * 0.04, ease: EASE }}
                  whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                  className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[0.95rem] font-semibold transition-colors ${active ? 'text-eg-teal-dark' : 'text-eg-muted hover:bg-eg-paper hover:text-eg-ink'}`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      transition={SPRING}
                      className="absolute inset-0 rounded-xl bg-eg-tint"
                      aria-hidden="true"
                    />
                  )}
                  <Icon className="relative h-5 w-5 shrink-0" />
                  <span className="relative">{item.label}</span>
                </motion.button>
              );
            })}
          </nav>
        </div>

        <div className="mt-6 shrink-0 border-t border-eg-line pt-4">
          {currentUser?.email && <p className="mb-3 truncate px-2 text-xs text-eg-muted">{currentUser.email}</p>}
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-eg-line px-4 py-2.5 text-sm font-bold text-eg-ink transition-colors hover:border-eg-teal hover:bg-eg-tint"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main id="main-content" className="mx-auto h-full w-full max-w-7xl flex-1 overflow-y-auto p-4 pb-28 md:p-8 md:pb-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            ref={pageRef}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8, transition: { duration: 0.14 } }}
            transition={{ duration: 0.3, ease: EASE }}
            onAnimationStart={() => requestAnimationFrame(() => enterCards(pageRef.current))}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Phone bottom tabs: four main pages and a way to the rest */}
      <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-eg-line bg-white md:hidden">
        {quickNav.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(activeTab, item.id);
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => choose(item.id)}
              className={`relative flex min-h-[60px] flex-col items-center justify-center gap-1 px-1 text-xs font-bold ${active ? 'text-eg-teal-dark' : 'text-eg-muted'}`}
            >
              {active && <motion.span layoutId="tab-bar-pill" transition={SPRING} className="absolute inset-x-3 top-0 h-1 rounded-b-full bg-eg-teal" aria-hidden="true" />}
              <Icon className="h-6 w-6" />
              <span className="max-w-full truncate">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
        <button type="button" onClick={() => setMobileMenuOpen(true)} aria-label="More pages" className="flex min-h-[60px] flex-col items-center justify-center gap-1 px-1 text-xs font-bold text-eg-muted">
          <List className="h-6 w-6" />
          <span>More</span>
        </button>
      </nav>

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
