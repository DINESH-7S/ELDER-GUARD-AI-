import React, { useEffect, useState } from 'react';
import { Video, Pill, FileText, CheckCircle2, Upload, Activity, Heart, Activity as GlucoseIcon, ShieldAlert } from 'lucide-react';
import appointmentsService from '../../services/appointmentsService';
import connectedPortalService from '../../services/connectedPortalService';
import doctorRecordsService from '../../services/doctorRecordsService';
import tabStorage from '../../utils/tabStorage';
import {
  appointmentPatientSummary,
  getUserId,
  patientInitials,
  getSelectedPatient,
  setSelectedPatient
} from './doctorPortalData';

export default function DoctorPatientDetailPage({ currentUser, onNavigateTab }) {
  const [activeTab, setActiveTab] = useState('vitals');
  const [soapForm, setSoapForm] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const [soapSaved, setSoapSaved] = useState(false);
  const [patient, setPatientState] = useState(() => getSelectedPatient());
  const [vitals, setVitals] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    // 1. Try to load currently selected patient from shared context
    const currentSelected = getSelectedPatient();
    if (currentSelected) {
      setPatientState(currentSelected);
      return;
    }

    // 2. Fallback to doctor's first appointment
    const doctorId = getUserId(currentUser);
    if (!doctorId) return;

    appointmentsService.getAppointments(null, doctorId)
      .then(data => {
        const firstAppointment = (data || [])[0];
        if (firstAppointment) {
          const summary = appointmentPatientSummary(firstAppointment);
          setPatientState(summary);
          setSelectedPatient(summary);
        }
      })
      .catch(() => {});
  }, [currentUser?.id, currentUser?.user_id]);

  useEffect(() => {
    if (!patient) return;

    doctorRecordsService.listPrescriptions(patient.elderId || patient.elder_id)
      .then(list => setPrescriptions(list || []))
      .catch(() => setPrescriptions([]));

    doctorRecordsService.listReports(patient.elderId || patient.elder_id)
      .then(list => setReports(list || []))
      .catch(() => setReports([]));

    // Fetch vitals for patient if elderId exists
    if (patient.elderId) {
      connectedPortalService.caregiverVitals(patient.elderId)
        .then(res => setVitals(res.data?.current || null))
        .catch(() => setVitals(null));
    }

    // Load SOAP note if previously saved for this patient
    try {
      const savedSoap = tabStorage.getItem(`elderguard_soap_${patient.elderId || patient.id}`);
      if (savedSoap) {
        setSoapForm(JSON.parse(savedSoap));
      }
    } catch {}
  }, [patient?.id, patient?.elderId, patient?.mrn]);

  const handleSaveSoap = (e) => {
    e.preventDefault();
    if (patient) {
      tabStorage.setItem(`elderguard_soap_${patient.elderId || patient.id}`, JSON.stringify(soapForm));
    }
    setSoapSaved(true);
    setTimeout(() => setSoapSaved(false), 3000);
  };

  const handleNavigateToRx = () => {
    if (patient) setSelectedPatient(patient);
    onNavigateTab('prescriptions');
  };

  const handleNavigateToReports = () => {
    if (patient) setSelectedPatient(patient);
    onNavigateTab('reports');
  };

  if (!patient) {
    return (
      <div className="bg-white border border-[#E2E9E4] rounded-lg p-8 text-center text-[#5C6B64] text-xs">
        No patient chart selected. Select a patient from <strong className="text-[#0F6B5C] cursor-pointer" onClick={() => onNavigateTab('mypatients')}>My Patients Roster</strong> or appointment desk.
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAF9] text-[#131917] font-inter space-y-5">
      {/* Patient Profile Header Card */}
      <div className="bg-white border border-[#E2E9E4] rounded-lg p-5 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#E2E9E4] pb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded bg-[#EEF3F0] text-[#0F6B5C] font-bold text-xl flex items-center justify-center border-2 border-[#0F6B5C] shadow-xs">
              {patientInitials(patient.name)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="font-bold text-2xl text-[#131917]">{patient.name}</h2>
                <span className="font-mono text-xs px-2.5 py-0.5 bg-[#EEF3F0] font-bold text-[#0F6B5C] rounded border border-[#0F6B5C]/30">{patient.mrn}</span>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-[#5C6B64] mt-1.5 font-medium">
                <span>Appointment: <strong>{patient.date || 'Active Record'}</strong></span>
                <span>Mode: <strong>{patient.type || 'Telehealth'}</strong></span>
                <span>Status: <strong className="text-[#2E9E6B]">{patient.status || 'Confirmed'}</strong></span>
                {patient.email && <span>Email: {patient.email}</span>}
              </div>
            </div>
          </div>

          {/* Node Navigation Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => onNavigateTab('appointments')} className="px-3.5 py-2 rounded bg-[#0F6B5C] hover:bg-[#0C5548] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs">
              <Video className="w-3.5 h-3.5" /> Telehealth Call
            </button>
            <button onClick={handleNavigateToRx} className="px-3.5 py-2 rounded border border-[#0F6B5C] text-[#0F6B5C] font-bold text-xs hover:bg-[#EEF3F0] cursor-pointer flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5" /> + Issue e-Rx
            </button>
            <button onClick={handleNavigateToReports} className="px-3.5 py-2 rounded border border-[#E2E9E4] text-[#131917] text-xs font-bold hover:bg-[#F2F6F3] cursor-pointer flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-[#5C6B64]" /> Reports Vault
            </button>
          </div>
        </div>
      </div>

      {/* Clinical Summary Bar */}
      <div className="p-4 rounded-lg bg-white border-2 border-[#C79A4B]/40 space-y-1.5 shadow-xs">
        <div className="flex items-center gap-2 text-[#C79A4B] font-bold text-xs uppercase tracking-wider">
          <FileText className="w-4 h-4 text-[#C79A4B]" />
          <span>Active Patient Record — {patient.name} ({patient.mrn})</span>
        </div>
        <p className="text-xs text-[#131917] leading-relaxed font-medium">
          Connected patient identity context active across Vitals, SOAP Notes, Medication Roster, e-Prescriptions, and Lab Reports.
        </p>
      </div>

      {/* Inner Overview Node Tabs */}
      <div className="flex border-b border-[#E2E9E4] gap-4 text-xs font-bold">
        {[
          { key: 'vitals', label: 'Vitals & Telemetry' },
          { key: 'soap', label: 'SOAP Note Entry' },
          { key: 'meds', label: `Medication Roster (${prescriptions.length})` },
          { key: 'labs', label: `Lab Reports (${reports.length})` }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-2.5 px-2 border-b-2 cursor-pointer transition ${activeTab === tab.key ? 'border-[#0F6B5C] text-[#0F6B5C]' : 'border-transparent text-[#5C6B64]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Vitals Tab Content */}
      {activeTab === 'vitals' && (
        <div className="bg-white border border-[#E2E9E4] rounded-lg p-5 space-y-4">
          <h4 className="font-bold text-sm text-[#131917]">Shared Vitals & Anomaly Telemetry</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-lg bg-[#FAFBFA] border border-[#E2E9E4] space-y-1">
              <span className="text-[11px] font-bold text-[#5C6B64] uppercase block">Blood Pressure</span>
              <span className="text-xl font-bold text-[#131917] font-mono">{vitals?.blood_pressure || vitals?.bp || '--'}</span>
              <span className="text-[10px] text-[#2E9E6B] font-bold block">{vitals ? 'Latest Connected Reading' : 'No Reading'}</span>
            </div>

            <div className="p-4 rounded-lg bg-[#FAFBFA] border border-[#E2E9E4] space-y-1">
              <span className="text-[11px] font-bold text-[#5C6B64] uppercase block">Heart Rate</span>
              <span className="text-xl font-bold text-[#131917] font-mono">{vitals?.pulse || vitals?.heart_rate || '--'}</span>
              <span className="text-[10px] text-[#2E9E6B] font-bold block">{vitals ? 'Latest Connected Reading' : 'No Reading'}</span>
            </div>

            <div className="p-4 rounded-lg bg-[#FAFBFA] border border-[#E2E9E4] space-y-1">
              <span className="text-[11px] font-bold text-[#5C6B64] uppercase block">Blood Glucose</span>
              <span className="text-xl font-bold text-[#131917] font-mono">{vitals?.blood_sugar || vitals?.glucose || '--'}</span>
              <span className="text-[10px] text-[#5C6B64] block">{vitals ? 'Latest Connected Reading' : 'No Reading'}</span>
            </div>

            <div className="p-4 rounded-lg bg-[#FAFBFA] border border-[#E2E9E4] space-y-1">
              <span className="text-[11px] font-bold text-[#5C6B64] uppercase block">Oxygen SpO2</span>
              <span className="text-xl font-bold text-[#131917] font-mono">{vitals?.spo2 || '--'}</span>
              <span className="text-[10px] text-[#2E9E6B] font-bold block">{vitals ? 'Latest Connected Reading' : 'No Reading'}</span>
            </div>
          </div>
        </div>
      )}

      {/* SOAP Note Entry Tab */}
      {activeTab === 'soap' && (
        <form onSubmit={handleSaveSoap} className="bg-white border border-[#E2E9E4] rounded-lg p-5 space-y-4 text-xs">
          <div className="flex justify-between items-center border-b pb-3">
            <h4 className="font-bold text-sm text-[#131917]">SOAP Clinical Note Editor — {patient.name}</h4>
            {soapSaved && (
              <span className="px-3 py-1 bg-[#2E9E6B]/15 text-[#2E9E6B] font-bold rounded flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved locally under patient chart
              </span>
            )}
          </div>

          {['subjective', 'objective', 'assessment', 'plan'].map(field => (
            <div key={field}>
              <label className="block font-bold text-[#0F6B5C] uppercase tracking-wider mb-1">{field}</label>
              <textarea
                rows={field === 'plan' ? 3 : 2}
                placeholder={`Enter clinical ${field} observations for ${patient.name}...`}
                value={soapForm[field]}
                onChange={(e) => setSoapForm({ ...soapForm, [field]: e.target.value })}
                className="w-full bg-[#F8FAF9] border border-[#E2E9E4] rounded p-2.5 text-xs text-[#131917] outline-none focus:border-[#0F6B5C]"
              />
            </div>
          ))}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="submit" className="px-5 py-2 rounded bg-[#0F6B5C] hover:bg-[#0C5548] text-white font-bold cursor-pointer">
              Save SOAP Note
            </button>
          </div>
        </form>
      )}

      {/* Medication Roster Tab */}
      {activeTab === 'meds' && (
        <div className="bg-white border border-[#E2E9E4] rounded-lg p-5 space-y-4 text-xs">
          <div className="flex justify-between items-center border-b border-[#E2E9E4] pb-3">
            <div>
              <h4 className="font-bold text-sm text-[#131917]">Active Prescriptions — {patient.name}</h4>
              <p className="text-[11px] text-[#5C6B64]">e-Prescriptions issued for patient MRN {patient.mrn}</p>
            </div>
            <button onClick={handleNavigateToRx} className="px-3.5 py-1.5 rounded bg-[#0F6B5C] hover:bg-[#0C5548] text-white font-bold flex items-center gap-1.5 cursor-pointer">
              <Pill className="w-3.5 h-3.5" /> + Issue e-Prescription
            </button>
          </div>

          {prescriptions.length === 0 ? (
            <div className="text-center py-6 text-[#5C6B64]">
              No active e-prescriptions recorded yet for {patient.name}. Click <strong>+ Issue e-Prescription</strong> to prescribe new medications.
            </div>
          ) : (
            <div className="divide-y divide-[#E2E9E4]">
              {prescriptions.map(p => (
                <div key={p.id} className="py-3 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-[#131917] text-sm block">{p.medicine}</span>
                    <span className="text-[#5C6B64]">Sig: {p.sig} · Refills: {p.refills} · Pharmacy: {p.pharmacy}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-[#2E9E6B]/15 text-[#2E9E6B] font-bold text-[10px]">{p.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lab Reports Tab */}
      {activeTab === 'labs' && (
        <div className="bg-white border border-[#E2E9E4] rounded-lg p-5 space-y-4 text-xs">
          <div className="flex justify-between items-center border-b border-[#E2E9E4] pb-3">
            <div>
              <h4 className="font-bold text-sm text-[#131917]">Diagnostic Test Reports — {patient.name}</h4>
              <p className="text-[11px] text-[#5C6B64]">Lab test vault for MRN {patient.mrn}</p>
            </div>
            <button onClick={handleNavigateToReports} className="px-3.5 py-1.5 rounded bg-[#0F6B5C] hover:bg-[#0C5548] text-white font-bold flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" /> Upload / Open Vault
            </button>
          </div>

          {reports.length === 0 ? (
            <div className="text-center py-6 text-[#5C6B64]">
              No lab reports uploaded for {patient.name} yet. Click <strong>Upload / Open Vault</strong> to manage test documents.
            </div>
          ) : (
            <div className="space-y-2">
              {reports.map(r => (
                <div key={r.id} className="p-3 rounded bg-[#FAFBFA] border border-[#E2E9E4] flex justify-between items-center">
                  <div>
                    <span className="font-bold text-[#131917] block text-sm">{r.title}</span>
                    <span className="text-[#5C6B64]">Uploaded {r.date} · Source: {r.source}</span>
                  </div>
                  <button onClick={handleNavigateToReports} className="px-3 py-1 rounded border border-[#E2E9E4] text-[#0F6B5C] font-bold hover:bg-[#EEF3F0]">
                    Inspect in Vault →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
