import React, { useState, useRef, useEffect } from 'react';
import { profilesService } from '../../services/profiles.service';
import {
  User,
  Phone,
  Calendar,
  MapPin,
  Globe,
  Camera,
  Edit3,
  Bell,
  Pill,
  Clock,
  Droplets,
  Activity,
  Volume2,
  PhoneCall,
  Users,
  Plus,
  ShieldAlert,
  CheckCircle2,
  Info,
  Sun,
  Moon,
  Eye,
  Sliders,
  Lock,
  LogOut,
  Trash2,
  ChevronRight,
  Bot,
  X,
  Sparkles,
  VolumeX,
  Languages,
  Check,
  Upload,
  Image as ImageIcon
} from 'lucide-react';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
  'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&q=80&w=200',
  'https://images.unsplash.com/photo-1581579438747-1dc8d1e29242?auto=format&fit=crop&q=80&w=200',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
];

export default function ElderSettingsPage({ currentUser, onNavigateTab, onLogout }) {
  const fileInputRef = useRef(null);

  // ── 1. Profile State ──
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileImage, setProfileImage] = useState(
    currentUser?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200'
  );
  const [profileData, setProfileData] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    dob: '',
    address: '',
    language: 'English'
  });
  const [profileSavedToast, setProfileSavedToast] = useState(null);
  const [elderId, setElderId] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      const userId = currentUser?.id || currentUser?.user_id;
      if (!userId) return;
      try {
        const p = await profilesService.getElderProfile(userId);
        if (p) {
          setElderId(p.elder_id || '');
          setProfileData({
            name: p.name || currentUser?.name || '',
            phone: p.phone_no || currentUser?.phone || '',
            dob: p.age_or_dob || '',
            address: p.home_address || '',
            language: p.primary_language || 'English'
          });
        }
      } catch (err) {
        console.warn('Error fetching elder profile in settings:', err);
      }
    }
    fetchProfile();
  }, [currentUser]);

  // File Upload Handler
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
        showSavedToast('Profile image uploaded! Click Save to confirm.');
      };
      reader.readAsDataURL(file);
    }
  };

  // ── 2. Reminders Toggles ──
  const [reminders, setReminders] = useState({
    medicine: true,
    appointment: true,
    water: true,
    activity: true,
    sound: true
  });

  // ── 3. Caregiver Toggles ──
  const [shareDailyUpdates, setShareDailyUpdates] = useState(true);

  // ── 4. Emergency Toggles ──
  const [emergencyConfig, setEmergencyConfig] = useState({
    shareLocation: true,
    autoNotifyCaregiver: true
  });

  // ── 5. Accessibility State ──
  const [textSize, setTextSize] = useState('Large'); // Normal, Large, Extra Large
  const [highContrast, setHighContrast] = useState(false);
  const [voiceAssistance, setVoiceAssistance] = useState(true);
  const [readAloud, setReadAloud] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('English');

  // ── 6. App Preferences ──
  const [prefNotificationSound, setPrefNotificationSound] = useState('Gentle Chime');
  const [prefReminderSound, setPrefReminderSound] = useState('Calming Flute');
  const [appThemeMode, setAppThemeMode] = useState('Light');

  // ── 7. AI Companion Drawer ──
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hello ${currentUser?.name ? currentUser.name.split(' ')[0] : 'there'}! Need help adjusting your settings or sound volumes?` }
  ]);
  const [inputMsg, setInputMsg] = useState('');

  // Toast handler
  function showSavedToast(msg) {
    setProfileSavedToast(msg);
    setTimeout(() => setProfileSavedToast(null), 3500);
  }

  const handleProfileSave = async (e) => {
    e.preventDefault();
    const updatedObj = {
      name: profileData.name || currentUser?.name || '',
      phone_no: profileData.phone || currentUser?.phone_no || '',
      phone: profileData.phone || currentUser?.phone || currentUser?.phone_no || '',
      age_or_dob: profileData.dob || '',
      age: profileData.dob || '',
      home_address: profileData.address || '',
      address: profileData.address || '',
      primary_language: profileData.language || '',
      profile_pic_url: profileImage
    };

    try {
      localStorage.setItem('elderguard_elder_profile', JSON.stringify(updatedObj));
      sessionStorage.setItem('elderguard_elder_profile', JSON.stringify(updatedObj));
      broadcastRealtimeEvent('elderguard:realtime-event', { event: 'profile:updated', profile: updatedObj });
    } catch (err) {}

    const userId = currentUser?.id || currentUser?.user_id;
    if (userId) {
      try {
        await profilesService.updateElderProfile(userId, {
          name: profileData.name,
          phone_no: profileData.phone,
          age_or_dob: profileData.dob,
          home_address: profileData.address,
          primary_language: profileData.language,
          profile_pic_url: profileImage
        });
        showSavedToast('Profile information updated successfully!');
      } catch (err) {
        console.warn('Error updating profile:', err);
        showSavedToast('Failed to update profile on server, but saved locally.');
      }
    } else {
      showSavedToast('Profile information updated locally!');
    }
    setIsEditingProfile(false);
  };

  const formatDob = (dobString) => {
    if (!dobString) return 'Not set';
    try {
      const date = new Date(dobString);
      if (isNaN(date.getTime())) return dobString;
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      const formatted = date.toLocaleDateString('en-US', options);
      // Calculate age
      const ageDiffMs = Date.now() - date.getTime();
      const ageDate = new Date(ageDiffMs);
      const age = Math.abs(ageDate.getUTCFullYear() - 1970);
      return `${formatted} (${age} yrs)`;
    } catch {
      return dobString;
    }
  };

  const toggleReminder = (key) => {
    setReminders(prev => ({ ...prev, [key]: !prev[key] }));
  };

  function handleSendChat(e) {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    setMessages(prev => [
      ...prev,
      { role: 'user', text: inputMsg },
      { role: 'assistant', text: `I can help you adjust "${inputMsg}" in your settings right now. Would you like me to update it for you?` }
    ]);
    setInputMsg('');
  }

  return (
    <div className="bg-[#FAF7F2] text-[#2E2E2E] font-inter min-h-screen pb-20 pt-2 px-4 md:px-8">

      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageFileChange}
        className="hidden"
      />

      {/* Save Toast Notification */}
      {profileSavedToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-[#4CAA6D] text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-semibold animate-bounce max-w-md w-full">
          <CheckCircle2 className="w-6 h-6 shrink-0" />
          <span className="flex-1 text-sm">{profileSavedToast}</span>
          <button onClick={() => setProfileSavedToast(null)} className="p-1 hover:bg-white/20 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Single Column Container (~70-75% width, max-w-4xl centered) */}
      <div className="max-w-4xl mx-auto space-y-8">

        {/* ══════════════════════════════════════════════════════════════
            HEADER
        ══════════════════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-br from-[#FFE8D6] via-[#FFF3E5] to-[#FCEFE3] border border-[#F5DFCD] shadow-[0_10px_30px_rgba(245,223,205,0.4)] rounded-3xl p-6 md:p-8 flex flex-wrap justify-between items-center gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 border border-[#F5DFCD] text-[#1B6B93] text-xs font-bold shadow-sm">
              <Sliders className="w-3.5 h-3.5 text-[#F5A623]" />
              <span>Elder Concierge Preferences</span>
            </div>
            <h1 className="font-fraunces font-bold text-3xl md:text-4xl text-[#2E2E2E] tracking-tight">
              Settings
            </h1>
            <p className="text-base text-[#525252] font-medium">
              Make ElderGuard work the way you like
            </p>
          </div>

          <div className="p-4 rounded-3xl bg-gradient-to-tr from-[#1B6B93] to-[#2E7D8C] text-white shadow-xl shrink-0 border-2 border-white/60">
            <User className="w-10 h-10 text-[#FFE8D6]" />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            1. MY PROFILE CARD
        ══════════════════════════════════════════════════════════════ */}
        <div className="bg-white border border-[#EBE3D5] rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-[#F0EBE1]">
            
            {/* Photo + Info */}
            <div className="flex items-center gap-5">
              <div className="relative group shrink-0">
                <img
                  src={profileImage}
                  alt="Profile Avatar"
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-4 border-[#1B6B93] shadow-md"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Change profile picture"
                  className="absolute bottom-0 right-0 p-2.5 rounded-full bg-[#1B6B93] hover:bg-[#155373] text-white border-2 border-white shadow-md transition cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <h2 className="font-fraunces font-bold text-2xl md:text-3xl text-[#2E2E2E]">
                  {profileData.name}
                </h2>
                <div className="flex flex-wrap gap-3 text-xs text-[#6B7280] font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#1B6B93]" />
                    {profileData.phone}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#4CAA6D]" />
                    {profileData.language}
                  </span>
                </div>
                {elderId && (
                  <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#E8F4FA] px-2.5 py-1.5 text-xs font-bold text-[#155373]">
                    <span>Your Elder ID</span>
                    <code className="select-all tracking-wider">{elderId}</code>
                  </div>
                )}
              </div>
            </div>

            {/* Edit Profile Button */}
            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="px-5 py-3 rounded-2xl border-2 border-[#1B6B93] text-[#1B6B93] hover:bg-[#1B6B93] hover:text-white font-bold text-xs transition shadow-sm flex items-center gap-2 cursor-pointer min-h-[48px] shrink-0"
            >
              <Edit3 className="w-4 h-4" />
              <span>{isEditingProfile ? 'Cancel Edit' : 'Edit Profile'}</span>
            </button>
          </div>

          {/* Inline Edit Form (When expanded) */}
          {isEditingProfile ? (
            <form onSubmit={handleProfileSave} className="space-y-6 pt-2 animate-in fade-in duration-200">
              
              {/* Profile Image Facility Block inside Edit Form */}
              <div className="p-5 rounded-2xl bg-[#FAF7F2] border-2 border-[#EBE3D5] space-y-4">
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                  Change Profile Photo
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <img
                    src={profileImage}
                    alt="Selected Avatar Preview"
                    className="w-20 h-20 rounded-full object-cover border-4 border-[#1B6B93] shadow-md shrink-0"
                  />

                  <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 rounded-xl bg-[#1B6B93] hover:bg-[#155373] text-white font-bold text-xs shadow-sm flex items-center gap-2 cursor-pointer min-h-[44px]"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProfileImage(PRESET_AVATARS[0])}
                      className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs transition min-h-[44px] cursor-pointer"
                    >
                      Reset Photo
                    </button>
                  </div>
                </div>

                {/* Preset Avatars Selection */}
                <div className="space-y-2 pt-2 border-t border-[#EBE3D5]">
                  <span className="text-xs font-semibold text-[#6B7280]">Or pick a sample avatar:</span>
                  <div className="flex items-center gap-3">
                    {PRESET_AVATARS.map((avatarUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setProfileImage(avatarUrl)}
                        className={`relative rounded-full transition cursor-pointer p-0.5 ${
                          profileImage === avatarUrl ? 'ring-4 ring-[#1B6B93] scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={avatarUrl}
                          alt={`Preset avatar ${idx + 1}`}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full bg-[#FAF7F2] border-2 border-[#EBE3D5] rounded-2xl px-4 py-3.5 text-sm font-bold text-[#2E2E2E] outline-none focus:border-[#1B6B93] min-h-[52px]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="w-full bg-[#FAF7F2] border-2 border-[#EBE3D5] rounded-2xl px-4 py-3.5 text-sm font-bold text-[#2E2E2E] outline-none focus:border-[#1B6B93] min-h-[52px]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={profileData.dob}
                    onChange={(e) => setProfileData({ ...profileData, dob: e.target.value })}
                    className="w-full bg-[#FAF7F2] border-2 border-[#EBE3D5] rounded-2xl px-4 py-3.5 text-sm font-bold text-[#2E2E2E] outline-none focus:border-[#1B6B93] min-h-[52px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                    Preferred Language
                  </label>
                  <select
                    value={profileData.language}
                    onChange={(e) => setProfileData({ ...profileData, language: e.target.value })}
                    className="w-full bg-[#FAF7F2] border-2 border-[#EBE3D5] rounded-2xl px-4 py-3.5 text-sm font-bold text-[#2E2E2E] outline-none focus:border-[#1B6B93] min-h-[52px]"
                  >
                    <option value="English">English</option>
                    <option value="Tamil">Tamil (தமிழ்)</option>
                    <option value="Hindi">Hindi (हिंदी)</option>
                    <option value="Telugu">Telugu (తెలుగు)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                  Home Address
                </label>
                <textarea
                  rows={2}
                  value={profileData.address}
                  onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                  className="w-full bg-[#FAF7F2] border-2 border-[#EBE3D5] rounded-2xl p-4 text-sm font-bold text-[#2E2E2E] outline-none focus:border-[#1B6B93]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-6 py-3 rounded-2xl border border-[#EBE3D5] text-xs font-bold text-[#525252] hover:bg-gray-100 min-h-[48px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 rounded-2xl bg-[#1B6B93] hover:bg-[#155373] text-white text-xs font-bold shadow-md min-h-[48px] cursor-pointer"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium text-[#525252]">
              <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EBE3D5]">
                <span className="text-[#9CA3AF] font-bold block uppercase text-[10px]">Date of Birth</span>
                <span className="text-sm font-bold text-[#2E2E2E]">{formatDob(profileData.dob)}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EBE3D5]">
                <span className="text-[#9CA3AF] font-bold block uppercase text-[10px]">Home Address</span>
                <span className="text-sm font-bold text-[#2E2E2E] truncate block">{profileData.address || 'Not set'}</span>
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            2. MY REMINDERS CARD
        ══════════════════════════════════════════════════════════════ */}
        <div className="bg-white border border-[#EBE3D5] rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-6">
          <div className="flex items-center gap-3 border-b border-[#F0EBE1] pb-4">
            <div className="p-3 rounded-2xl bg-[#FFE8D6] text-[#E2694B]">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-fraunces font-bold text-2xl text-[#2E2E2E]">My Reminders</h3>
              <p className="text-xs text-[#6B7280] font-medium">Control daily alert schedules and sounds</p>
            </div>
          </div>

          <div className="divide-y divide-[#F0EBE1]">
            
            {/* Medicine Reminders Row */}
            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-h-[64px]">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-[#F4F9F5] text-[#4CAA6D] mt-0.5">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-[#2E2E2E]">Medicine Reminders</h4>
                  <p className="text-xs text-[#6B7280] font-medium">Alerts for morning, afternoon & evening doses</p>
                  <button
                    onClick={() => showSavedToast('Opened Reminder Time Scheduler')}
                    className="text-xs font-bold text-[#1B6B93] hover:underline mt-1 inline-flex items-center gap-1 cursor-pointer"
                  >
                    + Add a Reminder Time
                  </button>
                </div>
              </div>

              {/* Large Toggle Switch */}
              <button
                onClick={() => toggleReminder('medicine')}
                className={`w-16 h-9 rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 self-start sm:self-center ${
                  reminders.medicine ? 'bg-[#4CAA6D]' : 'bg-gray-300'
                }`}
              >
                <div className={`w-7 h-7 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                  reminders.medicine ? 'translate-x-7' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Appointment Reminders Row */}
            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-h-[64px]">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-[#EEF3FF] text-[#5B8DD9] mt-0.5">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-[#2E2E2E]">Appointment Reminders</h4>
                  <p className="text-xs text-[#6B7280] font-medium">Notify 1 day and 2 hours before doctor visits</p>
                  <button
                    onClick={() => showSavedToast('Opened Appointment Alert Settings')}
                    className="text-xs font-bold text-[#1B6B93] hover:underline mt-1 inline-flex items-center gap-1 cursor-pointer"
                  >
                    + Add a Reminder Time
                  </button>
                </div>
              </div>

              <button
                onClick={() => toggleReminder('appointment')}
                className={`w-16 h-9 rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 self-start sm:self-center ${
                  reminders.appointment ? 'bg-[#4CAA6D]' : 'bg-gray-300'
                }`}
              >
                <div className={`w-7 h-7 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                  reminders.appointment ? 'translate-x-7' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Water Reminders Row */}
            <div className="py-4 flex items-center justify-between gap-3 min-h-[64px]">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-[#E6F4F1] text-[#1B6B93]">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-[#2E2E2E]">Water Reminders</h4>
                  <p className="text-xs text-[#6B7280] font-medium">Gentle hourly hydration check</p>
                </div>
              </div>

              <button
                onClick={() => toggleReminder('water')}
                className={`w-16 h-9 rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 ${
                  reminders.water ? 'bg-[#4CAA6D]' : 'bg-gray-300'
                }`}
              >
                <div className={`w-7 h-7 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                  reminders.water ? 'translate-x-7' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Activity Reminders Row */}
            <div className="py-4 flex items-center justify-between gap-3 min-h-[64px]">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-[#FFF3E5] text-[#F5A623]">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-[#2E2E2E]">Activity Reminders</h4>
                  <p className="text-xs text-[#6B7280] font-medium">Stretching and light afternoon walk prompt</p>
                </div>
              </div>

              <button
                onClick={() => toggleReminder('activity')}
                className={`w-16 h-9 rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 ${
                  reminders.activity ? 'bg-[#4CAA6D]' : 'bg-gray-300'
                }`}
              >
                <div className={`w-7 h-7 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                  reminders.activity ? 'translate-x-7' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Reminder Sound Row */}
            <div className="py-4 flex items-center justify-between gap-3 min-h-[64px]">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-[#FAF0FF] text-[#9B59B6]">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-[#2E2E2E]">Reminder Sound</h4>
                  <p className="text-xs text-[#6B7280] font-medium">Play pleasant chime when alert pops up</p>
                </div>
              </div>

              <button
                onClick={() => toggleReminder('sound')}
                className={`w-16 h-9 rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 ${
                  reminders.sound ? 'bg-[#4CAA6D]' : 'bg-gray-300'
                }`}
              >
                <div className={`w-7 h-7 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                  reminders.sound ? 'translate-x-7' : 'translate-x-0'
                }`} />
              </button>
            </div>

          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            3. MY CAREGIVER CARD
        ══════════════════════════════════════════════════════════════ */}
        <div className="bg-white border border-[#EBE3D5] rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-6">
          <div className="flex items-center justify-between border-b border-[#F0EBE1] pb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#EBE3D5] flex items-center justify-center border-2 border-[#EBE3D5]">
                <Users className="w-8 h-8 text-[#9CA3AF]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-fraunces font-bold text-2xl text-[#9CA3AF]">No Caregiver Linked</h3>
                </div>
                <p className="text-xs text-[#9CA3AF] font-semibold">Primary Caregiver · Not connected yet</p>
              </div>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => showSavedToast('No caregiver linked. Add a caregiver first.')}
              className="py-3.5 px-4 rounded-2xl bg-[#1B6B93] hover:bg-[#155373] text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 min-h-[52px] cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Call Caregiver</span>
            </button>

            <button
              onClick={() => showSavedToast('No caregiver linked. Add a caregiver first.')}
              className="py-3.5 px-4 rounded-2xl border-2 border-[#1B6B93] text-[#1B6B93] hover:bg-[#1B6B93]/10 font-bold text-xs transition flex items-center justify-center gap-2 min-h-[52px] cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>View Details</span>
            </button>

            <button
              onClick={() => showSavedToast('Add Family Member modal opened')}
              className="py-3.5 px-4 rounded-2xl border-2 border-dashed border-[#1B6B93]/50 text-[#1B6B93] hover:bg-[#1B6B93]/10 font-bold text-xs transition flex items-center justify-center gap-2 min-h-[52px] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Family Member</span>
            </button>
          </div>

          {/* Share Health Updates Toggle Row */}
          <div className="pt-4 border-t border-[#F0EBE1] flex items-center justify-between gap-4 min-h-[56px]">
            <div>
              <h4 className="font-bold text-sm text-[#2E2E2E]">Share my daily health updates</h4>
              <p className="text-xs text-[#6B7280] font-medium">Sends daily vital summaries automatically to your linked caregiver</p>
            </div>

            <button
              onClick={() => setShareDailyUpdates(!shareDailyUpdates)}
              className={`w-16 h-9 rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 ${
                shareDailyUpdates ? 'bg-[#4CAA6D]' : 'bg-gray-300'
              }`}
            >
              <div className={`w-7 h-7 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                shareDailyUpdates ? 'translate-x-7' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            4. EMERGENCY CARD (SOFT RED-TINTED BACKGROUND)
        ══════════════════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-br from-[#FFF5F5] via-[#FFEBEB] to-[#FFE0E0] border-2 border-red-200 shadow-[0_10px_35px_rgba(211,47,47,0.1)] rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-red-200/80 pb-4">
            <div className="p-3 rounded-2xl bg-red-600 text-white shadow-md">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-fraunces font-bold text-2xl text-[#9A0007]">Emergency</h3>
              <p className="text-xs text-red-700 font-bold">Fast Dispatch & Urgent Response Setup</p>
            </div>
          </div>

          {/* Emergency Contacts List */}
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-white/90 border border-red-200 flex items-center justify-between gap-3 shadow-sm">
              <div>
                <span className="text-[10px] text-red-600 font-bold uppercase tracking-wider block">Primary Emergency Contact</span>
                <p className="text-sm font-bold text-[#2E2E2E] text-[#94A3B8] italic">No emergency contact added yet</p>
              </div>
              <button onClick={() => showSavedToast('Add Emergency Contact')} className="text-xs font-bold text-[#1B6B93] hover:underline cursor-pointer">
                Add
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white/90 border border-red-200 flex items-center justify-between gap-3 shadow-sm">
              <div>
                <span className="text-[10px] text-red-600 font-bold uppercase tracking-wider block">Emergency Services Dispatch</span>
                <p className="text-sm font-bold text-[#2E2E2E]">Apollo Hospital 24/7 Ambulance · 108 / +91 44 2829 0200</p>
              </div>
              <button onClick={() => showSavedToast('Edit Ambulance Dispatch')} className="text-xs font-bold text-[#1B6B93] hover:underline cursor-pointer">
                Change
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white/90 border border-red-200 flex items-center justify-between gap-3 shadow-sm">
              <div>
                <span className="text-[10px] text-red-600 font-bold uppercase tracking-wider block">Primary Care Doctor</span>
                <p className="text-sm font-bold text-[#2E2E2E]">No primary doctor linked yet</p>
              </div>
              <button onClick={() => showSavedToast('Edit Primary Doctor')} className="text-xs font-bold text-[#1B6B93] hover:underline cursor-pointer">
                Change
              </button>
            </div>
          </div>

          {/* Emergency Toggles */}
          <div className="pt-3 border-t border-red-200/80 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm text-[#2E2E2E]">Share my location during emergency</h4>
                <p className="text-xs text-red-800 font-medium">Sends precise GPS coordinates to medical responders</p>
              </div>

              <button
                onClick={() => setEmergencyConfig({ ...emergencyConfig, shareLocation: !emergencyConfig.shareLocation })}
                className={`w-16 h-9 rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 ${
                  emergencyConfig.shareLocation ? 'bg-[#4CAA6D]' : 'bg-gray-300'
                }`}
              >
                <div className={`w-7 h-7 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                  emergencyConfig.shareLocation ? 'translate-x-7' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm text-[#2E2E2E]">Automatically notify caregiver after SOS</h4>
                <p className="text-xs text-red-800 font-medium">Sends automated phone call & SMS alert to your linked caregiver</p>
              </div>

              <button
                onClick={() => setEmergencyConfig({ ...emergencyConfig, autoNotifyCaregiver: !emergencyConfig.autoNotifyCaregiver })}
                className={`w-16 h-9 rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 ${
                  emergencyConfig.autoNotifyCaregiver ? 'bg-[#4CAA6D]' : 'bg-gray-300'
                }`}
              >
                <div className={`w-7 h-7 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                  emergencyConfig.autoNotifyCaregiver ? 'translate-x-7' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          {/* Reassuring Caption */}
          <p className="text-xs text-red-700/80 italic text-center pt-1 font-medium">
            "These settings help us contact the right people quickly when you need help."
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            5. ACCESSIBILITY CARD (VISUALLY EMPHASIZED BLUE-TINTED)
        ══════════════════════════════════════════════════════════════ */}
        <div className="bg-[#E6F4F1]/80 border-2 border-[#CDEAE5] shadow-[0_8px_30px_rgba(0,0,0,0.03)] rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-[#CDEAE5] pb-4">
            <div className="p-3 rounded-2xl bg-[#1B6B93] text-white">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-fraunces font-bold text-2xl text-[#2E2E2E]">Accessibility</h3>
              <p className="text-xs text-[#1B6B93] font-bold">Tailor visual size, voice reading and contrast for clarity</p>
            </div>
          </div>

          {/* Text Size Segmented Control */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#2E2E2E] uppercase tracking-wider">
              Text Size
            </label>
            <div className="grid grid-cols-3 gap-2 bg-white p-2 rounded-2xl border border-[#CDEAE5]">
              {['Normal', 'Large', 'Extra Large'].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setTextSize(size)}
                  className={`py-3.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer min-h-[48px] ${
                    textSize === size
                      ? 'bg-[#1B6B93] text-white shadow-md'
                      : 'text-[#525252] hover:bg-[#FAF7F2]'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* High Contrast Toggle */}
          <div className="flex items-center justify-between gap-4 py-2 border-t border-[#CDEAE5]">
            <div>
              <h4 className="font-bold text-base text-[#2E2E2E]">High Contrast</h4>
              <p className="text-xs text-[#6B7280] font-medium">Increases text boldness and icon clarity for easy viewing</p>
            </div>
            <button
              onClick={() => setHighContrast(!highContrast)}
              className={`w-16 h-9 rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 ${
                highContrast ? 'bg-[#4CAA6D]' : 'bg-gray-300'
              }`}
            >
              <div className={`w-7 h-7 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                highContrast ? 'translate-x-7' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Voice Assistance Toggle */}
          <div className="flex items-center justify-between gap-4 py-2 border-t border-[#CDEAE5]">
            <div>
              <h4 className="font-bold text-base text-[#2E2E2E]">Voice Assistance</h4>
              <p className="text-xs text-[#6B7280] font-medium">Allows voice dictation when logging readings and messages</p>
            </div>
            <button
              onClick={() => setVoiceAssistance(!voiceAssistance)}
              className={`w-16 h-9 rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 ${
                voiceAssistance ? 'bg-[#4CAA6D]' : 'bg-gray-300'
              }`}
            >
              <div className={`w-7 h-7 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                voiceAssistance ? 'translate-x-7' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Read Reminders Aloud Toggle */}
          <div className="flex items-center justify-between gap-4 py-2 border-t border-[#CDEAE5]">
            <div>
              <h4 className="font-bold text-base text-[#2E2E2E]">Read Reminders Aloud</h4>
              <p className="text-xs text-[#6B7280] font-medium">Speaks out loud when a medicine or appointment alert pops up</p>
            </div>
            <button
              onClick={() => setReadAloud(!readAloud)}
              className={`w-16 h-9 rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 ${
                readAloud ? 'bg-[#4CAA6D]' : 'bg-gray-300'
              }`}
            >
              <div className={`w-7 h-7 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                readAloud ? 'translate-x-7' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Language Selector */}
          <div className="space-y-2 pt-2 border-t border-[#CDEAE5]">
            <label className="block text-xs font-bold text-[#2E2E2E] uppercase tracking-wider">
              System Language
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['English', 'Tamil (தமிழ்)', 'Hindi (हिंदी)', 'Telugu (తెలుగు)'].map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setSelectedLanguage(lang)}
                  className={`py-3 px-3 rounded-2xl font-bold text-xs transition border-2 cursor-pointer min-h-[48px] ${
                    selectedLanguage === lang
                      ? 'bg-[#1B6B93] border-[#1B6B93] text-white shadow-sm'
                      : 'bg-white border-[#CDEAE5] text-[#525252] hover:border-[#1B6B93]'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            6. APP PREFERENCES CARD
        ══════════════════════════════════════════════════════════════ */}
        <div className="bg-white border border-[#EBE3D5] rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-6">
          <div className="flex items-center gap-3 border-b border-[#F0EBE1] pb-4">
            <div className="p-3 rounded-2xl bg-[#FFF3E5] text-[#F5A623]">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-fraunces font-bold text-2xl text-[#2E2E2E]">App Preferences</h3>
              <p className="text-xs text-[#6B7280] font-medium">Sounds, notification tones & display theme</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Notification Sound */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE3D5]">
              <div>
                <h4 className="font-bold text-sm text-[#2E2E2E]">Notification Sound</h4>
                <p className="text-xs text-[#6B7280] font-medium">Plays when receiving new health reports or messages</p>
              </div>
              <select
                value={prefNotificationSound}
                onChange={(e) => setPrefNotificationSound(e.target.value)}
                className="bg-white border border-[#EBE3D5] rounded-xl px-4 py-2.5 text-xs font-bold text-[#1B6B93] outline-none cursor-pointer min-h-[44px]"
              >
                <option value="Gentle Chime">Gentle Chime</option>
                <option value="Soft Bell">Soft Bell</option>
                <option value="Harmonious Tone">Harmonious Tone</option>
              </select>
            </div>

            {/* Reminder Sound */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE3D5]">
              <div>
                <h4 className="font-bold text-sm text-[#2E2E2E]">Reminder Sound</h4>
                <p className="text-xs text-[#6B7280] font-medium">Plays for scheduled medicine alarms</p>
              </div>
              <select
                value={prefReminderSound}
                onChange={(e) => setPrefReminderSound(e.target.value)}
                className="bg-white border border-[#EBE3D5] rounded-xl px-4 py-2.5 text-xs font-bold text-[#1B6B93] outline-none cursor-pointer min-h-[44px]"
              >
                <option value="Calming Flute">Calming Flute</option>
                <option value="Soft Chime">Soft Chime</option>
                <option value="Morning Birds">Morning Birds</option>
              </select>
            </div>

            {/* Display Mode Segmented Control */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE3D5]">
              <div>
                <h4 className="font-bold text-sm text-[#2E2E2E]">Display Mode</h4>
                <p className="text-xs text-[#6B7280] font-medium">Choose soft ivory theme or high contrast mode</p>
              </div>
              
              <div className="flex bg-white p-1 rounded-xl border border-[#EBE3D5]">
                <button
                  type="button"
                  onClick={() => setAppThemeMode('Light')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    appThemeMode === 'Light' ? 'bg-[#1B6B93] text-white shadow-sm' : 'text-[#6B7280]'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-[#F5A623]" />
                  <span>Ivory Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAppThemeMode('HighContrast')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    appThemeMode === 'HighContrast' ? 'bg-[#1B6B93] text-white shadow-sm' : 'text-[#6B7280]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>High Contrast</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            7. ACCOUNT CARD (MUTED COLORS AT BOTTOM)
        ══════════════════════════════════════════════════════════════ */}
        <div className="bg-white/80 border border-[#EBE3D5] rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-[#F0EBE1] pb-3">
            <div className="p-2.5 rounded-xl bg-gray-100 text-gray-600">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-fraunces font-bold text-xl text-[#2E2E2E]">Account & Security</h3>
              <p className="text-xs text-[#9CA3AF] font-medium">Manage password and sign-out controls</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => showSavedToast('Password reset link sent to your phone!')}
                className="px-5 py-3 rounded-2xl border border-[#EBE3D5] text-[#525252] hover:bg-gray-100 font-bold text-xs transition cursor-pointer min-h-[48px]"
              >
                Change Password
              </button>

              <button
                onClick={onLogout}
                className="px-5 py-3 rounded-2xl border border-red-200 text-red-700 hover:bg-red-50 font-bold text-xs transition flex items-center gap-2 cursor-pointer min-h-[48px]"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>

            {/* De-emphasized Delete Account Link */}
            <button
              onClick={() => showSavedToast('Delete Account requested. Contacting support...')}
              className="text-xs text-red-400 hover:text-red-600 hover:underline font-medium cursor-pointer"
            >
              Delete Account
            </button>
          </div>
        </div>

      </div>



    </div>
  );
}

