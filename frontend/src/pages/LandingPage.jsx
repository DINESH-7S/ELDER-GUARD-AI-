import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import {
  ArrowRight,
  Buildings,
  Heart,
  Pill,
  Robot,
  Stethoscope,
  Storefront,
  TextAa,
  Users,
  Phone,
  EnvelopeSimple,
  MapPin,
  Siren,
  Pulse,
  FileText,
} from '@phosphor-icons/react';
import Reveal from '../components/ui/Reveal';
import { EASE, SPRING, ScrollProgress } from '../components/ui/motionKit';
import { PHOTOS, PHOTO_CREDIT } from '../lib/photos';

const ROLES = [
  { id: 'elder', name: 'Elders', icon: Heart, headline: 'Big buttons, plain words', points: ['A one-tap SOS button that is always on screen', 'Medicine alarms that read aloud', 'A simple log for blood pressure, sugar and oxygen', 'Mevi, a patient AI companion for chat and company'] },
  { id: 'caregiver', name: 'Family caregivers', icon: Users, headline: 'Know without having to ask', points: ['Live alerts the moment something looks wrong', 'A daily digest of vitals and doses taken', 'A message thread with the care team', 'Link more than one elder to a single account'] },
  { id: 'doctor', name: 'Doctors', icon: Stethoscope, headline: 'Patients and queue in one view', points: ['Your availability and consultation queue', 'Patient history and shared vitals', 'Write prescriptions that flow to the pharmacy', 'Secure messages with caregivers'] },
  { id: 'hospital', name: 'Hospitals', icon: Buildings, headline: 'An emergency desk that is never surprised', points: ['SOS alerts that arrive with location and history', 'Ambulance dispatch coordination', 'A roster of doctors and departments', 'A record of every escalation'] },
  { id: 'pharmacy', name: 'Pharmacies', icon: Storefront, headline: 'From prescription to doorstep', points: ['Digital prescriptions land in one queue', 'Inventory with low-stock alerts', 'Delivery and dispatch tracking', 'Refill subscriptions for regular medicines'] },
];

const STEPS = [
  { title: 'Tap SOS', body: "One press on the elder's screen. Their location and health history go with it.", when: 'Instantly' },
  { title: 'Family is alerted first', body: 'Your caregiver gets an alert in the app and a push notification straight away. A second contact is alerted after 2 minutes if nobody has responded.', when: 'Within seconds' },
  { title: 'The hospital steps in', body: 'If there is still no response, the hospital desk is alerted after 5 minutes and emergency services after 10.', when: 'After 5 minutes' },
];

function Photo({ photo, width = 1400, position = 'center', priority = false, zoom = false }) {
  return (
    <img
      src={photo.src(width)}
      alt={photo.alt}
      width={width}
      height={Math.round((width * 9) / 16)}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={`h-full w-full object-cover ${zoom ? 'transition-transform duration-[900ms] ease-out group-hover:scale-105' : ''}`}
      style={{ objectPosition: position }}
    />
  );
}

export default function LandingPage({ onNavigate, currentUser, onOpenProfile, onLogout }) {
  const reduce = useReducedMotion();
  const [largeText, setLargeText] = useState(false);
  const [activeRole, setActiveRole] = useState('elder');
  const heroPhotoRef = useRef(null);
  const { scrollYProgress: heroScroll } = useScroll({ target: heroPhotoRef, offset: ['start end', 'end start'] });
  const photoY = useTransform(heroScroll, [0, 1], reduce ? ['0%', '0%'] : ['-7%', '7%']);
  const role = ROLES.find((r) => r.id === activeRole);

  // Scale the whole page for readers who need larger text.
  useEffect(() => {
    document.documentElement.style.fontSize = largeText ? '118%' : '';
    return () => { document.documentElement.style.fontSize = ''; };
  }, [largeText]);

  const go = (view) => () => onNavigate && onNavigate(view);

  return (
    <div className="eg-public min-h-[100dvh]">
      <ScrollProgress />
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-eg-line bg-eg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <a href="#top" className="flex items-center gap-3" aria-label="ElderGuard home">
            <img src="/logo.png" alt="" className="h-10 w-10 rounded-xl object-contain" />
            <span className="font-['Geist'] text-xl font-bold tracking-tight">ElderGuard</span>
          </a>

          <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
            <a href="#how" className="font-semibold text-eg-muted transition-colors hover:text-eg-ink">How it works</a>
            <a href="#emergency" className="font-semibold text-eg-muted transition-colors hover:text-eg-ink">Emergencies</a>
            <a href="#roles" className="font-semibold text-eg-muted transition-colors hover:text-eg-ink">Who it's for</a>
            <a href="#contact" className="font-semibold text-eg-muted transition-colors hover:text-eg-ink">Contact</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setLargeText((v) => !v)}
              aria-pressed={largeText}
              aria-label="Larger text"
              title="Larger text"
              className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border-[1.5px] transition-colors ${largeText ? 'border-eg-teal bg-eg-tint text-eg-teal' : 'border-eg-line text-eg-ink hover:bg-eg-tint'}`}
            >
              <TextAa size={22} weight="bold" aria-hidden="true" />
            </button>
            {currentUser ? (
              <>
                <button type="button" onClick={() => onOpenProfile && onOpenProfile()} className="btn-eg-ghost !min-h-[44px]">Profile</button>
                <button type="button" onClick={() => onLogout && onLogout()} className="btn-eg !min-h-[44px]">Log out</button>
              </>
            ) : (
              <button type="button" onClick={go('login')} className="btn-eg !min-h-[44px]">Sign In</button>
            )}
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero */}
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-12 lg:gap-10 lg:pb-28 lg:pt-16">
          <div className="lg:col-span-6">
            <h1 className="text-[2.75rem] leading-[1.02] sm:text-6xl lg:text-[4.25rem]">
              {'Care that reaches them, wherever you are.'.split(' ').map((word, i) => (
                <span key={i} className="inline-block overflow-hidden pb-1 align-bottom">
                  <motion.span
                    className="inline-block"
                    initial={reduce ? false : { y: '110%' }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.7, delay: 0.05 + i * 0.07, ease: EASE }}
                  >
                    {word}
                  </motion.span>
                  {'\u00A0'}
                </span>
              ))}
            </h1>
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 max-w-[34ch] text-xl leading-relaxed text-eg-muted"
            >
              Medicine reminders that get answered. Emergency alerts that reach family, doctors and hospitals in seconds.
            </motion.p>
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mt-9 flex flex-wrap items-center gap-4"
            >
              <button type="button" onClick={go('signup')} className="btn-eg group/btn text-lg">
                Create an account <ArrowRight size={20} weight="bold" className="transition-transform duration-200 group-hover/btn:translate-x-1" aria-hidden="true" />
              </button>
              <a href="#how" className="btn-eg-ghost text-lg">See how it works</a>
            </motion.div>
          </div>

          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6"
          >
            <div ref={heroPhotoRef} className="aspect-[5/6] overflow-hidden rounded-3xl bg-eg-tint">
              <motion.div style={{ y: photoY, scale: 1.14 }} className="h-full w-full">
                <Photo photo={PHOTOS.womanPhone} width={1400} position="62% 40%" priority />
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* How it works: a day with ElderGuard (bento) */}
        <section id="how" className="mx-auto max-w-7xl scroll-mt-20 px-5 pb-24 sm:px-8 lg:pb-32">
          <Reveal className="mb-12 max-w-2xl">
            <h2 className="text-4xl sm:text-5xl">A day with ElderGuard</h2>
            <p className="mt-4 max-w-[48ch] text-lg leading-relaxed text-eg-muted">
              From the first pill of the morning to a late-night worry, everyone who needs to know finds out.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <Reveal className="group relative min-h-[420px] overflow-hidden rounded-3xl lg:col-span-7">
              <div className="absolute inset-0">
                <Photo photo={PHOTOS.manTablet} width={1400} position="50% 30%" zoom />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A2724]/85 via-[#0A2724]/25 to-transparent" />
              </div>
              <div className="relative flex h-full min-h-[420px] flex-col justify-end p-8 text-white sm:p-10">
                <Pill size={32} weight="duotone" aria-hidden="true" />
                <h3 className="mt-4 text-3xl">Medicine reminders that get answered</h3>
                <p className="mt-3 max-w-[46ch] text-lg leading-relaxed text-white/90">
                  One gentle alarm per dose time, however many medicines. Miss it three times and a caregiver is told.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.08} className="flex flex-col justify-between rounded-3xl bg-eg-teal p-8 text-white sm:p-10 lg:col-span-5">
              <Siren size={32} weight="duotone" aria-hidden="true" />
              <div className="mt-10">
                <h3 className="text-3xl">One tap for help</h3>
                <p className="mt-3 text-lg leading-relaxed text-white/90">
                  Family is alerted first. If nobody replies, a second contact, then the hospital desk, then emergency services are alerted on a timer.
                </p>
                <a href="#emergency" className="mt-6 inline-flex items-center gap-2 font-bold underline underline-offset-4">
                  How an emergency is handled <ArrowRight size={18} weight="bold" aria-hidden="true" />
                </a>
              </div>
            </Reveal>

            <Reveal className="rounded-3xl bg-eg-tint p-8 lg:col-span-5">
              <Pulse size={30} weight="duotone" className="text-eg-teal" aria-hidden="true" />
              <h3 className="mt-5 text-2xl">Vitals that speak up</h3>
              <p className="mt-2 leading-relaxed text-eg-muted">
                Blood pressure, sugar, oxygen and heart rate over time. Unusual readings are flagged for a doctor before they become a bigger problem.
              </p>
            </Reveal>

            <Reveal delay={0.08} className="rounded-3xl border border-eg-line bg-white p-8 lg:col-span-4">
              <Robot size={30} weight="duotone" className="text-eg-teal" aria-hidden="true" />
              <h3 className="mt-5 text-2xl">Someone to talk to</h3>
              <p className="mt-2 leading-relaxed text-eg-muted">
                Mevi is a patient voice for conversation and company. If it hears real distress, it tells a caregiver.
              </p>
            </Reveal>

            <Reveal delay={0.16} className="rounded-3xl border border-eg-line bg-white p-8 lg:col-span-3">
              <FileText size={30} weight="duotone" className="text-eg-teal" aria-hidden="true" />
              <h3 className="mt-5 text-2xl">Visits and scripts</h3>
              <p className="mt-2 leading-relaxed text-eg-muted">
                Book a slot with a queue number. Photograph a prescription and it becomes a schedule.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Emergency timeline */}
        <section id="emergency" className="scroll-mt-20 border-y border-eg-line bg-white">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-12 lg:py-28">
            <Reveal className="lg:col-span-5">
              <div className="lg:sticky lg:top-28">
                <h2 className="text-4xl sm:text-5xl">When something goes wrong, nobody is left guessing</h2>
                <p className="mt-5 max-w-[42ch] text-lg leading-relaxed text-eg-muted">
                  Every emergency follows the same path, and every step is logged so you can see what happened.
                </p>
              </div>
            </Reveal>

            <ol className="lg:col-span-7">
              {STEPS.map((step, i) => (
                <Reveal as="li" key={step.title} delay={i * 0.08} className="relative flex gap-6 pb-12 last:pb-0">
                  <div className="flex flex-col items-center">
                    <motion.span
                      initial={reduce ? false : { scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true, amount: 0.8 }}
                      transition={{ ...SPRING, delay: i * 0.12 }}
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-['Geist'] text-lg font-bold text-white ${i === 0 ? 'bg-eg-sos' : 'bg-eg-teal'}`}
                    >
                      {i + 1}
                    </motion.span>
                    {i < STEPS.length - 1 && (
                      <motion.span
                        initial={reduce ? false : { scaleY: 0 }}
                        whileInView={{ scaleY: 1 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.9, delay: 0.2 + i * 0.12, ease: EASE }}
                        style={{ transformOrigin: 'top' }}
                        className="mt-2 w-0.5 flex-1 bg-eg-line"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <div className="pt-1">
                    <p className="font-semibold text-eg-muted">{step.when}</p>
                    <h3 className="mt-1 text-2xl sm:text-3xl">{step.title}</h3>
                    <p className="mt-2 max-w-[48ch] text-lg leading-relaxed text-eg-muted">{step.body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Roles */}
        <section id="roles" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 sm:px-8 lg:py-32">
          <Reveal className="mb-12 max-w-2xl">
            <h2 className="text-4xl sm:text-5xl">One record, five points of view</h2>
            <p className="mt-4 text-lg leading-relaxed text-eg-muted">Each role sees what it needs and nothing else.</p>
          </Reveal>

          <div className="grid gap-6 lg:grid-cols-12">
            <div role="tablist" aria-label="Choose a role" className="flex gap-2 overflow-x-auto pb-2 lg:col-span-4 lg:flex-col lg:overflow-visible lg:pb-0">
              {ROLES.map((r) => {
                const Icon = r.icon;
                const selected = r.id === activeRole;
                return (
                  <button
                    key={r.id}
                    type="button"
                    role="tab"
                    id={`tab-${r.id}`}
                    aria-selected={selected}
                    aria-controls="role-panel"
                    onClick={() => setActiveRole(r.id)}
                    className={`relative flex shrink-0 items-center gap-3 rounded-xl border-[1.5px] px-5 py-3.5 text-left text-lg font-bold transition-colors ${selected ? 'border-eg-teal text-white' : 'border-eg-line bg-white text-eg-ink hover:border-eg-teal'}`}
                  >
                    {selected && <motion.span layoutId="role-pill" transition={SPRING} className="absolute inset-0 rounded-[10px] bg-eg-teal" aria-hidden="true" />}
                    <Icon size={24} weight={selected ? 'fill' : 'regular'} className="relative" aria-hidden="true" />
                    <span className="relative">{r.name}</span>
                  </button>
                );
              })}
            </div>

            <motion.div
              key={role.id}
              id="role-panel"
              role="tabpanel"
              aria-labelledby={`tab-${role.id}`}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-3xl border border-eg-line bg-white p-8 sm:p-10 lg:col-span-8"
            >
              <h3 className="text-3xl sm:text-4xl">{role.headline}</h3>
              <ul className="mt-6 space-y-3.5">
                {role.points.map((p, i) => (
                  <motion.li
                    key={p}
                    initial={reduce ? false : { opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.45, delay: 0.1 + i * 0.07, ease: EASE }}
                    className="flex items-start gap-3 text-lg leading-relaxed"
                  >
                    <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-eg-teal" aria-hidden="true" />
                    {p}
                  </motion.li>
                ))}
              </ul>
              <button type="button" onClick={go('login')} className="btn-eg group/btn mt-8 text-lg">
                Sign in as {role.name.toLowerCase().replace(/s$/, '')} <ArrowRight size={20} weight="bold" className="transition-transform duration-200 group-hover/btn:translate-x-1" aria-hidden="true" />
              </button>
            </motion.div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="scroll-mt-20 bg-eg-teal-dark text-white">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-12 lg:py-28">
            <Reveal className="lg:col-span-6">
              <h2 className="text-4xl sm:text-5xl">Talk to a person, any hour</h2>
              <p className="mt-5 max-w-[40ch] text-lg leading-relaxed text-white/85">
                Our care specialists and emergency dispatch team answer around the clock.
              </p>
              <a href="tel:18003533748" className="mt-8 inline-flex items-center gap-3 font-['Geist'] text-3xl font-bold sm:text-4xl">
                <Phone size={36} weight="fill" aria-hidden="true" /> 1-800-353-3748
              </a>
            </Reveal>
            <Reveal delay={0.1} className="space-y-8 lg:col-span-5 lg:col-start-8">
              <div className="flex gap-4">
                <EnvelopeSimple size={28} weight="duotone" className="mt-1 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-lg font-bold">Care network desk</p>
                  <a href="mailto:support@elderguard.ai" className="text-lg text-white/90 underline underline-offset-4">support@elderguard.ai</a>
                  <p className="mt-1 text-white/75">Onboarding and general support.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <MapPin size={28} weight="duotone" className="mt-1 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-lg font-bold">Response HQ</p>
                  <p className="text-lg text-white/90">San Francisco and New York</p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-eg-line bg-eg-paper">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-eg-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© 2026 ElderGuard AI. Photography by <a className="underline underline-offset-4" href={PHOTO_CREDIT.url} target="_blank" rel="noreferrer">{PHOTO_CREDIT.name}</a> on Unsplash.</p>
          <nav aria-label="Legal" className="flex gap-6">
            <a href="#" className="underline-offset-4 hover:underline">Privacy</a>
            <a href="#" className="underline-offset-4 hover:underline">Terms</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
