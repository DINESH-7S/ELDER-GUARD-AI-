// Web Audio API & Speech Synthesis SOS Sound Generator for ElderGuard
let audioCtx = null;
let sosAudioInterval = null;

/**
 * Plays an urgent medical emergency alarm tone using Web Audio API.
 * Rapid dual-pitch pulse (960 Hz / 770 Hz) mimicking emergency medical telemetry siren.
 */
export const playSosAlarmTone = () => {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Pulse 1: 960 Hz High Warning Beep
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(960, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Pulse 2: 770 Hz Low Warning Beep
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(770, now + 0.25);
    gain2.gain.setValueAtTime(0.3, now + 0.25);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.25);
    osc2.stop(now + 0.5);
  } catch (err) {
    console.warn('SOS Audio playback error:', err);
  }
};

/**
 * Speaks Emergency Voice Alert using Web Speech API
 */
export const speakSosVoiceAlert = (message = 'Emergency SOS Alert Activated. Contacting Hospital Dispatch and Caregiver.') => {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    utterance.volume = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('SOS Speech alert failed:', err);
  }
};

/**
 * Starts continuous emergency alarm loop (repeats tone every 600ms)
 */
export const startSosAlarmSound = (voiceMsg) => {
  stopSosAlarmSound();
  playSosAlarmTone();
  if (voiceMsg) {
    speakSosVoiceAlert(voiceMsg);
  }
  sosAudioInterval = setInterval(() => {
    playSosAlarmTone();
  }, 600);
};

/**
 * Stops all SOS sounds and speech synthesis immediately
 */
export const stopSosAlarmSound = () => {
  if (sosAudioInterval) {
    clearInterval(sosAudioInterval);
    sosAudioInterval = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};
