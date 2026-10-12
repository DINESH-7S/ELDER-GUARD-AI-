import React, { useEffect, useMemo, useState } from 'react';
import { Search, Stethoscope } from 'lucide-react';
import appointmentsService from '../../services/appointmentsService';
import { doctorDisplayName, initials } from './hospitalPortalData';

export default function HospitalDoctorManagementPage() {
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    appointmentsService.getDoctors()
      .then(data => setDoctors(data || []))
      .catch(() => setDoctors([]));
  }, []);

  const filteredDoctors = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return doctors;
    return doctors.filter(doctor => [
      doctorDisplayName(doctor),
      doctor.specialization,
      doctor.qualification,
      doctor.license_number,
    ].filter(Boolean).some(value => String(value).toLowerCase().includes(query)));
  }, [doctors, search]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-eg-ink tracking-tight">Doctor Management</h1>
        <p className="text-xs text-eg-muted">Registered doctor accounts and completed doctor profiles appear here.</p>
      </div>

      <div className="bg-white border border-eg-line rounded-xl p-3">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-eg-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search doctors..."
            className="w-full bg-eg-paper border border-eg-line rounded-lg pl-9 pr-3 py-2 text-xs outline-none focus:border-eg-teal"
          />
        </div>
      </div>

      <div className="bg-white border border-eg-line rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-eg-tint text-eg-ink uppercase text-[11px]">
            <tr>
              <th className="p-3">Doctor</th>
              <th className="p-3">Specialization</th>
              <th className="p-3">Qualification</th>
              <th className="p-3">License</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-eg-line">
            {filteredDoctors.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-eg-muted">No registered doctors found.</td>
              </tr>
            ) : filteredDoctors.map(doctor => (
              <tr key={doctor.user_id} className="hover:bg-eg-paper">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-eg-tint text-eg-teal font-bold flex items-center justify-center">
                      {initials(doctorDisplayName(doctor))}
                    </div>
                    <div>
                      <span className="font-bold text-eg-ink block">{doctorDisplayName(doctor)}</span>
                      <span className="font-mono text-[10px] text-eg-muted">{doctor.user_id}</span>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-eg-muted">{doctor.specialization || 'Not set'}</td>
                <td className="p-3 text-eg-muted">{doctor.qualification || 'Not set'}</td>
                <td className="p-3 text-eg-muted">{doctor.license_number || 'Not set'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
