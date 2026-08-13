import React, { useEffect, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import hospitalService from '../../services/hospitalService';

export default function HospitalPatientRegistryPage() {
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({ name: '', elder_id: '', assigned_doctor_id: '', status: '', notes: '' });
  const load = () => hospitalService.listPatients().then(setPatients).catch(() => setPatients([]));

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    await hospitalService.createPatient(form);
    setForm({ name: '', elder_id: '', assigned_doctor_id: '', status: '', notes: '' });
    load();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1520] tracking-tight">Patient Registry</h1>
        <p className="text-xs text-[#6B6272]">Hospital patient records are stored in the database.</p>
      </div>
      <form onSubmit={submit} className="bg-white border border-[#E8E3ED] rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Patient name" className="md:col-span-2 px-3 py-2 rounded border border-[#E8E3ED] bg-[#F8F7FA]" />
        <input value={form.elder_id} onChange={e => setForm({ ...form, elder_id: e.target.value })} placeholder="Elder user ID" className="px-3 py-2 rounded border border-[#E8E3ED] bg-[#F8F7FA]" />
        <input value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} placeholder="Status" className="px-3 py-2 rounded border border-[#E8E3ED] bg-[#F8F7FA]" />
        <button className="px-3 py-2 rounded bg-[#5B2A86] text-white font-bold flex items-center justify-center gap-1"><Plus className="w-3 h-3" /> Add</button>
      </form>
      <div className="bg-white border border-[#E8E3ED] rounded-xl overflow-hidden">
        {patients.length === 0 ? <div className="p-8 text-center text-xs text-[#6B6272]"><Users className="w-8 h-8 mx-auto mb-3 text-[#5B2A86]" />No hospital patients are registered yet.</div> : (
          <table className="w-full text-left text-xs"><thead className="bg-[#F1ECF6] uppercase text-[11px]"><tr><th className="p-3">Patient</th><th className="p-3">Elder ID</th><th className="p-3">Status</th><th className="p-3">Notes</th></tr></thead><tbody className="divide-y divide-[#E8E3ED]">{patients.map(patient => <tr key={patient.id}><td className="p-3 font-bold">{patient.name}</td><td className="p-3 font-mono">{patient.elder_id || 'Not linked'}</td><td className="p-3">{patient.status || 'Not set'}</td><td className="p-3">{patient.notes || ''}</td></tr>)}</tbody></table>
        )}
      </div>
    </div>
  );
}
