import api from './api';

export const emergencyService = {
  async triggerSOS(locationLat = null, locationLng = null, accuracy = null) {
    const response = await api.post('/emergency/trigger', {
      location_lat: locationLat,
      location_lng: locationLng,
      location_accuracy_m: accuracy,
    });
    return response.data;
  },

  async getActiveSOS(elderId) {
    try {
      const response = await api.get(`/emergency/active/${elderId}`);
      return response.data;
    } catch (e) {
      if (e.response && e.response.status === 404) return null;
      throw e;
    }
  },

  async acknowledgeSOS(id) {
    const response = await api.put(`/emergency/${id}/acknowledge`);
    return response.data;
  },

  async resolveSOS(id, note = 'Resolved by user') {
    const response = await api.put(`/emergency/${id}/resolve`, { resolution_note: note });
    return response.data;
  },

  async getSOSHistory(elderId) {
    const response = await api.get(`/emergency/history/${elderId}`);
    return response.data;
  },

  async getEscalationPolicy(elderId) {
    const response = await api.get(`/emergency/escalation-policy/${elderId}`);
    return response.data;
  }
};

export default emergencyService;
