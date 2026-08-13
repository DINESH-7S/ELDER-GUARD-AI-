import api from './api';

export const medicinesService = {
  async createMedicine(payload) {
    const response = await api.post('/medicines/', payload);
    return response.data;
  },

  async getMedicines(elderId) {
    const response = await api.get(`/medicines/elder/${elderId}`);
    return response.data;
  },

  async updateMedicine(id, payload) {
    const response = await api.put(`/medicines/${id}`, payload);
    return response.data;
  },

  async deleteMedicine(id) {
    const response = await api.delete(`/medicines/${id}`);
    return response.data;
  },

  async getActiveSession(elderId) {
    try {
      const response = await api.get(`/reminders/active/${elderId}`);
      return response.data;
    } catch (e) {
      if (e.response && e.response.status === 404) return null;
      throw e;
    }
  },

  async markItemTaken(sessionId, itemId) {
    const response = await api.post(`/reminders/sessions/${sessionId}/items/${itemId}/mark-taken`);
    return response.data;
  },

  async turnOffSession(sessionId, resolution = 'taken') {
    const response = await api.post(`/reminders/sessions/${sessionId}/turn-off`, { resolution });
    return response.data;
  },

  async generateSessions(targetDate = null) {
    const url = targetDate ? `/reminders/generate-sessions?target_date=${targetDate}` : '/reminders/generate-sessions';
    const response = await api.post(url);
    return response.data;
  },

  async getConnectedMedicines(elderId) {
    try {
      const response = await api.get('/api/elder/medicines');
      return response.data;
    } catch (e) {
      // Fallback to standalone medicines endpoint
      try {
        const response = await api.get(`/medicines/elder/${elderId}`);
        return response.data;
      } catch (_) {
        return [];
      }
    }
  }
};

export default medicinesService;
