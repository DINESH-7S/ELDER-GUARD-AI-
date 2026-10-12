import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Pill,
  MessageSquare,
  Search,
  Bell,
  ShieldAlert,
  Clock,
  Video,
  ChevronRight,
  Check,
  X,
  CheckCircle2,
  Sparkles,
  AlertOctagon,
  FileSpreadsheet,
  Activity,
  Heart,
  Droplets
} from 'lucide-react';
import api from '../../services/api';
import { profilesService } from '../../services/profiles.service';
import { displayDoctorName, displayPatientName, getUserId, setSelectedPatient, appointmentPatientSummary } from './doctorPortalData';

export default function DoctorDashboard({ currentUser, onNavigateTab }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState(null);
  const [doctorProfile, setDoctorProfile] = useState(null);

  const [triageList, setTriageList] = useState([]);
  const [schedule, setSchedule] = useState([]);

  const doctorUserId = getUserId(currentUser);

  const loadDoctorProfile = async () => {
    try {
      const data = await profilesService.getDoctorProfile(doctorUserId);
      if (data) setDoctorProfile(data);
    } catch (e) {
      console.warn('Error fetching doctor profile in dashboard:', e);
    }
  };

  useEffect(() => {
    loadDoctorProfile();
    const handleRealtime = () => loadDoctorProfile();
    window.addEventListener('elderguard:realtime-event', handleRealtime);
    return () => window.removeEventListener('elderguard:realtime-event', handleRealtime);
  }, [doctorUserId]);

  useEffect(() => {
    const url = doctorUserId ? `/appointments/?doctor_id=${doctorUserId}` : '/appointments/';
    api.get(url)
      .then(res => {
        if (res.data && res.data.length > 0) {
          setSchedule(res.data);
        } else {
          api.get('/appointments/').then(r => setSchedule(r.data || [])).catch(() => setSchedule([]));
        }
      })
      .catch(() => setSchedule([]));
  }, [doctorUserId]);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }

  return (
    <div className="bg-eg-paper text-eg-ink font-inter space-y-5">
      
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-[#102621] text-white px-6 py-3 rounded-lg shadow-sm flex items-center gap-3 font-semibold text-xs border border-[#C79A4B]">
          <CheckCircle2 className="w-4 h-4 text-[#1F7A50]" />
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Top Bar with Real EHR Global Search */}
      <div className="bg-white border border-eg-line rounded-lg px-5 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-eg-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search MRN #, Patient Name, ICD-10, Drug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-eg-paper border border-eg-line rounded-md pl-10 pr-4 py-2 text-xs text-eg-ink outline-none font-medium focus:border-eg-teal"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-eg-tint px-3 py-1 rounded">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2E9E6B] animate-pulse" />
            <span className="text-xs font-bold text-eg-muted">EHR Sync: <strong className="text-eg-teal">Active (ElderGuard Doctor Portal)</strong></span>
          </div>

          <div className="flex items-center gap-3 pl-2 border-l border-eg-line">
            {doctorProfile?.profile_pic_url && (
              <img src={doctorProfile.profile_pic_url} alt={doctorProfile.name} className="w-8 h-8 rounded-full object-cover border border-eg-teal" />
            )}
            <div className="text-left hidden sm:block">
              <span className="text-xs font-bold text-eg-ink block leading-none">
                {displayDoctorName(currentUser, doctorProfile)}
              </span>
              <span className="text-[10px] text-eg-muted block mt-0.5 font-medium">
                {doctorProfile?.specialization || doctorProfile?.professional_title || currentUser?.email || 'Logged-in doctor account'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-eg-line rounded-lg p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-eg-muted uppercase tracking-wider block">Today's Consults</span>
            <span className="text-2xl font-bold text-eg-ink font-mono">{schedule.length} Patients</span>
          </div>
          <div className="p-3 rounded-lg bg-eg-teal/10 text-eg-teal"><Calendar className="w-5 h-5" /></div>
        </div>

        <div className="bg-white border border-[#C6363E]/40 rounded-lg p-4 flex items-center justify-between bg-gradient-to-r from-[#C6363E]/5 to-transparent">
          <div>
            <span className="text-[11px] font-bold text-[#C6363E] uppercase tracking-wider block">Critical Triage Flags</span>
            <span className="text-2xl font-bold text-[#C6363E] font-mono">{triageList.length} Patients</span>
          </div>
          <div className="p-3 rounded-lg bg-[#C6363E]/15 text-[#C6363E]"><ShieldAlert className="w-5 h-5" /></div>
        </div>

        <div className="bg-white border border-eg-line rounded-lg p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-eg-muted uppercase tracking-wider block">Pending e-Rx Approvals</span>
            <span className="text-2xl font-bold text-eg-ink font-mono">0 Orders</span>
          </div>
          <div className="p-3 rounded-lg bg-[#E8A03C]/10 text-[#E8A03C]"><Pill className="w-5 h-5" /></div>
        </div>

        <div className="bg-white border border-eg-line rounded-lg p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-eg-muted uppercase tracking-wider block">Caregiver Queries</span>
            <span className="text-2xl font-bold text-eg-ink font-mono">0 Threads</span>
          </div>
          <div className="p-3 rounded-lg bg-[#C79A4B]/15 text-[#C79A4B]"><MessageSquare className="w-5 h-5" /></div>
        </div>
      </div>

      {/* Critical Triage List */}
      <div className="bg-white border border-eg-line rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-eg-line pb-3">
          <h3 className="font-bold text-sm text-eg-ink flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C6363E]" />
            <span>Clinical Triage Desk & Urgent Vital Flags</span>
          </h3>
        </div>

        {triageList.length === 0 ? (
          <div className="text-center py-8 text-xs text-eg-muted">No active critical triage flags</div>
        ) : (
          <div className="space-y-2.5">
            {triageList.map(t => (
              <div key={t.id} className="p-3.5 rounded bg-eg-paper border border-eg-line flex justify-between items-center text-xs">
                <span className="font-bold text-eg-ink">{t.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 bg-white border border-eg-line rounded-lg p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-eg-line pb-3">
            <h4 className="font-bold text-sm text-eg-ink flex items-center gap-2">
              <Clock className="w-4 h-4 text-eg-teal" />
              <span>Today's Consultation Desk & Token Queue</span>
            </h4>
            <span className="text-xs text-eg-teal font-bold">{schedule.length} Appointments Total</span>
          </div>

          {schedule.length === 0 ? (
            <div className="text-center py-8 text-xs text-eg-muted">No appointments booked for today</div>
          ) : (
            <div className="space-y-3 divide-y divide-eg-line text-xs">
              {schedule.map((s, idx) => (
                <div key={s.id || idx} className="pt-2 flex items-center justify-between hover:bg-eg-paper p-2 rounded transition">
                  <div>
                    <span className="font-bold text-eg-ink text-sm block">{displayPatientName(s)}</span>
                    <span className="text-eg-muted text-[11px]">{s.appointment_date} at {s.start_time} · Status: <strong className="text-eg-teal">{String(s.status).replace('_', ' ')}</strong></span>
                  </div>
                  <button
                    onClick={() => {
                      const summary = appointmentPatientSummary(s, idx);
                      setSelectedPatient(summary);
                      onNavigateTab('patientdetail');
                    }}
                    className="px-3 py-1.5 rounded bg-eg-teal hover:bg-eg-teal-dark text-white font-bold text-xs cursor-pointer shadow-xs"
                  >
                    View Chart →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-5">
          <div className="bg-eg-teal-dark text-white rounded-lg p-5 space-y-3">
            <h4 className="font-bold text-base text-white">Clinical Action Desk</h4>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button onClick={() => onNavigateTab('mypatients')} className="p-3 rounded bg-white/10 hover:bg-white/20 text-left cursor-pointer">
                + Give Prescription
              </button>
              <button onClick={() => onNavigateTab('mypatients')} className="p-3 rounded bg-white/10 hover:bg-white/20 text-left cursor-pointer">
                + Upload Lab Report
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
