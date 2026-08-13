import React, { useEffect, useState } from 'react';
import { Calendar, Plus } from 'lucide-react';
import hospitalService from '../../services/hospitalService';

export default function HospitalAppointmentsQueuePage() {
  const [queue, setQueue] = useState([]);
  const [form, setForm] = useState({ patient_name: '', queue_token: '', status: '', priority: '', reason: '' });
  const load = () => hospitalService.listQueue().then(setQueue).catch(() => setQueue([]));

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.patient_name.trim()) return;
    await hospitalService.createQueueEntry(form);
    setForm({ patient_name: '', queue_token: '', status: '', priority: '', reason: '' });
    load();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1520] tracking-tight">Appointments Queue</h1>
        <p className="text-xs text-[#6B6272]">Hospital queue records are stored in the database.</p>
      </div>
      <form onSubmit={submit} className="bg-white border border-[#E8E3ED] rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
        <input value={form.patient_name} onChange={e => setForm({ ...form, patient_name: e.target.value })} placeholder="Patient name" className="md:col-span-2 px-3 py-2 rounded border border-[#E8E3ED] bg-[#F8F7FA]" />
        <input value={form.queue_token} onChange={e => setForm({ ...form, queue_token: e.target.value })} placeholder="Queue token" className="px-3 py-2 rounded border border-[#E8E3ED] bg-[#F8F7FA]" />
        <input value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} placeholder="Status" className="px-3 py-2 rounded border border-[#E8E3ED] bg-[#F8F7FA]" />
        <button className="px-3 py-2 rounded bg-[#5B2A86] text-white font-bold flex items-center justify-center gap-1"><Plus className="w-3 h-3" /> Add</button>
      </form>
      <div className="bg-white border border-[#E8E3ED] rounded-xl overflow-hidden">
        {queue.length === 0 ? <div className="p-8 text-center text-xs text-[#6B6272]"><Calendar className="w-8 h-8 mx-auto mb-3 text-[#5B2A86]" />No hospital appointment queue records are available yet.</div> : (
          <table className="w-full text-left text-xs"><thead className="bg-[#F1ECF6] uppercase text-[11px]"><tr><th className="p-3">Token</th><th className="p-3">Patient</th><th className="p-3">Priority</th><th className="p-3">Status</th><th className="p-3">Reason</th></tr></thead><tbody className="divide-y divide-[#E8E3ED]">{queue.map(item => <tr key={item.id}><td className="p-3 font-mono">{item.queue_token || '-'}</td><td className="p-3 font-bold">{item.patient_name}</td><td className="p-3">{item.priority || 'Normal'}</td><td className="p-3">{item.status || 'Not set'}</td><td className="p-3">{item.reason || ''}</td></tr>)}</tbody></table>
        )}
      </div>
    </div>
  );
}
