import api from './api';

export const aiCompanionService = {
  /**
   * Send a chat message to the AI companion with optional health context.
   * health_context is a plain-text summary of the elder's vitals, medicines, etc.
   */
  async chatWithAI(elderId, message, history = [], mode = 'companion', healthContext = null) {
    const payload = {
      elder_id: elderId,
      message,
      mode,
      history,
    };
    if (healthContext) {
      payload.health_context = healthContext;
    }
    const response = await api.post('/ai/chat', payload);
    return response.data;
  },

  async getChatHistory(elderId, limit = 50) {
    const response = await api.get(`/ai/chat/history/${elderId}?limit=${limit}`);
    return response.data;
  },

  async generateHealthReview(payload) {
    const response = await api.post('/ai/health-review', payload);
    return response.data;
  },

  /**
   * Generate a comprehensive Mevi's Report from vitals history.
   * Returns { report, summary, risk_flags, created_at }
   */
  async generateVitalsReport(payload) {
    const response = await api.post('/ai/vitals-report', payload);
    return response.data;
  },

  /**
   * Build a health context string from the elder's current data.
   * This gets injected into the system prompt so the AI knows about the elder's health.
   */
  buildHealthContext({ vitals, medicines, appointments, elderName, elderAge } = {}) {
    const parts = [];

    if (elderName) parts.push(`Patient Name: ${elderName}`);
    if (elderAge) parts.push(`Age: ${elderAge}`);

    if (vitals) {
      parts.push(`\nCurrent Vitals:`);
      if (vitals.blood_pressure) parts.push(`  Blood Pressure: ${vitals.blood_pressure} mmHg`);
      if (vitals.heart_rate) parts.push(`  Heart Rate: ${vitals.heart_rate} bpm`);
      if (vitals.spo2) parts.push(`  SpO2: ${vitals.spo2}%`);
      if (vitals.blood_sugar) parts.push(`  Blood Sugar: ${vitals.blood_sugar} mg/dL`);
      if (vitals.temperature) parts.push(`  Temperature: ${vitals.temperature}°F`);
    }

    if (medicines && medicines.length > 0) {
      parts.push(`\nCurrent Medicines:`);
      medicines.slice(0, 8).forEach(m => {
        const name = typeof m === 'string' ? m : (m.name || m.medicine_name || 'Unknown');
        const dosage = m?.dosage || '';
        const timing = m?.timing || m?.schedule || '';
        parts.push(`  - ${name}${dosage ? ` (${dosage})` : ''}${timing ? ` at ${timing}` : ''}`);
      });
    }

    if (appointments && appointments.length > 0) {
      parts.push(`\nUpcoming Appointments:`);
      appointments.slice(0, 3).forEach(a => {
        const doc = a.doctor_name || a.doctor_id || 'Doctor';
        const date = a.appointment_date || a.date || '';
        parts.push(`  - With ${doc}${date ? ` on ${date}` : ''}`);
      });
    }

    return parts.join('\n');
  }
};

export default aiCompanionService;
