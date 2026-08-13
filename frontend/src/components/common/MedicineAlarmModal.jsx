import React, { useState, useEffect, useRef } from 'react';
import { Pill, Volume2, VolumeX, CheckCircle2, Clock, X, BellRing } from 'lucide-react';
import medicinesService from '../../services/medicinesService';

export default function MedicineAlarmModal({ currentUser }) {
  const [activeSession, setActiveSession] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [testAlarmTriggered, setTestAlarmTriggered] = useState(false);
  const [scheduledMedicines, setScheduledMedicines] = useState([]);
  
  const audioCtxRef = useRef(null);
  const alarmIntervalRef = useRef(null);
  const speechUtteranceRef = useRef(null);
  const triggeredTimesRef = useRef(new Set());

  const elderId = currentUser?.role === 'elder' ? (currentUser.id || currentUser.user_id) : null;

  // 1. Web Audio Chime Generator (Ringing Alarm Sound)
  const playAlarmTone = () => {
    if (isAudioMuted) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      // High pitch medical alert tone pattern (880Hz & 1046.5Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1046.5, now + 0.4);
      gain2.gain.setValueAtTime(0.35, now + 0.4);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.4);
      osc2.stop(now + 0.75);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  };

  // 2. Text-to-Speech Guidance
  const speakAlarmText = (text) => {
    if (isAudioMuted || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      speechUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis failed:', e);
    }
  };

  // Stop sound & speech playback completely
  const stopAudioAndSpeech = () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Trigger sound loops when activeSession starts and sound is NOT muted
  useEffect(() => {
    if (activeSession && !isAudioMuted) {
      const medListStr = activeSession.items?.map(it => `${it.medicine_name} ${it.dosage}`).join(', ') || 'your scheduled medicine';
      const textToSpeak = `Time for your medicine. Please take ${medListStr}.`;
      
      playAlarmTone();
      speakAlarmText(textToSpeak);

      alarmIntervalRef.current = setInterval(() => {
        playAlarmTone();
      }, 3500);
    } else {
      stopAudioAndSpeech();
    }

    return () => stopAudioAndSpeech();
  }, [activeSession, isAudioMuted]);

  // 3. Fetch medicines list to match sharp timings
  // Uses connected_medicines (the actual source of truth) instead of standalone medicines table
  useEffect(() => {
    if (!elderId) return;
    let cancelled = false;
    const fetchMeds = () => {
      medicinesService.getConnectedMedicines(elderId)
        .then((meds) => {
          if (!cancelled && Array.isArray(meds)) {
            setScheduledMedicines(meds);
          }
        })
        .catch(() => {});
    };
    fetchMeds();
    // Re-fetch every 60s to pick up newly added medicines
    const refreshInterval = setInterval(fetchMeds, 60000);
    return () => { cancelled = true; clearInterval(refreshInterval); };
  }, [elderId]);

  // Helper: normalize time strings to "HH:MM" (handles "8:00" -> "08:00", "14:00" stays "14:00")
  const normalizeTime = (t) => {
    if (!t || typeof t !== 'string') return '';
    const parts = t.split(':');
    if (parts.length < 2) return t;
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  };

  // 4. Sharp Timing Alarm Trigger (Checks every 1 second for exact HH:MM:00 sharp times)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;
      const timeKey = `${now.toDateString()}_${timeStr}`;

      if (triggeredTimesRef.current.has(timeKey)) return;

      // Check scheduled medicines for sharp time match
      // Support both times_of_day (from parse_medicine mapping) and scheduled_times
      const matchingMeds = scheduledMedicines.filter(m => {
        const times = Array.isArray(m.times_of_day) ? m.times_of_day 
          : Array.isArray(m.scheduled_times) ? m.scheduled_times 
          : [];
        return times.some(t => normalizeTime(t) === timeStr);
      });

      if (matchingMeds.length > 0 && !activeSession) {
        triggeredTimesRef.current.add(timeKey);
        setIsAudioMuted(false);
        setActiveSession({
          id: 'sharp-session-' + Date.now(),
          scheduled_time: timeStr,
          status: 'RINGING',
          items: matchingMeds.map(m => ({
            id: m.id,
            medicine_name: m.name,
            dosage: m.dosage
          }))
        });
      }
    }, 1000); // Sharp 1-second check

    return () => clearInterval(timer);
  }, [scheduledMedicines, activeSession]);

  // 5. Poll Backend for Active Ringing Sessions
  useEffect(() => {
    if (!elderId) return;

    const checkActiveSession = async () => {
      try {
        const session = await medicinesService.getActiveSession(elderId);
        if (session && (session.status === 'RINGING' || session.status === 'RETRY_WAIT' || session.status === 'PENDING') && !activeSession) {
          // For PENDING sessions, only trigger if scheduled_time has passed
          if (session.status === 'PENDING' && session.scheduled_time) {
            const scheduledDate = new Date(session.scheduled_time);
            if (scheduledDate > new Date()) return; // Not yet time
          }
          setIsAudioMuted(false);
          setActiveSession(session);
        }
      } catch (err) {
        // No active session — expected when there are none
      }
    };

    checkActiveSession();
    const interval = setInterval(checkActiveSession, 8000);
    return () => clearInterval(interval);
  }, [elderId, activeSession]);

  // 6. Test Alarm Event Listener
  useEffect(() => {
    const handleTestAlarm = (e) => {
      const customMed = e.detail || {
        id: 'test-session-' + Date.now(),
        scheduled_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'RINGING',
        items: [
          { id: 'i1', medicine_name: 'Metformin', dosage: '500mg' },
          { id: 'i2', medicine_name: 'Aspirin', dosage: '81mg' }
        ]
      };
      setTestAlarmTriggered(true);
      setIsAudioMuted(false);
      setActiveSession(customMed);
    };

    window.addEventListener('elderguard:trigger-alarm', handleTestAlarm);
    return () => window.removeEventListener('elderguard:trigger-alarm', handleTestAlarm);
  }, []);

  // 7. Listen for realtime caregiver-sent reminders via WebSocket events
  useEffect(() => {
    const handleRealtimeEvent = (e) => {
      const data = e.detail;
      if (!data) return;
      // When caregiver sends a reminder, trigger alarm immediately
      if (data.event === 'reminder:sent' && !activeSession) {
        const medName = data.medicine_name || data.payload?.medicine_name || 'Prescribed Medicine';
        setIsAudioMuted(false);
        setActiveSession({
          id: 'reminder-' + Date.now(),
          scheduled_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'RINGING',
          items: [{
            id: data.medicine_id || 'rem-item',
            medicine_name: medName,
            dosage: data.dosage || '1 Dose'
          }]
        });
      }
    };

    window.addEventListener('elderguard:realtime-event', handleRealtimeEvent);
    return () => window.removeEventListener('elderguard:realtime-event', handleRealtimeEvent);
  }, [activeSession]);

  if (!activeSession) return null;

  // 🔇 Action 1: "Off Sound" Button
  // Stops the ringing alarm sound alone, while leaving the pop-up on screen!
  const handleOffSound = () => {
    setIsAudioMuted(true);
    stopAudioAndSpeech();
  };

  // 💚 Action 2: "Medicine Taken" Button
  // Pressed after taking tablet -> closes popup & resolves session
  const handleMedicineTaken = async () => {
    stopAudioAndSpeech();
    try {
      if (!testAlarmTriggered && activeSession.id) {
        await medicinesService.turnOffSession(activeSession.id, 'taken');
      }
    } catch (e) {
      console.warn('Turn off session error:', e);
    }
    setActiveSession(null);
    setTestAlarmTriggered(false);
    setIsAudioMuted(false);
  };

  const items = activeSession.items || [
    { id: 'i1', medicine_name: 'Prescribed Medicine', dosage: '1 Dose' }
  ];

  const timingDisplay = activeSession.scheduled_time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      
      {/* Alarm Pop-Up Dialog */}
      <div className="bg-gradient-to-b from-[#1B6B93] via-[#155373] to-[#0F3C54] text-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-[0_0_60px_rgba(27,107,147,0.7)] border-2 border-sky-300/40 relative overflow-hidden text-center space-y-6">
        
        {/* Top Alarm Badge Header */}
        <div className="flex justify-between items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 text-xs font-bold uppercase tracking-wider animate-pulse">
            <BellRing className="w-4 h-4 text-amber-300" />
            <span>Medicine Reminder Alarm</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-sky-200 text-xs font-bold border border-white/20">
            <Clock className="w-3.5 h-3.5 text-amber-300" />
            <span>{timingDisplay}</span>
          </div>
        </div>

        {/* Pulsing Capsule Icon */}
        <div className="flex justify-center py-2">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-sky-400/30 blur-xl animate-ping" />
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-[#FFE8D6] to-[#FFE0C2] text-[#1B6B93] border-4 border-white shadow-2xl flex items-center justify-center relative">
              <Pill className="w-14 h-14 text-[#1B6B93] animate-pulse" />
            </div>
          </div>
        </div>

        {/* Pop-up Title & Scheduled Timing Header */}
        <div className="space-y-1">
          <h2 className="font-fraunces font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
            Time for Medicine! 💊
          </h2>
          <p className="text-sm text-sky-200 font-semibold">
            Scheduled Time: <span className="text-white font-extrabold underline">{timingDisplay}</span>
          </p>
        </div>

        {/* Medicine List Container */}
        <div className="bg-white/10 border border-white/20 backdrop-blur-md rounded-2xl p-4 divide-y divide-white/10 text-left space-y-3">
          <p className="text-xs text-sky-200 font-bold uppercase tracking-wider mb-2">Prescribed Medicines List:</p>
          {items.map((item, idx) => (
            <div key={item.id || idx} className="pt-2.5 first:pt-0 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-base text-white">{item.medicine_name}</h4>
                <p className="text-xs text-sky-200">Dosage: <span className="font-semibold text-white">{item.dosage}</span></p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-200 text-xs font-bold shrink-0">
                Scheduled Dose
              </span>
            </div>
          ))}
        </div>

        {/* Two Explicit Buttons as requested: Off Sound & Medicine Taken */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          
          {/* Button 1: Off Sound (Stops sound alone, pop-up stays open) */}
          <button
            onClick={handleOffSound}
            disabled={isAudioMuted}
            className={`py-4 rounded-2xl font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer min-h-[56px] border ${
              isAudioMuted 
                ? 'bg-white/10 text-sky-200 border-white/20 opacity-70 cursor-default'
                : 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-300 shadow-amber-500/30 hover:scale-[1.02]'
            }`}
          >
            {isAudioMuted ? <VolumeX className="w-5 h-5 text-sky-200" /> : <Volume2 className="w-5 h-5 text-slate-950 animate-pulse" />}
            <span>{isAudioMuted ? 'Sound Off 🔇' : 'Off Sound'}</span>
          </button>

          {/* Button 2: Medicine Taken (Pressed after taking tablet -> closes pop-up) */}
          <button
            onClick={handleMedicineTaken}
            className="py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-base shadow-xl shadow-emerald-900/40 transition-all hover:scale-[1.02] flex items-center justify-center gap-2.5 cursor-pointer min-h-[56px] border border-emerald-300/40"
          >
            <CheckCircle2 className="w-6 h-6 text-white" />
            <span>Medicine Taken</span>
          </button>

        </div>

      </div>
    </div>
  );
}
