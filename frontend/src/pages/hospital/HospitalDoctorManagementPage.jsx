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
        <h1 className="text-2xl font-bold text-[#1A1520] tracking-tight">Doctor Management</h1>
        <p className="text-xs text-[#6B6272]">Registered doctor accounts and completed doctor profiles appear here.</p>
      </div>

      <div className="bg-white border border-[#E8E3ED] rounded-xl p-3">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-[#6B6272] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search doctors..."
            className="w-full bg-[#F8F7FA] border border-[#E8E3ED] rounded-lg pl-9 pr-3 py-2 text-xs outline-none focus:border-[#5B2A86]"
          />
        </div>
      </div>

      <div className="bg-white border border-[#E8E3ED] rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F1ECF6] text-[#1A1520] uppercase text-[11px]">
            <tr>
              <th className="p-3">Doctor</th>
              <th className="p-3">Specialization</th>
              <th className="p-3">Qualification</th>
              <th className="p-3">License</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E3ED]">
            {filteredDoctors.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-[#6B6272]">No registered doctors found.</td>
              </tr>
            ) : filteredDoctors.map(doctor => (
              <tr key={doctor.user_id} className="hover:bg-[#F8F7FA]">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-[#F1ECF6] text-[#5B2A86] font-bold flex items-center justify-center">
                      {initials(doctorDisplayName(doctor))}
                    </div>
                    <div>
                      <span className="font-bold text-[#1A1520] block">{doctorDisplayName(doctor)}</span>
                      <span className="font-mono text-[10px] text-[#6B6272]">{doctor.user_id}</span>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-[#6B6272]">{doctor.specialization || 'Not set'}</td>
                <td className="p-3 text-[#6B6272]">{doctor.qualification || 'Not set'}</td>
                <td className="p-3 text-[#6B6272]">{doctor.license_number || 'Not set'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
