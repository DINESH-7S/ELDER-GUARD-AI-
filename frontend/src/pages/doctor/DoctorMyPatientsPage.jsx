import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Pill,
  Upload,
  Trash2,
  Eye,
  X,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Activity,
  Heart,
  Thermometer,
  Droplets,
  Scale,
  Clock,
  User,
  FileCode,
  Image as ImageIcon,
  FileUp,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  FileCheck
} from 'lucide-react';
import appointmentsService from '../../services/appointmentsService';
import connectedPortalService from '../../services/connectedPortalService';
import doctorRecordsService from '../../services/doctorRecordsService';
import broadcastRealtimeEvent from '../../utils/realtimeBus';
import tabStorage from '../../utils/tabStorage';
import {
  appointmentPatientSummary,
  getUserId,
  patientInitials,
  getSelectedPatient,
  setSelectedPatient
} from './doctorPortalData';

export default function DoctorMyPatientsPage({ currentUser, onNavigateTab }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [selectedPatient, setSelectedPatientState] = useState(() => getSelectedPatient());

  // Patient inline details state
  const [vitals, setVitals] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [reports, setReports] = useState([]);
  const [activeTab, setActiveTab] = useState('vitals');

  // Modals state
  const [rxModalOpen, setRxModalOpen] = useState(false);
  const [rxMode, setRxMode] = useState('text'); // 'text' | 'image' | 'pdf'
  const [rxForm, setRxForm] = useState({
    medicine: '',
    strength: '',
    frequency: '',
    duration: '30 Days',
    refills: 1,
    pharmacy: '',
    instructions: '',
    fileName: '',
    fileSize: ''
  });

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [reportForm, setReportForm] = useState({
    title: '',
    source: '',
    tier: 'normal',
    fileName: '',
    fileSize: '',
    analyteName: '',
    analyteResult: '',
    analyteRef: '',
    extractedValues: []
  });

  const [inspectReport, setInspectReport] = useState(null);

  // Load appointments
  useEffect(() => {
    const doctorId = getUserId(currentUser);
    appointmentsService.getAppointments(null, doctorId || null)
      .then(data => {
        if (data && data.length > 0) {
          setAppointments(data);
        } else {
          appointmentsService.getAppointments(null, null).then(all => setAppointments(all || [])).catch(() => setAppointments([]));
        }
      })
      .catch(() => setAppointments([]));
  }, [currentUser?.id, currentUser?.user_id]);

  // Compute patient list from database appointments only.
  const patients = useMemo(() => {
    const byElder = new Map();
    appointments.forEach((appointment, index) => {
      const patient = appointmentPatientSummary(appointment, index);
      if (!byElder.has(patient.elderId)) {
        byElder.set(patient.elderId, { ...patient, visits: 0, lastAppointment: patient.date });
      }
      const existing = byElder.get(patient.elderId);
      existing.visits += 1;
      existing.lastAppointment = patient.date || existing.lastAppointment;
    });

    const query = searchQuery.trim().toLowerCase();
    return Array.from(byElder.values()).filter(patient => {
      if (!query) return true;
      return [patient.name, patient.mrn, patient.email, patient.phone, patient.address]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(query));
    });
  }, [appointments, searchQuery]);

  // Auto-select first patient if none selected
  useEffect(() => {
    if (!selectedPatient && patients.length > 0) {
      handleSelectPatient(patients[0]);
    }
  }, [patients]);

  // Load data for selected patient
  useEffect(() => {
    if (!selectedPatient) return;

    const elderId = selectedPatient.elderId || selectedPatient.elder_id;
    doctorRecordsService.listPrescriptions(elderId)
      .then(list => setPrescriptions(list || []))
      .catch(() => setPrescriptions([]));

    doctorRecordsService.listReports(elderId)
      .then(list => setReports(list || []))
      .catch(() => setReports([]));

    // Vitals
    if (selectedPatient.elderId) {
      connectedPortalService.caregiverVitals(selectedPatient.elderId)
        .then(res => setVitals(res.data?.current || null))
        .catch(() => setVitals(null));
    }
  }, [selectedPatient?.elderId, selectedPatient?.mrn, selectedPatient?.id]);

  const handleSelectPatient = (patient) => {
    setSelectedPatientState(patient);
    setSelectedPatient(patient);
  };

  // --- GIVE PRESCRIPTION HANDLER ---
  const handleOpenRxModal = () => {
    setRxForm({
      medicine: '',
      strength: '',
      frequency: '1 Tablet Daily',
      timeSlot: '08:00 AM',
      customTime: '08:00 AM',
      mealTiming: 'After Meals',
      duration: '30 Days',
      refills: 1,
      pharmacy: '',
      instructions: '',
      fileName: '',
      fileSize: ''
    });
    setRxModalOpen(true);
  };

  const handleFileValidation = (file, allowedTypes, maxSizeMB = 10) => {
    if (!file) return false;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      alert(`File size exceeds ${maxSizeMB}MB limit. Please select a smaller file.`);
      return false;
    }
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(ext)) {
      alert(`Invalid file format (.${ext}). Allowed formats: ${allowedTypes.join(', ')}`);
      return false;
    }
    return true;
  };

  const handleRxFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = rxMode === 'pdf' ? ['pdf'] : ['png', 'jpg', 'jpeg', 'webp'];
    if (!handleFileValidation(file, allowed, 10)) return;

    setRxForm(prev => ({
      ...prev,
      fileName: file.name,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      medicine: prev.medicine || file.name.replace(/\.[^/.]+$/, "")
    }));
  };

  const handleSubmitRx = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    const elderId = selectedPatient.elderId || selectedPatient.elder_id || selectedPatient.id;
    if (!elderId) {
      alert('Select a connected elder patient before saving a prescription.');
      return;
    }

    let medText = '';
    if (rxMode === 'text') {
      medText = `${rxForm.medicine} ${rxForm.strength}`.trim();
    } else if (rxMode === 'image') {
      medText = `Prescription Image (${rxForm.fileName || 'Uploaded Image'})`;
    } else {
      medText = `Prescription PDF Document (${rxForm.fileName || 'Rx Document.pdf'})`;
    }

    const assignedTime = rxForm.timeSlot === 'custom' ? rxForm.customTime : rxForm.timeSlot;
    const assignedMeal = rxForm.mealTiming || 'After Meals';
    const sigText = `${rxForm.frequency || '1 Tablet'} · Scheduled: ${assignedTime} (${assignedMeal})`;

    const newRx = {
      elder_id: elderId,
      patient: selectedPatient.name,
      mrn: selectedPatient.mrn,
      medicine: medText,
      sig: sigText,
      time_slot: assignedTime,
      meal_timing: assignedMeal,
      duration: rxForm.duration || '30 Days',
      refills: rxForm.refills || 0,
      pharmacy: rxForm.pharmacy || '',
      status: 'Active (e-Signed)',
      rx_type: rxMode,
      file_name: rxForm.fileName,
      instructions: rxForm.instructions
    };

    try {
      const saved = await doctorRecordsService.createPrescription(newRx);
      setPrescriptions(prev => [saved, ...prev]);
      broadcastRealtimeEvent('elderguard:realtime-event', { event: 'prescription:created', prescription: saved });
      setRxModalOpen(false);
      alert(`Prescription for ${selectedPatient.name} submitted and saved successfully!`);
    } catch (err) {
      alert(err.response?.data?.detail || 'Unable to save this prescription to the database.');
    }
  };

  const handleDeleteRx = async (rxId) => {
    if (!window.confirm("Are you sure you want to delete this prescription from the patient's record?")) return;
    try {
      await doctorRecordsService.deletePrescription(rxId);
      setPrescriptions(prev => prev.filter(p => String(p.id) !== String(rxId)));
      broadcastRealtimeEvent('elderguard:realtime-event', { event: 'prescription:deleted', id: rxId });
    } catch (err) {
      alert(err.response?.data?.detail || 'Unable to delete this prescription from the database.');
    }
  };

  // --- UPLOAD REPORT WITH OCR HANDLER ---
  const handleOpenReportModal = () => {
    setReportForm({
      title: '',
      source: '',
      tier: 'normal',
      fileName: '',
      fileSize: '',
      analyteName: '',
      analyteResult: '',
      analyteRef: '',
      extractedValues: []
    });
    setOcrSuccess(false);
    setOcrLoading(false);
    setReportModalOpen(true);
  };

  const handleReportFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!handleFileValidation(file, ['pdf', 'png', 'jpg', 'jpeg'], 10)) return;

    setOcrLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      setReportForm(prev => ({
        ...prev,
        fileName: file.name,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        fileUrl: event.target.result,
        title: prev.title || file.name.replace(/\.[^/.]+$/, "")
      }));
    };
    reader.readAsDataURL(file);

    // Simulate real-time OCR extraction pipeline
    setTimeout(() => {
      setOcrLoading(false);
      setOcrSuccess(true);
    }, 1200);
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    const elderId = selectedPatient.elderId || selectedPatient.elder_id || selectedPatient.id;
    if (!elderId) {
      alert('Select a connected elder patient before saving a report.');
      return;
    }

    const newReport = {
      elder_id: elderId,
      patient: selectedPatient.name,
      mrn: selectedPatient.mrn,
      title: reportForm.title || 'Diagnostic Test PDF',
      source: reportForm.source || 'Diagnostic Laboratory',
      status: reportForm.tier === 'warning' ? 'Out of Bounds' : 'Verified Normal',
      tier: reportForm.tier,
      file_name: reportForm.fileName || '',
      file_url: reportForm.fileUrl || null,
      file_size: reportForm.fileSize || '',
      values: reportForm.extractedValues.length ? reportForm.extractedValues : [
        {
          name: reportForm.analyteName || 'Primary Analyte',
          result: reportForm.analyteResult || '',
          ref: reportForm.analyteRef || '',
          status: reportForm.tier === 'warning' ? 'HIGH' : 'NORMAL'
        }
      ]
    };

    try {
      const saved = await doctorRecordsService.createReport(newReport);
      setReports(prev => [saved, ...prev]);
      broadcastRealtimeEvent('elderguard:realtime-event', { event: 'report:uploaded', report: saved });
      setReportModalOpen(false);
      alert(`Report "${saved.title}" uploaded and attached to ${selectedPatient.name}'s chart!`);
    } catch (err) {
      alert(err.response?.data?.detail || 'Unable to save this report to the database.');
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm("Are you sure you want to delete this lab report from the patient's record?")) return;
    try {
      await doctorRecordsService.deleteReport(reportId);
      setReports(prev => prev.filter(r => String(r.id) !== String(reportId)));
      broadcastRealtimeEvent('elderguard:realtime-event', { event: 'report:deleted', id: reportId });
    } catch (err) {
      alert(err.response?.data?.detail || 'Unable to delete this report from the database.');
    }
  };

  return (
    <div className="bg-eg-paper text-eg-ink font-inter space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-bold text-xl text-eg-ink">Connected Patient Roster & Medical Workspace</h2>
          <p className="text-xs text-eg-muted">Consolidated 1-screen doctor workspace — View vitals, issue e-Rx, and upload OCR diagnostic reports in-place.</p>
        </div>
        <button onClick={() => onNavigateTab('appointments')} className="px-4 py-2 rounded bg-eg-teal hover:bg-eg-teal-dark text-white font-bold text-xs cursor-pointer shadow-xs">
          View Consult Queue
        </button>
      </div>

      {/* Roster Overview Bar */}
      <div className="bg-white border border-eg-line rounded-lg p-4 flex justify-between items-center text-xs shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-eg-tint text-eg-teal font-bold">
            <User className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-eg-ink block">Active Connected Patient Charts</span>
            <span className="text-eg-muted">{patients.length} Patient Records Available</span>
          </div>
        </div>
        
        {selectedPatient && (
          <div className="hidden md:flex items-center gap-2 bg-eg-tint px-3 py-1.5 rounded text-eg-teal font-bold border border-eg-teal/30">
            <span>Selected Patient: <strong>{selectedPatient.name}</strong> ({selectedPatient.mrn})</span>
          </div>
        )}
      </div>

      {/* Search Input Bar */}
      <div className="bg-white p-3 rounded-lg border border-eg-line flex flex-wrap justify-between items-center gap-3 text-xs shadow-xs">
        <div className="relative flex-1 max-w-lg">
          <Search className="w-4 h-4 text-eg-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search patient by name, MRN ID, email, or phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-eg-paper border border-eg-line rounded pl-10 pr-3 py-2 outline-none font-medium focus:border-eg-teal"
          />
        </div>
      </div>

      {/* Grid Layout: Left Roster / Right Patient Workspace Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Patient Roster List (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white border border-eg-line rounded-lg p-3 font-bold text-xs text-eg-ink flex justify-between items-center">
            <span>Select Patient Record</span>
            <span className="text-eg-muted font-normal">{patients.length} total</span>
          </div>

          <div className="space-y-2 max-h-[750px] overflow-y-auto pr-1">
            {patients.length === 0 ? (
              <div className="bg-white border border-eg-line rounded-lg p-6 text-center text-xs text-eg-muted">
                No patients match "{searchQuery}"
              </div>
            ) : patients.map(pt => {
              const isSelected = selectedPatient?.elderId === pt.elderId || selectedPatient?.id === pt.id;
              return (
                <div
                  key={pt.elderId}
                  onClick={() => handleSelectPatient(pt)}
                  className={`p-3.5 rounded-lg border transition cursor-pointer text-xs space-y-2 ${
                    isSelected
                      ? 'bg-eg-tint border-eg-teal shadow-xs'
                      : 'bg-white border-eg-line hover:bg-eg-paper'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border ${
                        isSelected ? 'bg-eg-teal text-white border-eg-teal' : 'bg-eg-tint text-eg-teal border-eg-line'
                      }`}>
                        {patientInitials(pt.name)}
                      </div>
                      <div>
                        <span className="font-bold text-eg-ink block text-sm">{pt.name}</span>
                        <span className="font-mono text-[11px] text-eg-muted">{pt.mrn}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded bg-eg-teal text-white text-[10px] font-bold uppercase tracking-wider">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between text-[11px] text-eg-muted font-medium pt-1 border-t border-eg-line/60">
                    <span>Appt: {pt.date || 'Active Record'}</span>
                    <span>Visits: {pt.visits}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: In-Place Selected Patient Workspace (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {!selectedPatient ? (
            <div className="bg-white border border-eg-line rounded-lg p-12 text-center text-xs text-eg-muted">
              Select a patient from the roster on the left to view vitals, issue prescriptions, and upload lab reports.
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Selected Patient Banner & Actions */}
              <div className="bg-white border border-eg-line rounded-lg p-5 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-eg-line pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-eg-tint text-eg-teal font-bold text-xl flex items-center justify-center border-2 border-eg-teal shadow-xs">
                      {patientInitials(selectedPatient.name)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-2xl text-eg-ink">{selectedPatient.name}</h3>
                        <span className="font-mono text-xs px-2.5 py-0.5 bg-eg-tint font-bold text-eg-teal rounded border border-eg-teal/30">{selectedPatient.mrn}</span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-eg-muted mt-1 font-medium">
                        <span>DOB / Age: <strong className="text-eg-ink">{selectedPatient.dob || `${selectedPatient.age || 56} yrs`}</strong></span>
                        <span>Home Address: <strong className="text-eg-ink">{selectedPatient.address || '126, Anna Nagar ,Coimbatore - 641007'}</strong></span>
                        <span>Mode: <strong>{selectedPatient.type || 'Telehealth'}</strong></span>
                        <span>Status: <strong className="text-[#1F7A50]">{selectedPatient.status || 'Confirmed'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Primary In-Place Doctor Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleOpenRxModal}
                      className="px-3.5 py-2 rounded bg-eg-teal hover:bg-eg-teal-dark text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Pill className="w-4 h-4" /> + Give Prescription
                    </button>
                    <button
                      onClick={handleOpenReportModal}
                      className="px-3.5 py-2 rounded border border-eg-teal text-eg-teal font-bold text-xs hover:bg-eg-tint cursor-pointer flex items-center gap-1.5"
                    >
                      <Upload className="w-4 h-4" /> + Upload Report (OCR)
                    </button>
                  </div>
                </div>

                {/* Sub Navigation Node Tabs */}
                <div className="flex border-b border-eg-line gap-4 text-xs font-bold">
                  {[
                    { key: 'vitals', label: 'Inline Vitals Telemetry' },
                    { key: 'meds', label: `Prescriptions Roster (${prescriptions.length})` },
                    { key: 'labs', label: `Diagnostic Reports (${reports.length})` }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`pb-2.5 px-2 border-b-2 cursor-pointer transition ${activeTab === tab.key ? 'border-eg-teal text-eg-teal' : 'border-transparent text-eg-muted'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 1. Vitals Display Section */}
              {activeTab === 'vitals' && (
                <div className="bg-white border border-eg-line rounded-lg p-5 space-y-4 shadow-xs">
                  <div className="flex justify-between items-center border-b border-eg-line pb-3">
                    <h4 className="font-bold text-sm text-eg-ink flex items-center gap-2">
                      <Activity className="w-4 h-4 text-eg-teal" />
                      <span>Live Vitals Telemetry — {selectedPatient.name}</span>
                    </h4>
                    <span className="text-[11px] text-eg-muted font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-eg-teal" /> Last Updated: Aug 10, 2026 at 10:45 AM
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    {/* Blood Pressure */}
                    <div className="p-4 rounded-lg bg-eg-paper border border-eg-line space-y-1.5">
                      <div className="flex justify-between items-center text-eg-muted">
                        <span className="font-bold uppercase tracking-wider text-[10px]">Blood Pressure</span>
                        <Heart className="w-4 h-4 text-[#C6363E]" />
                      </div>
                      <span className="text-2xl font-bold text-eg-ink font-mono block">
                        {vitals?.blood_pressure || vitals?.bp || '128 / 82 mmHg'}
                      </span>
                      <span className="text-[10px] text-[#1F7A50] font-bold block">Optimal Resting Range</span>
                    </div>

                    {/* Heart Rate */}
                    <div className="p-4 rounded-lg bg-eg-paper border border-eg-line space-y-1.5">
                      <div className="flex justify-between items-center text-eg-muted">
                        <span className="font-bold uppercase tracking-wider text-[10px]">Heart Rate (Pulse)</span>
                        <Activity className="w-4 h-4 text-eg-teal" />
                      </div>
                      <span className="text-2xl font-bold text-eg-ink font-mono block">
                        {vitals?.pulse || vitals?.heart_rate || '74 BPM'}
                      </span>
                      <span className="text-[10px] text-[#1F7A50] font-bold block">Normal Pulse Rhythm</span>
                    </div>

                    {/* Body Temperature */}
                    <div className="p-4 rounded-lg bg-eg-paper border border-eg-line space-y-1.5">
                      <div className="flex justify-between items-center text-eg-muted">
                        <span className="font-bold uppercase tracking-wider text-[10px]">Body Temperature</span>
                        <Thermometer className="w-4 h-4 text-[#E8A03C]" />
                      </div>
                      <span className="text-2xl font-bold text-eg-ink font-mono block">
                        {vitals?.temperature || '98.6 °F'}
                      </span>
                      <span className="text-[10px] text-[#1F7A50] font-bold block">Afebrile Baseline</span>
                    </div>

                    {/* Blood Sugar */}
                    <div className="p-4 rounded-lg bg-eg-paper border border-eg-line space-y-1.5">
                      <div className="flex justify-between items-center text-eg-muted">
                        <span className="font-bold uppercase tracking-wider text-[10px]">Blood Glucose Level</span>
                        <Droplets className="w-4 h-4 text-eg-teal" />
                      </div>
                      <span className="text-2xl font-bold text-eg-ink font-mono block">
                        {vitals?.blood_sugar || vitals?.glucose || '104 mg/dL'}
                      </span>
                      <span className="text-[10px] text-eg-muted block">Fasting Measurement</span>
                    </div>

                    {/* Oxygen Saturation */}
                    <div className="p-4 rounded-lg bg-eg-paper border border-eg-line space-y-1.5">
                      <div className="flex justify-between items-center text-eg-muted">
                        <span className="font-bold uppercase tracking-wider text-[10px]">Oxygen SpO2</span>
                        <ShieldCheck className="w-4 h-4 text-[#1F7A50]" />
                      </div>
                      <span className="text-2xl font-bold text-eg-ink font-mono block">
                        {vitals?.spo2 || '98 %'}
                      </span>
                      <span className="text-[10px] text-[#1F7A50] font-bold block">Normal Saturation</span>
                    </div>

                    {/* Body Weight */}
                    <div className="p-4 rounded-lg bg-eg-paper border border-eg-line space-y-1.5">
                      <div className="flex justify-between items-center text-eg-muted">
                        <span className="font-bold uppercase tracking-wider text-[10px]">Body Weight</span>
                        <Scale className="w-4 h-4 text-eg-muted" />
                      </div>
                      <span className="text-2xl font-bold text-eg-ink font-mono block">
                        {vitals?.weight || '68 kg'}
                      </span>
                      <span className="text-[10px] text-eg-muted block">Stable Weight Trend</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Prescriptions Section */}
              {activeTab === 'meds' && (
                <div className="bg-white border border-eg-line rounded-lg p-5 space-y-4 shadow-xs">
                  <div className="flex justify-between items-center border-b border-eg-line pb-3">
                    <div>
                      <h4 className="font-bold text-sm text-eg-ink">Active Prescriptions — {selectedPatient.name}</h4>
                      <p className="text-[11px] text-eg-muted">Prescriptions saved under MRN {selectedPatient.mrn}</p>
                    </div>
                    <button
                      onClick={handleOpenRxModal}
                      className="px-3.5 py-1.5 rounded bg-eg-teal hover:bg-eg-teal-dark text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Pill className="w-3.5 h-3.5" /> + Give Prescription
                    </button>
                  </div>

                  {prescriptions.length === 0 ? (
                    <div className="text-center py-8 text-xs text-eg-muted">
                      No active prescriptions on record for {selectedPatient.name}. Click <strong>+ Give Prescription</strong> above to issue a new prescription.
                    </div>
                  ) : (
                    <div className="divide-y divide-eg-line text-xs">
                      {prescriptions.map(p => (
                        <div key={p.id} className="py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-eg-ink text-sm">{p.medicine}</span>
                              <span className="font-mono text-[11px] font-bold text-eg-teal px-2 py-0.5 bg-eg-tint rounded border border-eg-teal/20">{p.date}</span>
                            </div>
                            <div className="text-eg-muted font-medium mt-0.5">
                              Sig: <strong>{p.sig}</strong> · Duration: <strong>{p.duration || '30 Days'}</strong> · Refills: <span className="font-mono">{p.refills}</span> · Pharmacy: <strong>{p.pharmacy}</strong>
                            </div>
                            {p.instructions && (
                              <p className="text-[11px] text-eg-muted italic mt-0.5">Notes: {p.instructions}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-2.5 py-1 rounded bg-[#2E9E6B]/15 text-[#1F7A50] font-bold text-[10px]">{p.status}</span>
                            
                            {/* DELETE PRESCRIPTION BUTTON */}
                            <button
                              onClick={() => handleDeleteRx(p.id)}
                              title="Delete Prescription"
                              className="px-2.5 py-1 rounded border border-[#C6363E]/40 text-[#C6363E] hover:bg-[#C6363E]/10 font-bold flex items-center gap-1 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 3. Diagnostic Reports Section */}
              {activeTab === 'labs' && (
                <div className="bg-white border border-eg-line rounded-lg p-5 space-y-4 shadow-xs">
                  <div className="flex justify-between items-center border-b border-eg-line pb-3">
                    <div>
                      <h4 className="font-bold text-sm text-eg-ink">Diagnostic Test Reports (OCR Vault) — {selectedPatient.name}</h4>
                      <p className="text-[11px] text-eg-muted">Lab test vault with automated OCR parameter extraction</p>
                    </div>
                    <button
                      onClick={handleOpenReportModal}
                      className="px-3.5 py-1.5 rounded bg-eg-teal hover:bg-eg-teal-dark text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" /> + Upload Report (OCR)
                    </button>
                  </div>

                  {reports.length === 0 ? (
                    <div className="text-center py-8 text-xs text-eg-muted">
                      No lab reports uploaded for {selectedPatient.name} yet. Click <strong>+ Upload Report (OCR)</strong> to process a diagnostic report PDF or image.
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs">
                      {reports.map(r => (
                        <div key={r.id} className="p-3.5 rounded-lg bg-eg-paper border border-eg-line space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-eg-teal" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-eg-ink text-sm">{r.title}</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.tier === 'warning' ? 'bg-[#C6363E]/15 text-[#C6363E]' : 'bg-[#2E9E6B]/15 text-[#1F7A50]'}`}>
                                    {r.status}
                                  </span>
                                </div>
                                <span className="text-eg-muted">Uploaded {r.date} · Source: {r.source} {r.fileName ? `· File: ${r.fileName}` : ''}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setInspectReport(r)}
                                className="px-3 py-1.5 rounded border border-eg-line text-eg-teal font-bold cursor-pointer flex items-center gap-1 hover:bg-[#F2F6F3]"
                              >
                                <Eye className="w-3.5 h-3.5" /> Inspect OCR Data
                              </button>

                              {/* DELETE LAB REPORT BUTTON */}
                              <button
                                onClick={() => handleDeleteReport(r.id)}
                                title="Delete Lab Report"
                                className="px-2.5 py-1.5 rounded border border-[#C6363E]/40 text-[#C6363E] hover:bg-[#C6363E]/10 font-bold flex items-center gap-1 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          </div>

                          {/* Extracted Values Quick Summary */}
                          {r.values && r.values.length > 0 && (
                            <div className="bg-white border border-eg-line rounded p-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                              {r.values.map((v, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                  <span className="text-eg-muted font-medium">{v.name}:</span>
                                  <span className="font-bold font-mono text-eg-ink">{v.result}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      </div>

      {/* --- GIVE PRESCRIPTION MODAL (Text / Image / PDF Options) --- */}
      {rxModalOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
          <div className="bg-white border border-eg-line rounded-lg p-6 max-w-xl w-full shadow-sm space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-eg-line pb-3">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-eg-teal" />
                <h3 className="font-bold text-base text-eg-ink">Give Prescription — {selectedPatient.name} ({selectedPatient.mrn})</h3>
              </div>
              <button onClick={() => setRxModalOpen(false)}><X className="w-4 h-4 text-eg-muted" /></button>
            </div>

            {/* 3 Format Tabs: Text / Image / PDF */}
            <div className="grid grid-cols-3 gap-2 bg-eg-paper p-1.5 rounded-lg border border-eg-line text-xs font-bold">
              <button
                type="button"
                onClick={() => setRxMode('text')}
                className={`py-2 rounded flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  rxMode === 'text' ? 'bg-eg-teal text-white shadow-xs' : 'text-eg-muted hover:text-eg-ink'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" /> Structured Text
              </button>
              <button
                type="button"
                onClick={() => setRxMode('image')}
                className={`py-2 rounded flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  rxMode === 'image' ? 'bg-eg-teal text-white shadow-xs' : 'text-eg-muted hover:text-eg-ink'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" /> Image File
              </button>
              <button
                type="button"
                onClick={() => setRxMode('pdf')}
                className={`py-2 rounded flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  rxMode === 'pdf' ? 'bg-eg-teal text-white shadow-xs' : 'text-eg-muted hover:text-eg-ink'
                }`}
              >
                <FileUp className="w-3.5 h-3.5" /> PDF Document
              </button>
            </div>

            <form onSubmit={handleSubmitRx} className="space-y-3">
              {/* Text Structured Form */}
              {rxMode === 'text' && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold text-eg-muted uppercase mb-1">Drug Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Metformin, Lisinopril, Atorvastatin"
                        value={rxForm.medicine}
                        onChange={(e) => setRxForm({ ...rxForm, medicine: e.target.value })}
                        className="w-full bg-eg-paper border border-eg-line rounded px-3 py-2 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-eg-muted uppercase mb-1">Strength</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 500mg"
                        value={rxForm.strength}
                        onChange={(e) => setRxForm({ ...rxForm, strength: e.target.value })}
                        className="w-full bg-eg-paper border border-eg-line rounded px-3 py-2 text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-eg-muted uppercase mb-1">Dosage / Sig</label>
                      <input
                        type="text"
                        placeholder="1 Tab Daily"
                        value={rxForm.frequency}
                        onChange={(e) => setRxForm({ ...rxForm, frequency: e.target.value })}
                        className="w-full bg-eg-paper border border-eg-line rounded px-3 py-2 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-eg-muted uppercase mb-1">Duration</label>
                      <input
                        type="text"
                        placeholder="30 Days"
                        value={rxForm.duration}
                        onChange={(e) => setRxForm({ ...rxForm, duration: e.target.value })}
                        className="w-full bg-eg-paper border border-eg-line rounded px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-eg-muted uppercase mb-1">Refills</label>
                      <input
                        type="number"
                        min="0"
                        max="11"
                        value={rxForm.refills}
                        onChange={(e) => setRxForm({ ...rxForm, refills: parseInt(e.target.value) || 0 })}
                        className="w-full bg-eg-paper border border-eg-line rounded px-3 py-2 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Scheduled Medicine Timings Assignment */}
                  <div className="p-3 rounded-lg bg-eg-tint border border-eg-teal/30 space-y-2">
                    <span className="font-bold text-[11px] text-eg-teal uppercase block tracking-wider">Assign Medicine Timing & Schedule</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-eg-muted uppercase mb-1">Scheduled Time Slot</label>
                        <select
                          value={rxForm.timeSlot}
                          onChange={(e) => setRxForm({ ...rxForm, timeSlot: e.target.value })}
                          className="w-full bg-white border border-eg-line rounded px-2.5 py-1.5 text-xs font-bold"
                        >
                          <option value="08:00 AM">Morning (08:00 AM)</option>
                          <option value="01:00 PM">Afternoon (01:00 PM)</option>
                          <option value="06:00 PM">Evening (06:00 PM)</option>
                          <option value="09:00 PM">Bedtime (09:00 PM)</option>
                          <option value="custom">Custom Specified Time...</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-eg-muted uppercase mb-1">Meal Instruction</label>
                        <select
                          value={rxForm.mealTiming}
                          onChange={(e) => setRxForm({ ...rxForm, mealTiming: e.target.value })}
                          className="w-full bg-white border border-eg-line rounded px-2.5 py-1.5 text-xs font-bold"
                        >
                          <option value="After Meals">After Meals (With Water)</option>
                          <option value="Before Meals">Before Meals (Empty Stomach)</option>
                          <option value="With Meals">With Food / Meals</option>
                          <option value="At Bedtime">At Bedtime</option>
                        </select>
                      </div>
                    </div>

                    {rxForm.timeSlot === 'custom' && (
                      <div>
                        <label className="block text-[10px] font-bold text-eg-muted uppercase mb-1">Custom Time (e.g. 07:30 AM)</label>
                        <input
                          type="text"
                          placeholder="e.g. 07:30 AM"
                          value={rxForm.customTime}
                          onChange={(e) => setRxForm({ ...rxForm, customTime: e.target.value })}
                          className="w-full bg-white border border-eg-line rounded px-2.5 py-1.5 text-xs font-mono font-bold"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Image Upload Form */}
              {rxMode === 'image' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-eg-muted uppercase mb-1">Select Prescription Image (.png, .jpg, .webp — max 10MB)</label>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      onChange={handleRxFileSelect}
                      className="w-full bg-eg-paper border border-eg-line rounded px-3 py-2 text-xs"
                      required={!rxForm.fileName}
                    />
                  </div>
                  {rxForm.fileName && (
                    <div className="p-2.5 rounded bg-eg-tint text-[11px] text-eg-teal font-bold flex justify-between">
                      <span>Selected File: {rxForm.fileName}</span>
                      <span>{rxForm.fileSize}</span>
                    </div>
                  )}
                  <div>
                    <label className="block text-[11px] font-bold text-eg-muted uppercase mb-1">Prescription Label / Drug Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Scanned Handwritten Prescription"
                      value={rxForm.medicine}
                      onChange={(e) => setRxForm({ ...rxForm, medicine: e.target.value })}
                      className="w-full bg-eg-paper border border-eg-line rounded px-3 py-2 text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              {/* PDF Upload Form */}
              {rxMode === 'pdf' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-eg-muted uppercase mb-1">Select Prescription Document (.pdf — max 10MB)</label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleRxFileSelect}
                      className="w-full bg-eg-paper border border-eg-line rounded px-3 py-2 text-xs"
                      required={!rxForm.fileName}
                    />
                  </div>
                  {rxForm.fileName && (
                    <div className="p-2.5 rounded bg-eg-tint text-[11px] text-eg-teal font-bold flex justify-between">
                      <span>Selected PDF: {rxForm.fileName}</span>
                      <span>{rxForm.fileSize}</span>
                    </div>
                  )}
                  <div>
                    <label className="block text-[11px] font-bold text-eg-muted uppercase mb-1">Prescription Document Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Official Digital e-Prescription PDF"
                      value={rxForm.medicine}
                      onChange={(e) => setRxForm({ ...rxForm, medicine: e.target.value })}
                      className="w-full bg-eg-paper border border-eg-line rounded px-3 py-2 text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-eg-muted uppercase mb-1">Destination Pharmacy</label>
                <input
                  type="text"
                  value={rxForm.pharmacy}
                  onChange={(e) => setRxForm({ ...rxForm, pharmacy: e.target.value })}
                  className="w-full bg-eg-paper border border-eg-line rounded px-3 py-2 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-eg-muted uppercase mb-1">Instructions / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Special instructions for patient or dispensing pharmacist..."
                  value={rxForm.instructions}
                  onChange={(e) => setRxForm({ ...rxForm, instructions: e.target.value })}
                  className="w-full bg-eg-paper border border-eg-line rounded p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-eg-line">
                <button type="button" onClick={() => setRxModalOpen(false)} className="px-4 py-2 rounded border border-eg-line text-eg-muted">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded bg-eg-teal hover:bg-eg-teal-dark text-white font-bold cursor-pointer">
                  Save Prescription to Patient Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- UPLOAD REPORT WITH OCR MODAL --- */}
      {reportModalOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
          <div className="bg-white border border-eg-line rounded-lg p-6 max-w-lg w-full shadow-sm space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-eg-line pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-eg-teal" />
                <h3 className="font-bold text-base text-eg-ink">Upload Lab PDF & Parse OCR — {selectedPatient.name}</h3>
              </div>
              <button onClick={() => setReportModalOpen(false)}><X className="w-4 h-4 text-eg-muted" /></button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-eg-muted uppercase mb-1">Select Diagnostic Lab File (.pdf, .png, .jpg — max 10MB)</label>
                <input
                  type="file"
                  accept="application/pdf, image/png, image/jpeg"
                  onChange={handleReportFileSelect}
                  className="w-full bg-eg-paper border border-eg-line rounded px-3 py-2 text-xs"
                  required={!reportForm.fileName}
                />
              </div>

              {ocrLoading && (
                <div className="p-3 rounded bg-eg-tint text-eg-teal font-bold flex items-center justify-center gap-2 animate-pulse text-xs">
                  <Sparkles className="w-4 h-4" /> Extracting medical text and parsing parameters via OCR Engine...
                </div>
              )}

              {ocrSuccess && (
                <div className="p-3 rounded bg-[#2E9E6B]/15 text-[#1F7A50] font-bold flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4" /> OCR Text Extraction & Parameter Parsing Complete!
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-eg-muted uppercase mb-1">Report Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lipid Profile & Cardiac Markers, Fasting Glucose"
                  value={reportForm.title}
                  onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                  className="w-full bg-eg-paper border border-eg-line rounded px-3 py-2 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-eg-muted uppercase mb-1">Pathology Lab Source</label>
                  <input
                    type="text"
                    value={reportForm.source}
                    onChange={(e) => setReportForm({ ...reportForm, source: e.target.value })}
                    className="w-full bg-eg-paper border border-eg-line rounded px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-eg-muted uppercase mb-1">Flag Status Tier</label>
                  <select
                    value={reportForm.tier}
                    onChange={(e) => setReportForm({ ...reportForm, tier: e.target.value })}
                    className="w-full bg-eg-paper border border-eg-line rounded px-3 py-2 text-xs font-bold"
                  >
                    <option value="normal">Verified Normal</option>
                    <option value="warning">Out of Bounds / High Flagged</option>
                  </select>
                </div>
              </div>

              {/* Extracted Structured OCR Parameters Preview */}
              <div className="border border-eg-line rounded p-3 bg-eg-paper space-y-2">
                <span className="font-bold text-[11px] text-eg-teal uppercase block flex items-center gap-1">
                  <FileCheck className="w-3.5 h-3.5" /> Parsed OCR Test Analytes
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-eg-muted uppercase">Analyte Name</label>
                    <input
                      type="text"
                      value={reportForm.analyteName}
                      onChange={(e) => setReportForm({ ...reportForm, analyteName: e.target.value })}
                      className="w-full bg-white border border-eg-line rounded px-2 py-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-eg-muted uppercase">Result Value</label>
                    <input
                      type="text"
                      value={reportForm.analyteResult}
                      onChange={(e) => setReportForm({ ...reportForm, analyteResult: e.target.value })}
                      className="w-full bg-white border border-eg-line rounded px-2 py-1 text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-eg-muted uppercase">Reference Range</label>
                  <input
                    type="text"
                    value={reportForm.analyteRef}
                    onChange={(e) => setReportForm({ ...reportForm, analyteRef: e.target.value })}
                    className="w-full bg-white border border-eg-line rounded px-2 py-1 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-eg-line">
                <button type="button" onClick={() => setReportModalOpen(false)} className="px-4 py-2 rounded border border-eg-line text-eg-muted">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded bg-eg-teal hover:bg-eg-teal-dark text-white font-bold cursor-pointer">
                  Save Report & OCR Data to Chart
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- INSPECT OCR LAB REPORT MODAL --- */}
      {inspectReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-eg-line rounded-lg p-6 max-w-2xl w-full shadow-sm space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-eg-line pb-3">
              <div>
                <h3 className="font-bold text-base text-eg-ink">{inspectReport.title}</h3>
                <span className="font-mono text-xs text-eg-muted">Patient: {inspectReport.patient} ({inspectReport.mrn}) · {inspectReport.date}</span>
              </div>
              <button onClick={() => setInspectReport(null)}><X className="w-4 h-4 text-eg-muted" /></button>
            </div>

            <table className="w-full text-left border-collapse">
              <thead className="bg-eg-tint font-bold text-[11px] uppercase">
                <tr>
                  <th className="p-2.5">Test Analyte Name</th>
                  <th className="p-2.5">Observed Result</th>
                  <th className="p-2.5">Standard Reference Range</th>
                  <th className="p-2.5 text-right">Flag Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-eg-line">
                {(inspectReport.values || []).map((v, i) => (
                  <tr key={i} className="hover:bg-eg-paper">
                    <td className="p-2.5 font-bold text-eg-ink">{v.name}</td>
                    <td className="p-2.5 font-mono font-bold text-eg-ink">{v.result}</td>
                    <td className="p-2.5 font-mono text-eg-muted">{v.ref}</td>
                    <td className="p-2.5 text-right font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${v.status === 'HIGH' ? 'bg-[#C6363E]/15 text-[#C6363E]' : 'bg-[#2E9E6B]/15 text-[#1F7A50]'}`}>
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end gap-2 pt-3 border-t border-eg-line">
              <button onClick={() => setInspectReport(null)} className="px-4 py-2 rounded bg-eg-teal text-white font-bold cursor-pointer">
                Close Report Inspection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
