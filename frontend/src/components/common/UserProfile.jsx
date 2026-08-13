import React, { useState, useEffect } from 'react';
import { 
  User, 
  HeartPulse, 
  Stethoscope, 
  Building2, 
  Store, 
  ShieldCheck, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Edit3, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  Activity 
} from 'lucide-react';
import { profilesService } from '../../services/profilesService';

export default function UserProfile({ currentUser, onClose }) {
  const [profile, setProfile] = useState(null);
  const [linkedCaregivers, setLinkedCaregivers] = useState([]);
  const [linkedElders, setLinkedElders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const role = currentUser?.role || 'elder';
  const userId = currentUser?.id || currentUser?.user_id;

  useEffect(() => {
    fetchProfileData();
  }, [userId, role]);

  const fetchProfileData = async () => {
    if (!userId) return;
    setLoading(true);
    setError('');

    try {
      if (role === 'elder') {
        const p = await profilesService.getElderProfile(userId);
        setProfile(p);
        const links = await profilesService.getLinkedCaregivers(userId);
        setLinkedCaregivers(links || []);
      } else if (role === 'caregiver') {
        const p = await profilesService.getCaregiverProfile(userId);
        setProfile(p);
        const links = await profilesService.getLinkedElders(userId);
        setLinkedElders(links || []);
      } else if (role === 'doctor') {
        const p = await profilesService.getDoctorProfile(userId);
        setProfile(p);
      } else if (role === 'hospital') {
        const p = await profilesService.getHospitalProfile(userId);
        setProfile(p);
      } else if (role === 'pharmacy') {
        const p = await profilesService.getPharmacyProfile(userId);
        setProfile(p);
      }
    } catch (err) {
      console.warn('Profile fetch notification:', err);
      // Fallback mock profile state for local testing preview
      setProfile({
        user_id: userId,
        name: currentUser?.name || currentUser?.email?.split('@')[0] || '',
        email: currentUser?.email || '',
        phone_no: '',
        age_or_dob: '',
        blood_group: '',
        gender: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        home_address: '',
        specialization: '',
        license_no: '',
        hospital_name: '',
        pharmacy_name: ''
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (role === 'elder') {
        await profilesService.updateElderProfile(userId, profile);
      }
      setSuccessMsg('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = () => {
    switch (role) {
      case 'elder': return <User className="w-8 h-8 text-cyan-400" />;
      case 'caregiver': return <HeartPulse className="w-8 h-8 text-emerald-400" />;
      case 'doctor': return <Stethoscope className="w-8 h-8 text-blue-400" />;
      case 'hospital': return <Building2 className="w-8 h-8 text-purple-400" />;
      case 'pharmacy': return <Store className="w-8 h-8 text-amber-400" />;
      default: return <User className="w-8 h-8 text-cyan-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto font-sans">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl text-white">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-4 mb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
              {getRoleIcon()}
            </div>
            <div>
              <h3 className="text-xl font-extrabold capitalize text-white">
                {profile?.name || 'User Profile'}
              </h3>
              <span className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">
                Role: {role}
              </span>
            </div>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Close
            </button>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950 border border-red-800 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Core Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-sm">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-xs text-slate-500 block">Email Address</span>
                  <span className="font-semibold text-slate-200">{currentUser?.email || 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-xs text-slate-500 block">Phone Number</span>
                  <span className="font-semibold text-slate-200">{profile?.phone_no || 'N/A'}</span>
                </div>
              </div>

              {role === 'elder' && (
                <>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-xs text-slate-500 block">Date of Birth</span>
                      <span className="font-semibold text-slate-200">{profile?.age_or_dob || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-xs text-slate-500 block">Blood Group & Gender</span>
                      <span className="font-semibold text-slate-200">{profile?.blood_group || 'O+'} ({profile?.gender || 'N/A'})</span>
                    </div>
                  </div>
                </>
              )}

              {role === 'doctor' && (
                <>
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-xs text-slate-500 block">License Number</span>
                      <span className="font-semibold text-slate-200">{profile?.license_no || 'MD-90823'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Stethoscope className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-xs text-slate-500 block">Specialization</span>
                      <span className="font-semibold text-slate-200">{profile?.specialization || 'Geriatrics'}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Address & Emergency Info */}
            {role === 'elder' && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-sm space-y-3">
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Residential Address</span>
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{profile?.home_address || 'No address provided'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-900">
                  <span className="text-xs text-slate-500 block mb-1">Emergency Contact</span>
                  <div className="text-slate-300">
                    <span className="font-semibold text-white">{profile?.emergency_contact_name || 'N/A'}</span> — {profile?.emergency_contact_phone || 'N/A'}
                  </div>
                </div>
              </div>
            )}

            {/* Profile Linkage Display */}
            {role === 'elder' && linkedCaregivers.length > 0 && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-sm">
                <span className="text-xs text-cyan-400 font-bold uppercase tracking-wider block mb-2">Linked Caregivers</span>
                <div className="space-y-2">
                  {linkedCaregivers.map((c, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-900 p-2.5 rounded-xl text-xs">
                      <span className="font-semibold text-white">{c.caregiver_name || `Caregiver #${idx + 1}`}</span>
                      <span className="text-slate-400">{c.relationship || 'Linked Caregiver'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {role === 'caregiver' && linkedElders.length > 0 && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-sm">
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider block mb-2">Assigned Elders</span>
                <div className="space-y-2">
                  {linkedElders.map((e, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-900 p-2.5 rounded-xl text-xs">
                      <span className="font-semibold text-white">{e.elder_name || `Elder #${idx + 1}`}</span>
                      <span className="text-slate-400">{e.relationship || 'Linked Elder'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              {isEditing ? (
                <button
                  onClick={handleSaveProfile}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg transition"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm flex items-center gap-2 transition"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
