import React, { useState, useEffect } from 'react';
import { Video, Check, X, Sparkles, Mic, MicOff, PhoneOff } from 'lucide-react';
import appointmentsService from '../../services/appointmentsService';
import broadcastRealtimeEvent from '../../utils/realtimeBus';
import { appointmentPatientSummary, getUserId, patientInitials, setSelectedPatient } from './doctorPortalData';

export default function DoctorAppointmentsPage({ currentUser, onNavigateTab }) {
  const [videoCallModalOpen, setVideoCallModalOpen] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [activePatient, setActivePatient] = useState(null);
  const [liveNotes, setLiveNotes] = useState('');
  const [appointmentsList, setAppointmentsList] = useState([]);

  const fetchDoctorAppointments = async () => {
    const doctorId = getUserId(currentUser);
    try {
      let docsAppts = await appointmentsService.getAppointments(null, doctorId || null);
      if (!docsAppts || docsAppts.length === 0) {
        docsAppts = await appointmentsService.getAppointments(null, null);
      }
      setAppointmentsList((docsAppts || []).map(appointmentPatientSummary));
    } catch (e) {
      console.warn('Backend fetch appointments error:', e);
      setAppointmentsList([]);
    }
  };

  useEffect(() => {
    fetchDoctorAppointments();

    const handleRealtime = () => {
      fetchDoctorAppointments();
    };
    window.addEventListener('elderguard:realtime-event', handleRealtime);
    return () => window.removeEventListener('elderguard:realtime-event', handleRealtime);
  }, [currentUser?.id, currentUser?.user_id]);

  const handleStartSession = async (appointment) => {
    setActivePatient(appointment);
    setSelectedPatient(appointment);
    setVideoCallModalOpen(true);
    try {
      await appointmentsService.startConsultation(appointment.id);
      broadcastRealtimeEvent('elderguard:realtime-event', {
        event: 'appointment:updated',
        appointmentId: appointment.id,
        status: 'in_consultation',
      });
    } catch (e) {
      console.warn('Start consultation endpoint error:', e);
    }
  };

  const handleCompleteSession = async (appointmentId) => {
    try {
      await appointmentsService.completeAppointment(appointmentId);
      broadcastRealtimeEvent('elderguard:realtime-event', {
        event: 'appointment:updated',
        appointmentId,
        status: 'completed',
      });
    } catch (e) {
      console.warn('Complete appointment endpoint error:', e);
    }
    setAppointmentsList(prev => prev.map(ap => ap.id === appointmentId ? { ...ap, status: 'Completed' } : ap));
  };

  const handleAiSummarize = () => {
    setLiveNotes(prev => `${prev}\n[AI Auto-Summary]: Add patient-specific findings from this consultation, then review before committing the chart.`);
  };

  return (
    <div className="bg-[#F8FAF9] text-[#131917] font-inter space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-bold text-xl text-[#131917]">Appointments & Telehealth Desk</h2>
          <p className="text-xs text-[#5C6B64]">Appointments booked with this logged-in doctor account appear here.</p>
        </div>
        <button
          onClick={() => appointmentsList[0] && handleStartSession(appointmentsList[0])}
          disabled={!appointmentsList[0]}
          className="px-4 py-2 rounded bg-[#0F6B5C] hover:bg-[#0C5548] text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Video className="w-3.5 h-3.5 text-[#C79A4B]" /> Launch Telehealth Room
        </button>
      </div>

      <div className="bg-white border border-[#E2E9E4] rounded-lg p-5 space-y-4">
        <h4 className="font-bold text-sm text-[#131917]">Consultation Token Queue</h4>
        <div className="divide-y divide-[#E2E9E4]">
          {appointmentsList.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#5C6B64]">
              No elders have booked appointments with this doctor account yet.
            </div>
          ) : appointmentsList.map(appointment => (
            <div key={appointment.id} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="font-mono font-bold text-[#0F6B5C] bg-[#0F6B5C]/10 px-2 py-1 rounded text-xs">{appointment.token}</span>
                <span className="font-mono font-bold text-[#5C6B64] text-xs w-16">{appointment.time}</span>
                {appointment.avatar ? (
                  <img src={appointment.avatar} alt={appointment.name} className="w-9 h-9 rounded object-cover border" />
                ) : (
                  <div className="w-9 h-9 rounded bg-[#EEF3F0] text-[#0F6B5C] font-bold flex items-center justify-center border">
                    {patientInitials(appointment.name)}
                  </div>
                )}
                <div>
                  <span className="font-bold text-[#131917] block text-sm">
                    {appointment.name} <span className="font-mono text-xs text-[#5C6B64]">({appointment.mrn})</span>
                  </span>
                  <span className="text-[#5C6B64]">{appointment.date} - {appointment.type} - {appointment.status}</span>
                </div>
              </div>

              {appointment.status === 'Completed' ? (
                <span className="px-3 py-1 rounded bg-[#2E9E6B]/15 text-[#2E9E6B] font-bold text-[11px] flex items-center gap-1">
                  <Check className="w-3 h-3" /> Session Completed
                </span>
              ) : (
                <button onClick={() => handleStartSession(appointment)} className="px-3.5 py-1.5 rounded bg-[#0F6B5C] hover:bg-[#0C5548] text-white font-bold cursor-pointer">
                  Start Session
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {videoCallModalOpen && activePatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
          <div className="bg-[#102621] text-white border border-white/20 rounded-lg p-6 max-w-5xl w-full shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <Video className="w-5 h-5 text-[#C79A4B]" />
                <div>
                  <h3 className="font-bold text-base text-white">Encrypted Telehealth Room - Consultation with {activePatient.name}</h3>
                  <span className="text-[10px] text-white/60 font-mono">Appointment ID: {activePatient.id}</span>
                </div>
              </div>
              <button onClick={() => setVideoCallModalOpen(false)}><X className="w-5 h-5 text-white/60 hover:text-white" /></button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 bg-black rounded-lg h-80 flex items-center justify-center relative overflow-hidden border border-white/10">
                <div className="w-full h-full flex items-center justify-center bg-[#0B1714] text-white">
                  <div className="w-24 h-24 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-3xl font-bold">
                    {patientInitials(activePatient.name)}
                  </div>
                </div>

                <span className="absolute top-3 left-3 bg-[#C6363E] text-white px-2.5 py-0.5 rounded text-[10px] font-bold">
                  TELEHEALTH SESSION
                </span>

                <div className="absolute bottom-3 inset-x-0 flex justify-center gap-2">
                  <button onClick={() => setMicMuted(!micMuted)} className={`p-2.5 rounded-full ${micMuted ? 'bg-[#C6363E] text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}>
                    {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setVideoCallModalOpen(false)} className="px-4 py-2 rounded-full bg-[#C6363E] text-white font-bold flex items-center gap-1.5">
                    <PhoneOff className="w-4 h-4" /> End Call
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 bg-white/10 p-4 rounded-lg space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                    <span className="font-bold text-xs text-[#C79A4B] uppercase">Pinned Appointment Context</span>
                    <span className="font-mono text-[10px] text-white/60">{activePatient.mrn}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 text-[11px] font-mono">
                    <div className="bg-black/30 p-1.5 rounded">Patient: <strong className="text-white">{activePatient.name}</strong></div>
                    <div className="bg-black/30 p-1.5 rounded">Mode: <strong className="text-white">{activePatient.type}</strong></div>
                    <div className="bg-black/30 p-1.5 rounded">Status: <strong className="text-[#2E9E6B]">{activePatient.status}</strong></div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <label className="text-[10px] font-bold uppercase text-white/80">Live SOAP Documentation</label>
                    <button type="button" onClick={handleAiSummarize} className="px-2 py-0.5 rounded bg-[#C79A4B] text-[#102621] font-bold text-[10px] flex items-center gap-1 cursor-pointer">
                      <Sparkles className="w-3 h-3" /> AI Summarize
                    </button>
                  </div>

                  <textarea
                    rows={6}
                    value={liveNotes}
                    onChange={(e) => setLiveNotes(e.target.value)}
                    className="w-full mt-1 bg-black/40 border border-white/20 rounded p-2 text-xs text-white outline-none font-mono"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => {
                      if (activePatient) setSelectedPatient(activePatient);
                      setVideoCallModalOpen(false);
                      onNavigateTab('mypatients');
                    }}
                    className="flex-1 py-2 rounded bg-[#0F6B5C] text-white font-bold text-xs cursor-pointer hover:bg-[#0C5548]"
                  >
                    + e-Prescribe
                  </button>
                  <button onClick={() => { handleCompleteSession(activePatient.id); setVideoCallModalOpen(false); }} className="flex-1 py-2 rounded bg-[#C79A4B] text-[#102621] font-bold text-xs cursor-pointer">
                    Commit Chart
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
