import React, { useEffect, useState } from 'react';
import { Building2, ShieldAlert, Stethoscope, Layers3 } from 'lucide-react';
import appointmentsService from '../../services/appointmentsService';
import hospitalService from '../../services/hospitalService';

export default function HospitalOverviewPage({ currentUser, onNavigateTab }) {
  const [doctors, setDoctors] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    appointmentsService.getDoctors()
      .then(data => setDoctors(data || []))
      .catch(() => setDoctors([]));
    hospitalService.overview()
      .then(data => setOverview(data))
      .catch(() => setOverview(null));

    const handleRealtime = (event) => {
      const detail = event.detail || {};
      if (detail.event === 'sos:triggered' || detail.type === 'sos') {
        setSosAlerts(prev => [{
          id: detail.id || detail.sos_event_id || `sos-${Date.now()}`,
          elderName: detail.elder_name || detail.elder_id || 'Elder patient',
          triggeredAt: detail.triggered_at || new Date().toISOString(),
          location: [detail.location_lat, detail.location_lng].filter(Boolean).join(', '),
        }, ...prev]);
      }
      if (detail.event === 'sos:resolved') {
        setSosAlerts(prev => prev.filter(item => item.id !== detail.id && item.id !== detail.sos_event_id));
      }
    };

    window.addEventListener('elderguard:realtime-event', handleRealtime);
    return () => window.removeEventListener('elderguard:realtime-event', handleRealtime);
  }, []);

  const cards = [
    { label: 'Active SOS Alerts', value: sosAlerts.length, Icon: ShieldAlert, tab: 'emergency' },
    { label: 'Registered Doctors', value: overview?.doctors_count ?? doctors.length, Icon: Stethoscope, tab: 'doctors' },
    { label: 'Configured Departments', value: overview?.departments_count ?? 0, Icon: Layers3, tab: 'departments' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1520] tracking-tight">Hospital Operational Command</h1>
        <p className="text-xs text-[#6B6272]">Only connected ElderGuard records are shown here.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map(({ label, value, Icon, tab }) => (
          <button key={label} onClick={() => onNavigateTab(tab)} className="bg-white border border-[#E8E3ED] rounded-xl p-4 text-left flex items-center justify-between hover:bg-[#F8F7FA]">
            <div>
              <span className="text-[11px] font-bold text-[#6B6272] uppercase tracking-wider block">{label}</span>
              <span className="text-2xl font-bold text-[#1A1520] font-mono">{value}</span>
            </div>
            <div className="p-3 rounded-lg bg-[#5B2A86]/10 text-[#5B2A86]"><Icon className="w-5 h-5" /></div>
          </button>
        ))}
      </div>

      <div className="bg-white border border-[#E8E3ED] rounded-xl p-5">
        <div className="flex items-center gap-2 border-b border-[#E8E3ED] pb-3">
          <Building2 className="w-4 h-4 text-[#5B2A86]" />
          <h2 className="font-bold text-sm text-[#1A1520]">Recent Hospital Activity</h2>
        </div>
        {sosAlerts.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#6B6272]">No live hospital activity has been received yet.</div>
        ) : (
          <div className="divide-y divide-[#E8E3ED]">
            {sosAlerts.map(alert => (
              <div key={alert.id} className="py-3 text-xs">
                <span className="font-bold text-[#1A1520] block">{alert.elderName}</span>
                <span className="text-[#6B6272]">{new Date(alert.triggeredAt).toLocaleString()} {alert.location ? `- ${alert.location}` : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
