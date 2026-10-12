import React, { useState } from 'react';
import { Send, Paperclip, FileText, CheckCheck } from 'lucide-react';
import { displayDoctorName } from './doctorPortalData';

export default function DoctorMessagesPage({ currentUser, onNavigateTab }) {
  const [chatMessages, setChatMessages] = useState([]);
  const [inputText, setInputText] = useState('');

  const quickTemplates = [
    'Please log 3x daily BP for 3 days and report back.',
    'I have updated your care instructions. Please review the latest note.',
    'Please proceed to nearest ER if systolic exceeds 180 mmHg.'
  ];

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setChatMessages(prev => [...prev, { id: Date.now(), sender: `${displayDoctorName(currentUser)} (You)`, text: inputText, time: 'Just now', isDoc: true }]);
    setInputText('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 font-inter">
      
      {/* Roster (4 cols) */}
      <div className="lg:col-span-4 bg-white border border-eg-line rounded-lg p-4 space-y-3">
        <h4 className="font-bold text-sm text-eg-ink">Multidisciplinary Team Threads</h4>
        
        <div className="space-y-2">
          <div className="p-3 rounded bg-eg-paper border border-eg-teal flex items-center gap-3 cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-eg-tint text-eg-teal font-bold text-xs flex items-center justify-center">
              CG
            </div>
            <div>
              <span className="font-bold text-eg-ink text-xs block">Caregiver / Family Contact</span>
              <span className="text-[11px] text-eg-muted truncate block">No patient linked · Select to activate</span>
            </div>
          </div>

          <div className="p-3 rounded bg-white border border-eg-line flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-eg-tint text-eg-teal font-bold text-xs flex items-center justify-center">
              RX
            </div>
            <div>
              <span className="font-bold text-eg-ink text-xs block">Pharmacy Thread</span>
              <span className="text-[11px] text-eg-muted truncate block">No pharmacy messages yet</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Canvas (8 cols) */}
      <div className="lg:col-span-8 bg-white border border-eg-line rounded-lg p-5 flex flex-col justify-between h-[520px]">
        
        <div className="border-b border-eg-line pb-2 flex justify-between items-center">
          <div>
            <h5 className="font-bold text-sm text-eg-ink">Encrypted Channel: Caregiver / Care Team Communication</h5>
            <span className="text-[10px] text-eg-muted font-mono">HIPAA Encrypted Secure Channel</span>
          </div>
          <span className="text-xs text-[#1F7A50] font-bold">● Active Channel</span>
        </div>

        <div className="flex-1 overflow-y-auto my-3 p-3 bg-eg-paper rounded space-y-3">
          {chatMessages.length === 0 && (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-eg-muted">
              <p className="text-sm font-bold text-eg-ink">No messages yet</p>
              <p className="mt-1 max-w-[34ch] text-xs">Choose a thread on the left, or send guidance below. Quick replies are shown under this box.</p>
            </div>
          )}
          {chatMessages.map(m => (
            <div key={m.id} className={`p-3 rounded text-xs max-w-[80%] ${m.isDoc ? 'bg-eg-teal text-white ml-auto' : 'bg-white border border-eg-line text-eg-ink'}`}>
              <div className="flex justify-between items-center mb-1 gap-4 opacity-80 text-[10px]">
                <span className="font-bold">{m.sender}</span>
                <span className="font-mono">{m.time}</span>
              </div>
              <p className="leading-relaxed font-sans">{m.text}</p>
            </div>
          ))}
        </div>

        {/* Quick Clinical Reply Templates */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 text-[10px]">
          {quickTemplates.map((t, i) => (
            <button key={i} onClick={() => setInputText(t)} className="px-2.5 py-1 rounded bg-eg-tint text-eg-teal font-bold shrink-0 hover:bg-eg-teal hover:text-white transition">
              + "{t.slice(0, 30)}..."
            </button>
          ))}
        </div>

        <form onSubmit={handleSend} className="flex gap-2 pt-1 border-t border-eg-line">
          <input
            type="text"
            placeholder="Type clinical guidance or instructions..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 px-3.5 py-2.5 rounded border border-eg-line text-xs outline-none focus:border-eg-teal font-medium"
          />
          <button type="submit" className="px-4 py-2.5 rounded bg-eg-teal hover:bg-eg-teal-dark text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <Send className="w-3.5 h-3.5" /> Send Guidance
          </button>
        </form>
      </div>

    </div>
  );
}
