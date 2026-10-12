import React, { useEffect, useState } from 'react';
import { FileText, Plus } from 'lucide-react';
import hospitalService from '../../services/hospitalService';

export default function HospitalBillingRecordsPage() {
  const [billing, setBilling] = useState([]);
  const [form, setForm] = useState({ patient_name: '', invoice_no: '', amount: '', status: '', description: '' });
  const load = () => hospitalService.listBilling().then(setBilling).catch(() => setBilling([]));

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.patient_name.trim()) return;
    await hospitalService.createBillingRecord({ ...form, amount: form.amount === '' ? null : Number(form.amount) });
    setForm({ patient_name: '', invoice_no: '', amount: '', status: '', description: '' });
    load();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-eg-ink tracking-tight">Billing Records</h1>
        <p className="text-xs text-eg-muted">Invoices and insurance records are stored in the database.</p>
      </div>
      <form onSubmit={submit} className="bg-white border border-eg-line rounded-xl p-4 grid grid-cols-1 md:grid-cols-6 gap-3 text-xs">
        <input value={form.patient_name} onChange={e => setForm({ ...form, patient_name: e.target.value })} placeholder="Patient name" className="md:col-span-2 px-3 py-2 rounded border border-eg-line bg-eg-paper" />
        <input value={form.invoice_no} onChange={e => setForm({ ...form, invoice_no: e.target.value })} placeholder="Invoice no" className="px-3 py-2 rounded border border-eg-line bg-eg-paper" />
        <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="Amount" className="px-3 py-2 rounded border border-eg-line bg-eg-paper" />
        <input value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} placeholder="Status" className="px-3 py-2 rounded border border-eg-line bg-eg-paper" />
        <button className="px-3 py-2 rounded bg-eg-teal text-white font-bold flex items-center justify-center gap-1"><Plus className="w-3 h-3" /> Add</button>
      </form>
      <div className="bg-white border border-eg-line rounded-xl overflow-hidden">
        {billing.length === 0 ? <div className="p-8 text-center text-xs text-eg-muted"><FileText className="w-8 h-8 mx-auto mb-3 text-eg-teal" />No billing records are available yet.</div> : (
          <table className="w-full text-left text-xs"><thead className="bg-eg-tint uppercase text-[11px]"><tr><th className="p-3">Invoice</th><th className="p-3">Patient</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Description</th></tr></thead><tbody className="divide-y divide-eg-line">{billing.map(record => <tr key={record.id}><td className="p-3 font-mono">{record.invoice_no || '-'}</td><td className="p-3 font-bold">{record.patient_name}</td><td className="p-3">{record.amount ?? '-'}</td><td className="p-3">{record.status || 'Not set'}</td><td className="p-3">{record.description || ''}</td></tr>)}</tbody></table>
        )}
      </div>
    </div>
  );
}
