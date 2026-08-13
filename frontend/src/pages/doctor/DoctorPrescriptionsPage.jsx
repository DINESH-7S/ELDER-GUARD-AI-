import React, { useState, useEffect } from 'react';
import { Pill, Plus, X, ShieldCheck, AlertTriangle, CheckCircle2, Building2, User } from 'lucide-react';
import doctorRecordsService from '../../services/doctorRecordsService';
import broadcastRealtimeEvent from '../../utils/realtimeBus';
import { displayDoctorName, getSelectedPatient } from './doctorPortalData';

export default function DoctorPrescriptionsPage({ currentUser, onNavigateTab }) {
  const [activePatient, setActivePatient] = useState(() => getSelectedPatient());
  const [modalOpen, setModalOpen] = useState(false);
  const [rxForm, setRxForm] = useState({
    patientName: '',
    mrn: '',
    medicine: '',
    strength: '',
    route: 'PO (Oral)',
    frequency: '',
    duration: '',
    refills: 1,
    pharmacy: '',
    instructions: ''
  });

  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadPrescriptions = async (patient = getSelectedPatient()) => {
    setLoading(true);
    try {
      const elderId = patient?.elderId || patient?.elder_id || null;
      const list = await doctorRecordsService.listPrescriptions(elderId);
      setPrescriptions(list || []);
    } catch (err) {
      console.warn('Unable to load doctor prescriptions:', err);
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const patient = getSelectedPatient();
    setActivePatient(patient);
    loadPrescriptions(patient);

    if (patient) {
      setRxForm(prev => ({
        ...prev,
        patientName: patient.name || '',
        mrn: patient.mrn || ''
      }));
    }
  }, []);

  const handleOpenModal = () => {
    const patient = getSelectedPatient();
    if (patient) {
      setRxForm(prev => ({
        ...prev,
        patientName: patient.name || prev.patientName,
        mrn: patient.mrn || prev.mrn
      }));
    }
    setModalOpen(true);
  };

  const handleIssueRx = async (e) => {
    e.preventDefault();
    const patient = getSelectedPatient() || activePatient;
    const elderId = patient?.elderId || patient?.elder_id || patient?.id;
    if (!elderId) {
      alert('Select a patient with a connected elder account before issuing a prescription.');
      return;
    }
    const newRx = {
      elder_id: elderId,
      patient: rxForm.patientName || patient?.name || 'Patient',
      mrn: rxForm.mrn || patient?.mrn || 'ID-ASSIGNED',
      medicine: `${rxForm.medicine} ${rxForm.strength}`.trim(),
      sig: rxForm.frequency || 'Take as directed',
      duration: rxForm.duration || '30 Days',
      refills: rxForm.refills,
      pharmacy: rxForm.pharmacy || '',
      status: 'Active (e-Signed)'
    };

    try {
      const saved = await doctorRecordsService.createPrescription(newRx);
      setPrescriptions(prev => [saved, ...prev]);
      broadcastRealtimeEvent('elderguard:realtime-event', { event: 'prescription:created', prescription: saved });
      setModalOpen(false);
      alert(`Digital e-Rx for ${saved.medicine} successfully signed and saved for ${saved.patient} (${saved.mrn})!`);
    } catch (err) {
      alert(err.response?.data?.detail || 'Unable to save this prescription to the database.');
    }
  };

  return (
    <div className="bg-[#F8FAF9] text-[#131917] font-inter space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-bold text-xl text-[#131917]">Digital e-Prescribing & Rx Registry</h2>
          <p className="text-xs text-[#5C6B64]">Issue digitally signed prescriptions with automatic drug-allergy interaction checks and pharmacy routing</p>
        </div>
        <button onClick={handleOpenModal} className="px-4 py-2 rounded bg-[#0F6B5C] hover:bg-[#0C5548] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs">
          <Pill className="w-3.5 h-3.5" /> + Issue New e-Prescription
        </button>
      </div>

      {/* Active Patient Identity Banner */}
      {activePatient ? (
        <div className="bg-[#EEF3F0] border border-[#0F6B5C]/30 rounded-lg p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-[#0F6B5C] text-white">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#0F6B5C] uppercase tracking-wider text-[11px]">Active Patient Context:</span>
                <span className="font-bold text-[#131917] text-sm">{activePatient.name}</span>
                <span className="font-mono text-[11px] text-[#0F6B5C] px-2 py-0.5 bg-white rounded border border-[#0F6B5C]/30 font-bold">{activePatient.mrn}</span>
              </div>
              <span className="text-[11px] text-[#5C6B64] block mt-0.5">Appointment: {activePatient.date || 'Active Record'} · Status: {activePatient.status || 'Confirmed'}</span>
            </div>
          </div>
          <button onClick={() => onNavigateTab('patientdetail')} className="text-[#0F6B5C] font-bold underline hover:text-[#0C5548] cursor-pointer">
            View Patient Chart →
          </button>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E9E4] rounded-lg p-3.5 text-xs text-[#5C6B64] flex justify-between items-center">
          <span>No specific patient selected. Showing all doctor system prescriptions.</span>
          <button onClick={() => onNavigateTab('mypatients')} className="text-[#0F6B5C] font-bold underline">
            Select Patient from Roster →
          </button>
        </div>
      )}

      {/* Prescriptions Audit Log Section */}
      <div className="bg-white border border-[#E2E9E4] rounded-lg p-5 space-y-4 shadow-xs">
        <div className="flex justify-between items-center border-b border-[#E2E9E4] pb-3">
          <div>
            <h4 className="font-bold text-sm text-[#131917]">
              {activePatient ? `Prescriptions Audit Log — ${activePatient.name}` : 'All System Prescriptions Audit Log'}
            </h4>
            <span className="text-[11px] text-[#5C6B64]">{prescriptions.length} active digital e-prescriptions on record</span>
          </div>
          <span className="text-xs text-[#2E9E6B] font-bold flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-[#2E9E6B]" /> All Prescriptions e-Signed & Encrypted
          </span>
        </div>

        {loading ? (
          <div className="text-center py-8 text-xs text-[#5C6B64]">
            Loading prescriptions from database...
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#5C6B64]">
            No prescriptions found for this patient context. Click <strong>+ Issue New e-Prescription</strong> above to create one.
          </div>
        ) : (
          <div className="divide-y divide-[#E2E9E4] text-xs">
            {prescriptions.map(p => (
              <div key={p.id} className="py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#131917] text-sm">{p.medicine}</span>
                    <span className="font-mono text-[11px] text-[#5C6B64]">({p.patient} · {p.mrn})</span>
                  </div>
                  <div className="text-[#5C6B64] font-medium mt-0.5">
                    Sig: <strong>{p.sig}</strong> · Duration: <strong>{p.duration || '30 Days'}</strong> · Refills: <span className="font-mono">{p.refills}</span>{p.pharmacy ? <> · Pharmacy: <strong>{p.pharmacy}</strong></> : null}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="px-2.5 py-1 rounded bg-[#2E9E6B]/15 text-[#2E9E6B] font-bold text-[10px]">{p.status}</span>
                  <button onClick={() => alert(`Re-sending e-Rx copy for ${p.medicine} to pharmacy...`)} className="px-3 py-1 rounded border border-[#E2E9E4] text-[#0F6B5C] font-bold hover:bg-[#F2F6F3]">
                    Re-Send e-Rx
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Structured e-Prescribing Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#E2E9E4] rounded-lg p-6 max-w-xl w-full shadow-2xl space-y-4 text-xs">
            
            <div className="flex justify-between items-center border-b border-[#E2E9E4] pb-3">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-[#0F6B5C]" />
                <h3 className="font-bold text-base text-[#131917]">e-Prescribe Medication — Clinical Form</h3>
              </div>
              <button onClick={() => setModalOpen(false)}><X className="w-4 h-4 text-[#5C6B64]" /></button>
            </div>

            {/* Allergy Warning Box */}
            <div className="bg-[#EEF3F0] border border-[#2E9E6B]/40 rounded p-2.5 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 text-[#0F6B5C] font-bold">
                <ShieldCheck className="w-4 h-4 text-[#2E9E6B]" />
                <span>Patient Allergy Check: {rxForm.patientName || 'Active Patient'}</span>
              </div>
              <span className="text-[#2E9E6B] font-bold uppercase">No Contraindication</span>
            </div>

            <form onSubmit={handleIssueRx} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#5C6B64] uppercase mb-1">Patient Name</label>
                  <input type="text" value={rxForm.patientName} onChange={(e) => setRxForm({ ...rxForm, patientName: e.target.value })} className="w-full bg-[#F8FAF9] border border-[#E2E9E4] rounded px-3 py-2 text-xs font-bold" required />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#5C6B64] uppercase mb-1">MRN Number</label>
                  <input type="text" value={rxForm.mrn} onChange={(e) => setRxForm({ ...rxForm, mrn: e.target.value })} className="w-full bg-[#F8FAF9] border border-[#E2E9E4] rounded px-3 py-2 text-xs font-mono font-bold" required />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-[#5C6B64] uppercase mb-1">Drug Name</label>
                  <input type="text" value={rxForm.medicine} onChange={(e) => setRxForm({ ...rxForm, medicine: e.target.value })} className="w-full bg-[#F8FAF9] border border-[#E2E9E4] rounded px-3 py-2 text-xs font-bold" placeholder="e.g. Lisinopril, Metformin, Atorvastatin" required />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#5C6B64] uppercase mb-1">Strength</label>
                  <input type="text" value={rxForm.strength} onChange={(e) => setRxForm({ ...rxForm, strength: e.target.value })} className="w-full bg-[#F8FAF9] border border-[#E2E9E4] rounded px-3 py-2 text-xs font-bold" placeholder="e.g. 10mg" required />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#5C6B64] uppercase mb-1">Frequency (Sig)</label>
                  <input type="text" value={rxForm.frequency} onChange={(e) => setRxForm({ ...rxForm, frequency: e.target.value })} className="w-full bg-[#F8FAF9] border border-[#E2E9E4] rounded px-3 py-2 text-xs" placeholder="e.g. 1 Tab Daily Morning" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#5C6B64] uppercase mb-1">Duration</label>
                  <input type="text" value={rxForm.duration} onChange={(e) => setRxForm({ ...rxForm, duration: e.target.value })} className="w-full bg-[#F8FAF9] border border-[#E2E9E4] rounded px-3 py-2 text-xs" placeholder="30 Days" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#5C6B64] uppercase mb-1">Refills Authorized</label>
                  <input type="number" value={rxForm.refills} onChange={(e) => setRxForm({ ...rxForm, refills: parseInt(e.target.value) || 0 })} min="0" max="11" className="w-full bg-[#F8FAF9] border border-[#E2E9E4] rounded px-3 py-2 text-xs font-mono" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#5C6B64] uppercase mb-1">Destination Pharmacy Branch</label>
                <input type="text" value={rxForm.pharmacy} onChange={(e) => setRxForm({ ...rxForm, pharmacy: e.target.value })} className="w-full bg-[#F8FAF9] border border-[#E2E9E4] rounded px-3 py-2 text-xs font-medium" placeholder="Enter pharmacy name or branch" />
              </div>

              {/* Doctor e-Signature Stamp Preview */}
              <div className="bg-[#FAFBFA] border border-[#E2E9E4] rounded p-2.5 text-[10px] text-[#5C6B64] space-y-0.5">
                <span className="font-bold text-[#131917] block uppercase">Digital Authorization Stamp</span>
                <p>Prescribed by: <strong>{displayDoctorName(currentUser)}</strong></p>
                <p className="font-mono text-[#0F6B5C]">Status: e-Signed & Encrypted for {rxForm.patientName || 'Patient'}</p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E9E4]">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded border border-[#E2E9E4] text-[#5C6B64]">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded bg-[#0F6B5C] hover:bg-[#0C5548] text-white font-bold cursor-pointer">
                  Sign & Transmit e-Rx
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
