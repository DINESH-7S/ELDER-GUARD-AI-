import React, { useEffect, useState } from 'react';
import { MapPin, ShieldAlert } from 'lucide-react';

export default function HospitalEmergencyDispatchPage() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const handleRealtime = (event) => {
      const detail = event.detail || {};
      if (detail.event === 'sos:triggered' || detail.type === 'sos') {
        setAlerts(prev => [{
          id: detail.id || detail.sos_event_id || `sos-${Date.now()}`,
          elderName: detail.elder_name || detail.elder_id || 'Elder patient',
          triggeredAt: detail.triggered_at || new Date().toISOString(),
          location: [detail.location_lat, detail.location_lng].filter(Boolean).join(', '),
          status: detail.status || 'active',
        }, ...prev]);
      }
      if (detail.event === 'sos:resolved') {
        setAlerts(prev => prev.filter(alert => alert.id !== detail.id && alert.id !== detail.sos_event_id));
      }
    };

    window.addEventListener('elderguard:realtime-event', handleRealtime);
    return () => window.removeEventListener('elderguard:realtime-event', handleRealtime);
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1520] tracking-tight">Emergency & SOS Dispatch</h1>
        <p className="text-xs text-[#6B6272]">Live SOS events appear here when elders trigger them.</p>
      </div>

      <div className="bg-white border border-[#E8E3ED] rounded-xl p-5">
        <div className="flex items-center gap-2 border-b border-[#E8E3ED] pb-3">
          <ShieldAlert className="w-4 h-4 text-[#D6373F]" />
          <h2 className="font-bold text-sm text-[#1A1520]">Active SOS Alerts</h2>
        </div>

        {alerts.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#6B6272]">No active SOS alerts.</div>
        ) : (
          <div className="divide-y divide-[#E8E3ED]">
            {alerts.map(alert => (
              <div key={alert.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                <div>
                  <span className="font-bold text-[#1A1520] block">{alert.elderName}</span>
                  <span className="text-[#6B6272]">{new Date(alert.triggeredAt).toLocaleString()}</span>
                  {alert.location && (
                    <span className="text-[#5B2A86] flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" /> {alert.location}
                    </span>
                  )}
                </div>
                <span className="px-3 py-1 rounded bg-[#FDF2F2] text-[#D6373F] font-bold uppercase">{alert.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
