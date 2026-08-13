import React, { useEffect, useState } from 'react';
import { Building2, LogOut, Save } from 'lucide-react';
import { profilesService } from '../../services/profiles.service';
import { displayHospitalName, getUserId } from './hospitalPortalData';

export default function HospitalSettingsPage({ currentUser, onLogout }) {
  const hospitalUserId = getUserId(currentUser);
  const [hospitalInfo, setHospitalInfo] = useState({
    office_name: currentUser?.name || currentUser?.email || '',
    license_id: '',
    address: '',
    gps_lat: '',
    gps_lng: '',
    phone_no: '',
  });
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (!hospitalUserId) return;
    profilesService.getHospitalProfile(hospitalUserId)
      .then(profile => setHospitalInfo({
        office_name: profile.office_name || currentUser?.name || currentUser?.email || '',
        license_id: profile.license_id || '',
        address: profile.address || '',
        gps_lat: profile.gps_lat ?? '',
        gps_lng: profile.gps_lng ?? '',
        phone_no: profile.phone_no || '',
      }))
      .catch(() => {});
  }, [hospitalUserId]);

  const handleChange = (field, value) => {
    setHospitalInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!hospitalUserId) return;
    setSaving(true);
    setStatusMsg('');
    const payload = {
      ...hospitalInfo,
      gps_lat: hospitalInfo.gps_lat === '' ? null : Number(hospitalInfo.gps_lat),
      gps_lng: hospitalInfo.gps_lng === '' ? null : Number(hospitalInfo.gps_lng),
    };

    try {
      let saved;
      try {
        saved = await profilesService.updateHospitalProfile(hospitalUserId, payload);
      } catch {
        saved = await profilesService.createHospitalProfile(payload);
      }
      setHospitalInfo({
        office_name: saved.office_name || '',
        license_id: saved.license_id || '',
        address: saved.address || '',
        gps_lat: saved.gps_lat ?? '',
        gps_lng: saved.gps_lng ?? '',
        phone_no: saved.phone_no || '',
      });
      setStatusMsg('Hospital profile saved.');
    } catch (error) {
      setStatusMsg('Unable to save hospital profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1520] tracking-tight">Hospital Settings</h1>
        <p className="text-xs text-[#6B6272]">Manage the connected hospital profile for this login.</p>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-[#E8E3ED] rounded-xl p-5 space-y-4 text-xs">
        <div className="flex items-center gap-3 border-b border-[#E8E3ED] pb-3">
          <div className="p-2 rounded-lg bg-[#5B2A86]/10 text-[#5B2A86]">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-[#1A1520]">{displayHospitalName(currentUser, hospitalInfo)}</h2>
            <p className="text-[#6B6272]">No default facility, staff, pharmacy, or admin data is prefilled.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="font-bold text-[#1A1520]">Facility Name</span>
            <input value={hospitalInfo.office_name} onChange={event => handleChange('office_name', event.target.value)} className="w-full px-3 py-2 rounded border border-[#E8E3ED] bg-[#F8F7FA] outline-none focus:border-[#5B2A86]" />
          </label>
          <label className="space-y-1">
            <span className="font-bold text-[#1A1520]">License ID</span>
            <input value={hospitalInfo.license_id} onChange={event => handleChange('license_id', event.target.value)} className="w-full px-3 py-2 rounded border border-[#E8E3ED] bg-[#F8F7FA] outline-none focus:border-[#5B2A86]" />
          </label>
        </div>

        <label className="space-y-1 block">
          <span className="font-bold text-[#1A1520]">Address</span>
          <input value={hospitalInfo.address} onChange={event => handleChange('address', event.target.value)} className="w-full px-3 py-2 rounded border border-[#E8E3ED] bg-[#F8F7FA] outline-none focus:border-[#5B2A86]" />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="space-y-1">
            <span className="font-bold text-[#1A1520]">Phone</span>
            <input value={hospitalInfo.phone_no} onChange={event => handleChange('phone_no', event.target.value)} className="w-full px-3 py-2 rounded border border-[#E8E3ED] bg-[#F8F7FA] outline-none focus:border-[#5B2A86]" />
          </label>
          <label className="space-y-1">
            <span className="font-bold text-[#1A1520]">GPS Latitude</span>
            <input type="number" value={hospitalInfo.gps_lat} onChange={event => handleChange('gps_lat', event.target.value)} className="w-full px-3 py-2 rounded border border-[#E8E3ED] bg-[#F8F7FA] outline-none focus:border-[#5B2A86]" />
          </label>
          <label className="space-y-1">
            <span className="font-bold text-[#1A1520]">GPS Longitude</span>
            <input type="number" value={hospitalInfo.gps_lng} onChange={event => handleChange('gps_lng', event.target.value)} className="w-full px-3 py-2 rounded border border-[#E8E3ED] bg-[#F8F7FA] outline-none focus:border-[#5B2A86]" />
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#E8E3ED]">
          <span className="text-[#6B6272]">{statusMsg}</span>
          <div className="flex gap-2">
            <button type="button" onClick={onLogout} className="px-4 py-2 rounded border border-[#D6373F]/30 text-[#D6373F] font-bold flex items-center gap-1">
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded bg-[#5B2A86] text-white font-bold flex items-center gap-1 disabled:opacity-50">
              <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
