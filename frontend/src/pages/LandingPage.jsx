import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, 
  Pill, 
  HeartPulse, 
  Bot, 
  Calendar, 
  FileText, 
  Users, 
  ChevronRight, 
  PhoneCall, 
  Sun, 
  Moon, 
  ZoomIn, 
  CheckCircle2, 
  Stethoscope, 
  Building2, 
  ShoppingBag 
} from 'lucide-react';

import { ShaderBackground } from '../components/ui/shader-59f0538a';
import vitalsEngine from '../utils/vitalsSimulation';

export default function LandingPage({ onNavigate, currentUser, onOpenProfile, onLoginSuccess, onLogout }) {
  const [largeFont, setLargeFont] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);

  const [landingVitals, setLandingVitals] = useState(() => vitalsEngine.getVitals());

  useEffect(() => {
    const handleVitalsUpdate = (e) => {
      if (e.detail?.vitals) {
        setLandingVitals({ ...e.detail.vitals });
      }
    };
    window.addEventListener('elderguard:vitals-update', handleVitalsUpdate);
    return () => window.removeEventListener('elderguard:vitals-update', handleVitalsUpdate);
  }, []);



  const cardsRef = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const card = entry.target;
            const index = Number(card.getAttribute('data-index') || 0);
            setTimeout(() => {
              card.style.opacity = '1';
              card.style.transform = 'translateY(0)';
            }, index * 60);
            observer.unobserve(card);
          }
        });
      },
      { threshold: 0.1 }
    );

    cardsRef.current.forEach((card) => {
      if (card) observer.observe(card);
    });

    return () => observer.disconnect();
  }, []);

  const featureCards = [
    {
      title: "Emergency SOS & Multi-Tier Escalation",
      body: "One tap alerts family first. If nobody responds, hospitals and ambulances are notified automatically — no one has to remember to make that call.",
      icon: ShieldAlert,
      accent: "#E2694B", // --ember
      hoverBorder: "hover:border-[#E2694B]/60"
    },
    {
      title: "Smart Medicine Reminders",
      body: "A gentle alarm for every dose, grouped so multiple medicines ring as one reminder, not five. Miss it three times and a caregiver is notified right away.",
      icon: Pill,
      accent: "#8FBBA0", // --sage
      hoverBorder: "hover:border-[#8FBBA0]/60"
    },
    {
      title: "Vitals Tracking & Anomaly Alerts",
      body: "Blood pressure, glucose, oxygen, and heart rate, tracked over time. Unusual readings are flagged for a doctor automatically, before they become a bigger problem.",
      icon: HeartPulse,
      accent: "#D4A857", // --soft-gold
      hoverBorder: "hover:border-[#D4A857]/60"
    },
    {
      title: "AI Companion & Distress Detector",
      body: "A warm, patient voice for conversation and company. If it hears real distress, it notifies a caregiver immediately, without waiting to be asked.",
      icon: Bot,
      accent: "#E2694B", // --ember
      hoverBorder: "hover:border-[#E2694B]/60"
    },
    {
      title: "Doctor Appointments & Queue Tokens",
      body: "Real appointment slots, booked in real time. Every visit gets a queue number, so families know exactly when they'll be seen.",
      icon: Calendar,
      accent: "#8FBBA0", // --sage
      hoverBorder: "hover:border-[#8FBBA0]/60"
    },
    {
      title: "Prescription OCR Scanner & Vault",
      body: "Photograph a handwritten prescription and it becomes a medicine schedule automatically. Every report stays stored and easy to find later.",
      icon: FileText,
      accent: "#D4A857", // --soft-gold
      hoverBorder: "hover:border-[#D4A857]/60"
    }
  ];

  return (
    <div className={`relative min-h-screen font-inter transition-all duration-300 ${highContrast ? 'bg-black text-[#FFFFFF]' : 'bg-[#121715] text-[#F0E9DC]'} ${largeFont ? 'text-lg' : 'text-base'}`}>
      
      {/* Exact Login Page Shader Background Shading (60% opacity over #121715) */}
      <div className="fixed inset-0 z-0 opacity-60 pointer-events-none">
        <ShaderBackground className="h-full w-full" />
      </div>

      {/* Foreground Content Layer */}
      <div className="relative z-10">

        {/* Integrated Ultra-Premium Floating Glassmorphism Header */}
        <header className="sticky top-4 z-50 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-header-entrance">
          <div className="w-full rounded-full bg-[#121715]/85 backdrop-blur-2xl border border-[#D4A857]/35 shadow-[0_12px_40px_rgba(0,0,0,0.5)] px-4 sm:px-6 py-2.5 flex items-center justify-between transition-all duration-300 hover:border-[#D4A857]/60 hover:shadow-[0_16px_50px_rgba(212,168,87,0.15)]">
            
            {/* Left: Brand Logo & Live System Status Badge */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onNavigate && onNavigate('landing')}>
                <div className="relative flex items-center justify-center">
                  <div className="absolute -inset-1 rounded-xl bg-[#8FBBA0]/30 animate-signature-pulse pointer-events-none blur-xs" />
                  <img 
                    src="/logo.png" 
                    alt="ElderGuard AI Logo" 
                    className="w-10 h-10 object-contain rounded-xl relative z-10 shadow-sm border border-white/10" 
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-space text-lg font-semibold tracking-tight text-[#FFFFFF]">
                    ElderGuard
                  </span>
                  <span className="bg-[#E2694B]/25 text-[#E2694B] text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-[#E2694B]/40 shadow-sm">
                    AI
                  </span>
                </div>
              </div>

              {/* Status Badge Divider */}
              <div className="hidden lg:block h-4 w-[1px] bg-white/15 mx-1" />

              {/* Live Connected Badge */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-[#8FBBA0]/15 border border-[#8FBBA0]/30 text-[#8FBBA0] text-[11px] font-medium">
                <span className="relative flex items-center justify-center w-2 h-2">
                  <span className="absolute w-3 h-3 rounded-full bg-[#8FBBA0]/50 animate-ping" />
                  <span className="w-2 h-2 rounded-full bg-[#8FBBA0]" />
                </span>
                <span>Care Network Active</span>
              </div>
            </div>

            {/* Center: Navigation Links (Features • Users • Contact) - Expanded Width */}
            <nav className="hidden md:flex items-center gap-3 bg-[#121715]/60 px-3 py-1.5 rounded-full border border-[#F0E9DC]/10 shadow-inner">
              <a 
                href="#features" 
                className="px-6 py-2 rounded-full text-xs font-semibold text-[#FFFFFF] hover:text-[#FFFFFF] hover:bg-[#D4A857]/20 transition-all duration-200"
              >
                Features
              </a>
              <a 
                href="#portals" 
                className="px-6 py-2 rounded-full text-xs font-semibold text-[#FFFFFF] hover:text-[#FFFFFF] hover:bg-[#D4A857]/20 transition-all duration-200"
              >
                Users
              </a>
              <a 
                href="#contact" 
                className="px-6 py-2 rounded-full text-xs font-semibold text-[#FFFFFF] hover:text-[#FFFFFF] hover:bg-[#D4A857]/20 transition-all duration-200 cursor-pointer"
              >
                Contact
              </a>
            </nav>

            {/* Right: Accessibility Controls & Expanded Sign In CTA */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setLargeFont(!largeFont)}
                className="p-2.5 rounded-full bg-[#121715]/60 border border-[#F0E9DC]/25 hover:border-[#D4A857] hover:bg-[#D4A857]/20 text-[#D4A857] transition text-xs font-medium focus-visible:outline-none shadow-sm"
                title="Toggle Large Accessible Text"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <button 
                onClick={() => setHighContrast(!highContrast)}
                className="p-2.5 rounded-full bg-[#121715]/60 border border-[#F0E9DC]/25 hover:border-[#D4A857] hover:bg-[#D4A857]/20 text-[#D4A857] transition text-xs font-medium focus-visible:outline-none shadow-sm"
                title="Toggle High Contrast Mode"
              >
                {highContrast ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {currentUser ? (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => onOpenProfile && onOpenProfile()}
                    className="flex items-center gap-1.5 h-10 px-4 rounded-full bg-[#121715]/80 hover:bg-[#D4A857]/20 border border-[#D4A857]/45 text-xs font-semibold text-[#FFFFFF] transition focus-visible:outline-none shadow-sm"
                  >
                    <Users className="w-4 h-4 text-[#D4A857]" />
                    <span>Profile</span>
                  </button>

                  <button 
                    onClick={() => onLogout && onLogout()}
                    className="h-10 px-3.5 rounded-full bg-[#121715]/50 border border-[#F0E9DC]/30 hover:border-[#E2694B] text-xs font-medium text-[#FFFFFF] hover:text-[#E2694B] transition focus-visible:outline-none"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => onNavigate && onNavigate('login')}
                  className="h-11 px-7 rounded-full btn-ember-rich text-sm font-bold tracking-wide shadow-lg shadow-[#E2694B]/35 hover:scale-105 transition-all duration-200 focus-visible:outline-none inline-flex items-center justify-center"
                >
                  Sign In
                </button>
              )}
            </div>

          </div>
        </header>

        {/* Hero Section — Grid-Aligned & Centered Stack */}
        <section className="relative px-6 sm:px-8 lg:px-12 py-24 sm:py-32 max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto flex flex-col items-center text-center space-y-8">
            
            {/* Eyebrow Badge */}
            <div className="animate-hero-eyebrow inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#121715]/80 backdrop-blur-md border border-[#8FBBA0]/60 text-[#8FBBA0] text-[13px] font-semibold shadow-lg">
              <span className="w-[7px] h-[7px] rounded-full bg-[#8FBBA0] shadow-sm shadow-[#8FBBA0]"></span>
              <span>Built for families who care from a distance</span>
            </div>

            {/* H1 Headline with Metallic Gold Gradient Shimmer */}
            <h1 className="animate-hero-headline font-fraunces font-semibold text-[#FFFFFF] text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.15] max-w-3xl [text-shadow:_0_2px_12px_rgba(0,0,0,0.5)]">
              Care that reaches them, <span className="text-gradient-gold-ember drop-shadow-sm italic">wherever you are</span>
            </h1>

            {/* Description Paragraph */}
            <p className="animate-hero-subheading font-inter text-lg sm:text-xl text-[#FFFFFF] leading-[1.8] max-w-2xl font-medium [text-shadow:_0_1px_8px_rgba(0,0,0,0.5)]">
              ElderGuard AI connects seniors, family caregivers, doctors, hospitals, and pharmacies in one place. Medicine reminders that actually get answered. Emergency alerts that reach the right people in seconds. A gentle AI companion, always ready to listen.
            </p>

            {/* Perfectly Aligned Equal-Width Hero CTA Buttons with Height h-14 (56px) */}
            <div className="animate-hero-ctas flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto pt-2">
              {/* Primary Coral CTA Button - Matched Equal Width (230px) & Height h-14 */}
              <a 
                href="#features"
                className="w-full sm:w-[230px] h-14 rounded-xl btn-ember-rich font-semibold text-[15px] inline-flex items-center justify-center gap-2.5 shadow-lg shadow-[#E2694B]/30 hover:-translate-y-0.5 focus-visible:outline-none flex-shrink-0"
              >
                <span>See how it works</span>
                <ChevronRight className="w-4 h-4 text-[#FFFFFF]" />
              </a>

              {/* Secondary Glassmorphism CTA Button - Matched Equal Width (230px) & Height h-14 */}
              <a 
                href="#portals"
                className="w-full sm:w-[230px] h-14 rounded-xl bg-[#121715]/60 backdrop-blur-md border border-[#F0E9DC]/40 hover:border-[#D4A857] hover:bg-[#D4A857]/20 text-[#FFFFFF] font-semibold text-[15px] inline-flex items-center justify-center shadow-md hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-none flex-shrink-0"
              >
                <span>Explore the care network</span>
              </a>
            </div>

            {/* Interactive Live Monitoring Hub Product Showcase Widget */}
            <div className="w-full max-w-4xl mx-auto mt-14 p-[1.5px] rounded-3xl bg-gradient-to-b from-[#D4A857]/50 via-[#F0E9DC]/20 to-[#E2694B]/35 shadow-[0_25px_60px_rgba(0,0,0,0.6)] animate-border-glow">
              <div className="bg-[#121715]/90 backdrop-blur-2xl rounded-[22px] p-6 sm:p-8 border border-[#F0E9DC]/10 text-left">
                
                {/* Widget Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-5 mb-6 border-b border-[#F0E9DC]/10 text-xs font-inter">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-[#E2694B] shadow-sm shadow-[#E2694B]/50" />
                    <div className="w-3 h-3 rounded-full bg-[#D4A857] shadow-sm shadow-[#D4A857]/50" />
                    <div className="w-3 h-3 rounded-full bg-[#8FBBA0] shadow-sm shadow-[#8FBBA0]/50" />
                    <span className="ml-2 font-mono text-[11px] text-[#F0E9DC]/70 tracking-wider">
                      ELDERGUARD AI • LIVE MONITORING HUB
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#8FBBA0]/15 border border-[#8FBBA0]/35 text-[#8FBBA0] text-[11px] font-semibold">
                    <span className="w-2 h-2 rounded-full bg-[#8FBBA0] animate-pulse" />
                    <span>NETWORK ACTIVE • ALL SYSTEMS OPERATIONAL</span>
                  </div>
                </div>

                {/* Widget Grid Sub-Cards - Matched Heights & Spacing */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  
                  {/* Live Vitals Stream */}
                  <div className="p-5 rounded-2xl bg-[#121715]/80 border border-[#F0E9DC]/12 space-y-4 flex flex-col justify-between shadow-sm hover:border-[#8FBBA0]/50 transition-all duration-300 min-h-[155px]">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1.5 text-[#8FBBA0] font-semibold">
                        <HeartPulse className="w-4 h-4 animate-ecg" />
                        Vitals Stream
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#8FBBA0]/20 text-[#8FBBA0] text-[10px] font-bold uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8FBBA0] animate-pulse" />
                        Optimal
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs pb-1 border-b border-white/5">
                        <span className="text-[#F0E9DC]/70 font-medium">Heart Rate (5s)</span>
                        <span className="font-mono text-xs sm:text-sm font-semibold text-[#FFFFFF] animate-pulse">{landingVitals.hr || landingVitals.heart_rate || 72} BPM</span>
                      </div>
                      <div className="flex justify-between items-center text-xs pb-1 border-b border-white/5">
                        <span className="text-[#F0E9DC]/70 font-medium">Blood Pressure (5s)</span>
                        <span className="font-mono text-xs sm:text-sm font-semibold text-[#FFFFFF]">{landingVitals.bp || '120/80'} mmHg</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#F0E9DC]/70 font-medium">Oxygen (SpO2 5m)</span>
                        <span className="font-mono text-xs sm:text-sm font-semibold text-[#FFFFFF]">{landingVitals.spo2 || 98}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Safety Guard Monitor */}
                  <div className="p-5 rounded-2xl bg-[#121715]/80 border border-[#F0E9DC]/12 space-y-4 flex flex-col justify-between shadow-sm hover:border-[#E2694B]/50 transition-all duration-300 min-h-[155px]">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1.5 text-[#E2694B] font-semibold">
                        <ShieldAlert className="w-4 h-4" />
                        Safety Guard
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E2694B]/20 text-[#E2694B] text-[10px] font-bold uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E2694B] animate-pulse" />
                        Armed
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="text-[#FFFFFF] text-xs font-semibold">Tier 1 Caregiver Dispatch</div>
                      <p className="text-xs text-[#F0E9DC]/70 leading-relaxed">Multi-tier escalation active. 2-minute auto-hospital fallback armed.</p>
                    </div>
                  </div>

                  {/* Doctor Consultation Queue */}
                  <div className="p-5 rounded-2xl bg-[#121715]/80 border border-[#F0E9DC]/12 space-y-4 flex flex-col justify-between shadow-sm hover:border-[#D4A857]/50 transition-all duration-300 min-h-[155px]">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1.5 text-[#D4A857] font-semibold">
                        <Calendar className="w-4 h-4" />
                        Doctor Queue
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#D4A857]/20 text-[#D4A857] text-[10px] font-bold uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D4A857] animate-pulse" />
                        #Q-004
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="text-[#FFFFFF] text-xs font-semibold">Dr. Aris Thorne (Cardiology)</div>
                      <p className="text-xs text-[#F0E9DC]/70 leading-relaxed">Visit Scheduled Today • Telemedicine Room Ready</p>
                    </div>
                  </div>

                </div>

              </div>
            </div>

          </div>
        </section>

        {/* "One connected team around every senior" Feature Grid Section */}
        <section id="features" className="px-6 sm:px-8 lg:px-12 py-24 sm:py-28 bg-[#121715]/50 backdrop-blur-lg border-y border-[#D4A857]/25">
          <div className="max-w-7xl mx-auto">
            
            {/* Section Header Container */}
            <div className="max-w-2xl mx-auto text-center space-y-4 mb-16 sm:mb-20">
              <h2 className="font-fraunces font-semibold text-3xl sm:text-4xl text-[#FFFFFF] drop-shadow-md">
                One connected team around every senior
              </h2>
              <p className="font-inter text-base sm:text-lg text-[#F1F5F9] leading-[1.7] font-medium drop-shadow-sm">
                Six services working together — from a missed dose to a medical emergency, everyone who needs to know finds out immediately.
              </p>
            </div>

            {/* 6 Feature Cards in Responsive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featureCards.map((card, index) => {
                const IconComponent = card.icon;
                return (
                  <div 
                    key={index}
                    data-index={index}
                    ref={(el) => (cardsRef.current[index] = el)}
                    className={`bg-[#121715]/65 backdrop-blur-xl border border-[#F0E9DC]/15 ${card.hoverBorder} rounded-2xl p-8 opacity-0 translate-y-3 focus-within:border-[#D4A857] shadow-xl hover:shadow-2xl hover:bg-[#121715]/85 transition-all duration-300 hover:-translate-y-1.5`}
                    style={{ transitionProperty: 'opacity, transform, border-color, background-color, box-shadow' }}
                  >
                    {/* Icon container */}
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center mb-6 shadow-sm border border-white/10"
                      style={{ backgroundColor: `${card.accent}30` }}
                    >
                      <IconComponent className="w-6 h-6" style={{ color: card.accent }} />
                    </div>
                    
                    {/* Title */}
                    <h3 className="font-inter font-semibold text-xl text-[#FFFFFF] mb-3 leading-snug drop-shadow-sm">
                      {card.title}
                    </h3>
                    
                    {/* Body */}
                    <p className="font-inter font-normal text-base text-[#E2E8F0] leading-[1.7]">
                      {card.body}
                    </p>
                  </div>
                );
              })}
            </div>

          </div>
        </section>

        {/* Multi-Role Portals Section */}
        <section id="portals" className="px-6 sm:px-8 lg:px-12 py-24 sm:py-28 max-w-7xl mx-auto">
          <div className="max-w-2xl mx-auto text-center space-y-3 mb-16 sm:mb-20">
            <span className="text-[#D4A857] text-xs font-bold tracking-widest uppercase block drop-shadow-sm">Designed For Everyone</span>
            <h3 className="font-fraunces text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#FFFFFF] drop-shadow-md">5 Tailored Role Portals</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">

            {/* Elder Portal Card */}
            <div className="p-7 rounded-2xl bg-[#121715]/65 backdrop-blur-xl border border-[#F0E9DC]/15 hover:border-[#8FBBA0]/60 transition-all duration-300 hover:-translate-y-1.5 shadow-xl text-center flex flex-col justify-between hover:bg-[#121715]/85">
              <div>
                <div className="w-14 h-14 mx-auto rounded-full bg-[#8FBBA0]/25 border border-[#8FBBA0]/30 flex items-center justify-center text-[#8FBBA0] mb-5 shadow-sm">
                  <Users className="w-7 h-7" />
                </div>
                <h4 className="font-inter font-semibold text-lg text-[#FFFFFF] mb-2">Elder Portal</h4>
                <p className="text-xs text-[#E2E8F0] mb-6 leading-relaxed">Accessible high-contrast UI, big SOS panic button, simple vitals logger & AI Companion.</p>
              </div>
              <button onClick={() => onNavigate && onNavigate('login')} className="w-full h-11 rounded-xl bg-[#8FBBA0] hover:bg-[#8FBBA0]/90 text-[#121715] font-bold text-sm transition shadow-md focus-visible:outline-none inline-flex items-center justify-center">
                Elder Login
              </button>
            </div>

            {/* Caregiver Portal Card */}
            <div className="p-7 rounded-2xl bg-[#121715]/65 backdrop-blur-xl border border-[#F0E9DC]/15 hover:border-[#E2694B]/60 transition-all duration-300 hover:-translate-y-1.5 shadow-xl text-center flex flex-col justify-between hover:bg-[#121715]/85">
              <div>
                <div className="w-14 h-14 mx-auto rounded-full bg-[#E2694B]/25 border border-[#E2694B]/30 flex items-center justify-center text-[#E2694B] mb-5 shadow-sm">
                  <HeartPulse className="w-7 h-7" />
                </div>
                <h4 className="font-inter font-semibold text-lg text-[#FFFFFF] mb-2">Caregiver Portal</h4>
                <p className="text-xs text-[#E2E8F0] mb-6 leading-relaxed">Real-time alert monitoring feed, daily health digest, and medicine adherence metrics.</p>
              </div>
              <button onClick={() => onNavigate && onNavigate('login')} className="w-full h-11 rounded-xl bg-[#E2694B] hover:bg-[#E2694B]/90 text-[#FFFFFF] font-bold text-sm transition shadow-md focus-visible:outline-none inline-flex items-center justify-center">
                Caregiver Login
              </button>
            </div>

            {/* Doctor Portal Card */}
            <div className="p-7 rounded-2xl bg-[#121715]/65 backdrop-blur-xl border border-[#F0E9DC]/15 hover:border-[#D4A857]/60 transition-all duration-300 hover:-translate-y-1.5 shadow-xl text-center flex flex-col justify-between hover:bg-[#121715]/85">
              <div>
                <div className="w-14 h-14 mx-auto rounded-full bg-[#D4A857]/25 border border-[#D4A857]/30 flex items-center justify-center text-[#D4A857] mb-5 shadow-sm">
                  <Stethoscope className="w-7 h-7" />
                </div>
                <h4 className="font-inter font-semibold text-lg text-[#FFFFFF] mb-2">Doctor Portal</h4>
                <p className="text-xs text-[#E2E8F0] mb-6 leading-relaxed">Schedule availability policy, virtual queue caller (Q-001), and OCR prescription scanner.</p>
              </div>
              <button onClick={() => onNavigate && onNavigate('login')} className="w-full h-11 rounded-xl bg-[#D4A857] hover:bg-[#D4A857]/90 text-[#121715] font-bold text-sm transition shadow-md focus-visible:outline-none inline-flex items-center justify-center">
                Doctor Login
              </button>
            </div>

            {/* Hospital Portal Card */}
            <div className="p-7 rounded-2xl bg-[#121715]/65 backdrop-blur-xl border border-[#F0E9DC]/15 hover:border-[#E2694B]/60 transition-all duration-300 hover:-translate-y-1.5 shadow-xl text-center flex flex-col justify-between hover:bg-[#121715]/85">
              <div>
                <div className="w-14 h-14 mx-auto rounded-full bg-[#E2694B]/25 border border-[#E2694B]/30 flex items-center justify-center text-[#E2694B] mb-5 shadow-sm">
                  <Building2 className="w-7 h-7" />
                </div>
                <h4 className="font-inter font-semibold text-lg text-[#FFFFFF] mb-2">Hospital Portal</h4>
                <p className="text-xs text-[#E2E8F0] mb-6 leading-relaxed">Emergency SOS dispatch desk, ambulance coordination, and doctor roster manager.</p>
              </div>
              <button onClick={() => onNavigate && onNavigate('login')} className="w-full h-11 rounded-xl bg-[#E2694B] hover:bg-[#E2694B]/90 text-[#FFFFFF] font-bold text-sm transition shadow-md focus-visible:outline-none inline-flex items-center justify-center">
                Hospital Login
              </button>
            </div>

            {/* Pharmacy Portal Card */}
            <div className="p-7 rounded-2xl bg-[#121715]/65 backdrop-blur-xl border border-[#F0E9DC]/15 hover:border-[#D4A857]/60 transition-all duration-300 hover:-translate-y-1.5 shadow-xl text-center flex flex-col justify-between hover:bg-[#121715]/85">
              <div>
                <div className="w-14 h-14 mx-auto rounded-full bg-[#D4A857]/25 border border-[#D4A857]/30 flex items-center justify-center text-[#D4A857] mb-5 shadow-sm">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <h4 className="font-inter font-semibold text-lg text-[#FFFFFF] mb-2">Pharmacy Portal</h4>
                <p className="text-xs text-[#E2E8F0] mb-6 leading-relaxed">Digital prescription orders queue, medication fulfillment, and dispensing verification.</p>
              </div>
              <button onClick={() => onNavigate && onNavigate('login')} className="w-full h-11 rounded-xl bg-[#D4A857] hover:bg-[#D4A857]/90 text-[#121715] font-bold text-sm transition shadow-md focus-visible:outline-none inline-flex items-center justify-center">
                Pharmacy Login
              </button>
            </div>

          </div>
        </section>

        {/* Emergency SOS Demo Anchor */}
        <div id="sos-demo" className="py-2"></div>

        {/* Contact Information & Support Section */}
        <section id="contact" className="px-6 sm:px-8 lg:px-12 py-20 bg-[#121715]/60 backdrop-blur-lg border-t border-[#D4A857]/25">
          <div className="max-w-7xl mx-auto">
            
            <div className="max-w-2xl mx-auto text-center space-y-3 mb-14">
              <span className="text-[#D4A857] text-xs font-bold tracking-widest uppercase block drop-shadow-sm">24/7 Care Network Support</span>
              <h3 className="font-fraunces text-3xl sm:text-4xl font-semibold text-[#FFFFFF] drop-shadow-md">Get in Touch with ElderGuard AI</h3>
              <p className="font-inter text-base text-[#E2E8F0] leading-relaxed font-medium">
                Our care specialists and emergency response dispatch team are available 24/7 for assistance.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Phone Contact Card */}
              <div className="p-7 rounded-2xl bg-[#121715]/75 border border-[#F0E9DC]/15 text-center space-y-4 hover:border-[#8FBBA0]/60 transition-all duration-300 hover:-translate-y-1 shadow-xl">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#8FBBA0]/20 border border-[#8FBBA0]/30 flex items-center justify-center text-[#8FBBA0] shadow-sm">
                  <PhoneCall className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg text-[#FFFFFF]">24/7 Priority Emergency Hotline</h4>
                  <p className="text-xs text-[#E2E8F0] mt-1">Sub-second emergency dispatch line</p>
                </div>
                <div className="font-mono text-sm font-semibold text-[#8FBBA0]">1-800-ELDER-GUARD (1-800-353-3748)</div>
              </div>

              {/* Email Contact Card */}
              <div className="p-7 rounded-2xl bg-[#121715]/75 border border-[#F0E9DC]/15 text-center space-y-4 hover:border-[#E2694B]/60 transition-all duration-300 hover:-translate-y-1 shadow-xl">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#E2694B]/20 border border-[#E2694B]/30 flex items-center justify-center text-[#E2694B] shadow-sm">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg text-[#FFFFFF]">Care Network Desk</h4>
                  <p className="text-xs text-[#E2E8F0] mt-1">General support & onboarding</p>
                </div>
                <div className="font-mono text-sm font-semibold text-[#E2694B]">support@elderguard.ai</div>
              </div>

              {/* Location Contact Card */}
              <div className="p-7 rounded-2xl bg-[#121715]/75 border border-[#F0E9DC]/15 text-center space-y-4 hover:border-[#D4A857]/60 transition-all duration-300 hover:-translate-y-1 shadow-xl">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#D4A857]/20 border border-[#D4A857]/30 flex items-center justify-center text-[#D4A857] shadow-sm">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg text-[#FFFFFF]">Response Command HQ</h4>
                  <p className="text-xs text-[#E2E8F0] mt-1">San Francisco, CA & New York, NY</p>
                </div>
                <div className="font-mono text-xs font-semibold text-[#D4A857]">Multi-Tier Escalation Active</div>
              </div>

            </div>

          </div>
        </section>

        {/* Footer */}
        <footer className="bg-[#121715]/80 backdrop-blur-md border-t border-[#D4A857]/25 py-12 px-6 sm:px-8 lg:px-12">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="ElderGuard AI Logo" className="w-8 h-8 object-contain rounded-lg border border-white/10" />
              <span className="font-space font-semibold text-lg text-[#FFFFFF]">ElderGuard AI</span>
            </div>
            <p className="text-xs text-[#E2E8F0] text-center font-medium">
              © 2026 ElderGuard AI. Built with FastAPI, Supabase Postgres, and Groq AI. High-contrast Accessible Design.
            </p>
          </div>
        </footer>

      </div>

      {/* Emergency SOS Demo Modal */}
      {sosModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#121715] border-2 border-[#E2694B]/80 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl shadow-[#E2694B]/40 space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-[#E2694B]/25 border-2 border-[#E2694B] flex items-center justify-center text-[#E2694B] animate-pulse">
              <ShieldAlert className="w-10 h-10" />
            </div>
            <h4 className="font-fraunces text-2xl font-semibold text-[#FFFFFF]">EMERGENCY SOS TRIGGERED</h4>
            <p className="text-sm text-[#E2E8F0] leading-relaxed">
              Tier 1 Alert dispatched to Caregiver. Tier 2 Hospital auto-escalation active in <span className="font-bold text-[#E2694B]">120 seconds</span>.
            </p>
            <div className="space-y-3 text-xs text-left bg-[#121715]/90 p-4 rounded-xl border border-[#F0E9DC]/15">
              <div className="flex items-center gap-2 text-[#8FBBA0]"><CheckCircle2 className="w-4 h-4" /> Priority: CRITICAL Tier 1</div>
              <div className="flex items-center gap-2 text-[#D4A857]"><CheckCircle2 className="w-4 h-4" /> Multi-Channel: Push + SMS + Telegram</div>
              <div className="flex items-center gap-2 text-[#E2694B]"><CheckCircle2 className="w-4 h-4" /> Audit Logged: Event ID #SOS-9041</div>
            </div>
            <button 
              onClick={() => setSosModalOpen(false)}
              className="w-full h-12 rounded-xl bg-[#E2694B] hover:bg-[#E2694B]/90 text-[#FFFFFF] font-bold transition shadow-md inline-flex items-center justify-center"
            >
              Close SOS Demo
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
