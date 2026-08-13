import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, Upload, X, FileCheck, CheckCircle2, User, Plus } from 'lucide-react';
import doctorRecordsService from '../../services/doctorRecordsService';
import broadcastRealtimeEvent from '../../utils/realtimeBus';
import { getSelectedPatient } from './doctorPortalData';

export default function DoctorReportsPage({ currentUser, onNavigateTab }) {
  const [activePatient, setActivePatient] = useState(() => getSelectedPatient());
  const [selectedReport, setSelectedReport] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  const [uploadForm, setUploadForm] = useState({
    title: '',
    source: '',
    tier: 'normal',
    analyteName: '',
    analyteResult: '',
    analyteRef: ''
  });

  const loadReports = async (patient = getSelectedPatient()) => {
    setLoading(true);
    try {
      const elderId = patient?.elderId || patient?.elder_id || null;
      const list = await doctorRecordsService.listReports(elderId);
      setReports(list || []);
    } catch (err) {
      console.warn('Unable to load doctor reports:', err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const patient = getSelectedPatient();
    setActivePatient(patient);
    loadReports(patient);
  }, []);

  const handleOpenUpload = () => {
    const patient = getSelectedPatient();
    setActivePatient(patient);
    setUploadModalOpen(true);
  };

  const handleSaveReport = async (e) => {
    e.preventDefault();
    const patient = getSelectedPatient() || activePatient;
    const elderId = patient?.elderId || patient?.elder_id || patient?.id;
    if (!elderId) {
      alert('Select a patient with a connected elder account before saving a report.');
      return;
    }
    const newReport = {
      elder_id: elderId,
      patient: patient?.name || 'Patient Record',
      mrn: patient?.mrn || 'ID-ASSIGNED',
      title: uploadForm.title || 'Diagnostic Test PDF',
      source: uploadForm.source || 'Diagnostic Laboratory',
      status: uploadForm.tier === 'warning' ? 'Out of Bounds' : 'Verified Normal',
      tier: uploadForm.tier,
      values: [
        {
          name: uploadForm.analyteName || 'Primary Diagnostic Marker',
          result: uploadForm.analyteResult || 'Normal Observed Value',
          ref: uploadForm.analyteRef || 'Standard Reference Range',
          status: uploadForm.tier === 'warning' ? 'HIGH' : 'NORMAL'
        }
      ]
    };

    try {
      const saved = await doctorRecordsService.createReport(newReport);
      setReports(prev => [saved, ...prev]);
      broadcastRealtimeEvent('elderguard:realtime-event', { event: 'report:uploaded', report: saved });
      setUploadModalOpen(false);
      alert(`Diagnostic lab report "${saved.title}" successfully uploaded and saved for ${saved.patient} (${saved.mrn})!`);
    } catch (err) {
      alert(err.response?.data?.detail || 'Unable to save this report to the database.');
    }
  };

  return (
    <div className="bg-[#F8FAF9] text-[#131917] font-inter space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-bold text-xl text-[#131917]">Diagnostic Reports & Lab Vault</h2>
          <p className="text-xs text-[#5C6B64]">Central diagnostic test repository with automatic reference range out-of-bounds flagging</p>
        </div>
        <button onClick={handleOpenUpload} className="px-4 py-2 rounded bg-[#0F6B5C] hover:bg-[#0C5548] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs">
          <Upload className="w-3.5 h-3.5" /> Upload Diagnostic Lab PDF
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
          <span>No specific patient selected. Showing all doctor system diagnostic reports.</span>
          <button onClick={() => onNavigateTab('mypatients')} className="text-[#0F6B5C] font-bold underline">
            Select Patient from Roster →
          </button>
        </div>
      )}

      {/* Reports Vault Main Container */}
      <div className="bg-white border border-[#E2E9E4] rounded-lg p-5 space-y-4 shadow-xs">
        <div className="flex justify-between items-center border-b border-[#E2E9E4] pb-3">
          <h4 className="font-bold text-sm text-[#131917]">
            {activePatient ? `Diagnostic Reports Vault — ${activePatient.name}` : 'All Diagnostic Test Reports'}
          </h4>
          <span className="text-xs text-[#5C6B64] font-medium">{reports.length} Reports Stored</span>
        </div>

        {loading ? (
          <div className="text-center py-8 text-xs text-[#5C6B64]">
            Loading diagnostic reports from database...
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#5C6B64]">
            No diagnostic reports uploaded yet for this patient context. Click <strong>Upload Diagnostic Lab PDF</strong> above to add test results.
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(r => (
              <div key={r.id} className="p-3.5 rounded bg-[#FAFBFA] border border-[#E2E9E4] flex justify-between items-center text-xs">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-[#0F6B5C]" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#131917] text-sm">{r.title}</span>
                      <span className="font-mono text-[11px] text-[#5C6B64]">({r.patient} · {r.mrn})</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.tier === 'warning' ? 'bg-[#C6363E]/15 text-[#C6363E]' : 'bg-[#2E9E6B]/15 text-[#2E9E6B]'}`}>
                        {r.status}
                      </span>
                    </div>
                    <span className="text-[#5C6B64]">Uploaded {r.date} · Source: {r.source}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setSelectedReport(r)} className="px-3 py-1.5 rounded border border-[#E2E9E4] text-[#0F6B5C] font-bold cursor-pointer flex items-center gap-1 hover:bg-[#F2F6F3]">
                    <Eye className="w-3.5 h-3.5" /> Inspect Values
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Diagnostic Report Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#E2E9E4] rounded-lg p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-[#E2E9E4] pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#0F6B5C]" />
                <h3 className="font-bold text-base text-[#131917]">Upload Lab PDF / Enter Test Report</h3>
              </div>
              <button onClick={() => setUploadModalOpen(false)}><X className="w-4 h-4 text-[#5C6B64]" /></button>
            </div>

            <div className="p-2.5 rounded bg-[#EEF3F0] text-[11px] text-[#0F6B5C] font-bold flex justify-between">
              <span>Patient: {activePatient?.name || 'Selected Patient'}</span>
              <span className="font-mono">{activePatient?.mrn || 'ID-ASSIGNED'}</span>
            </div>

            <form onSubmit={handleSaveReport} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#5C6B64] uppercase mb-1">Report Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lipid Profile, Complete Blood Count, Liver Function"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  className="w-full bg-[#F8FAF9] border border-[#E2E9E4] rounded px-3 py-2 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#5C6B64] uppercase mb-1">Testing Source / Lab Name</label>
                <input
                  type="text"
                  value={uploadForm.source}
                  onChange={(e) => setUploadForm({ ...uploadForm, source: e.target.value })}
                  className="w-full bg-[#F8FAF9] border border-[#E2E9E4] rounded px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#5C6B64] uppercase mb-1">Primary Test Analyte</label>
                  <input
                    type="text"
                    placeholder="e.g. Glucose, Hemoglobin"
                    value={uploadForm.analyteName}
                    onChange={(e) => setUploadForm({ ...uploadForm, analyteName: e.target.value })}
                    className="w-full bg-[#F8FAF9] border border-[#E2E9E4] rounded px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#5C6B64] uppercase mb-1">Observed Value</label>
                  <input
                    type="text"
                    placeholder="e.g. 110 mg/dL"
                    value={uploadForm.analyteResult}
                    onChange={(e) => setUploadForm({ ...uploadForm, analyteResult: e.target.value })}
                    className="w-full bg-[#F8FAF9] border border-[#E2E9E4] rounded px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#5C6B64] uppercase mb-1">Standard Reference Range</label>
                <input
                  type="text"
                  placeholder="e.g. 70 - 99 mg/dL"
                  value={uploadForm.analyteRef}
                  onChange={(e) => setUploadForm({ ...uploadForm, analyteRef: e.target.value })}
                  className="w-full bg-[#F8FAF9] border border-[#E2E9E4] rounded px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#5C6B64] uppercase mb-1">Result Status Tier</label>
                <select
                  value={uploadForm.tier}
                  onChange={(e) => setUploadForm({ ...uploadForm, tier: e.target.value })}
                  className="w-full bg-[#F8FAF9] border border-[#E2E9E4] rounded px-3 py-2 text-xs font-bold"
                >
                  <option value="normal">Normal / In Range</option>
                  <option value="warning">Out of Bounds / High Flagged</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E9E4]">
                <button type="button" onClick={() => setUploadModalOpen(false)} className="px-4 py-2 rounded border border-[#E2E9E4] text-[#5C6B64]">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded bg-[#0F6B5C] hover:bg-[#0C5548] text-white font-bold cursor-pointer">
                  Save Report to Chart
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lab Report Values Inspection Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#E2E9E4] rounded-lg p-6 max-w-2xl w-full shadow-2xl space-y-4 text-xs">
            
            <div className="flex justify-between items-center border-b border-[#E2E9E4] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#131917]">{selectedReport.title}</h3>
                <span className="font-mono text-xs text-[#5C6B64]">Patient: {selectedReport.patient} ({selectedReport.mrn}) · {selectedReport.date}</span>
              </div>
              <button onClick={() => setSelectedReport(null)}><X className="w-4 h-4 text-[#5C6B64]" /></button>
            </div>

            <table className="w-full text-left border-collapse">
              <thead className="bg-[#EEF3F0] font-bold text-[11px] uppercase">
                <tr>
                  <th className="p-2.5">Test Analyte Name</th>
                  <th className="p-2.5">Observed Result</th>
                  <th className="p-2.5">Standard Reference Range</th>
                  <th className="p-2.5 text-right">Flag Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E9E4]">
                {(selectedReport.values || []).map((v, i) => (
                  <tr key={i} className="hover:bg-[#F8FAF9]">
                    <td className="p-2.5 font-bold text-[#131917]">{v.name}</td>
                    <td className="p-2.5 font-mono font-bold text-[#131917]">{v.result}</td>
                    <td className="p-2.5 font-mono text-[#5C6B64]">{v.ref}</td>
                    <td className="p-2.5 text-right font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${v.status === 'HIGH' ? 'bg-[#C6363E]/15 text-[#C6363E]' : 'bg-[#2E9E6B]/15 text-[#2E9E6B]'}`}>
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E9E4]">
              <button onClick={() => setSelectedReport(null)} className="px-4 py-2 rounded bg-[#0F6B5C] text-white font-bold cursor-pointer">
                Close Report Sheet
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
