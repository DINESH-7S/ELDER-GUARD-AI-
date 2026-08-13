import React, { useEffect, useState, useRef } from 'react';
import { 
  Bot, 
  Send, 
  ShieldAlert, 
  Sparkles, 
  Heart, 
  Pill, 
  Activity, 
  Calendar, 
  Sun, 
  Coffee, 
  Smile, 
  RefreshCw, 
  Volume2, 
  VolumeX,
  FileText,
  Clock,
  UserCheck
} from 'lucide-react';
import aiCompanionService from '../../services/aiCompanionService';
import vitalsEngine from '../../utils/vitalsSimulation';
import api from '../../services/api';
import appointmentsService from '../../services/appointmentsService';

export default function ElderAIAssistantPage({ currentUser }) {
  const elderId = currentUser?.id || currentUser?.user_id;
  const chatEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hello ${currentUser?.name || 'there'}! 🌸 I am Mevi, your personal AI companion. I'm here to chat about your day, listen to how you're feeling, help with your health routines, or just keep you company. How are you feeling today?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Health context state
  const [vitals, setVitals] = useState(() => vitalsEngine.getVitals());
  const [medicines, setMedicines] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [healthContextStr, setHealthContextStr] = useState('');

  // Fetch elder's live health context to feed Mevi
  useEffect(() => {
    if (!elderId) return;

    // Load medicines
    api.get(`/medicines/elder/${elderId}`)
      .then(res => setMedicines(res.data || []))
      .catch(() => {});

    // Load appointments
    appointmentsService.getAppointments(elderId)
      .then(res => setAppointments(res || []))
      .catch(() => {});

    // Load history
    aiCompanionService.getChatHistory(elderId, 20)
      .then((history) => {
        const chronological = (history || []).slice().reverse().map((entry) => ({
          role: entry.role === 'user' ? 'user' : 'assistant',
          text: entry.content,
          time: new Date(entry.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        if (chronological.length > 0) setMessages(chronological);
      })
      .catch(() => {});

    // Vitals live listener
    const handleVitalsUpdate = (e) => {
      if (e.detail?.vitals) {
        setVitals({ ...e.detail.vitals });
      }
    };
    window.addEventListener('elderguard:vitals-update', handleVitalsUpdate);
    return () => window.removeEventListener('elderguard:vitals-update', handleVitalsUpdate);
  }, [elderId]);

  // Build context string whenever vitals, medicines, or appointments update
  useEffect(() => {
    const formattedVitals = {
      blood_pressure: `${vitals.systolic_bp || 120}/${vitals.diastolic_bp || 80}`,
      heart_rate: vitals.heart_rate || vitals.hr || 72,
      spo2: vitals.spo2 || 98,
      blood_sugar: vitals.glucose || 104
    };

    const ctx = aiCompanionService.buildHealthContext({
      vitals: formattedVitals,
      medicines,
      appointments,
      elderName: currentUser?.name || 'Elder',
      elderAge: currentUser?.age || 72
    });
    setHealthContextStr(ctx);
  }, [vitals, medicines, appointments, currentUser]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (customMessage = null) => {
    const messageText = typeof customMessage === 'string' ? customMessage : input;
    const message = messageText.trim();
    if (!message || !elderId) return;

    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nextMessages = [...messages, { role: 'user', text: message, time: timeNow }];
    setMessages(nextMessages);
    if (!customMessage) setInput('');
    setLoading(true);

    try {
      const history = nextMessages.map((item) => ({
        role: item.role === 'user' ? 'user' : 'model',
        content: item.text,
      }));

      // Call Groq-powered AI Companion with health context injected
      const response = await aiCompanionService.chatWithAI(
        elderId, 
        message, 
        history, 
        'companion',
        healthContextStr
      );

      const replyText = response.reply || "I am right here with you! You are doing wonderful today.";
      setMessages((prev) => [...prev, { role: 'assistant', text: replyText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);

      // Speech synthesis if voice toggle enabled
      if (soundEnabled && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(replyText);
        utterance.rate = 0.9; // Slightly slower for elderly
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: 'I am having a brief connection issue right now, but I am right here with you! If you feel unwell, please press your Emergency SOS button or reach out to your caregiver.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    { label: 'How are my vitals today?', icon: Activity, text: 'Can you review my latest vitals and tell me how I am doing today?' },
    { label: 'Tell me a soothing story', icon: Coffee, text: 'Could you share a peaceful, heartwarming short story with me?' },
    { label: 'What medicines should I take?', icon: Pill, text: 'Can you remind me of my scheduled medicines for today?' },
    { label: 'Give me a daily warm tip', icon: Sun, text: 'What is a gentle wellness or hydration tip for me today?' }
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#FAF7F2] text-[#2E2E2E] font-inter p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-[#1B6B93] via-[#2A82B2] to-[#3B96C9] rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-10 -translate-y-10 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <Bot className="w-9 h-9 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-fraunces font-bold text-2xl md:text-3xl text-white">Meet Mevi</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/30 text-emerald-100 border border-emerald-300/40 text-xs font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-200" />
                  Groq AI Powered
                </span>
              </div>
              <p className="text-white/80 text-sm md:text-base mt-1">
                Your empathetic companion for friendly conversation, loneliness relief & health report insights.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-3 rounded-2xl border transition-all flex items-center gap-2 text-xs font-bold ${
                soundEnabled 
                  ? 'bg-white text-[#1B6B93] border-white shadow-md' 
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
              title="Toggle Read Aloud"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#1B6B93]" /> : <VolumeX className="w-4 h-4 text-white" />}
              <span>{soundEnabled ? 'Read Aloud On' : 'Read Aloud Off'}</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs text-amber-100 bg-black/20 border border-white/15 rounded-2xl px-3.5 py-2.5 backdrop-blur-sm">
              <ShieldAlert className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <span>Medical Safety Shield Active</span>
            </div>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Chat Window Column */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white border border-[#EBE3D5] rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col h-[640px]">
              
              {/* Chat Sub-Header */}
              <div className="px-6 py-4 bg-[#FFFDF9] border-b border-[#EBE3D5] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-bold text-[#525252] uppercase tracking-wider">Mevi is online & listening</span>
                </div>
                <span className="text-xs text-[#8C8C8C] flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-[#D6373F] fill-current" />
                  Warm Companionship Mode
                </span>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#FFFDF9]">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-3xl px-5 py-3.5 text-base leading-relaxed shadow-sm ${
                        message.role === 'user'
                          ? 'bg-[#1B6B93] text-white rounded-tr-none'
                          : 'bg-white border border-[#EBE3D5] text-[#2E2E2E] rounded-tl-none'
                      }`}
                    >
                      {message.text}
                    </div>
                    <span className="text-[11px] text-[#A0A0A0] mt-1 px-1">
                      {message.time}
                    </span>
                  </div>
                ))}

                {loading && (
                  <div className="flex flex-col items-start">
                    <div className="bg-white border border-[#EBE3D5] text-[#6B7280] rounded-3xl px-5 py-3.5 text-sm flex items-center gap-3 rounded-tl-none shadow-sm">
                      <Sparkles className="w-5 h-5 text-[#F5A623] animate-spin" />
                      <span className="font-medium text-[#1B6B93]">Mevi is carefully reflecting...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Form */}
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-4 bg-white border-t border-[#EBE3D5] flex gap-3">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Type a message to Mevi... (e.g. 'How are my vitals today?')"
                  className="flex-1 rounded-2xl border border-[#EBE3D5] bg-[#FAF7F2] px-5 py-3.5 text-base outline-none focus:border-[#1B6B93] focus:ring-2 focus:ring-[#1B6B93]/20 transition-all text-[#2E2E2E]"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="px-6 py-3.5 rounded-2xl bg-[#1B6B93] hover:bg-[#155373] disabled:opacity-50 text-white font-bold flex items-center gap-2 shadow-md transition-all"
                >
                  <Send className="w-5 h-5" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right Sidebar Column */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Quick Starter Prompts */}
            <div className="bg-white border border-[#EBE3D5] rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-fraunces font-bold text-lg text-[#2E2E2E] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#F5A623]" />
                <span>Quick Conversation Starters</span>
              </h3>
              <div className="space-y-2.5">
                {quickPrompts.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSend(item.text)}
                      disabled={loading}
                      className="w-full text-left p-3.5 rounded-2xl bg-[#FAF7F2] hover:bg-[#F3ECE0] border border-[#EBE3D5] text-[#2E2E2E] text-sm font-medium flex items-center justify-between group transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white text-[#1B6B93] border border-[#EBE3D5] shadow-xs group-hover:scale-105 transition-transform">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span>{item.label}</span>
                      </div>
                      <Send className="w-3.5 h-3.5 text-[#8C8C8C] group-hover:text-[#1B6B93] transition-colors" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Connected Health Context Card */}
            <div className="bg-gradient-to-br from-[#FFF9F2] to-[#FFF3E5] border border-[#F5DFCD] rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-fraunces font-bold text-lg text-[#2E2E2E] flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#1B6B93]" />
                  <span>Mevi's Live Knowledge</span>
                </h3>
                <span className="text-xs font-semibold text-[#1B6B93] bg-white px-2.5 py-1 rounded-full border border-[#F5DFCD]">
                  Connected
                </span>
              </div>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Mevi automatically reads your connected vitals, prescriptions, and medical reports to answer questions about your health routines accurately.
              </p>

              <div className="bg-white/80 border border-[#F5DFCD] rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-[#F5DFCD]">
                  <span className="text-[#6B7280]">Blood Pressure:</span>
                  <span className="font-bold text-[#2E2E2E]">{vitals.systolic_bp || 120}/{vitals.diastolic_bp || 80} mmHg</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-[#F5DFCD]">
                  <span className="text-[#6B7280]">Heart Rate:</span>
                  <span className="font-bold text-[#2E2E2E]">{vitals.heart_rate || vitals.hr || 72} bpm</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-[#F5DFCD]">
                  <span className="text-[#6B7280]">Blood Sugar:</span>
                  <span className="font-bold text-[#2E2E2E]">{vitals.glucose || 104} mg/dL</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280]">Active Prescriptions:</span>
                  <span className="font-bold text-[#1B6B93]">{medicines.length} medicines</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
