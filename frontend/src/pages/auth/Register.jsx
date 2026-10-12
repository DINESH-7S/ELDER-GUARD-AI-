import React, { useEffect, useRef, useState } from 'react';
import { enterChildren } from '../../components/ui/motionKit';
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
  ChevronRight
} from 'lucide-react';
import { authService } from '../../services/authService';
import { profilesService } from '../../services/profiles.service';

export default function Register({ onNavigate, onRegisterSuccess }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const tilesRef = useRef(null);
  const formCardRef = useRef(null);
  useEffect(() => { enterChildren(tilesRef.current, { delay: 0.15 }); }, []);
  useEffect(() => { if (selectedRole) requestAnimationFrame(() => enterChildren(formCardRef.current?.querySelector('form'), { y: 10, delay: 0.05 })); }, [selectedRole]);
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
    { key: 'elder', title: 'Elder', desc: 'Senior Citizen', icon: User, color: 'text-eg-teal', border: 'border-eg-teal' },
    { key: 'caregiver', title: 'Caretaker', desc: 'Family or Nurse', icon: HeartHandshake, color: 'text-eg-teal', border: 'border-eg-teal' },
    { key: 'doctor', title: 'Doctor', desc: 'Medical Practitioner', icon: Stethoscope, color: 'text-eg-teal', border: 'border-eg-teal' },
    { key: 'hospital', title: 'Hospital', desc: 'Emergency Dispatch', icon: Building2, color: 'text-eg-teal', border: 'border-eg-teal' },
    { key: 'pharmacy', title: 'Pharmacy', desc: 'Medicine Dispenser', icon: Pill, color: 'text-eg-teal', border: 'border-eg-teal' },
  ];

  return (
    <div className="eg-public relative min-h-[100dvh] w-full flex flex-col items-center px-4 py-8 overflow-x-hidden">

      <div className="relative z-10 w-full max-w-4xl mx-auto">
        
        {/* Navigation Bar */}
        <div className="flex justify-between items-center mb-8">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('landing')}
            className="flex items-center gap-2 py-2 font-bold text-eg-muted transition-colors hover:text-eg-ink min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4 text-eg-teal" />
            <span>Back to home</span>
          </button>

          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onNavigate && onNavigate('landing')}>
            <div className="relative flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="ElderGuard AI Logo" 
                className="w-9 h-9 object-contain rounded-xl relative z-10 shadow-md border border-white/10" 
              />
            </div>
            <span className="font-['Geist'] text-xl font-bold tracking-tight text-eg-ink">
              ElderGuard
            </span>
          </div>
        </div>

        {/* Page title */}
        <div className="mb-10 max-w-2xl">
          <h1 className="font-fraunces text-4xl md:text-6xl text-eg-ink mb-4">
            Create your account
          </h1>
          <p className="text-eg-ink text-lg leading-relaxed max-w-[52ch]">
            Pick your role. We'll ask only for what that portal needs.
          </p>
        </div>

        {/* Component 1: Role Selection Tiles Grid */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-eg-ink mb-4">
            Who is this account for?
          </h2>
          <div ref={tilesRef} className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {roleConfigs.map((r) => {
              const IconComp = r.icon;
              const isSelected = selectedRole === r.key;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => handleRoleSelect(r.key)}
                  className={`p-5 rounded-2xl  transition-all duration-200 flex flex-col items-start justify-center text-left cursor-pointer min-h-[140px] active:scale-[0.98] ${
                    isSelected
                      ? 'bg-eg-tint border-2 border-eg-teal'
                      : 'bg-white border border-eg-line hover:border-eg-teal hover:bg-eg-tint'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl bg-white border border-eg-line mb-3 ${r.color}`}>
                    <IconComp className="w-7 h-7" />
                  </div>
                  <span className="font-bold text-eg-ink text-base block">{r.title}</span>
                  <span className="text-xs text-eg-muted block mt-1 leading-snug">{r.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Component 2: Dynamic Step-by-Step Form Container */}
        {selectedRole ? (
          <div ref={formCardRef} className="bg-white  border border-eg-line rounded-3xl p-6 md:p-10 shadow-[0_20px_50px_rgba(16,33,31,0.08)] animate-fadeIn">
            
            <div className="flex items-center justify-between border-b border-eg-line pb-4 mb-8">
              <div>
                <h3 className="font-fraunces text-3xl text-eg-ink capitalize flex items-center gap-2">
                  <span>{selectedRole === 'caregiver' ? 'Caretaker' : selectedRole} Setup</span>
                </h3>
                <p className="text-sm text-eg-muted mt-1">Fields marked * are required.</p>
              </div>
              <button type="button" onClick={() => setSelectedRole(null)} className="text-sm text-eg-muted hover:text-eg-ink underline underline-offset-4 transition-colors">
                Change role
              </button>
            </div>

            {/* Error / Success Banners */}
            {error && (
              <div role="alert" className="mb-6 p-4 rounded-2xl bg-[#FDECEA] border border-eg-sos/40 text-[#8A1C12] text-sm flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-[#8A1C12]" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-4 rounded-2xl bg-eg-tint border border-eg-teal/40 text-eg-teal text-sm flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-eg-teal" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* STEP 1: Global Fields for All Roles */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-eg-ink">Your account</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-eg-ink mb-1">Full Name *</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="e.g. Meera Iyer"
                      className="eg-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-eg-ink mb-1">Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="name@example.com"
                      className="eg-input"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-eg-ink mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+91 98765 43210"
                      className="eg-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-eg-ink mb-1">Password *</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="eg-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-eg-ink mb-1">Confirm Password *</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="eg-input"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* STEP 2: Role-Specific Fields */}
              <div className="pt-4 border-t border-eg-line space-y-4">
                <h4 className="text-lg font-semibold text-eg-ink capitalize">{selectedRole === 'caregiver' ? 'Caretaker' : selectedRole} details</h4>

                {/* ELDER FIELDS */}
                {selectedRole === 'elder' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-eg-ink mb-1">Date of Birth *</label>
                        <input
                          type="date"
                          name="dob"
                          value={formData.dob}
                          onChange={handleChange}
                          className="eg-input"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-eg-ink mb-1">Blood Group *</label>
                        <select
                          name="bloodGroup"
                          value={formData.bloodGroup}
                          onChange={handleChange}
                          className="eg-input"
                        >
                          {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                            <option key={bg} value={bg} className="">{bg}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-eg-ink mb-1">Gender *</label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          className="eg-input"
                        >
                          <option value="Female" className="">Female</option>
                          <option value="Male" className="">Male</option>
                          <option value="Other" className="">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-eg-ink mb-1">Emergency Contact Name *</label>
                        <input
                          type="text"
                          name="emergencyName"
                          value={formData.emergencyName}
                          onChange={handleChange}
                          placeholder="e.g. John Doe (Son)"
                          className="eg-input"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-eg-ink mb-1">Emergency Contact Phone *</label>
                        <input
                          type="tel"
                          name="emergencyPhone"
                          value={formData.emergencyPhone}
                          onChange={handleChange}
                          placeholder="+91 98765 43210"
                          className="eg-input"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-eg-ink mb-1">Home Address *</label>
                      <input
                        type="text"
                        name="homeAddress"
                        value={formData.homeAddress}
                        onChange={handleChange}
                        placeholder="Full residential address"
                        className="eg-input"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* CARETAKER FIELDS */}
                {selectedRole === 'caregiver' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-eg-ink mb-1">Relationship to Elder *</label>
                      <select
                        name="relationship"
                        value={formData.relationship}
                        onChange={handleChange}
                        className="w-full bg-white border border-eg-line rounded-2xl px-4 py-3.5 text-base text-eg-ink focus:outline-none focus:border-eg-teal transition min-h-[48px]"
                      >
                        <option value="Spouse" className="bg-white text-eg-ink">Spouse</option>
                        <option value="Child" className="bg-white text-eg-ink">Child (Son / Daughter)</option>
                        <option value="Sibling" className="bg-white text-eg-ink">Sibling</option>
                        <option value="Professional Caregiver" className="bg-white text-eg-ink">Professional Nurse / Caregiver</option>
                        <option value="Other" className="bg-white text-eg-ink">Other Family Member</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-eg-ink mb-2">Preferred Notification Methods *</label>
                      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-2xl border border-eg-line">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-eg-ink">
                          <input type="checkbox" name="notifyPush" checked={formData.notifyPush} onChange={handleChange} className="w-5 h-5 accent-[#14625C]" />
                          <span>In-App Push</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-eg-ink">
                          <input type="checkbox" name="notifySMS" checked={formData.notifySMS} onChange={handleChange} className="w-5 h-5 accent-[#14625C]" />
                          <span>SMS Alerts</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-eg-ink">
                          <input type="checkbox" name="notifyTelegram" checked={formData.notifyTelegram} onChange={handleChange} className="w-5 h-5 accent-[#14625C]" />
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
                        <label className="block text-sm font-semibold text-eg-ink mb-1">Medical License Number *</label>
                        <input
                          type="text"
                          name="licenseNo"
                          value={formData.licenseNo}
                          onChange={handleChange}
                          placeholder="e.g. MD-908234"
                          className="w-full bg-white border border-eg-line rounded-2xl px-4 py-3.5 text-base text-eg-ink placeholder-[#B0AB9E]/50 focus:outline-none focus:border-eg-teal transition min-h-[48px]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-eg-ink mb-1">Specialization *</label>
                        <input
                          type="text"
                          name="specialization"
                          value={formData.specialization}
                          onChange={handleChange}
                          placeholder="e.g. Geriatrics, Cardiology"
                          className="w-full bg-white border border-eg-line rounded-2xl px-4 py-3.5 text-base text-eg-ink placeholder-[#B0AB9E]/50 focus:outline-none focus:border-eg-teal transition min-h-[48px]"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-eg-ink mb-1">Associated Hospital Name</label>
                        <input
                          type="text"
                          name="associatedHospital"
                          value={formData.associatedHospital}
                          onChange={handleChange}
                          placeholder="e.g. City General Hospital"
                          className="w-full bg-white border border-eg-line rounded-2xl px-4 py-3.5 text-base text-eg-ink placeholder-[#B0AB9E]/50 focus:outline-none focus:border-eg-teal transition min-h-[48px]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-eg-ink mb-1">Years of Experience *</label>
                        <input
                          type="number"
                          name="experienceYears"
                          value={formData.experienceYears}
                          onChange={handleChange}
                          min="1"
                          max="50"
                          className="w-full bg-white border border-eg-line rounded-2xl px-4 py-3.5 text-base text-eg-ink focus:outline-none focus:border-eg-teal transition min-h-[48px]"
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
                        <label className="block text-sm font-semibold text-eg-ink mb-1">Hospital Name *</label>
                        <input
                          type="text"
                          name="hospitalName"
                          value={formData.hospitalName}
                          onChange={handleChange}
                          placeholder="e.g. St. Jude General Hospital"
                          className="w-full bg-white border border-eg-line rounded-2xl px-4 py-3.5 text-base text-eg-ink placeholder-[#B0AB9E]/50 focus:outline-none focus:border-eg-teal transition min-h-[48px]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-eg-ink mb-1">Hospital License ID *</label>
                        <input
                          type="text"
                          name="hospitalLicense"
                          value={formData.hospitalLicense}
                          onChange={handleChange}
                          placeholder="e.g. HOSP-LIC-8820"
                          className="w-full bg-white border border-eg-line rounded-2xl px-4 py-3.5 text-base text-eg-ink placeholder-[#B0AB9E]/50 focus:outline-none focus:border-eg-teal transition min-h-[48px]"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-eg-ink mb-1">Physical Address *</label>
                        <input
                          type="text"
                          name="physicalAddress"
                          value={formData.physicalAddress}
                          onChange={handleChange}
                          placeholder="Hospital location"
                          className="w-full bg-white border border-eg-line rounded-2xl px-4 py-3.5 text-base text-eg-ink placeholder-[#B0AB9E]/50 focus:outline-none focus:border-eg-teal transition min-h-[48px]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-eg-ink mb-1">Emergency Dispatch Hotline *</label>
                        <input
                          type="tel"
                          name="dispatchNumber"
                          value={formData.dispatchNumber}
                          onChange={handleChange}
                          placeholder="+91 1800 11 9111"
                          className="w-full bg-white border border-eg-line rounded-2xl px-4 py-3.5 text-base text-eg-ink placeholder-[#B0AB9E]/50 focus:outline-none focus:border-eg-teal transition min-h-[48px]"
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
                        <label className="block text-sm font-semibold text-eg-ink mb-1">Pharmacy Name *</label>
                        <input
                          type="text"
                          name="pharmacyName"
                          value={formData.pharmacyName}
                          onChange={handleChange}
                          placeholder="e.g. CareRx Pharmacy"
                          className="w-full bg-white border border-eg-line rounded-2xl px-4 py-3.5 text-base text-eg-ink placeholder-[#B0AB9E]/50 focus:outline-none focus:border-eg-teal transition min-h-[48px]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-eg-ink mb-1">Pharmacy License ID *</label>
                        <input
                          type="text"
                          name="pharmacyLicense"
                          value={formData.pharmacyLicense}
                          onChange={handleChange}
                          placeholder="e.g. PHARM-LIC-501"
                          className="w-full bg-white border border-eg-line rounded-2xl px-4 py-3.5 text-base text-eg-ink placeholder-[#B0AB9E]/50 focus:outline-none focus:border-eg-teal transition min-h-[48px]"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-eg-ink mb-1">Operating Hours *</label>
                        <input
                          type="text"
                          name="operatingHours"
                          value={formData.operatingHours}
                          onChange={handleChange}
                          placeholder="e.g. 08:00 - 22:00"
                          className="w-full bg-white border border-eg-line rounded-2xl px-4 py-3.5 text-base text-eg-ink placeholder-[#B0AB9E]/50 focus:outline-none focus:border-eg-teal transition min-h-[48px]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-eg-ink mb-1">Home Delivery Radius (km) *</label>
                        <input
                          type="number"
                          name="deliveryRadiusKm"
                          value={formData.deliveryRadiusKm}
                          onChange={handleChange}
                          min="1"
                          max="50"
                          className="w-full bg-white border border-eg-line rounded-2xl px-4 py-3.5 text-base text-eg-ink focus:outline-none focus:border-eg-teal transition min-h-[48px]"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Component 3: Terms Checkbox & Register Button */}
              <div className="pt-6 border-t border-eg-line space-y-6">
                
                <label className="flex items-center gap-3 cursor-pointer text-sm font-medium text-eg-ink">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="w-5 h-5 rounded accent-[#14625C]"
                    required
                  />
                  <span>I agree to the <a href="#terms" className="text-eg-teal underline hover:text-[#e0b764]">Terms of Service</a> and <a href="#privacy" className="text-eg-teal underline hover:text-[#e0b764]">Privacy Policy</a>.</span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-eg w-full text-lg"
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

                <div className="text-center text-sm text-eg-muted">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('login')}
                    className="text-eg-teal font-bold hover:underline"
                  >
                    Sign In Here
                  </button>
                </div>

              </div>

            </form>

          </div>
        ) : (
          <div className="text-center p-8 bg-white  border border-eg-line rounded-3xl text-eg-muted font-medium shadow-xl">
            Please select one of the 5 roles above to continue setup.
          </div>
        )}

      </div>
    </div>
  );
}
