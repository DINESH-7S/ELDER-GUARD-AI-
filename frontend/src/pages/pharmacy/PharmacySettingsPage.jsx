import React, { useState } from 'react';
import { 
  Store, 
  Users, 
  Sliders, 
  Bell, 
  Link2, 
  Lock, 
  LogOut, 
  CheckCircle2, 
  UserPlus, 
  Mail, 
  Phone, 
  MapPin, 
  FileText,
  X
} from 'lucide-react';

export default function PharmacySettingsPage({ onLogout }) {
  const [showInviteStaffModal, setShowInviteStaffModal] = useState(false);

  // Pharmacy Profile Info
  const [pharmacyInfo, setPharmacyInfo] = useState({
    name: 'Connected Pharmacy',
    license: 'PHARM-CA-88192-X',
    address: '104 Pine Street, Suite 100, San Francisco, CA 94107',
    hours: 'Mon – Sun: 08:00 AM – 08:00 PM',
    phone: '+1 (800) 555-CARE'
  });

  // Staff List
  const [staffList, setStaffList] = useState([
    
    { name: 'Marcus Brody', role: 'Inventory Control Specialist', email: 'm.brody@apollopharmacy.org', badge: 'Inventory Lead' },
    { name: 'Elena Rostova', role: 'Home Dispatch Coordinator', email: 'e.rostova@apollopharmacy.org', badge: 'Dispatch Lead' }
  ]);

  // Form State for Invite Staff
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'Assistant Pharmacist' });

  const handleInviteStaff = (e) => {
    e.preventDefault();
    if (!inviteForm.email) return;

    setStaffList([...staffList, { name: inviteForm.name || 'New Staff', role: inviteForm.role, email: inviteForm.email, badge: inviteForm.role }]);
    setShowInviteStaffModal(false);
    setInviteForm({ name: '', email: '', role: 'Assistant Pharmacist' });
    alert(`Staff invite sent to ${inviteForm.email}!`);
  };

  // Toggles State
  const [notifications, setNotifications] = useState({
    newOrders: true, // locked
    lowStock: true,
    expiryAlerts: true,
    deliveryDelays: true,
    subscriptionRenewals: true
  });

  const [twoFactor, setTwoFactor] = useState(true);

  return (
    <div className="space-y-6 font-sans text-[#10221B] max-w-5xl mx-auto">
      
      {/* Page Header */}
      <div className="bg-white p-6 rounded-xl border border-[#E1EDE6] shadow-sm">
        <h1 className="text-2xl font-bold text-[#10221B] tracking-tight">Pharmacy Configuration & Administration</h1>
        <p className="text-sm text-[#5C6E64] mt-1">
          Manage pharmacy facility profile, staff accounts, threshold preferences, and doctor network integrations.
        </p>
      </div>

      {/* Card 1: Pharmacy Profile */}
      <div className="bg-white rounded-xl border border-[#E1EDE6] shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E1EDE6] pb-3">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-[#1E9E6B]" />
            <h2 className="text-lg font-bold text-[#10221B]">Pharmacy Facility Profile</h2>
          </div>
          <button onClick={() => alert('Facility details unlocked for editing.')} className="px-3 py-1.5 rounded-lg bg-[#EAF5EF] text-[#1E9E6B] text-xs font-bold cursor-pointer">
            Edit Profile
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[#5C6E64] font-semibold block">Pharmacy Branch Name</span>
            <span className="font-bold text-[#10221B] text-sm">{pharmacyInfo.name}</span>
          </div>
          <div>
            <span className="text-[#5C6E64] font-semibold block">State License & Registration #</span>
            <span className="font-mono font-bold text-[#1E9E6B] text-sm">{pharmacyInfo.license}</span>
          </div>
          <div>
            <span className="text-[#5C6E64] font-semibold block">Physical Address</span>
            <span className="font-medium text-[#10221B] flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-[#1E9E6B]" />
              <span>{pharmacyInfo.address}</span>
            </span>
          </div>
          <div>
            <span className="text-[#5C6E64] font-semibold block">Operating Hours & Hotline</span>
            <span className="font-medium text-[#10221B] block">{pharmacyInfo.hours}</span>
            <span className="text-[#5C6E64] font-bold">{pharmacyInfo.phone}</span>
          </div>
        </div>
      </div>

      {/* Card 2: Staff Accounts */}
      <div className="bg-white rounded-xl border border-[#E1EDE6] shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E1EDE6] pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#1E9E6B]" />
            <h2 className="text-lg font-bold text-[#10221B]">Pharmacy Staff Accounts</h2>
          </div>
          <button 
            onClick={() => setShowInviteStaffModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-[#1E9E6B] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite Staff Member</span>
          </button>
        </div>

        <div className="space-y-3">
          {staffList.map((st, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-[#F6FAF8] border border-[#E1EDE6] flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-[#10221B]">{st.name}</div>
                <div className="text-[#5C6E64]">{st.role} • {st.email}</div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#EAF5EF] text-[#1E9E6B]">
                {st.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Card 3: Inventory Preferences */}
      <div className="bg-white rounded-xl border border-[#E1EDE6] shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E1EDE6] pb-3">
          <Sliders className="w-5 h-5 text-[#1E9E6B]" />
          <h2 className="text-lg font-bold text-[#10221B]">Inventory & Threshold Preferences</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-[#F6FAF8] border border-[#E1EDE6]">
            <span className="font-bold text-[#10221B] block">Low-Stock Reorder Threshold</span>
            <span className="text-[#5C6E64]">Automatically flags items when stock drops below 25% of max capacity.</span>
          </div>
          <div className="p-3.5 rounded-xl bg-[#F6FAF8] border border-[#E1EDE6]">
            <span className="font-bold text-[#10221B] block">Batch Expiry Window</span>
            <span className="text-[#5C6E64]">Triggers watchlist alerts for items expiring within 60 days.</span>
          </div>
        </div>
      </div>

      {/* Card 4: Notification Preferences */}
      <div className="bg-white rounded-xl border border-[#E1EDE6] shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E1EDE6] pb-3">
          <Bell className="w-5 h-5 text-[#1E9E6B]" />
          <h2 className="text-lg font-bold text-[#10221B]">Notification Preferences</h2>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#EAF5EF] border border-[#4FD1A5]/30">
            <div>
              <span className="font-bold text-[#1E9E6B] flex items-center gap-1.5">
                ● New E-Prescription Orders Intake (LOCKED ON)
              </span>
              <span className="text-[#5C6E64] block mt-0.5">Instant alerts when doctors push new prescriptions.</span>
            </div>
            <span className="px-2.5 py-1 rounded bg-[#1E9E6B] text-white font-bold text-[10px]">
              ALWAYS ON
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-[#F6FAF8]">
            <div>
              <span className="font-bold text-[#10221B]">Low Stock Reorder Notifications</span>
              <span className="text-[#5C6E64] block mt-0.5">Alerts inventory manager when items need replenishment.</span>
            </div>
            <input 
              type="checkbox" 
              checked={notifications.lowStock}
              onChange={(e) => setNotifications({ ...notifications, lowStock: e.target.checked })}
              className="w-4 h-4 accent-[#1E9E6B] cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Card 5: Integrations */}
      <div className="bg-white rounded-xl border border-[#E1EDE6] shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E1EDE6] pb-3">
          <Link2 className="w-5 h-5 text-[#1E9E6B]" />
          <h2 className="text-lg font-bold text-[#10221B]">Connected Clinical Networks</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-[#F6FAF8] border border-[#E1EDE6]">
            <span className="font-bold text-[#10221B] block">ElderGuard Doctor Portal</span>
            <span className="text-[#5C6E64] block">E-Prescription direct routing</span>
            <span className="mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#EAF5EF] text-[#1E9E6B]">
              ● Connected
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F6FAF8] border border-[#E1EDE6]">
            <span className="font-bold text-[#10221B] block">St. Jude Hospital Ops</span>
            <span className="text-[#5C6E64] block">Inpatient discharge Rx sync</span>
            <span className="mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#EAF5EF] text-[#1E9E6B]">
              ● Connected
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F6FAF8] border border-[#E1EDE6]">
            <span className="font-bold text-[#10221B] block">BlueCross Clearinghouse</span>
            <span className="text-[#5C6E64] block">Real-time co-pay verification</span>
            <span className="mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#EAF5EF] text-[#1E9E6B]">
              ● Connected
            </span>
          </div>
        </div>
      </div>

      {/* Card 6: Account & Security */}
      <div className="bg-white rounded-xl border border-[#E1EDE6] shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E1EDE6] pb-3">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#1E9E6B]" />
            <h2 className="text-lg font-bold text-[#10201B]">Account & Security</h2>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#F6FAF8]">
            <div>
              <span className="font-bold text-[#10221B]">Two-Factor Authentication (2FA)</span>
              <span className="text-[#5C6E64] block mt-0.5">SMS & Authenticator app prompt at login.</span>
            </div>
            <button
              onClick={() => setTwoFactor(!twoFactor)}
              className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer ${
                twoFactor ? 'bg-[#1E9E6B] text-white' : 'bg-gray-300 text-gray-700'
              }`}
            >
              {twoFactor ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <div className="pt-2 border-t border-[#E1EDE6] flex justify-between items-center">
            <button onClick={() => alert('Password reset link dispatched.')} className="px-4 py-2 bg-[#EAF5EF] text-[#1E9E6B] font-bold text-xs rounded-xl cursor-pointer">
              Change Password
            </button>
            <button onClick={onLogout} className="px-4 py-2 bg-[#FDF2F2] text-[#D6373F] font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5">
              <LogOut className="w-4 h-4" />
              <span>Sign Out Console</span>
            </button>
          </div>
        </div>
      </div>

      {/* Invite Staff Modal */}
      {showInviteStaffModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleInviteStaff} className="bg-white rounded-2xl border border-[#E1EDE6] max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E1EDE6] pb-3">
              <h3 className="text-lg font-bold text-[#10221B]">Invite Pharmacy Staff Member</h3>
              <button type="button" onClick={() => setShowInviteStaffModal(false)} className="text-[#5C6E64]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#10221B] block mb-1">Staff Member Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Carlos Mendoza" 
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E1EDE6] bg-[#F6FAF8] text-sm focus:outline-none focus:border-[#1E9E6B]"
                />
              </div>

              <div>
                <label className="font-bold text-[#10221B] block mb-1">Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="c.mendoza@apollopharmacy.org" 
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E1EDE6] bg-[#F6FAF8] text-sm focus:outline-none focus:border-[#1E9E6B]"
                />
              </div>

              <div>
                <label className="font-bold text-[#10221B] block mb-1">System Role</label>
                <select 
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#E1EDE6] bg-[#F6FAF8] text-sm focus:outline-none focus:border-[#1E9E6B]"
                >
                  <option value="Assistant Pharmacist">Assistant Pharmacist</option>
                  <option value="Inventory Specialist">Inventory Specialist</option>
                  <option value="Dispatch Coordinator">Dispatch Coordinator</option>
                  <option value="Lead Clinical Pharmacist">Lead Clinical Pharmacist</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E1EDE6] flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowInviteStaffModal(false)}
                className="px-4 py-2 rounded-xl bg-[#F6FAF8] text-[#5C6E64] font-bold text-xs"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#1E9E6B] text-white font-bold text-xs"
              >
                Send Invite Link
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

