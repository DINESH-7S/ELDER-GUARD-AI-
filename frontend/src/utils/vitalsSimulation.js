import broadcastRealtimeEvent from './realtimeBus';

// Central Vitals Simulation & Realtime Synchronization Engine
// 1. BP and Heart Rate update every 5 seconds.
// 2. Blood Sugar changes every 15 mins.
// 3. Oxygen Level (SpO2) changes every 5 mins.
// 4. Weight changes everyday.
// 5. Sleep Duration changes everyday.

class VitalsSimulationEngine {
  constructor() {
    this.currentVitals = {
      systolic_bp: 120,
      diastolic_bp: 80,
      bp: '120/80',
      heart_rate: 72,
      hr: 72,
      glucose: 104,
      blood_sugar: 104,
      spo2: 98,
      weight: 65,
      sleep: 7.5,
      lastUpdated: new Date().toISOString()
    };

    this.listeners = new Set();
    this.started = false;
  }

  init() {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;

    // 1. BP & Heart Rate: Every 5 seconds
    setInterval(() => {
      const sys = Math.floor(116 + Math.random() * 11); // 116-126
      const dia = Math.floor(76 + Math.random() * 9);   // 76-84
      const hr = Math.floor(68 + Math.random() * 11);   // 68-78

      this.currentVitals.systolic_bp = sys;
      this.currentVitals.diastolic_bp = dia;
      this.currentVitals.bp = `${sys}/${dia}`;
      this.currentVitals.heart_rate = hr;
      this.currentVitals.hr = hr;
      this.currentVitals.lastUpdated = new Date().toISOString();

      this.emitUpdate({
        type: 'bp_hr',
        systolic_bp: sys,
        diastolic_bp: dia,
        bp: `${sys}/${dia}`,
        heart_rate: hr,
        hr: hr,
        vitals: this.currentVitals
      });
    }, 5000);

    // 3. Oxygen Level (SpO2): Every 5 minutes (300,000 ms)
    setInterval(() => {
      const spo2 = parseFloat((96.5 + Math.random() * 2.5).toFixed(1));
      this.currentVitals.spo2 = spo2;
      this.currentVitals.lastUpdated = new Date().toISOString();

      this.emitUpdate({
        type: 'spo2',
        spo2: spo2,
        vitals: this.currentVitals
      });
    }, 300000);

    // 2. Blood Sugar: Every 15 minutes (900,000 ms)
    setInterval(() => {
      const glucose = Math.floor(95 + Math.random() * 21); // 95-115
      this.currentVitals.glucose = glucose;
      this.currentVitals.blood_sugar = glucose;
      this.currentVitals.lastUpdated = new Date().toISOString();

      this.emitUpdate({
        type: 'sugar',
        glucose: glucose,
        blood_sugar: glucose,
        vitals: this.currentVitals
      });
    }, 900000);

    // 4 & 5. Weight & Sleep Duration: Daily (86,400,000 ms)
    setInterval(() => {
      const weight = parseFloat((64.5 + Math.random() * 1.3).toFixed(1));
      const sleep = parseFloat((7.0 + Math.random() * 1.2).toFixed(1));

      this.currentVitals.weight = weight;
      this.currentVitals.sleep = sleep;
      this.currentVitals.lastUpdated = new Date().toISOString();

      this.emitUpdate({
        type: 'daily',
        weight: weight,
        sleep: sleep,
        vitals: this.currentVitals
      });
    }, 86400000);

    // Listen for WebSocket real-time events from backend
    window.addEventListener('elderguard:realtime-event', (e) => {
      const data = e.detail;
      if (data && data.event === 'vital:logged' && data.payload) {
        const p = data.payload;
        const vType = p.type;
        const val = p.value;

        if (vType === 'bp' && val) {
          const sys = val.systolic || 120;
          const dia = val.diastolic || 80;
          this.currentVitals.systolic_bp = sys;
          this.currentVitals.diastolic_bp = dia;
          this.currentVitals.bp = `${sys}/${dia}`;
        } else if (vType === 'heart_rate' && val) {
          this.currentVitals.heart_rate = val.value || 72;
          this.currentVitals.hr = val.value || 72;
        } else if (vType === 'sugar' && val) {
          this.currentVitals.glucose = val.value || 104;
          this.currentVitals.blood_sugar = val.value || 104;
        } else if (vType === 'spo2' && val) {
          this.currentVitals.spo2 = val.value || 98;
        } else if (vType === 'weight' && val) {
          this.currentVitals.weight = val.value || 65;
        } else if (vType === 'sleep' && val) {
          this.currentVitals.sleep = val.value || 7.5;
        }

        this.currentVitals.lastUpdated = new Date().toISOString();
        this.emitUpdate({
          type: 'backend_sync',
          vitalType: vType,
          vitals: this.currentVitals
        });
      }
    });
  }

  emitUpdate(updateData) {
    if (typeof window !== 'undefined') {
      broadcastRealtimeEvent('elderguard:vitals-update', updateData);
    }
  }

  getVitals() {
    return { ...this.currentVitals };
  }
}

export const vitalsEngine = new VitalsSimulationEngine();
vitalsEngine.init();
export default vitalsEngine;
