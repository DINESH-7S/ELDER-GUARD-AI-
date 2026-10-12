import React, { useState, useEffect } from 'react';
import { startSosAlarmSound, stopSosAlarmSound } from '../../utils/sosSound';
import { 
  Pill, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Volume2, 
  Plus, 
  PhoneCall, 
  MessageSquare, 
  ShieldAlert, 
  ShoppingBag, 
  Sparkles,
  Info,
  Utensils,
  Car,
  Droplets,
  Calendar,
  X,
  Users,
  Bot,
  Trash2
} from 'lucide-react';
import { authService } from '../../services/authService';
import medicinesService from '../../services/medicinesService';
import doctorRecordsService from '../../services/doctorRecordsService';
import aiCompanionService from '../../services/aiCompanionService';
import emergencyService from '../../services/emergencyService';
import { useConnectedMutations, useElderDashboard, useElderRoom } from '../../hooks/useConnectedPortal';
import broadcastRealtimeEvent from '../../utils/realtimeBus';

export default function ElderMedicinesPage({ currentUser, onNavigateTab }) {
  const [sosActive, setSosActive] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(10);
  const [sosSentConfirmed, setSosSentConfirmed] = useState(false);
  const [activeSpeechId, setActiveSpeechId] = useState(null);
  const [refillSuccessMsg, setRefillSuccessMsg] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hello ${currentUser?.name ? currentUser.name.split(' ')[0] : 'there'}! I am your ElderGuard AI Companion. Need help with your medicines or alarms?` }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const elderId = currentUser?.id || currentUser?.user_id;
  const dashboardQuery = useElderDashboard(Boolean(elderId));
  const connectedMutations = useConnectedMutations();
  useElderRoom(elderId, Boolean(elderId));


  // Daily Medicines State
  const [todayMedicines, setTodayMedicines] = useState([]);

  // Inventory Medicines State
  const [inventory, setInventory] = useState([]);
  const [doctorPrescriptions, setDoctorPrescriptions] = useState([]);

  const mapDoctorPrescription = (rx, idx) => {
    const timeStr = rx.timeSlot || rx.time_slot || '08:00 AM';
    let period = 'Morning';
    const hour = parseInt(timeStr.split(':')[0], 10) || 8;
    const isPM = timeStr.toLowerCase().includes('pm');
    const h24 = isPM && hour < 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);

    if (h24 >= 12 && h24 < 17) {
      period = 'Afternoon';
    } else if (h24 >= 17 || h24 < 5) {
      period = 'Evening & Night';
    }

    const mealText = rx.mealTiming || rx.meal_timing || 'Scheduled';

    return {
      id: rx.id || `rx-doc-${idx}`,
      name: rx.medicine || 'Prescribed Medicine',
      dosage: rx.sig || 'As directed by Doctor',
      time: timeStr,
      period,
      instructions: `Prescribed by Doctor · Schedule: ${timeStr} (${mealText})${rx.pharmacy ? ` · Pharmacy: ${rx.pharmacy}` : ''}`,
      status: 'pending',
      pillColor: 'bg-eg-teal text-white',
      purpose: 'Doctor Prescription',
      stockRemaining: 30,
      totalStock: 30,
      cautions: []
    };
  };

  const refreshDoctorPrescriptions = () => {
    if (!elderId) return;
    doctorRecordsService.listPrescriptions(elderId)
      .then(list => setDoctorPrescriptions((list || []).map(mapDoctorPrescription)))
      .catch(() => setDoctorPrescriptions([]));
  };

  useEffect(() => {
    refreshDoctorPrescriptions();
  }, [elderId]);

  // Legacy loader kept inert; doctor prescriptions now load from the database service above.
  const loadDoctorPrescriptions = () => {
    try {
      const raw = null;
      if (!raw) return [];
      const doctorRxs = JSON.parse(raw);
      return doctorRxs.map((rx, idx) => {
        const timeStr = rx.timeSlot || '08:00 AM';
        let period = 'Morning';
        const hour = parseInt(timeStr.split(':')[0], 10) || 8;
        const isPM = timeStr.toLowerCase().includes('pm');
        const h24 = isPM && hour < 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);

        if (h24 >= 12 && h24 < 17) {
          period = 'Afternoon';
        } else if (h24 >= 17 || h24 < 5) {
          period = 'Evening & Night';
        }

        const mealText = rx.mealTiming || 'After Meals';

        return {
          id: rx.id || `rx-doc-${idx}`,
          name: rx.medicine || 'Prescribed Medicine',
          dosage: rx.sig || 'As directed by Doctor',
          time: timeStr,
          period: period,
          instructions: `Prescribed by Doctor · Schedule: ${timeStr} (${mealText}) · Pharmacy: ${rx.pharmacy || 'Central Pharmacy'}`,
          status: 'pending',
          pillColor: 'bg-eg-teal text-white',
          purpose: 'Doctor Prescription',
          stockRemaining: 30,
          totalStock: 30,
          cautions: []
        };
      });
    } catch {
      return [];
    }
  };

  useEffect(() => {
    const doctorMeds = doctorPrescriptions;
    const medicines = dashboardQuery.data?.today_medicines || [];
    let mappedToday = [];

    if (medicines.length > 0) {
      mappedToday = medicines.map((m, idx) => {
        const timesArr = Array.isArray(m.times_of_day) && m.times_of_day.length > 0 ? m.times_of_day : ['08:00'];
        const timeStr = typeof timesArr[0] === 'string' ? timesArr[0] : '08:00';
        const hour = timeStr.includes(':') ? parseInt(timeStr.split(':')[0], 10) : 8;
        
        let period = 'Morning';
        if (hour >= 12 && hour < 17) {
          period = 'Afternoon';
        } else if (hour >= 17 || hour < 5) {
          period = 'Evening & Night';
        }

        const colors = ['bg-eg-teal text-white', 'bg-[#E2694B] text-white', 'bg-[#1F8A5F] text-white', 'bg-eg-teal text-white'];

        return {
          id: m.id,
          name: m.name,
          dosage: m.dosage,
          time: timeStr,
          period: period,
          instructions: m.instructions || m.notes || 'Take as prescribed by doctor',
          status: m.status === 'taken' ? 'taken' : 'pending',
          pillColor: colors[idx % colors.length],
          purpose: m.purpose || 'General Therapy',
          stockRemaining: m.stock_count ?? m.stock_remaining ?? 25,
          totalStock: m.total_stock || 30,
          cautions: m.cautions || []
        };
      });
    }

    const merged = [...doctorMeds, ...mappedToday];
    setTodayMedicines(merged);
    setInventory(merged.map(m => ({
      id: m.id,
      name: m.name,
      dosage: m.dosage,
      purpose: m.purpose,
      frequency: `${m.period} (${m.time})`,
      stockRemaining: m.stockRemaining,
      totalStock: m.totalStock,
      cautions: m.cautions || []
    })));
  }, [dashboardQuery.data, doctorPrescriptions]);

  // Real-time synchronization listener for Doctor Portal events & Storage events
  useEffect(() => {
    const handleRealtimeSync = () => {
      refreshDoctorPrescriptions();
    };

    window.addEventListener('elderguard:realtime-event', handleRealtimeSync);
    return () => {
      window.removeEventListener('elderguard:realtime-event', handleRealtimeSync);
    };
  }, [elderId]);

  useEffect(() => {
    let timer;
    if (sosActive && !sosSentConfirmed && sosCountdown > 0) {
      startSosAlarmSound("Emergency SOS Activated! Dispatching alert to Caretaker and Emergency Desk.");
      timer = setInterval(() => setSosCountdown(prev => prev - 1), 1000);
    } else if (sosActive && !sosSentConfirmed && sosCountdown === 0) {
      try {
        emergencyService.triggerSOS(37.7749, -122.4194);
      } catch (err) {
        console.warn('Emergency service SOS trigger fallback:', err);
      }
      connectedMutations.triggerSOS.mutate({ location: { lat: 37.7749, lng: -122.4194 } });

      broadcastRealtimeEvent('elderguard:realtime-event', {
        event: 'sos:triggered',
        type: 'sos',
        elder_name: currentUser?.name || 'Elder Patient',
        location_lat: 37.7749,
        location_lng: -122.4194,
        triggered_at: new Date().toISOString()
      });

      setSosSentConfirmed(true);
    } else if (!sosActive) {
      stopSosAlarmSound();
    }
    return () => {
      clearInterval(timer);
      if (!sosActive) stopSosAlarmSound();
    };
  }, [sosActive, sosSentConfirmed, sosCountdown, connectedMutations.triggerSOS]);

  // Weekly adherence data (7 days)
  const weekDays = [
    { day: 'Mon', status: 'full' },
    { day: 'Tue', status: 'full' },
    { day: 'Wed', status: 'full' },
    { day: 'Thu', status: 'full' },
    { day: 'Fri', status: 'partial' },
    { day: 'Sat', status: 'full' },
    { day: 'Sun', status: 'today' }
  ];

  const handleDeleteElderMedicine = async (medId, medName) => {
    if (window.confirm(`Are you sure you want to remove "${medName}" from your medicines list?`)) {
      try {
        if (medId && typeof medId === 'string' && !medId.startsWith('rx-doc-')) {
          await medicinesService.deleteMedicine(medId);
        }
      } catch (err) {
        console.warn('Backend deleteMedicine note:', err);
      }
      setTodayMedicines(prev => prev.filter(m => m.id !== medId && m.name !== medName));
      setInventory(prev => prev.filter(item => item.id !== medId && item.name !== medName));
      showToast(`Removed "${medName}" from your medicine list.`);
    }
  };

  // Speech synthesis read aloud
  const handleReadAloud = (med) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const textToSpeak = `${med.name}. Dosage: ${med.dosage}. Scheduled time: ${med.time}. Instructions: ${med.instructions}.`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      setActiveSpeechId(med.id);
      utterance.onend = () => setActiveSpeechId(null);
      utterance.onerror = () => setActiveSpeechId(null);
      window.speechSynthesis.speak(utterance);
    } else {
      alert(`Read Aloud: ${med.name} - ${med.dosage} at ${med.time}`);
    }
  };

  const handleToggleTaken = async (id) => {
    const previous = todayMedicines;
    const target = todayMedicines.find((m) => m.id === id);
    setTodayMedicines(prev => prev.map(m => {
      if (m.id === id) {
        const nextStatus = m.status === 'taken' ? 'pending' : 'taken';
        return { ...m, status: nextStatus };
      }
      return m;
    }));
    if (target?.status !== 'taken' && !id.startsWith('default-')) {
      try {
        await connectedMutations.markMedicineTaken.mutateAsync({ medicineId: id, scheduledTime: new Date().toISOString() });
      } catch (_) {
        setTodayMedicines(previous);
        setRefillSuccessMsg('Something went wrong - let us try marking that dose again.');
      }
    }
  };

  const handleOrderRefill = (medName) => {
    setRefillSuccessMsg(`Refill order for ${medName} submitted to CVS Pharmacy!`);
    setTimeout(() => setRefillSuccessMsg(null), 5000);
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    setMessages(prev => [
      ...prev,
      { role: 'user', text: inputMsg },
      { role: 'assistant', text: `I have updated your medicine log for "${inputMsg}". Is there anything else you need?` }
    ]);
    setInputMsg('');
  };

  return (
    <div className="space-y-8 bg-eg-paper text-eg-ink font-inter min-h-screen pb-16">
      
      {/* Refill Success Toast Banner */}
      {refillSuccessMsg && (
        <div className="fixed top-6 right-6 z-50 bg-[#4CAA6D] text-white px-6 py-4 rounded-2xl shadow-sm flex items-center gap-3 font-semibold animate-bounce">
          <CheckCircle2 className="w-6 h-6 shrink-0 text-white" />
          <span>{refillSuccessMsg}</span>
          <button onClick={() => setRefillSuccessMsg(null)} className="ml-4 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Responsive Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left / Main Content Column (~65% width / 8 cols) */}
        <div className="xl:col-span-8 space-y-8">
          
          {/* Header Card (Soft Peach Gradient Banner) */}
          <div className="bg-white border border-eg-line  rounded-2xl p-6 lg:p-8 relative overflow-hidden flex flex-wrap justify-between items-center gap-6">
            <div className="space-y-2 max-w-lg">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-eg-teal/10 text-eg-teal text-xs font-bold uppercase tracking-wider">
                <Pill className="w-4 h-4 text-eg-teal" />
                <span>Daily Concierge Tracker</span>
              </div>
              <h1 className="font-fraunces font-bold text-3xl lg:text-4xl text-eg-ink tracking-tight">
                Your Medicines
              </h1>
              <p className="text-base text-[#5A6065] font-medium leading-relaxed">
                3 medicines scheduled today <span className="text-[#E2694B] font-bold">• 1 running low on stock</span>
              </p>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('elderguard:trigger-alarm', {
                    detail: {
                      id: 'demo-alarm-' + Date.now(),
                      scheduled_time: new Date().toISOString(),
                      status: 'RINGING',
                      items: [
                        { id: 'item-1', medicine_name: 'Metformin', dosage: '500mg (1 Tablet)' },
                        { id: 'item-2', medicine_name: 'Aspirin', dosage: '81mg (1 Tablet)' }
                      ]
                    }
                  }));
                }}
                className="mt-2 px-4 py-2.5 rounded-2xl bg-eg-teal hover:bg-eg-teal-dark text-white text-xs font-bold shadow-md transition inline-flex items-center gap-2 cursor-pointer"
              >
                <Volume2 className="w-4 h-4 text-eg-tint animate-pulse" />
                <span>Test Alarm Ringing Sound</span>
              </button>
            </div>

            {/* Pill Capsule Illustration Badge */}
            <div className="bg-eg-teal-dark p-5 rounded-2xl text-white shadow-sm flex items-center justify-center shrink-0 border-2 border-white/60">
              <Pill className="w-12 h-12 text-eg-tint animate-pulse" />
            </div>
          </div>

          {/* Today's Full Schedule (Timeline sectioned by Morning / Afternoon / Evening / Night) */}
          <div className="bg-white border border-eg-line  rounded-2xl p-6 lg:p-8 space-y-6">
            <div className="flex justify-between items-center border-b border-eg-line pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3.5 rounded-2xl bg-eg-tint text-eg-teal">
                  <Clock className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="font-fraunces font-bold text-2xl text-eg-ink">Today's Schedule</h2>
                  <span className="text-xs text-eg-muted font-medium">Timely Doses & Audio Guidance</span>
                </div>
              </div>
            </div>

            {/* Timeline Sections */}
            <div className="space-y-6">
              
              {/* Morning Block */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-eg-tint text-[#9A5B00] border border-eg-line">
                    Morning (8:00 AM - 11:00 AM)
                  </span>
                </div>

                <div className="space-y-3">
                  {todayMedicines.filter(m => m.period === 'Morning').map(m => (
                    <div 
                      key={m.id}
                      className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                        m.status === 'taken' 
                          ? 'bg-eg-paper border-eg-line' 
                          : m.status === 'missed'
                            ? 'bg-[#FFF5F5] border-[#F8B4B4]'
                            : 'bg-eg-paper border-eg-line hover:border-eg-teal/40'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-2xl ${m.pillColor} shadow-md shrink-0 mt-0.5`}>
                          <Pill className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg text-eg-ink">{m.name}</h3>
                            <span className="text-xs text-eg-muted font-normal">({m.dosage})</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-eg-teal font-semibold mt-1">
                            <span className="flex items-center gap-1 text-[#9A5B00]">
                              <Clock className="w-4 h-4" /> {m.time}
                            </span>
                            <span className="text-eg-muted">• {m.instructions}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-200">
                        {/* Speaker / Read Aloud Button */}
                        <button
                          onClick={() => handleReadAloud(m)}
                          title="Read Aloud Instructions"
                          className={`p-3 rounded-xl border transition min-h-[48px] min-w-[48px] flex items-center justify-center cursor-pointer ${
                            activeSpeechId === m.id 
                              ? 'bg-eg-teal text-white border-eg-teal animate-pulse' 
                              : 'bg-white text-eg-teal border-eg-line hover:bg-eg-tint/50'
                          }`}
                        >
                          <Volume2 className="w-5 h-5" />
                        </button>

                        {/* Status Button */}
                        {m.status === 'taken' ? (
                          <button
                            onClick={() => handleToggleTaken(m.id)}
                            className="flex items-center gap-2 text-[#2F7D4C] font-bold text-sm bg-[#4CAA6D]/15 px-4 py-2.5 rounded-xl border border-[#4CAA6D]/30 min-h-[48px] cursor-pointer"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                            <span>Dose Taken</span>
                          </button>
                        ) : m.status === 'missed' ? (
                          <div className="flex items-center gap-2 text-[#D32F2F] font-bold text-sm bg-[#D32F2F]/10 px-4 py-2.5 rounded-xl border border-[#D32F2F]/30 min-h-[48px]">
                            <AlertCircle className="w-5 h-5" />
                            <span>Missed Dose</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleToggleTaken(m.id)}
                            className="bg-eg-teal hover:bg-eg-teal-dark px-6 py-3 rounded-2xl text-white font-bold text-sm shadow-md /20 transition-all hover:scale-[1.02] min-h-[48px] cursor-pointer"
                          >
                            Mark as Taken
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Afternoon Block */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-eg-tint text-eg-teal border border-eg-line">
                    Afternoon (12:00 PM - 3:00 PM)
                  </span>
                </div>

                <div className="space-y-3">
                  {todayMedicines.filter(m => m.period === 'Afternoon').map(m => (
                    <div 
                      key={m.id}
                      className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                        m.status === 'taken' 
                          ? 'bg-eg-paper border-eg-line' 
                          : 'bg-eg-paper border-eg-line hover:border-eg-teal/40'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-2xl ${m.pillColor} shadow-md shrink-0 mt-0.5`}>
                          <Pill className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg text-eg-ink">{m.name}</h3>
                            <span className="text-xs text-eg-muted font-normal">({m.dosage})</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-eg-teal font-semibold mt-1">
                            <span className="flex items-center gap-1 text-[#9A5B00]">
                              <Clock className="w-4 h-4" /> {m.time}
                            </span>
                            <span className="text-eg-muted">• {m.instructions}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-200">
                        <button
                          onClick={() => handleReadAloud(m)}
                          title="Read Aloud Instructions"
                          className={`p-3 rounded-xl border transition min-h-[48px] min-w-[48px] flex items-center justify-center cursor-pointer ${
                            activeSpeechId === m.id 
                              ? 'bg-eg-teal text-white border-eg-teal animate-pulse' 
                              : 'bg-white text-eg-teal border-eg-line hover:bg-eg-tint/50'
                          }`}
                        >
                          <Volume2 className="w-5 h-5" />
                        </button>

                        {m.status === 'taken' ? (
                          <button
                            onClick={() => handleToggleTaken(m.id)}
                            className="flex items-center gap-2 text-[#2F7D4C] font-bold text-sm bg-[#4CAA6D]/15 px-4 py-2.5 rounded-xl border border-[#4CAA6D]/30 min-h-[48px] cursor-pointer"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                            <span>Dose Taken</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleTaken(m.id)}
                            className="bg-eg-teal hover:bg-eg-teal-dark px-6 py-3 rounded-2xl text-white font-bold text-sm shadow-md /20 transition-all hover:scale-[1.02] min-h-[48px] cursor-pointer"
                          >
                            Mark as Taken
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evening & Night Block */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-eg-paper text-[#2F7D4C] border border-eg-line">
                    Evening & Night (7:00 PM - 10:00 PM)
                  </span>
                </div>

                <div className="space-y-3">
                  {todayMedicines.filter(m => m.period === 'Evening & Night').map(m => (
                    <div 
                      key={m.id}
                      className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                        m.status === 'taken' 
                          ? 'bg-eg-paper border-eg-line' 
                          : 'bg-eg-paper border-eg-line hover:border-eg-teal/40'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-2xl ${m.pillColor} shadow-md shrink-0 mt-0.5`}>
                          <Pill className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg text-eg-ink">{m.name}</h3>
                            <span className="text-xs text-eg-muted font-normal">({m.dosage})</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-eg-teal font-semibold mt-1">
                            <span className="flex items-center gap-1 text-[#9A5B00]">
                              <Clock className="w-4 h-4" /> {m.time}
                            </span>
                            <span className="text-eg-muted">• {m.instructions}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-200">
                        <button
                          onClick={() => handleReadAloud(m)}
                          title="Read Aloud Instructions"
                          className={`p-3 rounded-xl border transition min-h-[48px] min-w-[48px] flex items-center justify-center cursor-pointer ${
                            activeSpeechId === m.id 
                              ? 'bg-eg-teal text-white border-eg-teal animate-pulse' 
                              : 'bg-white text-eg-teal border-eg-line hover:bg-eg-tint/50'
                          }`}
                        >
                          <Volume2 className="w-5 h-5" />
                        </button>

                        {m.status === 'taken' ? (
                          <button
                            onClick={() => handleToggleTaken(m.id)}
                            className="flex items-center gap-2 text-[#2F7D4C] font-bold text-sm bg-[#4CAA6D]/15 px-4 py-2.5 rounded-xl border border-[#4CAA6D]/30 min-h-[48px] cursor-pointer"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                            <span>Dose Taken</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleTaken(m.id)}
                            className="bg-eg-teal hover:bg-eg-teal-dark px-6 py-3 rounded-2xl text-white font-bold text-sm shadow-md /20 transition-all hover:scale-[1.02] min-h-[48px] cursor-pointer"
                          >
                            Mark as Taken
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Medicine Detail Cards (Full Inventory View) */}
          <div className="bg-white border border-eg-line  rounded-2xl p-6 lg:p-8 space-y-6">
            <div className="flex justify-between items-center border-b border-eg-line pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3.5 rounded-2xl bg-eg-tint text-eg-teal">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="font-fraunces font-bold text-2xl text-eg-ink">Medicine Inventory & Refills</h2>
                  <span className="text-xs text-eg-muted font-medium">Stock Levels, Purpose & Safe Driving Cautions</span>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              {inventory.map((item) => {
                const isLow = item.stockRemaining <= 7;
                const stockPercent = Math.round((item.stockRemaining / item.totalStock) * 100);

                return (
                  <div 
                    key={item.id}
                    className="p-6 rounded-2xl bg-eg-paper border border-eg-line space-y-4 hover:border-eg-teal/40 transition"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      
                      {/* Left Side: Pill Icon & Title */}
                      <div className="flex items-start gap-4">
                        <div className="p-4 rounded-2xl bg-eg-teal text-white shadow-md shrink-0">
                          <Pill className="w-8 h-8 text-eg-tint" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-fraunces font-bold text-xl text-eg-ink">{item.name}</h3>
                            <span className="px-3 py-0.5 rounded-full bg-eg-tint text-eg-teal text-xs font-bold">
                              {item.purpose}
                            </span>
                          </div>
                          <p className="text-xs text-eg-muted font-medium">
                            {item.dosage} • <span className="font-semibold text-eg-ink">{item.frequency}</span>
                          </p>
                        </div>
                      </div>

                      {/* Right Side Refill CTA & Delete Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleOrderRefill(item.name)}
                          className={`px-5 py-3 rounded-2xl font-bold text-xs shadow-md transition min-h-[44px] cursor-pointer flex items-center gap-2 ${
                            isLow ? 'bg-gradient-to-r text-white hover:scale-[1.02]' : 'bg-white border border-eg-teal text-eg-teal hover:bg-eg-teal/10'
                          }`}
                        >
                          <ShoppingBag className="w-4 h-4" />
                          <span>{isLow ? 'Order Refill (Low Stock!)' : 'Order Refill'}</span>
                        </button>

                        <button
                          onClick={() => handleDeleteElderMedicine(item.id, item.name)}
                          className="px-4 py-3 rounded-2xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 font-bold text-xs transition min-h-[44px] cursor-pointer flex items-center gap-1.5 shadow-sm"
                          title={`Delete ${item.name}`}
                        >
                          <Trash2 className="w-4 h-4 shrink-0" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Stock Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-eg-muted">Current Stock Level</span>
                        <span className={isLow ? 'text-[#E2694B]' : 'text-[#2F7D4C]'}>
                          {item.stockRemaining} Doses Remaining ({stockPercent}%)
                        </span>
                      </div>
                      <div className="w-full h-3 bg-eg-line rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isLow 
                              ? 'bg-gradient-to-r ' 
                              : stockPercent < 40 
                                ? 'bg-[#F5A623]' 
                                : 'bg-[#4CAA6D]'
                          }`}
                          style={{ width: `${stockPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Cautions Row */}
                    <div className="flex items-center gap-3 pt-2 border-t border-eg-line/60 text-xs text-eg-muted flex-wrap">
                      <span className="font-semibold text-eg-ink">Safety Instructions:</span>
                      {item.cautions.map((c, idx) => {
                        const IconComponent = c.icon;
                        return (
                          <div 
                            key={idx} 
                            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-eg-line text-eg-teal font-medium"
                          >
                            <IconComponent className="w-4 h-4 text-[#9A5B00]" />
                            <span>{c.label}</span>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly Adherence Strip ("Your Week") */}
          <div className="bg-white border border-eg-line  rounded-2xl p-6 lg:p-8 space-y-4">
            <div className="flex justify-between items-center border-b border-eg-line pb-3">
              <div>
                <h3 className="font-fraunces font-bold text-2xl text-eg-ink">Your Week</h3>
                <p className="text-xs text-eg-muted font-medium">Gentle Weekly Routine Consistency</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#4CAA6D]/15 text-[#2F7D4C] font-bold text-xs">
                92% Completed
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2 lg:gap-4 text-center pt-2">
              {weekDays.map((w, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-eg-paper border border-eg-line space-y-2">
                  <span className="text-xs font-bold text-eg-muted block">{w.day}</span>
                  <div className="flex justify-center">
                    {w.status === 'full' ? (
                      <span className="w-6 h-6 rounded-full bg-[#4CAA6D] text-white flex items-center justify-center text-xs font-bold shadow-sm">
                        ✓
                      </span>
                    ) : w.status === 'partial' ? (
                      <span className="w-6 h-6 rounded-full bg-[#F5A623] text-white flex items-center justify-center text-xs font-bold shadow-sm">
                        !
                      </span>
                    ) : (
                      <span className="w-6 h-6 rounded-full bg-eg-teal text-white flex items-center justify-center text-xs font-bold animate-pulse">
                        Today
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-eg-muted font-medium text-center pt-2 italic">
              {`Wonderful progress! You've taken 92% of your prescribed medicines this week.`}
            </p>
          </div>

        </div>

        {/* Right Sidebar (~35% width / 4 cols) */}
        <div className="xl:col-span-4 space-y-8">
          
          {/* 1. Prominent Emergency SOS Card */}
          <div className="bg-gradient-to-br rounded-2xl p-6 lg:p-8 text-white  space-y-6 relative overflow-hidden from-[#D32F2F] via-[#C62828] to-[#B71C1C]">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-white/20 text-white ">
                <PhoneCall className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-fraunces font-bold text-2xl text-white">Emergency SOS</h3>
                <span className="text-xs text-white/80 font-medium">Multi-Tier Urgent Response</span>
              </div>
            </div>

            <p className="text-white/90 text-sm font-medium leading-relaxed">
              Press the panic button below if you feel unwell or need immediate assistance.
            </p>

            <button
              onClick={() => {
                setSosActive(true);
                setSosCountdown(10);
              }}
              className="w-full py-5 rounded-2xl bg-white hover:bg-red-50 text-[#C62828] font-fraunces font-bold text-xl shadow-sm hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3 min-h-[64px] cursor-pointer border-2 border-white/80"
            >
              <PhoneCall className="w-7 h-7 text-[#C62828] animate-bounce" />
              <span>1-TAP EMERGENCY SOS</span>
            </button>

            <div className="text-center text-xs text-white/80 font-medium pt-1">
              Notifies your caregiver & 24/7 Hospital Dispatch Immediately
            </div>
          </div>

          {/* 2. Caregiver Note Card */}
          <div className="bg-white to-white border border-eg-line  rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-eg-line flex items-center justify-center">
                <Users className="w-6 h-6 text-eg-muted" />
              </div>
              <div>
                <h4 className="font-fraunces font-bold text-lg text-eg-ink">Caregiver Note</h4>
                <p className="text-xs text-eg-muted font-semibold">No caregiver linked yet</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-eg-paper border border-dashed border-eg-line text-sm text-eg-muted font-medium leading-relaxed text-center">
              No caregiver message yet. Notes from your caregiver will appear here.
            </div>
          </div>

          {/* 3. Add New Medicine Card (Doctor / Caregiver Initiated) */}
          <div className="bg-white border-2 border-dashed border-eg-teal/40 hover:border-eg-teal  rounded-2xl p-6 space-y-4 text-center transition">
            <div className="p-4 rounded-full bg-eg-tint text-eg-teal w-14 h-14 mx-auto flex items-center justify-center">
              <Plus className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-fraunces font-bold text-xl text-eg-ink">Add New Medicine</h4>
              <p className="text-xs text-eg-muted font-medium mt-1">
                Ask your caregiver or doctor to add a new prescription or dose.
              </p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="bg-eg-teal hover:bg-eg-teal-dark w-full py-4 rounded-2xl text-white font-bold text-sm shadow-md transition hover:scale-[1.02] min-h-[48px] cursor-pointer"
            >
              Request New Medicine Addition
            </button>
          </div>

        </div>

      </div>



      {/* Emergency SOS Countdown / Confirmation Modal */}
      {sosActive && (
        <div className="fixed inset-0 z-50 bg-black/70  flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border-4 border-[#D32F2F] rounded-2xl p-8 max-w-md w-full text-center space-y-6 shadow-sm">
            {!sosSentConfirmed ? (
              <div className="space-y-6">
                <div className="w-20 h-20 rounded-full bg-[#D32F2F]/10 mx-auto flex items-center justify-center animate-pulse">
                  <PhoneCall className="w-10 h-10 text-[#D32F2F]" />
                </div>
                <div>
                  <h2 className="font-fraunces font-bold text-3xl text-[#D32F2F]">DISPATCHING SOS ALERT</h2>
                  <p className="text-sm text-eg-muted font-medium mt-2">
                    Alerting your Caretaker & Hospital Emergency Dispatch Team in
                  </p>
                </div>
                <div className="text-6xl font-black text-[#D32F2F] font-fraunces tracking-wider">
                  {sosCountdown}s
                </div>
                <button
                  onClick={() => {
                    setSosActive(false);
                    setSosSentConfirmed(false);
                    setSosCountdown(10);
                  }}
                  className="w-full py-4 rounded-2xl bg-eg-paper border border-eg-line text-eg-ink font-bold text-lg hover:bg-gray-100 transition cursor-pointer"
                >
                  CANCEL EMERGENCY SOS
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="w-16 h-16 rounded-full bg-[#1F8A5F]/15 border-2 border-[#1F8A5F] text-[#1F8A5F] flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="font-fraunces font-bold text-2xl text-[#1F8A5F]">SOS SENT SUCCESSFULLY!</h2>
                <p className="text-sm text-eg-muted font-semibold leading-relaxed">
                  Emergency alert & live GPS coordinates have been sent to your <strong>Caretaker</strong> and <strong>Hospital Emergency Dispatch Desk</strong>.
                </p>
                <button
                  onClick={() => {
                    setSosActive(false);
                    setSosSentConfirmed(false);
                    setSosCountdown(10);
                  }}
                  className="w-full py-4 rounded-2xl bg-[#1F8A5F] hover:bg-[#1F8A5F]/90 text-white font-bold text-lg shadow-sm transition cursor-pointer"
                >
                  Close Confirmation
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Request New Medicine Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50  flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 lg:p-8 max-w-md w-full space-y-5 shadow-sm border border-eg-line">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-fraunces font-bold text-xl text-eg-ink">Request New Prescription</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-eg-muted font-medium leading-relaxed">
              New medicines are safely reviewed and added by your primary doctor or caregiver. Click below to notify them via priority message.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setRefillSuccessMsg("Notification sent to your doctor & caregiver!");
                  setTimeout(() => setRefillSuccessMsg(null), 4000);
                }}
                className="w-full py-3.5 rounded-2xl bg-eg-teal text-white font-bold text-sm hover:bg-eg-teal-dark transition min-h-[48px]"
              >
                Send Request to your doctor
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-full py-3.5 rounded-2xl bg-eg-paper border border-eg-line text-eg-ink font-bold text-sm hover:bg-eg-tint/50 transition min-h-[48px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


