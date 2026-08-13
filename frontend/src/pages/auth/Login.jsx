import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Lock, 
  Mail, 
  AlertCircle, 
  ArrowLeft, 
  CheckCircle2, 
  Heart, 
  Users, 
  Stethoscope, 
  Building2, 
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  Activity,
  Zap
} from 'lucide-react';
import { ShaderBackground } from '../../components/ui/shader-59f0538a';
import { authService } from '../../services/authService';

export default function Login({ onNavigate, onLoginSuccess }) {
  const [role, setRole] = useState('elder');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [elderId, setElderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Role metadata for unique left preview panel
  const roleDetails = {
    elder: {
      title: 'Senior Elder Portal',
      desc: 'Voice medicine alarms, 1-tap SOS emergency button, and gentle daily check-in companion.',
      badge: 'Tier 1 Priority SOS Armed',
      stat: '0.8s Alert Dispatch Speed',
      icon: Heart,
      color: '#E2694B'
    },
    caregiver: {
      title: 'Family Caregiver Hub',
      desc: 'Real-time vitals radar, missed dose notifications, and multi-tier escalation monitor.',
      badge: 'Live Family Vitals Sync Active',
      stat: '54 Tissue / Vital Checkpoints',
      icon: Users,
      color: '#8FBBA0'
    },
    doctor: {
      title: 'Doctor Clinical Desk',
      desc: 'OCR prescription scanner, virtual consultation queue (Q-004), and patient history logs.',
      badge: 'HIPAA & Telemedicine Verified',
      stat: 'Virtual Queue Token #Q-004',
      icon: Stethoscope,
      color: '#D4A857'
    },
    hospital: {
      title: 'Hospital Emergency Desk',
      desc: 'Automated 2-minute fall-back ambulance dispatch, bed allocation, and emergency team roster.',
      badge: 'Ambulance & ICU Desk Armed',
      stat: '< 2 Min Escalation Timeout',
      icon: Building2,
      color: '#E2694B'
    },
    pharmacy: {
      title: 'Pharmacy Dispensing Hub',
      desc: 'Digital prescription orders queue, medicine fulfillment verification, and refill alerts.',
      badge: 'Auto-Refill Dispenser Online',
      stat: '100% Prescription Accuracy',
      icon: ShoppingBag,
      color: '#D4A857'
    }
  };

  const currentRoleInfo = roleDetails[role];

  const handleRoleSelect = (targetRole) => {
    setRole(targetRole);
    setError('');
    if (targetRole !== 'caregiver') {
      setElderId('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your email or phone number and password.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const data = await authService.loginWithEmail(identifier.trim(), password);

      if (role === 'caregiver' && elderId.trim()) {
        await authService.connectWithElder(elderId.trim());
      }

      setSuccessMsg(`Welcome back! Entering ${data.user.role.toUpperCase()} portal...`);
      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }
    } catch (err) {
      const errorDetail = err.response?.data?.detail || err.message || 'Invalid credentials. Please check your username and password.';
      setError(errorDetail);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      // Prompt for standard Google login
      setError('Google Sign-In integration requires configured OAuth client ID.');
    } catch (err) {
      setError('Google Sign-In failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const ActiveIcon = currentRoleInfo.icon;

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center bg-[#121715] text-[#F0E9DC] px-4 py-8 overflow-hidden font-inter">
      
      {/* WebGL Shader Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-60">
        <ShaderBackground className="w-full h-full" />
      </div>

      {/* Top Header Navigation */}
      <div className="relative z-10 w-full max-w-5xl flex justify-between items-center mb-6">
        <button 
          onClick={() => onNavigate && onNavigate('landing')}
          className="flex items-center gap-2 text-xs font-semibold text-[#F0E9DC] hover:text-[#FFFFFF] bg-[#121715]/85 backdrop-blur-xl border border-[#D4A857]/35 px-4.5 py-2.5 rounded-full transition-all duration-200 hover:border-[#D4A857] shadow-xl"
        >
          <ArrowLeft className="w-4 h-4 text-[#D4A857]" />
          <span>Back to Home</span>
        </button>

        {/* Live Network Status Pill */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#8FBBA0]/15 border border-[#8FBBA0]/30 text-[#8FBBA0] text-xs font-medium shadow-sm">
          <span className="relative flex items-center justify-center w-2 h-2">
            <span className="absolute w-3 h-3 rounded-full bg-[#8FBBA0]/50 animate-ping" />
            <span className="w-2 h-2 rounded-full bg-[#8FBBA0]" />
          </span>
          <span>Care Network Active</span>
        </div>
      </div>

      {/* UNIQUE SPLIT-CARD LUXURY LOGIN CONTAINER */}
      <div className="relative z-10 w-full max-w-5xl bg-[#121715]/90 backdrop-blur-2xl border border-[#D4A857]/40 rounded-3xl overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.7)] animate-header-entrance animate-border-glow grid grid-cols-1 lg:grid-cols-12">
        
        {/* LEFT COLUMN: Role Preview Panel & Live Metrics */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#121715] via-[#1a2320] to-[#121715] p-8 sm:p-10 border-b lg:border-b-0 lg:border-r border-[#D4A857]/20 flex flex-col justify-between relative overflow-hidden">
          
          {/* Background Ambient Glow */}
          <div className="absolute -top-20 -left-20 w-60 h-60 bg-[#D4A857]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-[#E2694B]/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            {/* Logo */}
            <div className="flex items-center gap-2.5 mb-8 cursor-pointer" onClick={() => onNavigate && onNavigate('landing')}>
              <div className="relative flex items-center justify-center">
                <div className="absolute -inset-1 rounded-xl bg-[#8FBBA0]/40 animate-signature-pulse pointer-events-none blur-xs" />
                <img 
                  src="/logo.png" 
                  alt="ElderGuard AI Logo" 
                  className="w-10 h-10 object-contain rounded-xl relative z-10 shadow-md border border-white/10" 
                />
              </div>
              <span className="font-space text-2xl font-semibold tracking-tight text-[#FFFFFF]">
                ElderGuard <span className="text-[#E2694B] text-xs font-bold font-sans px-2 py-0.5 rounded-full bg-[#E2694B]/20 border border-[#E2694B]/40">AI</span>
              </span>
            </div>

            {/* Role Dynamic Highlight Card */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8FBBA0]/15 border border-[#8FBBA0]/30 text-[#8FBBA0] text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{currentRoleInfo.badge}</span>
              </div>

              <h3 className="font-fraunces text-2xl sm:text-3xl font-semibold text-[#FFFFFF] leading-tight">
                {currentRoleInfo.title}
              </h3>

              <p className="font-inter text-xs text-[#E2E8F0] leading-relaxed font-medium">
                {currentRoleInfo.desc}
              </p>

              {/* Key Metric Widget */}
              <div className="pt-2">
                <div className="p-4 rounded-2xl bg-[#121715]/90 border border-[#D4A857]/30 flex items-center gap-3 shadow-inner">
                  <div className="w-10 h-10 rounded-xl bg-[#D4A857]/20 border border-[#D4A857]/40 flex items-center justify-center text-[#D4A857] shrink-0">
                    <Activity className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-[10px] text-[#B0AB9E] uppercase tracking-wider font-bold">System Status</div>
                    <div className="text-xs font-semibold text-[#FFFFFF]">{currentRoleInfo.stat}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enterprise Security & Compliance Trust Badges */}
          <div className="mt-8 pt-6 border-t border-[#F0E9DC]/10">
            <div className="text-[11px] font-bold text-[#D4A857] uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D4A857]" />
              <span>Enterprise Security & Trust</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-[#121715]/90 border border-[#F0E9DC]/15 flex items-center gap-2.5 shadow-sm">
                <Lock className="w-4 h-4 text-[#8FBBA0] shrink-0" />
                <div>
                  <div className="text-[11px] font-semibold text-[#FFFFFF]">256-Bit AES</div>
                  <div className="text-[9px] text-[#B0AB9E]">End-to-end Encrypted</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#121715]/90 border border-[#F0E9DC]/15 flex items-center gap-2.5 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-[#D4A857] shrink-0" />
                <div>
                  <div className="text-[11px] font-semibold text-[#FFFFFF]">HIPAA Compliant</div>
                  <div className="text-[9px] text-[#B0AB9E]">Medical Data Protection</div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Authentication Form */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
          
          <div>
            {/* Header Title */}
            <div className="mb-6">
              <h2 className="font-fraunces text-2xl font-semibold text-[#FFFFFF]">
                Sign In to Your Portal
              </h2>
              <p className="text-xs text-[#E2E8F0] font-medium mt-1">
                Select your role tab below and enter your credentials
              </p>
            </div>

            {/* 5-Role Segmented Control Bar */}
            <div className="mb-6">
              <label className="block text-[10px] font-bold text-[#D4A857] uppercase tracking-widest mb-2">
                Active Portal Target
              </label>
              <div className="grid grid-cols-5 gap-1.5 p-1.5 bg-[#121715] border border-[#F0E9DC]/15 rounded-2xl text-xs font-semibold">
                {Object.keys(roleDetails).map((r) => {
                  const Icon = roleDetails[r].icon;
                  const isActive = role === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRoleSelect(r)}
                      className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 transition-all duration-200 ${
                        isActive
                          ? 'bg-[#D4A857] text-[#121715] font-bold shadow-md shadow-[#D4A857]/20 scale-[1.02]'
                          : 'text-[#E2E8F0] hover:text-[#FFFFFF] hover:bg-[#D4A857]/15'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#121715]' : 'text-[#D4A857]'}`} />
                      <span className="text-[10px] capitalize font-medium">
                        {r === 'caregiver' ? 'Care' : r === 'pharmacy' ? 'Pharm' : r}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notifications */}
            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-[#E2694B]/15 border border-[#E2694B]/40 text-[#E2694B] text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#E2694B]" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3.5 rounded-xl bg-[#8FBBA0]/15 border border-[#8FBBA0]/40 text-[#8FBBA0] text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#8FBBA0]" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Credentials Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#FFFFFF] mb-1.5">
                  Email Address or Mobile Number
                </label>
                <div className="relative">
                  <Mail className={`absolute left-3.5 top-3.5 w-4 h-4 transition-colors ${role === 'elder' ? 'text-[#121715]' : 'text-[#D4A857]'}`} />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter email or mobile"
                    className={`w-full rounded-xl pl-10 pr-4 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[#D4A857] ${
                      role === 'elder'
                        ? 'bg-white text-[#121715] border-2 border-[#D4A857] elder-white-input placeholder-[#64748B]'
                        : 'bg-[#121715] text-[#FFFFFF] border border-[#F0E9DC]/25 placeholder-[#B0AB9E]/60 focus:border-[#D4A857]'
                    }`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#FFFFFF] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className={`absolute left-3.5 top-3.5 w-4 h-4 transition-colors ${role === 'elder' ? 'text-[#121715]' : 'text-[#D4A857]'}`} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className={`w-full rounded-xl pl-10 pr-4 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[#D4A857] ${
                      role === 'elder'
                        ? 'bg-white text-[#121715] border-2 border-[#D4A857] elder-white-input placeholder-[#64748B]'
                        : 'bg-[#121715] text-[#FFFFFF] border border-[#F0E9DC]/25 placeholder-[#B0AB9E]/60 focus:border-[#D4A857]'
                    }`}
                    required
                  />
                </div>
              </div>

              {role === 'caregiver' && (
                <div>
                  <label className="block text-xs font-semibold text-[#FFFFFF] mb-1.5">
                    Elder ID <span className="text-[#B0AB9E] font-medium">(optional)</span>
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3.5 top-3.5 w-4 h-4 text-[#D4A857]" />
                    <input
                      type="text"
                      value={elderId}
                      onChange={(e) => setElderId(e.target.value.toUpperCase())}
                      placeholder="Enter the elder's shared ID"
                      className="w-full rounded-xl bg-[#121715] text-[#FFFFFF] border border-[#F0E9DC]/25 placeholder-[#B0AB9E]/60 pl-10 pr-4 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[#D4A857] focus:border-[#D4A857]"
                      autoCapitalize="characters"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#B0AB9E]">
                    Add an Elder ID to securely link their profile for monitoring.
                  </p>
                </div>
              )}

              {/* Ember Coral Primary CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 mt-3 rounded-xl btn-ember-rich text-sm font-bold tracking-wide shadow-lg shadow-[#E2694B]/35 hover:scale-[1.01] transition-all duration-200 focus-visible:outline-none inline-flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In as {role.charAt(0).toUpperCase() + role.slice(1)}</span>
                    <Sparkles className="w-4 h-4 text-white" />
                  </>
                )}
              </button>

              {/* Google SSO Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full h-12 rounded-xl bg-[#121715]/60 border border-[#F0E9DC]/30 hover:border-[#D4A857] hover:bg-[#D4A857]/15 text-[#FFFFFF] font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-3 shadow-md"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </form>
          </div>

          {/* Registration Footer Prompt */}
          <div className="mt-6 text-center text-xs text-[#E2E8F0]">
            <span>Need a new account? </span>
            <button 
              type="button"
              onClick={() => onNavigate && onNavigate('signup')}
              className="text-[#D4A857] font-bold hover:underline"
            >
              Register Here
            </button>
          </div>

        </div>

      </div>

      {/* Footer Copyright */}
      <div className="relative z-10 text-[11px] text-[#E2E8F0] text-center mt-6 font-medium">
        © 2026 ElderGuard AI Healthcare. Multi-Tier Escalation Active.
      </div>

    </div>
  );
}
