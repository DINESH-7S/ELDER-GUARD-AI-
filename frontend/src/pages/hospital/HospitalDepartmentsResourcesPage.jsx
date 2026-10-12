import React, { useEffect, useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import hospitalService from '../../services/hospitalService';

export default function HospitalDepartmentsResourcesPage() {
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({ name: '', head: '', beds_total: '', beds_occupied: '', status: '', contact_ext: '' });

  const load = () => hospitalService.listDepartments().then(setDepartments).catch(() => setDepartments([]));

  useEffect(() => {
    load();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    await hospitalService.createDepartment({
      ...form,
      beds_total: form.beds_total === '' ? null : Number(form.beds_total),
      beds_occupied: form.beds_occupied === '' ? null : Number(form.beds_occupied),
    });
    setForm({ name: '', head: '', beds_total: '', beds_occupied: '', status: '', contact_ext: '' });
    load();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-eg-ink tracking-tight">Departments & Resources</h1>
        <p className="text-xs text-eg-muted">Department, ward, bed, and equipment records are stored in the database.</p>
      </div>

      <form onSubmit={submit} className="bg-white border border-eg-line rounded-xl p-4 grid grid-cols-1 md:grid-cols-6 gap-3 text-xs">
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Department name" className="md:col-span-2 px-3 py-2 rounded border border-eg-line bg-eg-paper" />
        <input value={form.head} onChange={e => setForm({ ...form, head: e.target.value })} placeholder="Head / owner" className="px-3 py-2 rounded border border-eg-line bg-eg-paper" />
        <input type="number" value={form.beds_total} onChange={e => setForm({ ...form, beds_total: e.target.value })} placeholder="Beds total" className="px-3 py-2 rounded border border-eg-line bg-eg-paper" />
        <input type="number" value={form.beds_occupied} onChange={e => setForm({ ...form, beds_occupied: e.target.value })} placeholder="Occupied" className="px-3 py-2 rounded border border-eg-line bg-eg-paper" />
        <button className="px-3 py-2 rounded bg-eg-teal text-white font-bold flex items-center justify-center gap-1"><Plus className="w-3 h-3" /> Add</button>
      </form>

      <div className="bg-white border border-eg-line rounded-xl overflow-hidden">
        {departments.length === 0 ? (
          <div className="p-8 text-center text-xs text-eg-muted"><Building2 className="w-8 h-8 mx-auto mb-3 text-eg-teal" />No hospital resources are configured yet.</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-eg-tint uppercase text-[11px]"><tr><th className="p-3">Department</th><th className="p-3">Head</th><th className="p-3">Beds</th><th className="p-3">Status</th></tr></thead>
            <tbody className="divide-y divide-eg-line">
              {departments.map(dept => (
                <tr key={dept.id}><td className="p-3 font-bold">{dept.name}</td><td className="p-3">{dept.head || 'Not set'}</td><td className="p-3">{dept.beds_occupied ?? 0}/{dept.beds_total ?? 0}</td><td className="p-3">{dept.status || 'Not set'}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
