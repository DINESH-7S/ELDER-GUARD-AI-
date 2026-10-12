import React, { useEffect, useState } from 'react';
import doctorRecordsService from '../../services/doctorRecordsService';
import { 
  Users, 
  RefreshCw, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  PauseCircle, 
  XCircle, 
  Search, 
  Bell,
  X,
  ChevronRight
} from 'lucide-react';

export default function PharmacySubscriptionsPage({ onNavigateTab }) {
  const [showCreateSubModal, setShowCreateSubModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Subscriptions Data
  // Refill subscriptions come from prescriptions addressed to this pharmacy that still have refills left.
  const [subscriptions, setSubscriptions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    doctorRecordsService.listPrescriptions()
      .then((rows) => {
        if (cancelled) return;
        const mapped = (rows || [])
          .filter((rx) => Number(rx.refills) > 0)
          .map((rx) => {
            const start = rx.created_at ? new Date(rx.created_at) : new Date();
            const next = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
            return {
              id: `RX-${String(rx.id).slice(0, 6).toUpperCase()}`,
              patientName: rx.patient || 'Patient',
              medicine: rx.medicine,
              frequency: rx.duration ? `Every ${rx.duration}` : 'Monthly',
              nextRefill: next.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
              nextRefillAt: next,
              refillsLeft: Number(rx.refills),
              autoRenew: true,
              address: 'On file',
            };
          });
        setSubscriptions(mapped);
      })
      .catch(() => setSubscriptions([]));
    return () => { cancelled = true; };
  }, []);

  // Form State for Creating Subscription
  const [newSubForm, setNewSubForm] = useState({
    patientName: '',
    medicine: 'Metformin ER 500mg',
    frequency: 'Every 30 Days',
    address: ''
  });

  const handleToggleAutoRenew = (id) => {
    setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, autoRenew: !s.autoRenew } : s));
  };

  const handleCreateSub = (e) => {
    e.preventDefault();
    if (!newSubForm.patientName) return;

    const newSub = {
      id: `SUB-${Math.floor(200 + Math.random() * 800)}`,
      patientName: newSubForm.patientName,
      medicine: newSubForm.medicine,
      frequency: newSubForm.frequency,
      nextRefill: 'In 30 Days',
      autoRenew: true,
      address: newSubForm.address || 'Registered Address',
    };

    setSubscriptions([newSub, ...subscriptions]);
    setShowCreateSubModal(false);
    setNewSubForm({ patientName: '', medicine: 'Metformin ER 500mg', frequency: 'Every 30 Days', address: '' });
  };

  // Reminders Logged Today
  const remindersLog = [];

  const filteredSubs = subscriptions.filter(s => 
    s.patientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.medicine.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans text-eg-ink">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-eg-line shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-eg-ink tracking-tight">Patient Refill Subscriptions</h1>
          <p className="text-sm text-eg-muted mt-1">
            Automated recurring medicine refill management, elder reminders, and subscription health tracking.
          </p>
        </div>
        <button
          onClick={() => setShowCreateSubModal(true)}
          className="px-4 py-2.5 rounded-xl bg-eg-teal hover:bg-[#187E56] text-white font-bold text-sm transition shadow-sm flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Refill Subscription</span>
        </button>
      </div>

      {/* Subscription Health Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-eg-line shadow-sm">
          <span className="text-xs text-eg-muted font-semibold uppercase tracking-wider block">Active Subscriptions</span>
          <div className="text-2xl font-bold text-eg-teal mt-1">{subscriptions.filter(x => x.autoRenew).length} Active</div>
          <span className="text-[11px] text-eg-muted">{subscriptions.length ? 'From prescriptions with refills' : 'None yet'}</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-eg-line shadow-sm">
          <span className="text-xs text-eg-muted font-semibold uppercase tracking-wider block">Refills Due This Week</span>
          <div className="text-2xl font-bold text-eg-ink mt-1">{subscriptions.filter(x => x.nextRefillAt && x.nextRefillAt - new Date() < 7 * 86400000).length} Refills</div>
          <span className="text-[11px] text-eg-muted">Due in the next 7 days</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-eg-line shadow-sm">
          <span className="text-xs text-eg-muted font-semibold uppercase tracking-wider block">Paused Subscriptions</span>
          <div className="text-2xl font-bold text-[#9A5B00] mt-1">{subscriptions.filter(x => !x.autoRenew).length} Paused</div>
          <span className="text-[11px] text-eg-muted">On hold</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-eg-line shadow-sm">
          <span className="text-xs text-eg-muted font-semibold uppercase tracking-wider block">Refills Remaining</span>
          <div className="text-2xl font-bold text-eg-teal mt-1">{subscriptions.reduce((n, x) => n + (x.refillsLeft || 0), 0)}</div>
          <span className="text-[11px] text-eg-muted">Across all subscriptions</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-eg-line shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-eg-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search patient name or subscription medicine..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-eg-paper border border-eg-line text-sm focus:outline-none focus:border-eg-teal"
          />
        </div>
      </div>

      {/* Active Subscriptions Table */}
      <div className="bg-white rounded-xl border border-eg-line shadow-sm overflow-hidden">
        <div className="p-4 border-b border-eg-line">
          <h2 className="text-lg font-bold text-eg-ink">Active Elder Refill Subscriptions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-eg-paper border-b border-eg-line text-xs font-semibold text-eg-muted uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Patient Name</th>
                <th className="py-3.5 px-4">Subscribed Medicine</th>
                <th className="py-3.5 px-4">Refill Frequency</th>
                <th className="py-3.5 px-4">Next Refill Date</th>
                <th className="py-3.5 px-4">Auto-Renew Status</th>
                <th className="py-3.5 px-4">Delivery Location</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-eg-line">
              {filteredSubs.map((sub) => (
                <tr key={sub.id} className="hover:bg-eg-paper/80 transition">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full border border-eg-line bg-eg-tint text-sm font-bold text-eg-teal-dark">{(sub.patientName || 'P').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}</span>
                      <div>
                        <div className="font-bold text-eg-ink">{sub.patientName}</div>
                        <span className="font-mono text-xs text-eg-teal font-bold">{sub.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-bold text-eg-ink text-xs">
                    {sub.medicine}
                  </td>
                  <td className="py-4 px-4 text-xs text-eg-muted font-medium">
                    {sub.frequency}
                  </td>
                  <td className="py-4 px-4 text-xs font-bold text-eg-teal">
                    {sub.nextRefill}
                  </td>
                  <td className="py-4 px-4">
                    <button
                      onClick={() => handleToggleAutoRenew(sub.id)}
                      className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition ${
                        sub.autoRenew ? 'bg-eg-tint text-eg-teal' : 'bg-[#FEF6EC] text-[#9A5B00]'
                      }`}
                    >
                      {sub.autoRenew ? '● Auto-Renew ON' : '○ Paused'}
                    </button>
                  </td>
                  <td className="py-4 px-4 text-xs text-eg-muted">
                    {sub.address}
                  </td>
                  <td className="py-4 px-6 text-right space-x-2">
                    <button
                      onClick={() => alert(`Refill order manually triggered for ${sub.patientName}`)}
                      className="px-3 py-1.5 rounded-lg bg-eg-teal hover:bg-[#187E56] text-white font-bold text-xs transition cursor-pointer"
                    >
                      Trigger Refill
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refill Reminders Sent Today Log */}
      <div className="bg-white rounded-xl border border-eg-line shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-eg-line pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-eg-teal" />
            <h2 className="text-lg font-bold text-eg-ink">Automated Refill Reminders Sent Today</h2>
          </div>
          <span className="text-xs text-eg-muted">App Push & SMS Log</span>
        </div>

        <div className="space-y-3 text-xs">
          {remindersLog.map((r, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-eg-paper border border-eg-line flex items-center justify-between">
              <div>
                <span className="font-bold text-eg-ink">{r.patient}:</span> <span className="text-eg-muted">{r.msg}</span>
              </div>
              <span className="text-[10px] text-eg-muted font-semibold">{r.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Create New Subscription Modal */}
      {showCreateSubModal && (
        <div className="fixed inset-0 z-50 bg-black/50  flex items-center justify-center p-4">
          <form onSubmit={handleCreateSub} className="bg-white rounded-2xl border border-eg-line max-w-lg w-full p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-eg-line pb-3">
              <h3 className="text-lg font-bold text-eg-ink">Create Patient Refill Subscription</h3>
              <button type="button" onClick={() => setShowCreateSubModal(false)} className="text-eg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-eg-ink block mb-1">Patient Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Samuel Jackson" 
                  value={newSubForm.patientName}
                  onChange={(e) => setNewSubForm({ ...newSubForm, patientName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-eg-line bg-eg-paper text-sm focus:outline-none focus:border-eg-teal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-eg-ink block mb-1">Subscribed Medicine</label>
                  <select 
                    value={newSubForm.medicine}
                    onChange={(e) => setNewSubForm({ ...newSubForm, medicine: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-eg-line bg-eg-paper text-sm focus:outline-none focus:border-eg-teal"
                  >
                    <option value="Metformin ER 500mg">Metformin ER 500mg</option>
                    <option value="Atorvastatin 20mg">Atorvastatin 20mg</option>
                    <option value="Donepezil 10mg">Donepezil 10mg</option>
                    <option value="Lisinopril 10mg">Lisinopril 10mg</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-eg-ink block mb-1">Refill Frequency</label>
                  <select 
                    value={newSubForm.frequency}
                    onChange={(e) => setNewSubForm({ ...newSubForm, frequency: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-eg-line bg-eg-paper text-sm focus:outline-none focus:border-eg-teal"
                  >
                    <option value="Every 30 Days">Every 30 Days</option>
                    <option value="Every 60 Days">Every 60 Days</option>
                    <option value="Every 90 Days">Every 90 Days</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-eg-ink block mb-1">Delivery Address</label>
                <input 
                  type="text" 
                  placeholder="e.g. 742 Evergreen Terrace" 
                  value={newSubForm.address}
                  onChange={(e) => setNewSubForm({ ...newSubForm, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-eg-line bg-eg-paper text-sm focus:outline-none focus:border-eg-teal"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-eg-line flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowCreateSubModal(false)}
                className="px-4 py-2 rounded-xl bg-eg-paper text-eg-muted font-bold text-xs"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-2 rounded-xl bg-eg-teal text-white font-bold text-xs"
              >
                Activate Subscription
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

