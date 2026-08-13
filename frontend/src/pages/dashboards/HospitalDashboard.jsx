import React from 'react';
import { Building2 } from 'lucide-react';

export default function HospitalDashboard({ currentUser }) {
  return (
    <div className="bg-white border border-purple-100 rounded-xl p-8 text-center text-sm text-slate-600">
      <Building2 className="w-10 h-10 mx-auto mb-3 text-purple-700" />
      <h1 className="text-xl font-bold text-slate-900">Hospital Portal</h1>
      <p className="mt-2">No emergency, doctor, or facility data is loaded for {currentUser?.email || 'this hospital account'}.</p>
    </div>
  );
}
