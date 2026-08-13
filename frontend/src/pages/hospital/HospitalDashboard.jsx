import React, { useState, useEffect } from 'react';
import emergencyService from '../../services/emergencyService';
import { 
  Building2, 
  Search, 
  Bell, 
  ShieldAlert, 
  Users, 
  Stethoscope, 
  Calendar, 
  FileText, 
  Settings, 
  Home, 
  UserCircle,
  X,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';

import HospitalOverviewPage from './HospitalOverviewPage';
import HospitalPatientRegistryPage from './HospitalPatientRegistryPage';
import HospitalDoctorManagementPage from './HospitalDoctorManagementPage';
import HospitalAppointmentsQueuePage from './HospitalAppointmentsQueuePage';
import HospitalEmergencyDispatchPage from './HospitalEmergencyDispatchPage';
import HospitalDepartmentsResourcesPage from './HospitalDepartmentsResourcesPage';
import HospitalBillingRecordsPage from './HospitalBillingRecordsPage';
import HospitalSettingsPage from './HospitalSettingsPage';
import { displayHospitalName, initials } from './hospitalPortalData';

export default function HospitalDashboard({ currentUser, activeTab = 'overview', onNavigateTab, onLogout }) {
  const [internalTab, setInternalTab] = useState(activeTab || 'overview');
  const [globalSearch, setGlobalSearch] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [hospitalSosModalData, setHospitalSosModalData] = useState(null);

  useEffect(() => {
    const handleRealtime = (e) => {
      const detail = e.detail;
      if (detail?.event === 'sos:triggered' || detail?.type === 'sos') {
        setHospitalSosModalData({
          id: detail?.id || detail?.sos_event_id || 'sos-' + Date.now(),
          elder_name: detail?.elder_name || detail?.elder_id || 'Elder patient',
          triggered_at: detail?.triggered_at || new Date().toISOString(),
          location_lat: detail?.location_lat || '',
          location_lng: detail?.location_lng || '',
          status: 'active'
        });
      } else if (detail?.event === 'sos:resolved') {
        setHospitalSosModalData(null);
      }
    };
    window.addEventListener('elderguard:realtime-event', handleRealtime);
    return () => window.removeEventListener('elderguard:realtime-event', handleRealtime);
  }, []);

  // Sync prop tab if provided
  const currentTab = onNavigateTab ? activeTab : internalTab;

  const handleTabChange = (tabId) => {
    if (onNavigateTab) {
      onNavigateTab(tabId);
    } else {
      setInternalTab(tabId);
    }
  };

  // Main Navigation Tabs Definition (Clean Hospital Command Hub)
  const tabs = [
    { id: 'overview', label: 'Overview Dashboard', icon: Home },
    { id: 'doctors', label: 'Doctor Management', icon: Stethoscope },
    { id: 'emergency', label: 'Emergency & SOS Dispatch', icon: ShieldAlert },
    { id: 'departments', label: 'Departments & Resources', icon: Building2 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  // Hospital notifications list
  const notificationsList = [];

  // Page Content Switcher
  const renderCurrentPage = () => {
    switch (currentTab) {
      case 'overview':
      case 'home':
        return <HospitalOverviewPage currentUser={currentUser} onNavigateTab={handleTabChange} />;
      case 'doctors':
        return <HospitalDoctorManagementPage currentUser={currentUser} onNavigateTab={handleTabChange} />;
      case 'emergency':
        return <HospitalEmergencyDispatchPage currentUser={currentUser} onNavigateTab={handleTabChange} />;
      case 'departments':
        return <HospitalDepartmentsResourcesPage currentUser={currentUser} onNavigateTab={handleTabChange} />;
      case 'settings':
        return <HospitalSettingsPage currentUser={currentUser} onLogout={onLogout} />;
      default:
        return <HospitalOverviewPage currentUser={currentUser} onNavigateTab={handleTabChange} />;
    }
  };

  return (
    <div className="space-y-6 bg-[#F8F7FA] text-[#1A1520] min-h-screen font-sans pb-12">
      
      {/* Top Bar (Global Header Bar matching Royal Plum System) */}
      <div className="bg-white border border-[#E8E3ED] rounded-2xl p-4 md:p-5 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4 sticky top-0 z-20">
        
        {/* Left: Global Search Input */}
        <div className="relative w-full lg:w-96">
          <Search className="w-4 h-4 text-[#6B6272] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Global Search (Patients, Doctors, Wards, Invoices)..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F8F7FA] border border-[#E8E3ED] text-sm focus:outline-none focus:border-[#5B2A86] placeholder-[#6B6272]"
          />
        </div>

        {/* Right: Emergency Indicator, Notifications Bell & Admin Profile */}
        <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
          
          {/* Emergency Dispatch Shortcut Button */}
          <button
            onClick={() => handleTabChange('emergency')}
            className="px-3.5 py-1.5 rounded-xl bg-[#FDF2F2] border border-[#D6373F]/30 text-[#D6373F] font-bold text-xs flex items-center gap-2 hover:bg-[#FDF2F2]/80 transition cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-[#D6373F] animate-pulse"></span>
            <span>ACTIVE SOS</span>
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 rounded-xl bg-[#F8F7FA] border border-[#E8E3ED] hover:bg-[#F1ECF6] text-[#1A1520] transition relative cursor-pointer"
            >
              <Bell className="w-5 h-5 text-[#5B2A86]" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#D6373F] text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                0
              </span>
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-2xl border border-[#E8E3ED] shadow-2xl p-4 space-y-3 z-50">
                <div className="flex items-center justify-between border-b border-[#E8E3ED] pb-2">
                  <h4 className="font-bold text-sm text-[#1A1520]">Hospital Notifications</h4>
                  <button onClick={() => setShowNotifications(false)} className="text-[#6B6272] hover:text-[#1A1520]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {notificationsList.map((n) => (
                    <div key={n.id} className="p-2.5 rounded-xl bg-[#F8F7FA] border border-[#E8E3ED] text-xs">
                      <p className="font-semibold text-[#1A1520]">{n.text}</p>
                      <span className="text-[10px] text-[#6B6272]">{n.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Admin Profile Info */}
          <div className="flex items-center gap-3 pl-3 border-l border-[#E8E3ED]">
            <div className="w-9 h-9 rounded-xl bg-[#5B2A86] text-white flex items-center justify-center font-bold text-sm shadow-sm">
              {initials(displayHospitalName(currentUser))}
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-sm text-[#1A1520] block leading-tight">
                {displayHospitalName(currentUser)}
              </span>
              <span className="text-[11px] text-[#5B2A86] font-semibold block">
                Central Operations Hub • Admin Console
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* Institutional Top Tab Bar for quick navigation across 8 pages */}
      <div className="bg-white border border-[#E8E3ED] rounded-2xl p-2 shadow-sm flex items-center gap-1.5 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id || (currentTab === 'home' && tab.id === 'overview');

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                isActive 
                  ? 'bg-[#5B2A86] text-white shadow-sm font-bold' 
                  : 'text-[#6B6272] hover:bg-[#F8F7FA] hover:text-[#1A1520]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#B57EDC]' : 'text-[#6B6272]'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${isActive ? 'bg-[#D6373F] text-white' : 'bg-[#FDF2F2] text-[#D6373F]'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Page Area */}
      <div className="pt-2">
        {renderCurrentPage()}
      </div>

      {/* 🚨 HOSPITAL INCOMING EMERGENCY SOS POPUP BOX MODAL */}
      {hospitalSosModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="relative bg-white border-4 border-[#D6373F] rounded-3xl shadow-2xl overflow-hidden max-w-lg w-full transform transition-all scale-100 animate-in zoom-in-95">
            
            {/* Flashing Hospital Red Siren Header */}
            <div className="bg-gradient-to-r from-[#D6373F] via-[#E53935] to-[#5B2A86] p-4 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/20 text-white animate-ping shrink-0">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-black text-lg tracking-wide uppercase flex items-center gap-2">
                    <span>🚨 HOSPITAL EMERGENCY SOS ALERT</span>
                  </h3>
                  <p className="text-xs text-white/90 font-medium">Direct Route: Connected Hospital ER Triage</p>
                </div>
              </div>
              <button
                onClick={() => setHospitalSosModalData(null)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
                title="Minimize Popup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-[#1A1520]">
              <div className="p-4 rounded-2xl bg-[#FFFDFD] border border-[#D6373F]/30 flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#6B6272] font-bold block uppercase tracking-wider">Patient Name</span>
                  <span className="text-xl font-black text-[#D6373F]">
                    {hospitalSosModalData.elder_name}
                  </span>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#D6373F] text-white text-xs font-black uppercase animate-pulse">
                  CRITICAL TRIAGE
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#F8F7FA] border border-[#E8E3ED]">
                  <span className="text-[#6B6272] font-bold block mb-0.5">Time Triggered</span>
                  <span className="font-bold text-[#1A1520]">
                    {hospitalSosModalData.triggered_at ? new Date(hospitalSosModalData.triggered_at).toLocaleTimeString() : 'Just now'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F8F7FA] border border-[#E8E8ED]">
                  <span className="text-[#6B6272] font-bold block mb-0.5">GPS Location</span>
                  <span className="font-mono font-bold text-[#5B2A86]">
                    {hospitalSosModalData.location_lat}, {hospitalSosModalData.location_lng}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FDF2F2] border border-[#D6373F]/30 text-xs text-[#D6373F] flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Panic alert received. Both Hospital ER Triage Desk and Caregiver have been dispatched.</span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  onClick={async () => {
                    await emergencyService.acknowledgeSOS(hospitalSosModalData.id).catch(() => {});
                    setHospitalSosModalData(null);
                    handleTabChange('emergency');
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#5B2A86] hover:bg-[#4A2270] text-white font-black text-xs uppercase tracking-wider transition shadow-md cursor-pointer text-center"
                >
                  Dispatch Ambulance / ER
                </button>
                <button
                  onClick={async () => {
                    await emergencyService.resolveSOS(hospitalSosModalData.id, 'Resolved by hospital ER triage').catch(() => {});
                    setHospitalSosModalData(null);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#2E9E6B] hover:bg-[#258258] text-white font-black text-xs uppercase tracking-wider transition shadow-md cursor-pointer text-center"
                >
                  Resolve SOS
                </button>
                <button
                  onClick={() => setHospitalSosModalData(null)}
                  className="py-3 px-4 rounded-xl border border-[#E8E3ED] text-[#6B6272] hover:bg-gray-100 font-bold text-xs transition cursor-pointer text-center"
                >
                  Minimize
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
