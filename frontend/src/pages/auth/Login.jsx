import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { enterChildren, SPRING } from '../../components/ui/motionKit';
import { ArrowLeft, Buildings, CheckCircle, Envelope, Heart, Lock, Stethoscope, Storefront, Users, WarningCircle } from '@phosphor-icons/react';
import { PHOTOS } from '../../lib/photos';
import { authService } from '../../services/authService';

export default function Login({ onNavigate, onLoginSuccess }) {
  const reduceMotion = useReducedMotion();
  const formRef = useRef(null);
  useEffect(() => { enterChildren(formRef.current, { delay: 0.25 }); }, []);
  const [role, setRole] = useState('elder');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [elderId, setElderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // What each portal offers, shown beside the form
  const roleDetails = {
    elder: {
      title: 'Your portal, made simple',
      desc: 'Medicine alarms, a one-tap SOS button and a friendly companion for your day.',
      icon: Heart,
    },
    caregiver: {
      title: 'Stay close, even from far away',
      desc: 'Live vitals, missed-dose alerts and a clear view of how your loved one is doing.',
      icon: Users,
    },
    doctor: {
      title: 'Your patients, ready when you are',
      desc: 'Your consultation queue, patient history and prescriptions in one place.',
      icon: Stethoscope,
    },
    hospital: {
      title: 'An emergency desk that is never surprised',
      desc: 'SOS alerts with location and history, ambulance coordination and your doctor roster.',
      icon: Buildings,
    },
    pharmacy: {
      title: 'From prescription to doorstep',
      desc: 'A digital prescription queue, stock alerts and delivery tracking.',
      icon: Storefront,
    },
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

  const photo = role === 'elder' || role === 'doctor' || role === 'pharmacy' ? PHOTOS.manTablet : PHOTOS.womanPhone;

  return (
    <div className="eg-public min-h-[100dvh] lg:grid lg:grid-cols-2">
      {/* Photo panel */}
      <aside className="relative hidden overflow-hidden lg:block">
        <img src={photo.src(1400)} alt={photo.alt} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A2724]/90 via-[#0A2724]/30 to-transparent" />
        <div className="relative flex h-full min-h-[100dvh] flex-col justify-between p-12 text-white">
          <button type="button" onClick={() => onNavigate && onNavigate('landing')} className="flex w-fit items-center gap-3" aria-label="ElderGuard home">
            <img src="/logo.png" alt="" className="h-10 w-10 rounded-xl bg-white/90 object-contain p-0.5" />
            <span className="font-['Geist'] text-xl font-bold">ElderGuard</span>
          </button>
          <motion.div key={role} initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <h2 className="text-4xl leading-tight">{currentRoleInfo.title}</h2>
            <p className="mt-3 max-w-[40ch] text-lg leading-relaxed text-white/90">{currentRoleInfo.desc}</p>
          </motion.div>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex min-h-[100dvh] flex-col px-5 py-6 sm:px-10">
        <button type="button" onClick={() => onNavigate && onNavigate('landing')} className="flex w-fit items-center gap-2 py-2 font-bold text-eg-muted transition-colors hover:text-eg-ink">
          <ArrowLeft size={20} weight="bold" aria-hidden="true" /> Back to home
        </button>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-4xl sm:text-5xl">Welcome back</h1>
          <p className="mt-3 text-lg text-eg-muted">Choose your role, then enter your details.</p>

          <p id="role-label" className="mt-8 font-bold">I am signing in as</p>
          <div role="radiogroup" aria-labelledby="role-label" className="mt-3 grid grid-cols-5 gap-2">
            {Object.keys(roleDetails).map((r) => {
              const Icon = roleDetails[r].icon;
              const isActive = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => handleRoleSelect(r)}
                  className={`relative flex flex-col items-center gap-1.5 rounded-xl border-[1.5px] px-1 py-3 text-[0.8125rem] font-bold capitalize transition-colors ${isActive ? 'border-eg-teal text-white' : 'border-eg-line bg-white text-eg-ink hover:border-eg-teal'}`}
                >
                  {isActive && <motion.span layoutId="login-role-pill" transition={SPRING} className="absolute inset-0 rounded-[10px] bg-eg-teal" aria-hidden="true" />}
                  <Icon size={22} weight={isActive ? 'fill' : 'regular'} className="relative" aria-hidden="true" />
                  <span className="relative">{r}</span>
                </button>
              );
            })}
          </div>

          {error && (
            <motion.div
              key={error}
              role="alert"
              initial={reduceMotion ? false : { opacity: 0, x: 0 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: [0, -9, 9, -6, 6, 0] }}
              transition={{ duration: 0.5 }}
              className="mt-6 flex items-start gap-3 rounded-xl border border-eg-sos/40 bg-[#FDECEA] p-4 text-[#8A1C12]"
            >
              <WarningCircle size={22} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </motion.div>
          )}
          {successMsg && (
            <motion.div role="status" initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING} className="mt-6 flex items-start gap-3 rounded-xl border border-eg-teal/40 bg-eg-tint p-4 text-eg-teal-dark">
              <CheckCircle size={22} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="login-id" className="mb-2 block font-bold">Email address or mobile number</label>
              <div className="relative">
                <Envelope size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-eg-muted" aria-hidden="true" />
                <input id="login-id" type="text" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Enter email or mobile" className="eg-input pl-12" required />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="mb-2 block font-bold">Password</label>
              <div className="relative">
                <Lock size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-eg-muted" aria-hidden="true" />
                <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="eg-input pl-12" required />
              </div>
            </div>

            {role === 'caregiver' && (
              <div>
                <label htmlFor="login-elder-id" className="mb-2 block font-bold">Elder ID <span className="font-normal text-eg-muted">(optional)</span></label>
                <div className="relative">
                  <Users size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-eg-muted" aria-hidden="true" />
                  <input id="login-elder-id" type="text" value={elderId} onChange={(e) => setElderId(e.target.value.toUpperCase())} placeholder="The elder's shared ID" autoCapitalize="characters" className="eg-input pl-12" />
                </div>
                <p className="mt-2 text-sm text-eg-muted">Add an Elder ID to link their profile for monitoring.</p>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-eg w-full text-lg">
              {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-label="Signing in" /> : <span>Sign in as {role}</span>}
            </button>

            <button type="button" onClick={handleGoogleLogin} disabled={loading} className="btn-eg-ghost w-full text-lg">
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Continue with Google
            </button>
          </form>

          <p className="mt-8 text-center text-eg-muted">
            New here?{' '}
            <button type="button" onClick={() => onNavigate && onNavigate('signup')} className="font-bold text-eg-teal underline underline-offset-4">Register here</button>
          </p>
        </div>
      </main>
    </div>
  );
}
