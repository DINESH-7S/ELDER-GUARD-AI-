import api from './api';

export const vitalsService = {
  async addVitals(payload) {
    const response = await api.post('/vitals/add', payload);
    return response.data;
  },

  async getVitalsList(elderId, limit = 20, offset = 0) {
    const response = await api.get(`/vitals/list/${elderId}?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  async getLatestVital(elderId) {
    const response = await api.get(`/vitals/latest/${elderId}`);
    return response.data;
  },

  async getVitalsTrend(elderId, days = 7) {
    const response = await api.get(`/vitals/trend/${elderId}?days=${days}`);
    return response.data;
  },

  async deleteVital(vitalId) {
    const response = await api.delete(`/vitals/${vitalId}`);
    return response.data;
  }
};

export default vitalsService;
