import React, { useState } from 'react';
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
  const [subscriptions, setSubscriptions] = useState([
    {
      id: 'SUB-101',
      patientName: 'Patient #SUB-101',
      age: '--',
      medicine: 'Metformin ER 500mg (60 Tabs)',
      frequency: 'Every 30 Days',
      nextRefill: 'Today',
      autoRenew: true,
      address: 'Address pending',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150'
    },
    {
      id: 'SUB-102',
      patientName: 'Linked patient',
      age: 82,
      medicine: 'Atorvastatin 20mg (30 Caps)',
      frequency: 'Every 30 Days',
      nextRefill: 'Aug 12, 2026',
      autoRenew: true,
      address: '104 Pine Street, Rm 12',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150'
    },
    {
      id: 'SUB-103',
      patientName: 'Harold Finch',
      age: 85,
      medicine: 'Donepezil 10mg (30 Tabs)',
      frequency: 'Every 30 Days',
      nextRefill: 'Aug 15, 2026',
      autoRenew: true,
      address: '12 Baker Street',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150'
    },
    {
      id: 'SUB-104',
      patientName: 'Beatrice Lawson',
      age: 80,
      medicine: 'Alendronate 70mg (4 Tabs)',
      frequency: 'Every 30 Days',
      nextRefill: 'Aug 20, 2026',
      autoRenew: false,
      address: '88 Oak Lane',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
    }
  ]);

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
      age: 76,
      medicine: newSubForm.medicine,
      frequency: newSubForm.frequency,
      nextRefill: 'In 30 Days',
      autoRenew: true,
      address: newSubForm.address || 'Registered Address',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150'
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
    <div className="space-y-6 font-sans text-[#10221B]">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-[#E1EDE6] shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-[#10221B] tracking-tight">Patient Refill Subscriptions</h1>
          <p className="text-sm text-[#5C6E64] mt-1">
            Automated recurring medicine refill management, elder reminders, and subscription health tracking.
          </p>
        </div>
        <button
          onClick={() => setShowCreateSubModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#1E9E6B] hover:bg-[#187E56] text-white font-bold text-sm transition shadow-sm flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Refill Subscription</span>
        </button>
      </div>

      {/* Subscription Health Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#E1EDE6] shadow-sm">
          <span className="text-xs text-[#5C6E64] font-semibold uppercase tracking-wider block">Active Subscriptions</span>
          <div className="text-2xl font-bold text-[#1E9E6B] mt-1">142 Active</div>
          <span className="text-[11px] text-[#1E9E6B]">Auto-renew enabled for 94%</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E1EDE6] shadow-sm">
          <span className="text-xs text-[#5C6E64] font-semibold uppercase tracking-wider block">Refills Due This Week</span>
          <div className="text-2xl font-bold text-[#10221B] mt-1">18 Refills</div>
          <span className="text-[11px] text-[#5C6E64]">3 processing today</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E1EDE6] shadow-sm">
          <span className="text-xs text-[#5C6E64] font-semibold uppercase tracking-wider block">Paused Subscriptions</span>
          <div className="text-2xl font-bold text-[#E8A03C] mt-1">8 Paused</div>
          <span className="text-[11px] text-[#5C6E64]">Patient travel / hold</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E1EDE6] shadow-sm">
          <span className="text-xs text-[#5C6E64] font-semibold uppercase tracking-wider block">Retention Rate</span>
          <div className="text-2xl font-bold text-[#1E9E6B] mt-1">97.8%</div>
          <span className="text-[11px] text-[#1E9E6B]">High recurring compliance</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E1EDE6] shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-[#5C6E64] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search patient name or subscription medicine..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F6FAF8] border border-[#E1EDE6] text-sm focus:outline-none focus:border-[#1E9E6B]"
          />
        </div>
      </div>

      {/* Active Subscriptions Table */}
      <div className="bg-white rounded-xl border border-[#E1EDE6] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E1EDE6]">
          <h2 className="text-lg font-bold text-[#10221B]">Active Elder Refill Subscriptions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F6FAF8] border-b border-[#E1EDE6] text-xs font-semibold text-[#5C6E64] uppercase tracking-wider">
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
            <tbody className="divide-y divide-[#E1EDE6]">
              {filteredSubs.map((sub) => (
                <tr key={sub.id} className="hover:bg-[#F6FAF8]/80 transition">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <img src={sub.avatar} alt={sub.patientName} className="w-10 h-10 rounded-full object-cover border border-[#E1EDE6]" />
                      <div>
                        <div className="font-bold text-[#10221B]">{sub.patientName}</div>
                        <span className="font-mono text-xs text-[#1E9E6B] font-bold">{sub.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-bold text-[#10221B] text-xs">
                    {sub.medicine}
                  </td>
                  <td className="py-4 px-4 text-xs text-[#5C6E64] font-medium">
                    {sub.frequency}
                  </td>
                  <td className="py-4 px-4 text-xs font-bold text-[#1E9E6B]">
                    {sub.nextRefill}
                  </td>
                  <td className="py-4 px-4">
                    <button
                      onClick={() => handleToggleAutoRenew(sub.id)}
                      className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition ${
                        sub.autoRenew ? 'bg-[#EAF5EF] text-[#1E9E6B]' : 'bg-[#FEF6EC] text-[#E8A03C]'
                      }`}
                    >
                      {sub.autoRenew ? '● Auto-Renew ON' : '○ Paused'}
                    </button>
                  </td>
                  <td className="py-4 px-4 text-xs text-[#5C6E64]">
                    {sub.address}
                  </td>
                  <td className="py-4 px-6 text-right space-x-2">
                    <button
                      onClick={() => alert(`Refill order manually triggered for ${sub.patientName}`)}
                      className="px-3 py-1.5 rounded-lg bg-[#1E9E6B] hover:bg-[#187E56] text-white font-bold text-xs transition cursor-pointer"
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
      <div className="bg-white rounded-xl border border-[#E1EDE6] shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-[#E1EDE6] pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#1E9E6B]" />
            <h2 className="text-lg font-bold text-[#10221B]">Automated Refill Reminders Sent Today</h2>
          </div>
          <span className="text-xs text-[#5C6E64]">App Push & SMS Log</span>
        </div>

        <div className="space-y-3 text-xs">
          {remindersLog.map((r, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-[#F6FAF8] border border-[#E1EDE6] flex items-center justify-between">
              <div>
                <span className="font-bold text-[#10221B]">{r.patient}:</span> <span className="text-[#5C6E64]">{r.msg}</span>
              </div>
              <span className="text-[10px] text-[#5C6E64] font-semibold">{r.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Create New Subscription Modal */}
      {showCreateSubModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateSub} className="bg-white rounded-2xl border border-[#E1EDE6] max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E1EDE6] pb-3">
              <h3 className="text-lg font-bold text-[#10221B]">Create Patient Refill Subscription</h3>
              <button type="button" onClick={() => setShowCreateSubModal(false)} className="text-[#5C6E64]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#10221B] block mb-1">Patient Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Samuel Jackson" 
                  value={newSubForm.patientName}
                  onChange={(e) => setNewSubForm({ ...newSubForm, patientName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E1EDE6] bg-[#F6FAF8] text-sm focus:outline-none focus:border-[#1E9E6B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#10221B] block mb-1">Subscribed Medicine</label>
                  <select 
                    value={newSubForm.medicine}
                    onChange={(e) => setNewSubForm({ ...newSubForm, medicine: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E1EDE6] bg-[#F6FAF8] text-sm focus:outline-none focus:border-[#1E9E6B]"
                  >
                    <option value="Metformin ER 500mg">Metformin ER 500mg</option>
                    <option value="Atorvastatin 20mg">Atorvastatin 20mg</option>
                    <option value="Donepezil 10mg">Donepezil 10mg</option>
                    <option value="Lisinopril 10mg">Lisinopril 10mg</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#10221B] block mb-1">Refill Frequency</label>
                  <select 
                    value={newSubForm.frequency}
                    onChange={(e) => setNewSubForm({ ...newSubForm, frequency: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E1EDE6] bg-[#F6FAF8] text-sm focus:outline-none focus:border-[#1E9E6B]"
                  >
                    <option value="Every 30 Days">Every 30 Days</option>
                    <option value="Every 60 Days">Every 60 Days</option>
                    <option value="Every 90 Days">Every 90 Days</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#10221B] block mb-1">Delivery Address</label>
                <input 
                  type="text" 
                  placeholder="e.g. 742 Evergreen Terrace" 
                  value={newSubForm.address}
                  onChange={(e) => setNewSubForm({ ...newSubForm, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E1EDE6] bg-[#F6FAF8] text-sm focus:outline-none focus:border-[#1E9E6B]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#E1EDE6] flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowCreateSubModal(false)}
                className="px-4 py-2 rounded-xl bg-[#F6FAF8] text-[#5C6E64] font-bold text-xs"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#1E9E6B] text-white font-bold text-xs"
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

