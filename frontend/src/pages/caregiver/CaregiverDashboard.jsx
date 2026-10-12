import React, { useEffect, useState } from 'react';
import {
  Home,
  Activity,
  Pill,
  Calendar,
  ShieldAlert,
  Users,
  UserCircle,
  Settings,
  Heart,
  Droplets,
  Wind,
  Scale,
  Clock,
  PhoneCall,
  Plus,
  Send,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  FileText,
  Lock,
  BatteryCharging,
  Smartphone,
  Eye,
  Edit3,
  Trash2,
  Bell,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  Share2,
  Sparkles,
  Award,
  Crown,
  Smile
} from 'lucide-react';
import { profilesService } from '../../services/profiles.service';
import medicinesService from '../../services/medicinesService';
import appointmentsService from '../../services/appointmentsService';
import doctorRecordsService from '../../services/doctorRecordsService';
import emergencyService from '../../services/emergencyService';
import connectedPortalService from '../../services/connectedPortalService';
import { useCaregiverDashboard, useCaregiverElders, useConnectedMutations, useElderRoom } from '../../hooks/useConnectedPortal';
import vitalsEngine from '../../utils/vitalsSimulation';
import broadcastRealtimeEvent from '../../utils/realtimeBus';

export default function CaregiverDashboard({ currentUser, activeTab = 'overview', onNavigateTab, onLogout }) {
  const defaultElder = {
    id: 'unlinked',
    elderId: '',
    name: 'No elder connected',
    relationship: 'Connect an elder',
    age: '',
    status: 'Not connected',
    statusType: 'neutral',
    avatar: '',
    bp: '--',
    glucose: '--',
    hr: '--',
    spo2: '--',
    weight: '--',
    sleep: '--',
    adherence: 0,
    lastActive: 'No database record',
    permissionLevel: 'none'
  };

  // ── Global State ──
  const [selectedElderId, setSelectedElderId] = useState('');
  const [currentTab, setCurrentTab] = useState(activeTab || 'overview');
  const [alertFilter, setAlertFilter] = useState('All');
  const [sosEvents, setSosEvents] = useState([]);
  const [notificationsList, setNotificationsList] = useState([]);
  
  const [elders, setElders] = useState([]);
  const [elderIdInput, setElderIdInput] = useState('');
  const [connectingElder, setConnectingElder] = useState(false);
  const [showConnectForm, setShowConnectForm] = useState(false);

  const currentElder = elders.find(e => e.id === selectedElderId) || elders[0] || defaultElder;
  const caregiverEldersQuery = useCaregiverElders(Boolean(currentUser?.id || currentUser?.user_id));
  const caregiverDashboardQuery = useCaregiverDashboard(currentElder?.id, currentElder?.id && currentElder.id !== 'unlinked');
  const connectedMutations = useConnectedMutations();
  useElderRoom(currentElder?.id, Boolean(currentElder?.id && currentElder.id !== 'unlinked'));

  useEffect(() => {
    const linked = caregiverEldersQuery.data;
    if (!Array.isArray(linked) || linked.length === 0) {
      setElders([]);
      setSelectedElderId('');
      return;
    }
    const mapped = linked.map(elder => ({
        id: elder.user_id || elder.id || elder.elder_id,
        elderId: elder.elder_id,
        name: elder.name || elder.email || 'Connected elder',
        relationship: 'Connected elder', age: elder.age_or_dob || '', status: 'Connected', statusType: 'success',
        avatar: elder.profile_pic_url || defaultElder.avatar,
        bp: elder.latest_vitals?.find?.((v) => v.type === 'bp')?.value?.systolic
          ? `${elder.latest_vitals.find((v) => v.type === 'bp').value.systolic}/${elder.latest_vitals.find((v) => v.type === 'bp').value.diastolic}`
          : '--',
        glucose: elder.latest_vitals?.find?.((v) => v.type === 'sugar')?.value?.value || '--',
        hr: elder.latest_vitals?.find?.((v) => v.type === 'heart_rate')?.value?.value || '--',
        spo2: elder.latest_vitals?.find?.((v) => v.type === 'spo2')?.value?.value || '--',
        weight: elder.latest_vitals?.find?.((v) => v.type === 'weight')?.value?.value || '--',
        sleep: elder.latest_vitals?.find?.((v) => v.type === 'sleep')?.value?.value || '--',
        adherence: elder.adherence ?? 0, lastActive: elder.today_checkin ? 'Checked in today' : 'Connected',
        activeSos: elder.active_sos,
        permissionLevel: elder.permission_level,
      }));
    setElders(mapped);
    if (mapped.length > 0 && !mapped.some(e => e.id === selectedElderId)) {
      setSelectedElderId(mapped[0].id);
    }
  }, [caregiverEldersQuery.data]);

  // Realtime Vitals Simulation Listener for Caregiver Dashboard
  useEffect(() => {
    const handleVitalsUpdate = (e) => {
      const v = e.detail?.vitals;
      if (!v) return;
      setElders(prev => {
        if (!prev || prev.length === 0) return [defaultElder];
        return prev.map(elder => ({
          ...elder,
          bp: v.bp || elder.bp,
          glucose: `${v.glucose || elder.glucose}`,
          hr: `${v.hr || v.heart_rate || elder.hr}`,
          spo2: `${v.spo2}%`,
          weight: `${v.weight} kg`,
          sleep: `${v.sleep} hrs`
        }));
      });
    };
    window.addEventListener('elderguard:vitals-update', handleVitalsUpdate);
    return () => window.removeEventListener('elderguard:vitals-update', handleVitalsUpdate);
  }, []);

  const fetchCaregiverAlerts = async () => {
    try {
      const notifs = await connectedPortalService.notifications().catch(() => []);
      if (Array.isArray(notifs)) {
        setNotificationsList(notifs);
      }
      const elderId = currentElder?.id || currentElder?.elderId;
      if (!elderId || elderId === 'unlinked') return;
      const history = await emergencyService.getSOSHistory(elderId).catch(() => []);
      if (Array.isArray(history)) {
        setSosEvents(history);
      }
    } catch (e) {
      console.warn('Error fetching caregiver alerts:', e);
    }
  };

  useEffect(() => {
    fetchCaregiverAlerts();
  }, [currentElder?.id, currentTab]);

  const [activeSosModalData, setActiveSosModalData] = useState(null);

  useEffect(() => {
    const handleRealtimeEvent = (e) => {
      const detail = e.detail;
      if (detail?.event === 'sos:triggered' || detail?.type === 'sos') {
        fetchCaregiverAlerts();
        setActiveSosModalData({
          id: detail?.id || detail?.sos_event_id || 'sos-' + Date.now(),
          elder_name: detail?.elder_name || currentElder?.name || 'Connected elder',
          triggered_at: detail?.triggered_at || new Date().toISOString(),
          location_lat: detail?.location_lat || 37.7749,
          location_lng: detail?.location_lng || -122.4194,
          status: 'active'
        });
      } else if (detail?.event === 'sos:resolved') {
        fetchCaregiverAlerts();
        setActiveSosModalData(null);
      }
    };
    window.addEventListener('elderguard:realtime-event', handleRealtimeEvent);
    return () => window.removeEventListener('elderguard:realtime-event', handleRealtimeEvent);
  }, [currentElder?.id]);

  useEffect(() => {
    const activeEvent = sosEvents.find(s => String(s.status || 'active').toLowerCase() !== 'resolved');
    if (activeEvent && !activeSosModalData) {
      setActiveSosModalData(activeEvent);
    }
  }, [sosEvents]);

  const handleAcknowledgeSos = async (eventId) => {
    try {
      await emergencyService.acknowledgeSOS(eventId);
      fetchCaregiverAlerts();
    } catch (err) {
      console.warn('Failed to acknowledge SOS:', err);
    }
  };

  const handleResolveSos = async (eventId) => {
    try {
      await emergencyService.resolveSOS(eventId, 'Resolved by caregiver');
      fetchCaregiverAlerts();
    } catch (err) {
      console.warn('Failed to resolve SOS:', err);
    }
  };

  // Caregiver Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || currentUser?.phone_no || '',
    email: currentUser?.email || '',
    relationship: 'Child',
    profile_pic_url: ''
  });

  useEffect(() => {
    async function fetchCaregiverProfile() {
      const caregiverId = currentUser?.id || currentUser?.user_id;
      if (!caregiverId) return;
      try {
        const p = await profilesService.getCaregiverProfile(caregiverId);
        if (p) {
          setProfileData({
            name: p.name || currentUser?.name || '',
            phone: p.phone_no || currentUser?.phone || currentUser?.phone_no || '',
            email: p.email || currentUser?.email || '',
            relationship: p.relationship_to_elder || 'Child',
            profile_pic_url: p.profile_pic_url || ''
          });
        }
      } catch (err) {
        console.warn('Caregiver profile not found yet or error loading:', err);
      }
    }
    fetchCaregiverProfile();
  }, [currentUser]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const caregiverId = currentUser?.id || currentUser?.user_id;
    if (!caregiverId) return;
    setSavingProfile(true);
    try {
      const payload = {
        name: profileData.name,
        phone_no: profileData.phone,
        email: profileData.email,
        relationship_to_elder: profileData.relationship,
        profile_pic_url: profileData.profile_pic_url
      };
      try {
        await profilesService.updateCaregiverProfile(caregiverId, payload);
      } catch (updateErr) {
        if (updateErr.response?.status === 404) {
          await profilesService.createCaregiverProfile(payload);
        } else {
          throw updateErr;
        }
      }
      // Update local stored user if available
      const storedUser = localStorage.getItem('elderguard_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          parsed.name = profileData.name;
          parsed.phone = profileData.phone;
          parsed.email = profileData.email;
          localStorage.setItem('elderguard_user', JSON.stringify(parsed));
        } catch (_) {}
      }
      showToast('Caregiver profile updated successfully!');
      setIsEditingProfile(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      showToast(err.response?.data?.detail || 'Failed to update caregiver profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Toast notification state
  const [toastMsg, setToastMsg] = useState(null);
  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }

  const handleConnectElder = async (event) => {
    event.preventDefault();
    if (!elderIdInput.trim()) return;
    setConnectingElder(true);
    try {
      const result = await connectedMutations.inviteElder.mutateAsync({
        elderIdentifier: elderIdInput.trim(),
        permissionLevel: 'full_access',
      });
      setElderIdInput('');
      setShowConnectForm(false);
      showToast(result?.status === 'active' ? 'Elder is connected to your care account.' : 'Unable to complete the connection.');
    } catch (error) {
      showToast(error.response?.data?.detail?.error?.message || error.response?.data?.detail || 'Unable to send this invite.');
    } finally {
      setConnectingElder(false);
    }
  };

  // Modals & Medicine State
  const [addMedModalOpen, setAddMedModalOpen] = useState(false);
  const [bookApptModalOpen, setBookApptModalOpen] = useState(false);

  const [medicinesList, setMedicinesList] = useState([]);

  const [newMedForm, setNewMedForm] = useState({
    name: '',
    dosage: '',
    timeSlot: '08:00',
    customTime: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: ''
  });
  const [addingMedLoading, setAddingMedLoading] = useState(false);

  // Appointment Form State
  const [registeredDoctors, setRegisteredDoctors] = useState([]);
  const [newApptForm, setNewApptForm] = useState({
    doctorId: '',
    doctorName: '',
    appointmentDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    appointmentTime: '10:30',
    type: 'Video Call',
    notes: 'Routine Checkup'
  });
  const [bookingApptLoading, setBookingApptLoading] = useState(false);

  useEffect(() => {
    async function fetchDocs() {
      try {
        const docs = await appointmentsService.getDoctors();
        if (docs && docs.length > 0) {
          setRegisteredDoctors(docs);
          setNewApptForm(prev => ({
            ...prev,
            doctorId: docs[0].user_id,
            doctorName: docs[0].name
          }));
        }
      } catch (e) {
        console.warn('Error loading registered doctors in caregiver portal:', e);
      }
    }
    fetchDocs();
  }, []);

  // Fetch medicines for currently selected elder + doctor prescriptions
  const loadDoctorPrescriptionsForCaregiver = async () => {
    try {
      const elderId = currentElder?.id || currentElder?.elderId;
      if (!elderId || elderId === 'unlinked') return [];
      const doctorRxs = await doctorRecordsService.listPrescriptions(elderId);
      return doctorRxs.map((rx, idx) => ({
        id: rx.id || `rx-doc-cg-${idx}`,
        name: rx.medicine || 'Prescribed Medicine',
        dosage: rx.sig || 'As prescribed',
        times_of_day: [rx.timeSlot || rx.time_slot || '08:00 AM'],
        stock: `30 pills (Doctor e-Rx · ${rx.mealTiming || 'Scheduled'})`,
        adherence: '100% Active'
      }));
    } catch {
      return [];
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function loadMedicines() {
      const doctorMeds = await loadDoctorPrescriptionsForCaregiver();
      const meds = caregiverDashboardQuery.data?.today_medicines || [];
      const mapped = meds.map(m => ({
        id: m.id,
        name: m.name,
        dosage: m.dosage,
        times_of_day: m.times_of_day || m.scheduled_times || ['08:00'],
        stock: `${m.stock_count ?? 30} pills left`,
        adherence: '100%'
      }));
      if (!cancelled) setMedicinesList([...doctorMeds, ...mapped]);
    }
    loadMedicines();
    return () => {
      cancelled = true;
    };
  }, [caregiverDashboardQuery.data, currentElder?.id, currentElder?.elderId]);

  useEffect(() => {
    const handleRealtimeSync = () => {
      loadDoctorPrescriptionsForCaregiver().then(doctorMeds => {
        setMedicinesList(prev => {
          const nonDoc = prev.filter(p => !String(p.id).startsWith('rx-'));
          return [...doctorMeds, ...nonDoc];
        });
      });
    };
    window.addEventListener('elderguard:realtime-event', handleRealtimeSync);
    return () => {
      window.removeEventListener('elderguard:realtime-event', handleRealtimeSync);
    };
  }, [currentElder?.id, currentElder?.elderId]);

  const handleAddMedicineSubmit = async (e) => {
    e.preventDefault();
    if (!newMedForm.name.trim() || !newMedForm.dosage.trim()) {
      showToast('Please fill in Medicine Name and Dosage.');
      return;
    }
    const elderId = currentElder?.id || currentElder?.elderId;
    if (!elderId || elderId === 'unlinked') {
      showToast('Please connect an Elder account first before adding medicines.');
      return;
    }

    const times = newMedForm.timeSlot === 'custom' 
      ? [newMedForm.customTime || '08:00']
      : [newMedForm.timeSlot];

    setAddingMedLoading(true);
    try {
      const payload = {
        elder_id: elderId,
        name: newMedForm.name.trim(),
        dosage: newMedForm.dosage.trim(),
        times_of_day: times,
        start_date: newMedForm.startDate,
        end_date: newMedForm.endDate ? newMedForm.endDate : null,
      };

      let createdMed;
      try {
        createdMed = await connectedMutations.addMedicine.mutateAsync({
          elderId,
          payload: {
            name: payload.name,
            dosage: payload.dosage,
            frequency: 'daily',
            scheduled_times: payload.times_of_day,
            instructions: newMedForm.notes,
            stock_count: 30,
            low_stock_threshold: 7,
          }
        });
      } catch (err) {
        console.warn('Backend createMedicine failed, adding locally:', err);
        createdMed = {
          id: 'med-' + Date.now(),
          name: payload.name,
          dosage: payload.dosage,
          times_of_day: payload.times_of_day,
        };
      }

      setMedicinesList(prev => [
        ...prev,
        {
          id: createdMed.id || 'med-' + Date.now(),
          name: createdMed.name || payload.name,
          dosage: createdMed.dosage || payload.dosage,
          times_of_day: createdMed.times_of_day || times,
          stock: '30 pills left',
          adherence: '100%'
        }
      ]);

      showToast(`Medicine "${newMedForm.name}" scheduled successfully for ${currentElder.name}!`);
      setAddMedModalOpen(false);
      setNewMedForm({
        name: '',
        dosage: '',
        timeSlot: '08:00',
        customTime: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        notes: ''
      });
    } catch (err) {
      console.error('Add medicine error:', err);
      showToast('Failed to add medicine. Please try again.');
    } finally {
      setAddingMedLoading(false);
    }
  };

  const handleSendMedicineReminder = async (medicine) => {
    const elderId = currentElder?.id || currentElder?.elderId;
    if (!elderId || elderId === 'unlinked') return;
    try {
      await connectedMutations.sendMedicineReminder.mutateAsync({ elderId, medicineId: medicine.id });
      showToast(`Pushed instant reminder for ${medicine.name} to ${currentElder.name}`);
    } catch (err) {
      showToast('Could not send that reminder. Please try again.');
    }
  };

  const handleDeleteMedicine = async (medicine) => {
    const medId = medicine.id;
    const medName = medicine.name || 'Medicine';
    if (window.confirm(`Are you sure you want to remove "${medName}" from ${currentElder?.name || 'Elder'}'s active prescriptions?`)) {
      try {
        if (medId && typeof medId === 'string' && !medId.startsWith('med-')) {
          await medicinesService.deleteMedicine(medId);
        }
      } catch (err) {
        console.warn('Backend deleteMedicine note:', err);
      }
      setMedicinesList(prev => prev.filter(m => m.id !== medId && m.name !== medName));
      showToast(`Removed "${medName}" from active prescriptions.`);
    }
  };

  const handleBookApptSubmit = async (e) => {
    e.preventDefault();
    const elderId = currentElder?.id || currentElder?.elderId;
    if (!elderId || elderId === 'unlinked') {
      showToast('Please connect an Elder account first before booking appointments.');
      return;
    }
    setBookingApptLoading(true);
    try {
      const selectedDoc = registeredDoctors.find(d => d.user_id === newApptForm.doctorId) || registeredDoctors[0];
      const docId = selectedDoc ? selectedDoc.user_id : newApptForm.doctorId;
      if (!docId) {
        showToast('Please select a registered doctor before booking.');
        return;
      }
      const docName = selectedDoc ? selectedDoc.name : newApptForm.doctorName;

      const payload = {
        elder_id: elderId,
        doctor_id: docId,
        appointment_date: newApptForm.appointmentDate,
        start_time: newApptForm.appointmentTime ? (newApptForm.appointmentTime.length === 5 ? `${newApptForm.appointmentTime}:00` : newApptForm.appointmentTime) : '10:30:00',
        end_time: '11:00:00',
        mode: newApptForm.type === 'In-Clinic Visit' ? 'in_person' : 'telemedicine',
        notes: newApptForm.notes
      };
      let apptResult;
      try {
        apptResult = await appointmentsService.bookAppointment(payload);
        broadcastRealtimeEvent('elderguard:realtime-event', { event: 'appointment:created', appointment: apptResult });
      } catch (err) {
        console.warn('Backend bookAppointment error:', err);
        throw err;
      }
      showToast(`Appointment booked with ${docName} for ${currentElder.name}!`);
      setBookApptModalOpen(false);
    } catch (err) {
      showToast('Failed to book appointment.');
    } finally {
      setBookingApptLoading(false);
    }
  };

  // Vitals Metric Selector state
  const [selectedVitalMetric, setSelectedVitalMetric] = useState('bp');
  const [vitalTimeRange, setVitalTimeRange] = useState('7D');

  // Chat input
  const [chatMessageText, setChatMessageText] = useState('');
  const [chatMessages, setChatMessages] = useState([]);

  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!chatMessageText.trim()) return;
    setChatMessages(prev => [
      ...prev,
      { id: Date.now(), sender: `${currentUser?.name || 'You'} (You)`, text: chatMessageText, time: 'Just now', isDoctor: false }
    ]);
    setChatMessageText('');
    showToast('Message sent to Assigned doctor');
  };

  // Synchronize prop activeTab if updated from sidebar
  const effectiveTab = activeTab && activeTab !== 'home' ? activeTab : currentTab;

  return (
    <div className="bg-eg-paper text-eg-ink font-inter min-h-screen pb-16 space-y-6">

      {/* Floating Action Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-eg-ink text-white px-7 py-3.5 rounded-2xl shadow-sm flex items-center gap-3 font-semibold text-sm animate-bounce border border-[#D4A24C]/60 max-w-md w-full">
          <CheckCircle2 className="w-5 h-5 text-[#16644A] shrink-0" />
          <span className="flex-1">{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="p-1 hover:bg-white/20 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TOP BAR: ELDER SWITCHER & CONCIERGE MEDICAL HEADER
      ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-eg-line rounded-2xl px-6 py-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Left: Elder Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8A6212]">
            <Crown className="w-4 h-4" />
            <span>Concierge Client:</span>
          </div>
          <div className="flex items-center gap-2.5">
            {elders.map((elder) => (
              <button
                key={elder.id}
                onClick={() => setSelectedElderId(elder.id)}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border min-h-[42px] ${
                  selectedElderId === elder.id
                    ? 'bg-eg-teal text-white border-eg-teal shadow-md ring-2 ring-[#D4A24C]/40'
                    : 'bg-eg-paper text-eg-muted border-eg-line hover:border-eg-teal/40'
                }`}
              >
                <img
                  src={elder.avatar}
                  alt={elder.name}
                  className="w-6 h-6 rounded-full object-cover border border-white/60 shrink-0"
                />
                <span className="truncate">{elder.name}</span>
                {elder.id === selectedElderId && (
                  <span className="w-2 h-2 rounded-full bg-[#D4A24C] animate-ping shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Premium Status Badge & Caregiver Identity */}
        <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-eg-line">
          <div className={`px-4 py-2 rounded-full text-xs font-extrabold flex items-center gap-2 border shadow-xs min-h-[38px] ${
            currentElder.statusType === 'success'
              ? 'bg-[#1F8A5F]/10 text-[#16644A] border-[#1F8A5F]/30'
              : 'bg-[#D4A24C]/15 text-[#7A5410] border-[#D4A24C]/40'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${currentElder.statusType === 'success' ? 'bg-[#1F8A5F]' : 'bg-[#D4A24C] animate-pulse'}`} />
            <span>{currentElder.status}</span>
          </div>

          <div className="h-6 w-px bg-eg-line hidden sm:block" />

          <button
            onClick={() => showToast('Caregiver Notifications (3 unread)')}
            className="relative p-2.5 rounded-xl bg-eg-paper border border-eg-line text-eg-teal hover:bg-eg-teal/10 transition cursor-pointer min-h-[42px] min-w-[42px] flex items-center justify-center"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-[#D4A24C] text-eg-ink text-[10px] font-black flex items-center justify-center shadow-sm">
              3
            </span>
          </button>

          <div className="flex items-center gap-3 pl-1">
            <div className="w-10 h-10 rounded-full bg-eg-line border-2 border-[#D4A24C] shadow-sm shrink-0 flex items-center justify-center">
              <span className="text-sm font-bold text-[#D4A24C]">{currentUser?.name?.charAt(0) || 'C'}</span>
            </div>
            <div className="hidden sm:block text-left">
              <span className="text-xs font-bold text-eg-ink block leading-none">{currentUser?.name || 'Caregiver'}</span>
              <span className="text-[10px] text-[#8A6212] font-extrabold uppercase tracking-wider">Private Caregiver</span>
            </div>
          </div>
        </div>

      </div>


      {/* ══════════════════════════════════════════════════════════════
          PAGE 1: OVERVIEW DASHBOARD
      ══════════════════════════════════════════════════════════════ */}
      {(effectiveTab === 'overview' || effectiveTab === 'home') && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Active Emergency SOS Alert Banner */}
          {sosEvents.some(s => String(s.status || 'active').toLowerCase() !== 'resolved') && (
            <div className="p-4 rounded-2xl bg-gradient-to-r text-white border-2 border-white/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm from-[#C1443A] via-[#E53935] to-[#B71C1C]">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-xl bg-white/20 text-white font-bold shrink-0">
                  <ShieldAlert className="w-7 h-7 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base flex items-center gap-2">
                    <span>CRITICAL EMERGENCY SOS ACTIVE: {currentElder.name}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white text-[#A63228] text-[10px] uppercase font-black">ACTION REQUIRED</span>
                  </h4>
                  <p className="text-xs text-white/90 font-semibold mt-0.5">
                    Emergency SOS triggered by {currentElder.name}. Both Caretaker & Hospital Emergency Dispatch Team have been alerted!
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => handleAcknowledgeSos(sosEvents.find(s => s.status !== 'resolved')?.id)}
                  className="px-4 py-2 rounded-xl bg-white text-[#A63228] font-bold text-xs hover:bg-gray-100 transition shadow-md cursor-pointer"
                >
                  Acknowledge
                </button>
                <button
                  onClick={() => handleResolveSos(sosEvents.find(s => s.status !== 'resolved')?.id)}
                  className="px-4 py-2 rounded-xl bg-[#1F8A5F] text-white font-bold text-xs hover:bg-[#1F8A5F]/90 transition shadow-md cursor-pointer"
                >
                  Resolve SOS
                </button>
              </div>
            </div>
          )}

          {/* Critical Care Notice Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r to-white border border-[#D4A24C]/40 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-[#D4A24C] text-eg-ink shadow-sm font-bold shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-eg-ink flex items-center gap-2">
                  <span>Concierge Care Notice for {currentElder.name}</span>
                  <span className="px-2 py-0.5 rounded bg-eg-teal text-white text-[10px] uppercase font-bold">Verified</span>
                </h4>
                <p className="text-xs text-eg-muted font-medium">
                  Morning Blood Pressure logged at 128/80 mmHg (Optimal). Next Dose: Aspirin 81mg at 1:00 PM.
                </p>
              </div>
            </div>
            <button aria-label="Dismiss notice" onClick={() => showToast('Notice acknowledged')} className="p-1.5 rounded-xl hover:bg-black/5 text-eg-muted">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Live Vitals Summary Grid (5 Equal Width Sparkline Cards) */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-lg text-eg-ink flex items-center gap-2">
                <Activity className="w-5 h-5 text-eg-teal" />
                <span>Live Biosensor Vitals ({currentElder.name})</span>
              </h3>
              <span className="text-xs text-eg-muted font-semibold">Synced {currentElder.lastActive}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              
              {/* BP Card */}
              <div className="bg-white border border-eg-line rounded-2xl p-4 shadow-sm hover:border-eg-teal/40 transition flex flex-col justify-between min-h-[160px] overflow-hidden relative group">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5 text-[#A63228] text-xs font-bold truncate">
                      <Heart className="w-4 h-4 shrink-0" /> BP
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#1F8A5F]/15 text-[#16644A] text-[10px] font-extrabold shrink-0 flex items-center gap-0.5">
                      <TrendingDown className="w-3 h-3" /> Normal
                    </span>
                  </div>
                  
                  <div>
                    <div className="text-2xl font-black text-eg-ink tracking-tight">{currentElder.bp}</div>
                    <div className="text-[11px] text-eg-muted font-medium truncate">Target: 110-130 / 70-85</div>
                  </div>
                </div>

                {/* Sparkline Graphic Block */}
                <div className="pt-2">
                  <div className="h-9 w-full bg-gradient-to-b to-transparent rounded-lg p-1 flex items-end">
                    <svg className="w-full h-full" viewBox="0 0 100 25" preserveAspectRatio="none">
                      <path d="M 0 18 Q 25 10, 50 20 T 100 12" fill="none" stroke="#C1443A" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Blood Sugar */}
              <div className="bg-white border border-eg-line rounded-2xl p-4 shadow-sm hover:border-eg-teal/40 transition flex flex-col justify-between min-h-[160px] overflow-hidden relative group">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5 text-eg-teal text-xs font-bold truncate">
                      <Droplets className="w-4 h-4 shrink-0" /> Glucose
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#1F8A5F]/15 text-[#16644A] text-[10px] font-extrabold shrink-0">
                      Optimal
                    </span>
                  </div>

                  <div>
                    <div className="text-2xl font-black text-eg-ink tracking-tight">
                      {currentElder.glucose} <span className="text-xs font-bold text-eg-muted">mg/dL</span>
                    </div>
                    <div className="text-[11px] text-eg-muted font-medium truncate">Post-breakfast fast</div>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="bg-white h-9 w-full to-transparent rounded-lg p-1 flex items-end">
                    <svg className="w-full h-full" viewBox="0 0 100 25" preserveAspectRatio="none">
                      <path d="M 0 20 Q 25 8, 50 16 T 100 10" fill="none" stroke="#3B4C9E" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Heart Rate */}
              <div className="bg-white border border-eg-line rounded-2xl p-4 shadow-sm hover:border-eg-teal/40 transition flex flex-col justify-between min-h-[160px] overflow-hidden relative group">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5 text-[#16644A] text-xs font-bold truncate">
                      <Activity className="w-4 h-4 shrink-0" /> Heart Rate
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#1F8A5F]/15 text-[#16644A] text-[10px] font-extrabold shrink-0">
                      Calm
                    </span>
                  </div>

                  <div>
                    <div className="text-2xl font-black text-eg-ink tracking-tight">
                      {currentElder.hr} <span className="text-xs font-bold text-eg-muted">bpm</span>
                    </div>
                    <div className="text-[11px] text-eg-muted font-medium truncate">Resting pulse rhythm</div>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="h-9 w-full bg-gradient-to-b to-transparent rounded-lg p-1 flex items-end">
                    <svg className="w-full h-full" viewBox="0 0 100 25" preserveAspectRatio="none">
                      <path d="M 0 12 L 20 12 L 25 5 L 30 20 L 35 8 L 40 12 L 100 12" fill="none" stroke="#1F8A5F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* SpO2 Oxygen */}
              <div className="bg-white border border-eg-line rounded-2xl p-4 shadow-sm hover:border-eg-teal/40 transition flex flex-col justify-between min-h-[160px] overflow-hidden relative group">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5 text-[#8A6212] text-xs font-bold truncate">
                      <Wind className="w-4 h-4 shrink-0" /> Oxygen
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#1F8A5F]/15 text-[#16644A] text-[10px] font-extrabold shrink-0">
                      97% SpO2
                    </span>
                  </div>

                  <div>
                    <div className="text-2xl font-black text-eg-ink tracking-tight">{currentElder.spo2}</div>
                    <div className="text-[11px] text-eg-muted font-medium truncate">Optimal oxygenation</div>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="h-9 w-full bg-gradient-to-b to-transparent rounded-lg p-1 flex items-end">
                    <svg className="w-full h-full" viewBox="0 0 100 25" preserveAspectRatio="none">
                      <path d="M 0 15 Q 30 8, 60 18 T 100 12" fill="none" stroke="#D4A24C" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Weight */}
              <div className="bg-white border border-eg-line rounded-2xl p-4 shadow-sm hover:border-eg-teal/40 transition flex flex-col justify-between min-h-[160px] overflow-hidden relative group">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5 text-eg-teal text-xs font-bold truncate">
                      <Scale className="w-4 h-4 shrink-0" /> Weight
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-eg-teal/10 text-eg-teal text-[10px] font-extrabold shrink-0">
                      Steady
                    </span>
                  </div>

                  <div>
                    <div className="text-2xl font-black text-eg-ink tracking-tight">
                      {currentElder.weight} <span className="text-xs font-bold text-eg-muted">kg</span>
                    </div>
                    <div className="text-[11px] text-eg-muted font-medium truncate">Steady this month</div>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="bg-white h-9 w-full to-transparent rounded-lg p-1 flex items-end">
                    <svg className="w-full h-full" viewBox="0 0 100 25" preserveAspectRatio="none">
                      <path d="M 0 15 L 100 15" fill="none" stroke="#3B4C9E" strokeWidth="2.5" strokeDasharray="4 4" />
                    </svg>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Equalized 2-Column Grid (Medication Adherence vs Quick Actions & Next Visit) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Left Column: Medication Adherence & Today's Schedule (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-eg-line rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div className="space-y-5">
                
                {/* Header with Adherence Donut Progress */}
                <div className="flex items-center justify-between border-b border-eg-line pb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 rounded-2xl bg-eg-teal text-white shadow-sm">
                      <Pill className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-eg-ink">Medication Adherence Rate</h4>
                      <span className="text-xs text-eg-muted">Weekly Adherence Compliance: <strong>{currentElder.adherence}%</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-xs font-black ${currentElder.adherence >= 80 ? 'bg-[#1F8A5F]/15 border-[#1F8A5F] text-[#16644A]' : currentElder.adherence >= 50 ? 'bg-[#D4A24C]/15 border-[#D4A24C] text-[#9A6B12]' : 'bg-[#D6373F]/10 border-[#D6373F] text-[#B42830]'}`}>
                      {currentElder.adherence}%
                    </div>
                    <span className={`hidden sm:inline-block px-3 py-1 rounded-full font-extrabold text-xs ${currentElder.adherence >= 80 ? 'bg-[#1F8A5F]/15 text-[#16644A]' : currentElder.adherence >= 50 ? 'bg-[#D4A24C]/15 text-[#9A6B12]' : 'bg-[#D6373F]/10 text-[#B42830]'}`}>
                      {currentElder.adherence >= 80 ? 'On track' : currentElder.adherence >= 50 ? 'Needs attention' : 'Low adherence'}
                    </span>
                  </div>
                </div>

                {/* Today's Schedule List */}
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-eg-muted block">Today's Dose Stream</span>
                  
                  <div className="p-4 rounded-xl bg-eg-paper border border-eg-line flex justify-between items-center text-xs">
                    <div className="flex items-center gap-3.5">
                      <CheckCircle2 className="w-5 h-5 text-[#16644A] shrink-0" />
                      <div>
                        <span className="font-bold text-eg-ink text-sm block">Aspirin 81mg - 8:00 AM</span>
                        <span className="text-xs text-eg-muted">Taken on time with breakfast</span>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-md bg-[#145C43] text-white font-bold text-[10px]">TAKEN</span>
                  </div>

                  <div className="p-4 rounded-xl bg-[#FAF6ED] border border-[#F5E6CA] flex justify-between items-center text-xs">
                    <div className="flex items-center gap-3.5">
                      <Clock className="w-5 h-5 text-[#D4A24C] shrink-0" />
                      <div>
                        <span className="font-bold text-eg-ink text-sm block">Metformin 500mg - 1:00 PM</span>
                        <span className="text-xs text-eg-muted">Pending lunch dose</span>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-md bg-[#D4A24C] text-eg-ink font-bold text-[10px]">PENDING</span>
                  </div>

                  <div className="p-4 rounded-xl bg-eg-paper border border-eg-line flex justify-between items-center text-xs">
                    <div className="flex items-center gap-3.5">
                      <Clock className="w-5 h-5 text-gray-400 shrink-0" />
                      <div>
                        <span className="font-bold text-eg-ink text-sm block">Atorvastatin 10mg - 8:00 PM</span>
                        <span className="text-xs text-eg-muted">Evening dose before bed</span>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-md bg-gray-200 text-eg-muted font-bold text-[10px]">SCHEDULED</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Right Column: Quick Actions & Next Scheduled Visit (5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
              
              {/* Quick Actions Panel (Concierge Dark Navy Card) */}
              <div className="bg-eg-teal-dark text-white rounded-2xl p-6 shadow-sm space-y-4 border border-[#D4A24C]/30 flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-base flex items-center gap-2">
                    <Crown className="w-5 h-5 text-[#D4A24C]" />
                    <span>Concierge Quick Actions</span>
                  </h4>
                  <span className="text-[10px] bg-[#D4A24C]/20 text-[#F2D58B] px-2.5 py-0.5 rounded font-extrabold uppercase tracking-wider">VIP</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs font-bold">
                  <button onClick={() => showToast(`Calling ${currentElder.name}...`)} className="p-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 transition flex items-center justify-center gap-2 min-h-[48px] cursor-pointer">
                    <PhoneCall className="w-4 h-4 text-[#D4A24C]" /> Call Elder
                  </button>
                  <button onClick={() => showToast('Voice note sent to elder app')} className="p-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 transition flex items-center justify-center gap-2 min-h-[48px] cursor-pointer">
                    <Send className="w-4 h-4 text-[#16644A]" /> Voice Note
                  </button>
                  <button onClick={() => showToast('Refill request dispatched to pharmacy desk')} className="p-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 transition flex items-center justify-center gap-2 min-h-[48px] cursor-pointer">
                    <Pill className="w-4 h-4 text-[#D4A24C]" /> Order Refill
                  </button>
                  <button onClick={() => setBookApptModalOpen(true)} className="p-3.5 rounded-xl bg-eg-teal hover:bg-eg-teal text-white shadow-md transition flex items-center justify-center gap-2 min-h-[48px] cursor-pointer">
                    <Calendar className="w-4 h-4 text-[#D4A24C]" /> Book Visit
                  </button>
                </div>
              </div>

              {/* Next Scheduled Visit Card */}
              <div className="bg-white border border-eg-line rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-xs font-bold text-eg-ink">Next Scheduled Visit</span>
                  <span className="text-xs text-eg-teal font-extrabold">Thu, Aug 15 · 10:30 AM</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=120"
                      alt="Dr Meena"
                      className="w-12 h-12 rounded-xl object-cover border border-eg-line shrink-0"
                    />
                    <div>
                      <h5 className="font-bold text-sm text-eg-ink">Assigned doctor</h5>
                      <p className="text-xs text-eg-muted">Video Consultation</p>
                    </div>
                  </div>

                  <button onClick={() => showToast('Joining video call room...')} className="px-4 py-2 rounded-xl bg-eg-teal text-white font-bold text-xs shadow-sm hover:bg-eg-teal transition cursor-pointer shrink-0">
                    Join Call
                  </button>
                </div>
              </div>

            </div>

          </div>

          {/* Activity & Wellness Log Strip */}
          <div className="bg-white border border-eg-line rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-eg-teal/10 text-eg-teal"><Activity className="w-4 h-4" /></span>
              <span>Steps: <strong>3,420 steps</strong> (Active day)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-[#FAF0FF] text-[#9B59B6]"><Clock className="w-4 h-4" /></span>
              <span>Sleep: <strong>{currentElder.sleep} hrs</strong> (Restful)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-[#1F8A5F]/10 text-[#16644A]"><Droplets className="w-4 h-4" /></span>
              <span>Water: <strong>1.8 Liters</strong> (Target Met)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-[#D4A24C]/15 text-[#D4A24C]"><Smile className="w-4 h-4" /></span>
              <span>Mood Log: <strong>"Feeling cheerful & peaceful today"</strong></span>
            </div>
          </div>

        </div>
      )}


      {/* ══════════════════════════════════════════════════════════════
          PAGE 2: VITALS & HEALTH TRENDS
      ══════════════════════════════════════════════════════════════ */}
      {effectiveTab === 'vitals' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Header & Export Button */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="font-bold text-2xl text-eg-ink">Vitals & Health Trends</h2>
              <p className="text-xs text-eg-muted">Historical analytics and anomaly timeline for {currentElder.name}</p>
            </div>

            <button
              onClick={() => showToast('Exporting PDF Health Report for Doctor...')}
              className="px-5 py-2.5 rounded-xl bg-eg-teal hover:bg-eg-teal text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#D4A24C]" />
              <span>Export PDF Report</span>
            </button>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-eg-line">
            <div className="flex gap-1.5 overflow-x-auto">
              {[
                { id: 'bp', label: 'Blood Pressure' },
                { id: 'glucose', label: 'Blood Sugar' },
                { id: 'hr', label: 'Heart Rate' },
                { id: 'spo2', label: 'Oxygen SpO2' },
                { id: 'weight', label: 'Weight' },
                { id: 'sleep', label: 'Sleep' },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedVitalMetric(m.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    selectedVitalMetric === m.id
                      ? 'bg-eg-teal text-white shadow-sm'
                      : 'text-eg-muted hover:text-eg-ink'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Range Selector 7D / 30D / 90D */}
            <div className="flex bg-eg-paper p-1 rounded-xl border border-eg-line text-xs font-bold">
              {['7D', '30D', '90D'].map(r => (
                <button
                  key={r}
                  onClick={() => setVitalTimeRange(r)}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    vitalTimeRange === r ? 'bg-white text-eg-teal shadow-sm' : 'text-eg-muted'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Large Trend Chart */}
          <div className="bg-white border border-eg-line rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h4 className="font-bold text-base text-eg-ink capitalize">
                  {selectedVitalMetric} Trend ({vitalTimeRange})
                </h4>
                <span className="text-xs text-[#16644A] font-bold">Target Range: 110-130 / 70-85 mmHg (Doctor-set Bounds)</span>
              </div>
              <span className="px-3.5 py-1 rounded-full bg-[#1F8A5F]/15 text-[#16644A] font-bold text-xs">
                99% In Range
              </span>
            </div>

            {/* SVG Area Chart Wave Graphic */}
            <div className="bg-white h-64 w-full to-transparent rounded-xl border border-eg-line p-4 flex flex-col justify-between relative overflow-hidden">
              <div className="flex justify-between text-[11px] text-eg-muted font-bold">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
              
              <svg className="w-full h-40" viewBox="0 0 500 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="royalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3B4C9E" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#3B4C9E" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M 0 60 Q 75 40, 150 50 T 300 45 T 450 35 T 500 40 L 500 100 L 0 100 Z" fill="url(#royalGrad)" />
                <path d="M 0 60 Q 75 40, 150 50 T 300 45 T 450 35 T 500 40" fill="none" stroke="#3B4C9E" strokeWidth="3" />
              </svg>

              <div className="flex justify-between text-xs text-eg-muted font-semibold pt-2">
                <span>Min: 118/78</span>
                <span>Avg: 124/80</span>
                <span>Max: 128/82</span>
              </div>
            </div>
          </div>

          {/* Anomaly Timeline */}
          <div className="bg-white border border-eg-line rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="font-bold text-sm text-eg-ink">Anomaly Flags Timeline</h4>
            <div className="p-3.5 rounded-xl bg-[#FAF6ED] border border-[#F5E6CA] text-xs flex justify-between items-center">
              <span className="font-bold text-eg-ink">Saturday 4:30 PM: Slight BP Elevation (132/86 mmHg)</span>
              <span className="text-[#8A6212] font-bold">Resolved after rest</span>
            </div>
          </div>

        </div>
      )}


      {/* ══════════════════════════════════════════════════════════════
          PAGE 3: MEDICATION MANAGEMENT
      ══════════════════════════════════════════════════════════════ */}
      {effectiveTab === 'medications' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="font-bold text-2xl text-eg-ink">Medication Management</h2>
              <p className="text-xs text-eg-muted">Adherence tracking, refill alerts and dose schedules for {currentElder.name}</p>
            </div>

            <button
              onClick={() => setAddMedModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-eg-teal hover:bg-eg-teal text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#D4A24C]" />
              <span>Add New Medicine</span>
            </button>
          </div>

          {/* Refill Alert Box */}
          <div className="p-4 rounded-2xl bg-[#FAF6ED] border border-[#F5E6CA] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#D4A24C] text-eg-ink font-bold">
                <Pill className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-eg-ink">Low Stock Warning: Aspirin 81mg</h4>
                <p className="text-xs text-eg-muted">Only 4 pills left in stock. Reorder now for continuous therapy.</p>
              </div>
            </div>
            <button onClick={() => showToast('Refill request sent to the connected pharmacy.')} className="px-4 py-2 rounded-xl bg-eg-teal text-white font-bold text-xs hover:bg-eg-teal transition cursor-pointer shrink-0">
              Order Refill Now
            </button>
          </div>

          {/* Medicine List Table */}
          <div className="bg-white border border-eg-line rounded-2xl p-6 shadow-sm space-y-4">
            <h4 className="font-bold text-base text-eg-ink">Active Prescriptions Roster</h4>
            
            <div className="divide-y divide-eg-line">
              {medicinesList.length === 0 ? (
                <div className="py-8 text-center text-xs text-eg-muted">
                  No active prescriptions registered for {currentElder?.name || 'this elder'}. Click "+ Add New Medicine" above to add one.
                </div>
              ) : (
                medicinesList.map((m, i) => {
                  const timesStr = Array.isArray(m.times_of_day) ? m.times_of_day.join(', ') : (m.timing || '08:00');
                  const dosageStr = m.dosage || m.dose || '';
                  return (
                    <div key={m.id || i} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                      <div>
                        <h5 className="font-bold text-sm text-eg-ink">{m.name} ({dosageStr})</h5>
                        <span className="text-eg-muted font-medium">Scheduled: {timesStr} · Stock: {m.stock || 'In Stock'}</span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <span className="px-3 py-1 rounded-full bg-[#1F8A5F]/15 text-[#16644A] font-bold">
                          {m.adherence || '100%'} Adherence
                        </span>
                        <button onClick={() => handleSendMedicineReminder(m)} className="px-3.5 py-2 rounded-xl bg-eg-paper border border-eg-line text-eg-teal font-bold hover:bg-eg-teal hover:text-white transition cursor-pointer">
                          Push Alert Now
                        </button>
                        <button
                          onClick={() => handleDeleteMedicine(m)}
                          className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-700 text-red-700 hover:text-white border border-red-200 transition cursor-pointer flex items-center gap-1 font-bold shadow-sm"
                          title={`Delete ${m.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}


      {/* ══════════════════════════════════════════════════════════════
          PAGE 4: APPOINTMENTS
      ══════════════════════════════════════════════════════════════ */}
      {effectiveTab === 'appointments' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="font-bold text-2xl text-eg-ink">Doctor Appointments</h2>
              <p className="text-xs text-eg-muted">Schedule and join virtual consultations for {currentElder.name}</p>
            </div>

            <button
              onClick={() => setBookApptModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-eg-teal hover:bg-eg-teal text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-[#D4A24C]" />
              <span>Book New Appointment</span>
            </button>
          </div>

          <div className="bg-white border border-eg-line rounded-2xl p-6 shadow-sm space-y-4">
            <h4 className="font-bold text-base text-eg-ink">Upcoming Consultations</h4>
            
            <div className="p-4 rounded-xl bg-eg-paper border border-eg-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=120" alt="Dr Meena" className="w-12 h-12 rounded-xl object-cover" />
                <div>
                  <h5 className="font-bold text-sm text-eg-ink">Assigned doctor</h5>
                  <p className="text-xs text-eg-muted">Thu, Aug 15 · 10:30 AM · Video Call</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => showToast('Joining video call...')} className="px-4 py-2 rounded-xl bg-eg-teal text-white font-bold text-xs cursor-pointer">
                  Join Call
                </button>
                <button onClick={() => showToast('Reschedule modal opened')} className="px-4 py-2 rounded-xl border border-eg-line text-eg-muted font-bold text-xs cursor-pointer">
                  Reschedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ══════════════════════════════════════════════════════════════
          PAGE 5: ALERTS & SOS HISTORY
      ══════════════════════════════════════════════════════════════ */}
      {effectiveTab === 'alerts' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-bold text-2xl text-eg-ink">Alerts & SOS History</h2>
              <p className="text-xs text-eg-muted">Audit log of urgent triggers and biosensor warnings</p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 bg-white p-2 rounded-2xl border border-eg-line text-xs font-bold">
            {['All', 'SOS', 'Vitals', 'Medication'].map(f => (
              <button
                key={f}
                onClick={() => setAlertFilter(f)}
                className={`px-4 py-2 rounded-xl transition cursor-pointer ${
                  alertFilter === f ? 'bg-eg-teal text-white' : 'text-eg-muted'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {/* Live SOS Events */}
            {sosEvents.map((sos) => {
              const statusStr = String(sos.status || 'active').toLowerCase();
              const isResolved = statusStr === 'resolved';
              const isAcknowledged = statusStr === 'acknowledged';
              const isPending = !isResolved && !isAcknowledged;
              const formattedDate = sos.triggered_at ? new Date(sos.triggered_at).toLocaleString() : 'Just now';

              return (
                <div key={sos.id} className="p-4 rounded-2xl bg-white border-l-4 border-l-[#C1443A] border-eg-line shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 text-[#A63228] animate-pulse shrink-0" />
                    <div>
                      <span className="font-bold text-eg-ink block text-sm">
                        EMERGENCY SOS TRIGGERED ({currentElder.name})
                      </span>
                      <span className="text-eg-muted">
                        {formattedDate} · Notified Caretaker & Hospital Dispatch
                      </span>
                      {sos.location_lat && (
                        <span className="block font-mono text-[11px] text-eg-teal mt-0.5">
                          GPS: {sos.location_lat}, {sos.location_lng}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {isPending && (
                      <>
                        <button
                          onClick={() => handleAcknowledgeSos(sos.id)}
                          className="px-3 py-1.5 rounded-xl bg-[#D4A24C] hover:bg-[#D4A24C]/90 text-white font-bold text-xs cursor-pointer shadow-sm"
                        >
                          Acknowledge
                        </button>
                        <button
                          onClick={() => handleResolveSos(sos.id)}
                          className="px-3 py-1.5 rounded-xl bg-[#1F8A5F] hover:bg-[#1F8A5F]/90 text-white font-bold text-xs cursor-pointer shadow-sm"
                        >
                          Resolve SOS
                        </button>
                      </>
                    )}
                    {isAcknowledged && (
                      <>
                        <span className="px-3 py-1 rounded-full bg-[#D4A24C]/20 text-[#7A5410] font-bold">
                          Acknowledged
                        </span>
                        <button
                          onClick={() => handleResolveSos(sos.id)}
                          className="px-3 py-1.5 rounded-xl bg-[#1F8A5F] hover:bg-[#1F8A5F]/90 text-white font-bold text-xs cursor-pointer shadow-sm"
                        >
                          Resolve SOS
                        </button>
                      </>
                    )}
                    {isResolved && (
                      <span className="px-3 py-1 rounded-full bg-[#1F8A5F]/15 text-[#16644A] font-bold">
                        Resolved
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Notifications List */}
            {notificationsList.map((notif) => (
              <div key={notif.id} className="p-4 rounded-2xl bg-white border-l-4 border-l-[#3B4C9E] border-eg-line shadow-sm flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-eg-teal" />
                  <div>
                    <span className="font-bold text-eg-ink block">{notif.type?.replace('_', ' ').toUpperCase() || 'NOTIFICATION'}</span>
                    <span className="text-eg-muted">{new Date(notif.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-eg-teal/15 text-eg-teal font-bold">Active</span>
              </div>
            ))}

            {/* Fallback Log if no events yet */}
            {sosEvents.length === 0 && (
              <div className="p-4 rounded-2xl bg-white border-l-4 border-l-[#C1443A] border-eg-line shadow-sm flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-[#A63228]" />
                  <div>
                    <span className="font-bold text-eg-ink block">SOS Emergency Triggered</span>
                    <span className="text-eg-muted">Notified caregiver & Hospital Dispatch</span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#C1443A]/15 text-[#A63228] font-bold">Resolved</span>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-white border-l-4 border-l-[#D4A24C] border-eg-line shadow-sm flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-[#D4A24C]" />
                <div>
                  <span className="font-bold text-eg-ink block">Missed Medication Alert</span>
                  <span className="text-eg-muted">Aug 5, 1:30 PM · Metformin 500mg</span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#D4A24C]/15 text-[#7A5410] font-bold">Logged</span>
            </div>
          </div>

        </div>
      )}


      {/* ══════════════════════════════════════════════════════════════
          PAGE 6: CARE TEAM & MESSAGES
      ══════════════════════════════════════════════════════════════ */}
      {effectiveTab === 'careteam' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          
          {/* Contacts (4 cols) */}
          <div className="lg:col-span-4 bg-white border border-eg-line rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-lg text-eg-ink">Care Team Contacts</h3>
            
            <div className="space-y-2 text-xs font-semibold">
              <div className="p-3 rounded-xl bg-eg-paper border border-eg-line flex items-center gap-3 cursor-pointer">
                <img src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=120" alt="Dr Meena" className="w-9 h-9 rounded-full object-cover" />
                <div>
                  <span className="font-bold text-eg-ink block">Assigned doctor</span>
                  <span className="text-[#16644A] text-[10px] font-bold">● Online</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-eg-line flex items-center gap-3 cursor-pointer">
                <Pill className="w-6 h-6 text-eg-teal" />
                <div>
                  <span className="font-bold text-eg-ink block">Connected pharmacy</span>
                  <span className="text-eg-muted text-[10px]">Refill Desk</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Thread (8 cols) */}
          <div className="lg:col-span-8 bg-white border border-eg-line rounded-2xl p-6 shadow-sm flex flex-col justify-between h-[500px]">
            <div className="border-b pb-3 flex justify-between items-center">
              <h4 className="font-bold text-base text-eg-ink">Direct Channel: Assigned doctor</h4>
              <span className="text-xs text-[#16644A] font-bold">● Active Now</span>
            </div>

            <div className="flex-1 overflow-y-auto my-4 space-y-3 p-2 bg-eg-paper rounded-xl">
              {chatMessages.map((m) => (
                <div key={m.id} className={`p-3.5 rounded-2xl text-xs max-w-[80%] ${m.isDoctor ? 'bg-white border border-eg-line text-eg-ink' : 'bg-eg-teal text-white ml-auto'}`}>
                  <span className="font-bold block text-[10px] opacity-80 mb-0.5">{m.sender}</span>
                  <p>{m.text}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChatMessage} className="flex gap-2">
              <input
                type="text"
                placeholder="Write a message to Assigned doctor..."
                value={chatMessageText}
                onChange={(e) => setChatMessageText(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border border-eg-line text-xs outline-none focus:border-eg-teal"
              />
              <button type="submit" className="px-5 py-3 rounded-xl bg-eg-teal text-white font-bold text-xs cursor-pointer">
                Send
              </button>
            </form>
          </div>

        </div>
      )}


      {/* ══════════════════════════════════════════════════════════════
          PAGE 7: MANAGE ELDERS
      ══════════════════════════════════════════════════════════════ */}
      {effectiveTab === 'elders' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-bold text-2xl text-eg-ink">Manage Elders</h2>
              <p className="text-xs text-eg-muted">Linked profiles and sharing permissions</p>
            </div>

            <button onClick={() => setShowConnectForm((visible) => !visible)} className="px-5 py-2.5 rounded-xl bg-eg-teal text-white font-bold text-xs flex items-center gap-2 cursor-pointer">
              <Plus className="w-4 h-4 text-[#D4A24C]" /> Link New Elder
            </button>
          </div>

          {showConnectForm && (
            <form onSubmit={handleConnectElder} className="rounded-2xl border border-[#D4A24C]/40 bg-[#FAF6ED] p-5 flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <label className="flex-1 w-full">
                <span className="block text-xs font-bold text-eg-muted mb-2">Enter the Elder ID shared from their Settings page</span>
                <input
                  value={elderIdInput}
                  onChange={(event) => setElderIdInput(event.target.value.toUpperCase())}
                  placeholder="EG-7A3C91F2"
                  maxLength={11}
                  className="w-full rounded-xl border border-eg-line bg-white px-4 py-3 text-sm font-bold tracking-wider outline-none focus:border-eg-teal"
                />
              </label>
              <button disabled={connectingElder} type="submit" className="px-5 py-3 rounded-xl bg-[#1F8A5F] disabled:opacity-60 text-white font-bold text-xs whitespace-nowrap cursor-pointer">
                {connectingElder ? 'Connecting...' : 'Connect Elder'}
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {elders.length === 0 && (
              <div className="md:col-span-2 rounded-2xl border border-dashed border-[#D4A24C]/60 bg-white p-8 text-center text-sm text-eg-muted">
                No elders are connected yet. Enter an Elder ID to start sharing care.
              </div>
            )}
            {elders.map((el) => (
              <div key={el.id} className="bg-white border border-eg-line rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-4">
                  <img src={el.avatar} alt={el.name} className="w-14 h-14 rounded-full object-cover border-2 border-[#D4A24C]" />
                  <div>
                    <h3 className="font-bold text-lg text-eg-ink">{el.name}</h3>
                    <span className="text-xs text-eg-muted">{el.relationship} · {el.age} years old</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => { setSelectedElderId(el.id); setCurrentTab('overview'); }} className="flex-1 py-2.5 rounded-xl bg-eg-teal text-white font-bold text-xs cursor-pointer">
                    View Dashboard
                  </button>
                  <button onClick={() => showToast('Permissions edited')} className="px-4 py-2.5 rounded-xl border border-eg-line text-eg-muted font-bold text-xs cursor-pointer">
                    Permissions
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* ══════════════════════════════════════════════════════════════
          PAGE 8: SETTINGS
      ══════════════════════════════════════════════════════════════ */}
      {effectiveTab === 'settings' && (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
          
          <div>
            <h2 className="font-bold text-2xl text-eg-ink">Concierge Caregiver Settings</h2>
            <p className="text-xs text-eg-muted">Preferences, notification delivery and account security</p>
          </div>

          {/* 1. My Profile Card */}
          <div className="bg-white border border-eg-line rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-eg-line border-2 border-[#D4A24C] flex items-center justify-center overflow-hidden shrink-0">
                  {profileData.profile_pic_url ? (
                    <img src={profileData.profile_pic_url} alt={profileData.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-[#D4A24C]">{(profileData.name || currentUser?.name || 'C').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-xl text-eg-ink">{profileData.name || currentUser?.name || 'Caregiver'}</h3>
                  <p className="text-xs text-eg-muted">
                    {profileData.email || currentUser?.email || '--'} · {profileData.phone || currentUser?.phone || currentUser?.phone_no || '--'}
                  </p>
                  <p className="text-xs text-[#8A6212] font-semibold mt-0.5">Relationship: {profileData.relationship || 'Child'}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditingProfile(true)} 
                className="px-4 py-2 rounded-xl bg-eg-teal hover:bg-[#2e3d82] text-white font-bold text-xs cursor-pointer transition shadow-xs"
              >
                Edit Profile
              </button>
            </div>
          </div>

          {/* Edit Caregiver Profile Modal */}
          {isEditingProfile && (
            <div className="fixed inset-0 z-[100] bg-black/60  flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-sm space-y-5 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="font-bold text-lg text-eg-ink">Edit Caregiver Profile</h3>
                    <p className="text-xs text-eg-muted">Update your personal information and contact details</p>
                  </div>
                  <button 
                    onClick={() => setIsEditingProfile(false)}
                    aria-label="Close" className="p-1.5 rounded-lg hover:bg-black/5 text-eg-muted transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-semibold">
                  <div>
                    <label className="block text-eg-ink mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="w-full rounded-xl border border-eg-line px-3.5 py-2.5 text-sm text-eg-ink focus:outline-none focus:ring-2 focus:ring-eg-teal/30 focus:border-eg-teal"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-eg-ink mb-1">Phone Number</label>
                    <input 
                      type="tel" 
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="w-full rounded-xl border border-eg-line px-3.5 py-2.5 text-sm text-eg-ink focus:outline-none focus:ring-2 focus:ring-eg-teal/30 focus:border-eg-teal"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-eg-ink mb-1">Email Address</label>
                    <input 
                      type="email" 
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="w-full rounded-xl border border-eg-line px-3.5 py-2.5 text-sm text-eg-ink focus:outline-none focus:ring-2 focus:ring-eg-teal/30 focus:border-eg-teal"
                    />
                  </div>

                  <div>
                    <label className="block text-eg-ink mb-1">Relationship to Elder</label>
                    <select
                      value={profileData.relationship}
                      onChange={(e) => setProfileData({ ...profileData, relationship: e.target.value })}
                      className="w-full rounded-xl border border-eg-line px-3.5 py-2.5 text-sm text-eg-ink focus:outline-none focus:ring-2 focus:ring-eg-teal/30 focus:border-eg-teal bg-white"
                    >
                      <option value="Spouse">Spouse</option>
                      <option value="Child">Child (Son / Daughter)</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Professional Caregiver">Professional Nurse / Caregiver</option>
                      <option value="Other">Other Family Member</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-eg-ink mb-1">Profile Photo URL (Optional)</label>
                    <input 
                      type="url" 
                      value={profileData.profile_pic_url}
                      onChange={(e) => setProfileData({ ...profileData, profile_pic_url: e.target.value })}
                      placeholder="https://example.com/avatar.jpg"
                      className="w-full rounded-xl border border-eg-line px-3.5 py-2.5 text-sm text-eg-ink focus:outline-none focus:ring-2 focus:ring-eg-teal/30 focus:border-eg-teal"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-4 py-2.5 rounded-xl border border-eg-line text-eg-muted font-bold text-xs hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-5 py-2.5 rounded-xl bg-eg-teal hover:bg-[#2e3d82] text-white font-bold text-xs transition shadow-md flex items-center gap-2"
                    >
                      {savingProfile ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>Save Changes</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 2. Notification Preferences */}
          <div className="bg-white border border-eg-line rounded-2xl p-6 shadow-sm space-y-4">
            <h4 className="font-bold text-base text-eg-ink">Notification Preferences</h4>
            
            <div className="space-y-3 text-xs font-semibold">
              
              {/* SOS Alert Locked ON */}
              <div className="p-3.5 rounded-xl bg-[#FAF6ED] border border-[#F5E6CA] flex items-center justify-between opacity-80">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#A63228]" />
                  <span>SOS & Emergency Alerts (Mandatory Safety Control)</span>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-[#145C43] text-white font-bold">LOCKED ON</span>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-eg-line flex items-center justify-between">
                <span>Abnormal Vital Warnings</span>
                <span className="text-[#16644A]">Push & SMS Active</span>
              </div>
            </div>
          </div>

          {/* 3. Privacy & Account */}
          <div className="bg-white border border-eg-line rounded-2xl p-6 shadow-sm flex items-center justify-between text-xs">
            <div className="flex gap-3">
              <button onClick={() => showToast('Password reset link sent')} className="px-4 py-2 rounded-xl border border-eg-line text-eg-muted font-bold cursor-pointer">
                Change Password
              </button>
              <button onClick={onLogout} className="px-4 py-2 rounded-xl border border-[#C1443A]/30 text-[#A63228] font-bold hover:bg-[#C1443A]/10 transition cursor-pointer">
                Sign Out
              </button>
            </div>

            <button onClick={() => showToast('Account deletion requested')} className="text-[#A63228]/80 hover:underline font-semibold cursor-pointer">
              Delete Account
            </button>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          ADD NEW MEDICINE MODAL
      ══════════════════════════════════════════════════════════════ */}
      {addMedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60  animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-sm border border-eg-line space-y-6 relative overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-eg-line pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-eg-teal/10 text-eg-teal">
                  <Pill className="w-6 h-6 text-[#D4A24C]" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-eg-ink">Add New Medicine</h3>
                  <p className="text-xs text-eg-muted">
                    Schedule prescription for <span className="font-semibold text-eg-teal">{currentElder.name}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setAddMedModalOpen(false)}
                className="p-2 rounded-xl text-eg-muted hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddMedicineSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-eg-ink mb-1.5">Medicine Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Metformin, Amlodipine"
                  value={newMedForm.name}
                  onChange={(e) => setNewMedForm({ ...newMedForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-eg-line bg-eg-paper text-sm focus:outline-none focus:border-eg-teal transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-eg-ink mb-1.5">Dosage *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 500mg, 1 pill"
                    value={newMedForm.dosage}
                    onChange={(e) => setNewMedForm({ ...newMedForm, dosage: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-eg-line bg-eg-paper text-sm focus:outline-none focus:border-eg-teal transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-eg-ink mb-1.5">Schedule Time *</label>
                  <select
                    value={newMedForm.timeSlot}
                    onChange={(e) => setNewMedForm({ ...newMedForm, timeSlot: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-eg-line bg-eg-paper text-sm focus:outline-none focus:border-eg-teal transition"
                  >
                    <option value="08:00">Morning (8:00 AM)</option>
                    <option value="13:00">Afternoon (1:00 PM)</option>
                    <option value="18:00">Evening (6:00 PM)</option>
                    <option value="21:00">Night (9:00 PM)</option>
                    <option value="custom">Custom Time</option>
                  </select>
                </div>
              </div>

              {newMedForm.timeSlot === 'custom' && (
                <div>
                  <label className="block text-xs font-bold text-eg-ink mb-1.5">Select Time (24h)</label>
                  <input
                    type="time"
                    required
                    value={newMedForm.customTime}
                    onChange={(e) => setNewMedForm({ ...newMedForm, customTime: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-eg-line bg-eg-paper text-sm focus:outline-none focus:border-eg-teal transition"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-eg-ink mb-1.5">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={newMedForm.startDate}
                    onChange={(e) => setNewMedForm({ ...newMedForm, startDate: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-eg-line bg-eg-paper text-sm focus:outline-none focus:border-eg-teal transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-eg-ink mb-1.5">End Date (Optional)</label>
                  <input
                    type="date"
                    value={newMedForm.endDate}
                    onChange={(e) => setNewMedForm({ ...newMedForm, endDate: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-eg-line bg-eg-paper text-sm focus:outline-none focus:border-eg-teal transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-eg-ink mb-1.5">Instructions / Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Take with food"
                  value={newMedForm.notes}
                  onChange={(e) => setNewMedForm({ ...newMedForm, notes: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-eg-line bg-eg-paper text-sm focus:outline-none focus:border-eg-teal transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-eg-line">
                <button
                  type="button"
                  onClick={() => setAddMedModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-eg-line text-eg-muted font-bold text-xs hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMedLoading}
                  className="px-6 py-2.5 rounded-xl bg-eg-teal hover:bg-eg-teal text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 text-[#D4A24C]" />
                  <span>{addingMedLoading ? 'Scheduling...' : 'Save & Schedule'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          BOOK APPOINTMENT MODAL
      ══════════════════════════════════════════════════════════════ */}
      {bookApptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60  animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-sm border border-eg-line space-y-6 relative overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-eg-line pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-eg-teal/10 text-eg-teal">
                  <Calendar className="w-6 h-6 text-[#D4A24C]" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-eg-ink">Book Appointment</h3>
                  <p className="text-xs text-eg-muted">
                    Schedule doctor visit for <span className="font-semibold text-eg-teal">{currentElder.name}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setBookApptModalOpen(false)}
                className="p-2 rounded-xl text-eg-muted hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleBookApptSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-eg-ink mb-1.5">Select Doctor</label>
                <select
                  value={newApptForm.doctorId || newApptForm.doctorName}
                  onChange={(e) => {
                    const doc = registeredDoctors.find(d => d.user_id === e.target.value);
                    setNewApptForm({
                      ...newApptForm,
                      doctorId: e.target.value,
                      doctorName: doc ? doc.name : e.target.value
                    });
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-eg-line bg-eg-paper text-sm focus:outline-none focus:border-eg-teal transition"
                >
                  {registeredDoctors.length > 0 ? (
                    registeredDoctors.map(d => (
                      <option key={d.user_id} value={d.user_id}>
                        {d.name} - {d.specialization || 'Specialist'}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="">No registered doctors available</option>
                      
                      
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-eg-ink mb-1.5">Date *</label>
                  <input
                    type="date"
                    required
                    value={newApptForm.appointmentDate}
                    onChange={(e) => setNewApptForm({ ...newApptForm, appointmentDate: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-eg-line bg-eg-paper text-sm focus:outline-none focus:border-eg-teal transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-eg-ink mb-1.5">Time *</label>
                  <input
                    type="time"
                    required
                    value={newApptForm.appointmentTime}
                    onChange={(e) => setNewApptForm({ ...newApptForm, appointmentTime: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-eg-line bg-eg-paper text-sm focus:outline-none focus:border-eg-teal transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-eg-ink mb-1.5">Consultation Type</label>
                <select
                  value={newApptForm.type}
                  onChange={(e) => setNewApptForm({ ...newApptForm, type: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-eg-line bg-eg-paper text-sm focus:outline-none focus:border-eg-teal transition"
                >
                  <option value="Video Call">Video Call</option>
                  <option value="In-Clinic Visit">In-Clinic Visit</option>
                  <option value="Home Visit">Home Visit</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-eg-ink mb-1.5">Reason for Visit / Symptoms</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly follow-up, BP checkup"
                  value={newApptForm.notes}
                  onChange={(e) => setNewApptForm({ ...newApptForm, notes: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-eg-line bg-eg-paper text-sm focus:outline-none focus:border-eg-teal transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-eg-line">
                <button
                  type="button"
                  onClick={() => setBookApptModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-eg-line text-eg-muted font-bold text-xs hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingApptLoading}
                  className="px-6 py-2.5 rounded-xl bg-eg-teal hover:bg-eg-teal text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Calendar className="w-4 h-4 text-[#D4A24C]" />
                  <span>{bookingApptLoading ? 'Booking...' : 'Confirm Appointment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CRITICAL EMERGENCY SOS POPUP BOX MODAL */}
      {activeSosModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80  p-4 animate-in fade-in duration-300">
          <div className="relative bg-white border-4 border-[#C1443A] rounded-2xl shadow-sm overflow-hidden max-w-lg w-full transform transition-all scale-100 animate-in zoom-in-95">
            
            {/* Flashing Siren Top Bar */}
            <div className="bg-gradient-to-r p-4 text-white flex items-center justify-between shadow-md from-[#C1443A] via-[#E53935] to-[#B71C1C]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/20 text-white animate-ping shrink-0">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-black text-lg tracking-wide uppercase flex items-center gap-2">
                    <span>EMERGENCY SOS DISPATCHED</span>
                  </h3>
                  <p className="text-xs text-white/90 font-medium">Dual Dispatch Active: Caretaker + Hospital Alerted</p>
                </div>
              </div>
              <button
                onClick={() => setActiveSosModalData(null)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
                title="Minimize Popup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Info */}
            <div className="p-6 space-y-4 text-eg-ink">
              <div className="p-4 rounded-2xl bg-[#FFF5F5] border border-[#C1443A]/30 flex items-center justify-between">
                <div>
                  <span className="text-xs text-eg-muted font-bold block uppercase tracking-wider">Elder Patient</span>
                  <span className="text-xl font-black text-[#A63228]">
                    {activeSosModalData.elder_name || currentElder?.name || 'Elder Patient'}
                  </span>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#C1443A] text-white text-xs font-black uppercase animate-pulse">
                  CRITICAL ALERT
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-eg-paper border border-eg-line">
                  <span className="text-eg-muted font-bold block mb-0.5">Triggered At</span>
                  <span className="font-bold text-eg-ink">
                    {activeSosModalData.triggered_at ? new Date(activeSosModalData.triggered_at).toLocaleTimeString() : 'Just now'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-eg-paper border border-eg-line">
                  <span className="text-eg-muted font-bold block mb-0.5">GPS Location</span>
                  <span className="font-mono font-bold text-eg-teal">
                    {activeSosModalData.location_lat || '37.7749'}, {activeSosModalData.location_lng || '-122.4194'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F0FDF4] border border-[#1F8A5F]/30 text-xs text-[#16644A] flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Hospital Emergency Triage and Caregiver On-Call have received this panic alert.</span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  onClick={async () => {
                    await handleAcknowledgeSos(activeSosModalData.id);
                    setActiveSosModalData(null);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#D4A24C] hover:bg-[#D4A24C]/90 text-white font-black text-xs uppercase tracking-wider transition shadow-md cursor-pointer text-center"
                >
                  Acknowledge Alert
                </button>
                <button
                  onClick={async () => {
                    await handleResolveSos(activeSosModalData.id);
                    setActiveSosModalData(null);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#1F8A5F] hover:bg-[#1F8A5F]/90 text-white font-black text-xs uppercase tracking-wider transition shadow-md cursor-pointer text-center"
                >
                  Resolve SOS
                </button>
                <button
                  onClick={() => setActiveSosModalData(null)}
                  className="py-3 px-4 rounded-xl border border-eg-line text-eg-muted hover:bg-gray-100 font-bold text-xs transition cursor-pointer text-center"
                >
                  Minimize
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

