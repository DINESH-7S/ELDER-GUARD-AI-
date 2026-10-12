import React, { useEffect, useState } from 'react';
import { profilesService } from '../../services/profilesService';
import { tabStorage } from '../../utils/tabStorage';
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
    name: 'Not set',
    license: 'Not set',
    address: 'Not set',
    hours: 'Not set',
    phone: 'Not set'
  });

  useEffect(() => {
    let cancelled = false;
    try {
      const user = JSON.parse(tabStorage.getItem('elderguard_user') || '{}');
      const id = user.user_id || user.id;
      if (!id) return undefined;
      profilesService.getPharmacyProfile(id)
        .then((p) => {
          if (cancelled || !p) return;
          setPharmacyInfo((prev) => ({
            name: p.pharmacy_name || prev.name,
            license: p.license_id || prev.license,
            address: p.address || prev.address,
            hours: prev.hours,
            phone: p.phone_no || prev.phone,
          }));
        })
        .catch(() => {});
    } catch (_) { /* profile stays "Not set" */ }
    return () => { cancelled = true; };
  }, []);

  // Staff List
  const [staffList, setStaffList] = useState([]);

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
    <div className="space-y-6 font-sans text-eg-ink max-w-5xl mx-auto">
      
      {/* Page Header */}
      <div className="bg-white p-6 rounded-xl border border-eg-line shadow-sm">
        <h1 className="text-2xl font-bold text-eg-ink tracking-tight">Pharmacy Configuration & Administration</h1>
        <p className="text-sm text-eg-muted mt-1">
          Manage pharmacy facility profile, staff accounts, threshold preferences, and doctor network integrations.
        </p>
      </div>

      {/* Card 1: Pharmacy Profile */}
      <div className="bg-white rounded-xl border border-eg-line shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-eg-line pb-3">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-eg-teal" />
            <h2 className="text-lg font-bold text-eg-ink">Pharmacy Facility Profile</h2>
          </div>
          <button onClick={() => alert('Facility details unlocked for editing.')} className="px-3 py-1.5 rounded-lg bg-eg-tint text-eg-teal text-xs font-bold cursor-pointer">
            Edit Profile
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-eg-muted font-semibold block">Pharmacy Branch Name</span>
            <span className="font-bold text-eg-ink text-sm">{pharmacyInfo.name}</span>
          </div>
          <div>
            <span className="text-eg-muted font-semibold block">State License & Registration #</span>
            <span className="font-mono font-bold text-eg-teal text-sm">{pharmacyInfo.license}</span>
          </div>
          <div>
            <span className="text-eg-muted font-semibold block">Physical Address</span>
            <span className="font-medium text-eg-ink flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-eg-teal" />
              <span>{pharmacyInfo.address}</span>
            </span>
          </div>
          <div>
            <span className="text-eg-muted font-semibold block">Operating Hours & Hotline</span>
            <span className="font-medium text-eg-ink block">{pharmacyInfo.hours}</span>
            <span className="text-eg-muted font-bold">{pharmacyInfo.phone}</span>
          </div>
        </div>
      </div>

      {/* Card 2: Staff Accounts */}
      <div className="bg-white rounded-xl border border-eg-line shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-eg-line pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-eg-teal" />
            <h2 className="text-lg font-bold text-eg-ink">Pharmacy Staff Accounts</h2>
          </div>
          <button 
            onClick={() => setShowInviteStaffModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-eg-teal text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite Staff Member</span>
          </button>
        </div>

        <div className="space-y-3">
          {staffList.length === 0 && (
            <p className="rounded-xl border border-dashed border-eg-line bg-eg-paper p-4 text-center text-sm text-eg-muted">No staff added yet. Use "Invite Staff Member" to add your team.</p>
          )}
          {staffList.map((st, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-eg-paper border border-eg-line flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-eg-ink">{st.name}</div>
                <div className="text-eg-muted">{st.role} • {st.email}</div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-eg-tint text-eg-teal">
                {st.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Card 3: Inventory Preferences */}
      <div className="bg-white rounded-xl border border-eg-line shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-eg-line pb-3">
          <Sliders className="w-5 h-5 text-eg-teal" />
          <h2 className="text-lg font-bold text-eg-ink">Inventory & Threshold Preferences</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-eg-paper border border-eg-line">
            <span className="font-bold text-eg-ink block">Low-Stock Reorder Threshold</span>
            <span className="text-eg-muted">Automatically flags items when stock drops below 25% of max capacity.</span>
          </div>
          <div className="p-3.5 rounded-xl bg-eg-paper border border-eg-line">
            <span className="font-bold text-eg-ink block">Batch Expiry Window</span>
            <span className="text-eg-muted">Triggers watchlist alerts for items expiring within 60 days.</span>
          </div>
        </div>
      </div>

      {/* Card 4: Notification Preferences */}
      <div className="bg-white rounded-xl border border-eg-line shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-eg-line pb-3">
          <Bell className="w-5 h-5 text-eg-teal" />
          <h2 className="text-lg font-bold text-eg-ink">Notification Preferences</h2>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-lg bg-eg-tint border border-[#4FD1A5]/30">
            <div>
              <span className="font-bold text-eg-teal flex items-center gap-1.5">
                ● New E-Prescription Orders Intake (LOCKED ON)
              </span>
              <span className="text-eg-muted block mt-0.5">Instant alerts when doctors push new prescriptions.</span>
            </div>
            <span className="px-2.5 py-1 rounded bg-eg-teal text-white font-bold text-[10px]">
              ALWAYS ON
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-eg-paper">
            <div>
              <span className="font-bold text-eg-ink">Low Stock Reorder Notifications</span>
              <span className="text-eg-muted block mt-0.5">Alerts inventory manager when items need replenishment.</span>
            </div>
            <input 
              type="checkbox" 
              checked={notifications.lowStock}
              onChange={(e) => setNotifications({ ...notifications, lowStock: e.target.checked })}
              aria-label="Low stock reorder notifications" className="w-4 h-4 accent-eg-teal cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Card 5: Integrations */}
      <div className="bg-white rounded-xl border border-eg-line shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-eg-line pb-3">
          <Link2 className="w-5 h-5 text-eg-teal" />
          <h2 className="text-lg font-bold text-eg-ink">Connected Clinical Networks</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-eg-paper border border-eg-line">
            <span className="font-bold text-eg-ink block">ElderGuard Doctor Portal</span>
            <span className="text-eg-muted block">E-Prescription direct routing</span>
            <span className="mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-eg-tint text-eg-teal">
              ● Connected
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-eg-paper border border-eg-line">
            <span className="font-bold text-eg-ink block">St. Jude Hospital Ops</span>
            <span className="text-eg-muted block">Inpatient discharge Rx sync</span>
            <span className="mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-eg-tint text-eg-teal">
              ● Connected
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-eg-paper border border-eg-line">
            <span className="font-bold text-eg-ink block">BlueCross Clearinghouse</span>
            <span className="text-eg-muted block">Real-time co-pay verification</span>
            <span className="mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-eg-tint text-eg-teal">
              ● Connected
            </span>
          </div>
        </div>
      </div>

      {/* Card 6: Account & Security */}
      <div className="bg-white rounded-xl border border-eg-line shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-eg-line pb-3">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-eg-teal" />
            <h2 className="text-lg font-bold text-[#10201B]">Account & Security</h2>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-3 rounded-lg bg-eg-paper">
            <div>
              <span className="font-bold text-eg-ink">Two-Factor Authentication (2FA)</span>
              <span className="text-eg-muted block mt-0.5">SMS & Authenticator app prompt at login.</span>
            </div>
            <button
              onClick={() => setTwoFactor(!twoFactor)}
              className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer ${
                twoFactor ? 'bg-eg-teal text-white' : 'bg-gray-300 text-gray-700'
              }`}
            >
              {twoFactor ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <div className="pt-2 border-t border-eg-line flex justify-between items-center">
            <button onClick={() => alert('Password reset link dispatched.')} className="px-4 py-2 bg-eg-tint text-eg-teal font-bold text-xs rounded-xl cursor-pointer">
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
        <div className="fixed inset-0 z-50 bg-black/50  flex items-center justify-center p-4">
          <form onSubmit={handleInviteStaff} className="bg-white rounded-2xl border border-eg-line max-w-md w-full p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-eg-line pb-3">
              <h3 className="text-lg font-bold text-eg-ink">Invite Pharmacy Staff Member</h3>
              <button type="button" onClick={() => setShowInviteStaffModal(false)} className="text-eg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-eg-ink block mb-1">Staff Member Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Carlos Mendoza" 
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-eg-line bg-eg-paper text-sm focus:outline-none focus:border-eg-teal"
                />
              </div>

              <div>
                <label className="font-bold text-eg-ink block mb-1">Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="c.mendoza@apollopharmacy.org" 
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-eg-line bg-eg-paper text-sm focus:outline-none focus:border-eg-teal"
                />
              </div>

              <div>
                <label className="font-bold text-eg-ink block mb-1">System Role</label>
                <select 
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-eg-line bg-eg-paper text-sm focus:outline-none focus:border-eg-teal"
                >
                  <option value="Assistant Pharmacist">Assistant Pharmacist</option>
                  <option value="Inventory Specialist">Inventory Specialist</option>
                  <option value="Dispatch Coordinator">Dispatch Coordinator</option>
                  <option value="Lead Clinical Pharmacist">Lead Clinical Pharmacist</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-eg-line flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowInviteStaffModal(false)}
                className="px-4 py-2 rounded-xl bg-eg-paper text-eg-muted font-bold text-xs"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-2 rounded-xl bg-eg-teal text-white font-bold text-xs"
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

