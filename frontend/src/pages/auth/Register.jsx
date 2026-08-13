import React, { useState } from 'react';
import { 
  User, 
  HeartHandshake, 
  Stethoscope, 
  Building2, 
  Pill, 
  ShieldAlert, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { ShaderBackground } from '../../components/ui/shader-59f0538a';
import { authService } from '../../services/authService';
import { profilesService } from '../../services/profiles.service';

export default function Register({ onNavigate, onRegisterSuccess }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);

  // Form Fields State
  const [formData, setFormData] = useState({
    // Step 1: Global Fields
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',

    // Elder Specific
    dob: '',
    bloodGroup: 'O+',
    gender: 'Female',
    emergencyName: '',
    emergencyPhone: '',
    homeAddress: '',

    // Caregiver Specific
    relationship: 'Child',
    notifyPush: true,
    notifySMS: true,
    notifyTelegram: false,

    // Doctor Specific
    licenseNo: '',
    specialization: 'General Medicine',
    associatedHospital: '',
    experienceYears: 5,

    // Hospital Specific
    hospitalName: '',
    hospitalLicense: '',
    physicalAddress: '',
    dispatchNumber: '',

    // Pharmacy Specific
    pharmacyName: '',
    pharmacyLicense: '',
    operatingHours: '08:00 - 20:00',
    deliveryRadiusKm: 10,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRoleSelect = (roleKey) => {
    setSelectedRole(roleKey);
    setError('');
    setSuccessMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRole) {
      setError('Please select a user role first.');
      return;
    }
    if (!agreedTerms) {
      setError('You must agree to the Terms of Service to register.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      // 1. Register Auth Account in FastAPI Backend
      const authRes = await authService.signupWithEmail(
        formData.email.trim(),
        formData.password,
        selectedRole
      );

      const userId = authRes.user.id;

      // 2. Create Role-Specific Profile Record
      try {
        if (selectedRole === 'elder') {
          await profilesService.createElderProfile({
            name: formData.fullName,
            age_or_dob: formData.dob || '1950-01-01',
            gender: formData.gender,
            blood_group: formData.bloodGroup,
            phone_no: formData.phone,
            primary_language: 'English',
            home_address: formData.homeAddress,
          });
        } else if (selectedRole === 'caregiver') {
          await profilesService.createCaregiverProfile({
            name: formData.fullName,
            phone_no: formData.phone,
            relationship_to_elder: formData.relationship,
          });
        } else if (selectedRole === 'doctor') {
          await profilesService.createDoctorProfile({
            name: formData.fullName,
            specialization: formData.specialization,
            license_number: formData.licenseNo,
            years_of_experience: Number(formData.experienceYears),
          });
        } else if (selectedRole === 'hospital') {
          await profilesService.createHospitalProfile({
            office_name: formData.hospitalName || formData.fullName,
            license_id: formData.hospitalLicense,
            address: formData.physicalAddress,
            phone_no: formData.dispatchNumber || formData.phone,
          });
        } else if (selectedRole === 'pharmacy') {
          await profilesService.createPharmacyProfile({
            pharmacy_name: formData.pharmacyName || formData.fullName,
            license_id: formData.pharmacyLicense,
          });
        }
      } catch (profErr) {
        console.warn('Profile creation notification:', profErr);
      }

      setSuccessMsg(`Registration complete! Welcome to ElderGuard AI as ${selectedRole.toUpperCase()}.`);
      if (onRegisterSuccess) {
        onRegisterSuccess(authRes.user);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please check form fields and try again.');
    } finally {
      setLoading(false);
    }
  };

  const roleConfigs = [
    { key: 'elder', title: 'Elder', desc: 'Senior Citizen', icon: User, color: 'text-[#E2694B]', border: 'border-[#E2694B]' },
    { key: 'caregiver', title: 'Caretaker', desc: 'Family or Nurse', icon: HeartHandshake, color: 'text-[#8FBBA0]', border: 'border-[#8FBBA0]' },
    { key: 'doctor', title: 'Doctor', desc: 'Medical Practitioner', icon: Stethoscope, color: 'text-[#D4A857]', border: 'border-[#D4A857]' },
    { key: 'hospital', title: 'Hospital', desc: 'Emergency Dispatch', icon: Building2, color: 'text-[#E2694B]', border: 'border-[#E2694B]' },
    { key: 'pharmacy', title: 'Pharmacy', desc: 'Medicine Dispenser', icon: Pill, color: 'text-[#D4A857]', border: 'border-[#D4A857]' },
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center bg-[#121715] text-[#F0E9DC] px-4 py-8 overflow-x-hidden font-inter">
      
      {/* 21st.dev WebGL Shader Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-60">
        <ShaderBackground className="w-full h-full" />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto">
        
        {/* Navigation Bar */}
        <div className="flex justify-between items-center mb-8">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('landing')}
            className="flex items-center gap-2 text-xs font-semibold text-[#F0E9DC] hover:text-[#FFFFFF] bg-[#121715]/85 backdrop-blur-xl border border-[#D4A857]/35 px-4.5 py-2.5 rounded-full transition-all duration-200 hover:border-[#D4A857] shadow-xl min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4 text-[#D4A857]" />
            <span>Back to Home</span>
          </button>

          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onNavigate && onNavigate('landing')}>
            <div className="relative flex items-center justify-center">
              <div className="absolute -inset-1 rounded-xl bg-[#8FBBA0]/40 animate-signature-pulse pointer-events-none blur-xs" />
              <img 
                src="/logo.png" 
                alt="ElderGuard AI Logo" 
                className="w-9 h-9 object-contain rounded-xl relative z-10 shadow-md border border-white/10" 
              />
            </div>
            <span className="font-space text-xl font-semibold tracking-tight text-[#FFFFFF]">
              ElderGuard <span className="bg-[#E2694B]/25 text-[#E2694B] text-[10px] px-2 py-0.5 rounded-full font-bold font-sans uppercase tracking-wider border border-[#E2694B]/40 shadow-sm">AI</span>
            </span>
          </div>
        </div>

        {/* Page Title Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8FBBA0]/15 border border-[#8FBBA0]/30 text-[#8FBBA0] text-xs font-semibold mb-3 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#D4A857]" />
            <span>Healthcare Platform Registration</span>
          </div>
          <h1 className="font-fraunces text-3xl md:text-5xl font-semibold tracking-tight text-[#FFFFFF] drop-shadow-md mb-3">
            Create Your Account
          </h1>
          <p className="font-inter text-[#B0AB9E] text-base md:text-lg max-w-xl mx-auto font-medium leading-relaxed">
            Select your role to unlock personalized healthcare monitoring, emergency SOS protection, and assistance.
          </p>
        </div>

        {/* Component 1: Role Selection Tiles Grid */}
        <div className="mb-10">
          <h2 className="text-xs font-bold text-[#D4A857] uppercase tracking-widest text-center mb-4">
            1. Select Your Platform Role
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {roleConfigs.map((r) => {
              const IconComp = r.icon;
              const isSelected = selectedRole === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => handleRoleSelect(r.key)}
                  className={`p-5 rounded-3xl backdrop-blur-xl transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer min-h-[125px] ${
                    isSelected
                      ? 'bg-[#121715]/95 border-2 border-[#D4A857] ring-4 ring-[#D4A857]/20 shadow-[0_0_30px_rgba(212,168,87,0.3)] scale-[1.03]'
                      : 'bg-[#121715]/80 border border-[#D4A857]/25 hover:border-[#8FBBA0]/60 hover:bg-[#18201D]/90'
                  }`}
                >
                  <div className={`p-3 rounded-2xl bg-[#0D1110] border border-[#D4A857]/30 mb-3 ${r.color}`}>
                    <IconComp className="w-7 h-7" />
                  </div>
                  <span className="font-bold text-[#FFFFFF] text-base block">{r.title}</span>
                  <span className="text-[11px] text-[#B0AB9E] block mt-0.5">{r.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Component 2: Dynamic Step-by-Step Form Container */}
        {selectedRole ? (
          <div className="bg-[#121715]/90 backdrop-blur-2xl border border-[#D4A857]/40 rounded-3xl p-6 md:p-10 shadow-[0_25px_70px_rgba(0,0,0,0.7)] transition-all duration-500 animate-fadeIn">
            
            <div className="flex items-center justify-between border-b border-[#D4A857]/20 pb-4 mb-8">
              <div>
                <h3 className="font-fraunces text-2xl font-semibold text-[#FFFFFF] capitalize flex items-center gap-2">
                  <span>{selectedRole === 'caregiver' ? 'Caretaker' : selectedRole} Setup</span>
                </h3>
                <p className="text-xs text-[#8FBBA0] font-semibold mt-1">Fill in the required information for your role profile.</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#18201D] border border-[#D4A857]/40 text-[#D4A857] text-xs font-bold uppercase">
                Role: {selectedRole}
              </span>
            </div>

            {/* Error / Success Banners */}
            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-[#E2694B]/15 border border-[#E2694B]/40 text-[#E2694B] text-sm flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-[#E2694B]" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-4 rounded-2xl bg-[#8FBBA0]/15 border border-[#8FBBA0]/40 text-[#8FBBA0] text-sm flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-[#8FBBA0]" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* STEP 1: Global Fields for All Roles */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-[#D4A857] uppercase tracking-wider">Step 1: Account Information</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#F0E9DC] mb-1">Full Name *</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="e.g. Jane Doe"
                      className={`w-full rounded-2xl px-4 py-3.5 text-base font-semibold focus:outline-none transition min-h-[48px] ${
                        selectedRole === 'elder'
                          ? 'bg-white text-[#121715] border-2 border-[#D4A857] elder-white-input placeholder-[#64748B] focus:ring-2 focus:ring-[#D4A857]'
                          : 'bg-[#0D1110] text-[#FFFFFF] border border-[#D4A857]/30 placeholder-[#B0AB9E]/50 focus:border-[#D4A857] focus:ring-2 focus:ring-[#D4A857]/20'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#F0E9DC] mb-1">Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="name@example.com"
                      className={`w-full rounded-2xl px-4 py-3.5 text-base font-semibold focus:outline-none transition min-h-[48px] ${
                        selectedRole === 'elder'
                          ? 'bg-white text-[#121715] border-2 border-[#D4A857] elder-white-input placeholder-[#64748B] focus:ring-2 focus:ring-[#D4A857]'
                          : 'bg-[#0D1110] text-[#FFFFFF] border border-[#D4A857]/30 placeholder-[#B0AB9E]/50 focus:border-[#D4A857] focus:ring-2 focus:ring-[#D4A857]/20'
                      }`}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#F0E9DC] mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+91 98765 43210"
                      className={`w-full rounded-2xl px-4 py-3.5 text-base font-semibold focus:outline-none transition min-h-[48px] ${
                        selectedRole === 'elder'
                          ? 'bg-white text-[#121715] border-2 border-[#D4A857] elder-white-input placeholder-[#64748B] focus:ring-2 focus:ring-[#D4A857]'
                          : 'bg-[#0D1110] text-[#FFFFFF] border border-[#D4A857]/30 placeholder-[#B0AB9E]/50 focus:border-[#D4A857] focus:ring-2 focus:ring-[#D4A857]/20'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#F0E9DC] mb-1">Password *</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className={`w-full rounded-2xl px-4 py-3.5 text-base font-semibold focus:outline-none transition min-h-[48px] ${
                        selectedRole === 'elder'
                          ? 'bg-white text-[#121715] border-2 border-[#D4A857] elder-white-input placeholder-[#64748B] focus:ring-2 focus:ring-[#D4A857]'
                          : 'bg-[#0D1110] text-[#FFFFFF] border border-[#D4A857]/30 placeholder-[#B0AB9E]/50 focus:border-[#D4A857] focus:ring-2 focus:ring-[#D4A857]/20'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#F0E9DC] mb-1">Confirm Password *</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className={`w-full rounded-2xl px-4 py-3.5 text-base font-semibold focus:outline-none transition min-h-[48px] ${
                        selectedRole === 'elder'
                          ? 'bg-white text-[#121715] border-2 border-[#D4A857] elder-white-input placeholder-[#64748B] focus:ring-2 focus:ring-[#D4A857]'
                          : 'bg-[#0D1110] text-[#FFFFFF] border border-[#D4A857]/30 placeholder-[#B0AB9E]/50 focus:border-[#D4A857] focus:ring-2 focus:ring-[#D4A857]/20'
                      }`}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* STEP 2: Role-Specific Fields */}
              <div className="pt-4 border-t border-[#D4A857]/20 space-y-4">
                <h4 className="text-xs font-bold text-[#D4A857] uppercase tracking-wider">Step 2: Role Details ({selectedRole.toUpperCase()})</h4>

                {/* ELDER FIELDS */}
                {selectedRole === 'elder' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-[#F0E9DC] mb-1">Date of Birth *</label>
                        <input
                          type="date"
                          name="dob"
                          value={formData.dob}
                          onChange={handleChange}
                          className="w-full bg-white text-[#121715] border-2 border-[#D4A857] rounded-2xl px-4 py-3.5 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#D4A857] transition min-h-[48px] elder-white-input placeholder-[#64748B]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[#F0E9DC] mb-1">Blood Group *</label>
                        <select
                          name="bloodGroup"
                          value={formData.bloodGroup}
                          onChange={handleChange}
                          className="w-full bg-white text-[#121715] border-2 border-[#D4A857] rounded-2xl px-4 py-3.5 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#D4A857] transition min-h-[48px] elder-white-input"
                        >
                          {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                            <option key={bg} value={bg} className="bg-white text-[#121715]">{bg}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[#F0E9DC] mb-1">Gender *</label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          className="w-full bg-white text-[#121715] border-2 border-[#D4A857] rounded-2xl px-4 py-3.5 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#D4A857] transition min-h-[48px] elder-white-input"
                        >
                          <option value="Female" className="bg-white text-[#121715]">Female</option>
                          <option value="Male" className="bg-white text-[#121715]">Male</option>
                          <option value="Other" className="bg-white text-[#121715]">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-[#F0E9DC] mb-1">Emergency Contact Name *</label>
                        <input
                          type="text"
                          name="emergencyName"
                          value={formData.emergencyName}
                          onChange={handleChange}
                          placeholder="e.g. John Doe (Son)"
                          className="w-full bg-white text-[#121715] border-2 border-[#D4A857] rounded-2xl px-4 py-3.5 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#D4A857] transition min-h-[48px] elder-white-input placeholder-[#64748B]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[#F0E9DC] mb-1">Emergency Contact Phone *</label>
                        <input
                          type="tel"
                          name="emergencyPhone"
                          value={formData.emergencyPhone}
                          onChange={handleChange}
                          placeholder="+91 98765 43210"
                          className="w-full bg-white text-[#121715] border-2 border-[#D4A857] rounded-2xl px-4 py-3.5 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#D4A857] transition min-h-[48px] elder-white-input placeholder-[#64748B]"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#F0E9DC] mb-1">Home Address *</label>
                      <input
                        type="text"
                        name="homeAddress"
                        value={formData.homeAddress}
                        onChange={handleChange}
                        placeholder="Full residential address"
                        className="w-full bg-white text-[#121715] border-2 border-[#D4A857] rounded-2xl px-4 py-3.5 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#D4A857] transition min-h-[48px] elder-white-input placeholder-[#64748B]"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* CARETAKER FIELDS */}
                {selectedRole === 'caregiver' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#F0E9DC] mb-1">Relationship to Elder *</label>
                      <select
                        name="relationship"
                        value={formData.relationship}
                        onChange={handleChange}
                        className="w-full bg-[#0D1110] border border-[#D4A857]/30 rounded-2xl px-4 py-3.5 text-base text-[#FFFFFF] focus:outline-none focus:border-[#D4A857] transition min-h-[48px]"
                      >
                        <option value="Spouse" className="bg-[#121715] text-[#FFFFFF]">Spouse</option>
                        <option value="Child" className="bg-[#121715] text-[#FFFFFF]">Child (Son / Daughter)</option>
                        <option value="Sibling" className="bg-[#121715] text-[#FFFFFF]">Sibling</option>
                        <option value="Professional Caregiver" className="bg-[#121715] text-[#FFFFFF]">Professional Nurse / Caregiver</option>
                        <option value="Other" className="bg-[#121715] text-[#FFFFFF]">Other Family Member</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#F0E9DC] mb-2">Preferred Notification Methods *</label>
                      <div className="flex flex-wrap gap-4 bg-[#0D1110] p-4 rounded-2xl border border-[#D4A857]/20">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[#F0E9DC]">
                          <input type="checkbox" name="notifyPush" checked={formData.notifyPush} onChange={handleChange} className="w-5 h-5 accent-[#D4A857]" />
                          <span>In-App Push</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[#F0E9DC]">
                          <input type="checkbox" name="notifySMS" checked={formData.notifySMS} onChange={handleChange} className="w-5 h-5 accent-[#D4A857]" />
                          <span>SMS Alerts</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[#F0E9DC]">
                          <input type="checkbox" name="notifyTelegram" checked={formData.notifyTelegram} onChange={handleChange} className="w-5 h-5 accent-[#D4A857]" />
                          <span>Telegram Bot</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* DOCTOR FIELDS */}
                {selectedRole === 'doctor' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-[#F0E9DC] mb-1">Medical License Number *</label>
                        <input
                          type="text"
                          name="licenseNo"
                          value={formData.licenseNo}
                          onChange={handleChange}
                          placeholder="e.g. MD-908234"
                          className="w-full bg-[#0D1110] border border-[#D4A857]/30 rounded-2xl px-4 py-3.5 text-base text-[#FFFFFF] placeholder-[#B0AB9E]/50 focus:outline-none focus:border-[#D4A857] transition min-h-[48px]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[#F0E9DC] mb-1">Specialization *</label>
                        <input
                          type="text"
                          name="specialization"
                          value={formData.specialization}
                          onChange={handleChange}
                          placeholder="e.g. Geriatrics, Cardiology"
                          className="w-full bg-[#0D1110] border border-[#D4A857]/30 rounded-2xl px-4 py-3.5 text-base text-[#FFFFFF] placeholder-[#B0AB9E]/50 focus:outline-none focus:border-[#D4A857] transition min-h-[48px]"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-[#F0E9DC] mb-1">Associated Hospital Name</label>
                        <input
                          type="text"
                          name="associatedHospital"
                          value={formData.associatedHospital}
                          onChange={handleChange}
                          placeholder="e.g. City General Hospital"
                          className="w-full bg-[#0D1110] border border-[#D4A857]/30 rounded-2xl px-4 py-3.5 text-base text-[#FFFFFF] placeholder-[#B0AB9E]/50 focus:outline-none focus:border-[#D4A857] transition min-h-[48px]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[#F0E9DC] mb-1">Years of Experience *</label>
                        <input
                          type="number"
                          name="experienceYears"
                          value={formData.experienceYears}
                          onChange={handleChange}
                          min="1"
                          max="50"
                          className="w-full bg-[#0D1110] border border-[#D4A857]/30 rounded-2xl px-4 py-3.5 text-base text-[#FFFFFF] focus:outline-none focus:border-[#D4A857] transition min-h-[48px]"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* HOSPITAL FIELDS */}
                {selectedRole === 'hospital' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-[#F0E9DC] mb-1">Hospital Name *</label>
                        <input
                          type="text"
                          name="hospitalName"
                          value={formData.hospitalName}
                          onChange={handleChange}
                          placeholder="e.g. St. Jude General Hospital"
                          className="w-full bg-[#0D1110] border border-[#D4A857]/30 rounded-2xl px-4 py-3.5 text-base text-[#FFFFFF] placeholder-[#B0AB9E]/50 focus:outline-none focus:border-[#D4A857] transition min-h-[48px]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[#F0E9DC] mb-1">Hospital License ID *</label>
                        <input
                          type="text"
                          name="hospitalLicense"
                          value={formData.hospitalLicense}
                          onChange={handleChange}
                          placeholder="e.g. HOSP-LIC-8820"
                          className="w-full bg-[#0D1110] border border-[#D4A857]/30 rounded-2xl px-4 py-3.5 text-base text-[#FFFFFF] placeholder-[#B0AB9E]/50 focus:outline-none focus:border-[#D4A857] transition min-h-[48px]"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-[#F0E9DC] mb-1">Physical Address *</label>
                        <input
                          type="text"
                          name="physicalAddress"
                          value={formData.physicalAddress}
                          onChange={handleChange}
                          placeholder="Hospital location"
                          className="w-full bg-[#0D1110] border border-[#D4A857]/30 rounded-2xl px-4 py-3.5 text-base text-[#FFFFFF] placeholder-[#B0AB9E]/50 focus:outline-none focus:border-[#D4A857] transition min-h-[48px]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[#F0E9DC] mb-1">Emergency Dispatch Hotline *</label>
                        <input
                          type="tel"
                          name="dispatchNumber"
                          value={formData.dispatchNumber}
                          onChange={handleChange}
                          placeholder="+91 1800 11 9111"
                          className="w-full bg-[#0D1110] border border-[#D4A857]/30 rounded-2xl px-4 py-3.5 text-base text-[#FFFFFF] placeholder-[#B0AB9E]/50 focus:outline-none focus:border-[#D4A857] transition min-h-[48px]"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* PHARMACY FIELDS */}
                {selectedRole === 'pharmacy' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-[#F0E9DC] mb-1">Pharmacy Name *</label>
                        <input
                          type="text"
                          name="pharmacyName"
                          value={formData.pharmacyName}
                          onChange={handleChange}
                          placeholder="e.g. CareRx Pharmacy"
                          className="w-full bg-[#0D1110] border border-[#D4A857]/30 rounded-2xl px-4 py-3.5 text-base text-[#FFFFFF] placeholder-[#B0AB9E]/50 focus:outline-none focus:border-[#D4A857] transition min-h-[48px]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[#F0E9DC] mb-1">Pharmacy License ID *</label>
                        <input
                          type="text"
                          name="pharmacyLicense"
                          value={formData.pharmacyLicense}
                          onChange={handleChange}
                          placeholder="e.g. PHARM-LIC-501"
                          className="w-full bg-[#0D1110] border border-[#D4A857]/30 rounded-2xl px-4 py-3.5 text-base text-[#FFFFFF] placeholder-[#B0AB9E]/50 focus:outline-none focus:border-[#D4A857] transition min-h-[48px]"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-[#F0E9DC] mb-1">Operating Hours *</label>
                        <input
                          type="text"
                          name="operatingHours"
                          value={formData.operatingHours}
                          onChange={handleChange}
                          placeholder="e.g. 08:00 - 22:00"
                          className="w-full bg-[#0D1110] border border-[#D4A857]/30 rounded-2xl px-4 py-3.5 text-base text-[#FFFFFF] placeholder-[#B0AB9E]/50 focus:outline-none focus:border-[#D4A857] transition min-h-[48px]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[#F0E9DC] mb-1">Home Delivery Radius (km) *</label>
                        <input
                          type="number"
                          name="deliveryRadiusKm"
                          value={formData.deliveryRadiusKm}
                          onChange={handleChange}
                          min="1"
                          max="50"
                          className="w-full bg-[#0D1110] border border-[#D4A857]/30 rounded-2xl px-4 py-3.5 text-base text-[#FFFFFF] focus:outline-none focus:border-[#D4A857] transition min-h-[48px]"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Component 3: Terms Checkbox & Register Button */}
              <div className="pt-6 border-t border-[#D4A857]/20 space-y-6">
                
                <label className="flex items-center gap-3 cursor-pointer text-sm font-medium text-[#F0E9DC]">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="w-5 h-5 rounded accent-[#D4A857]"
                    required
                  />
                  <span>I agree to the <a href="#terms" className="text-[#D4A857] underline hover:text-[#e0b764]">Terms of Service</a> and <a href="#privacy" className="text-[#D4A857] underline hover:text-[#e0b764]">Privacy Policy</a>.</span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#E2694B] to-[#d55839] hover:from-[#d55839] hover:to-[#c4492b] text-white font-bold text-lg shadow-xl shadow-[#E2694B]/25 transition duration-300 hover:scale-[1.01] flex items-center justify-center gap-3 min-h-[52px] cursor-pointer"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Register Account</span>
                      <ChevronRight className="w-6 h-6" />
                    </>
                  )}
                </button>

                <div className="text-center text-sm text-[#B0AB9E]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('login')}
                    className="text-[#D4A857] font-bold hover:underline"
                  >
                    Sign In Here
                  </button>
                </div>

              </div>

            </form>

          </div>
        ) : (
          <div className="text-center p-8 bg-[#121715]/80 backdrop-blur-xl border border-[#D4A857]/30 rounded-3xl text-[#B0AB9E] font-medium shadow-xl">
            👈 Please select one of the 5 roles above to continue setup.
          </div>
        )}

      </div>
    </div>
  );
}
