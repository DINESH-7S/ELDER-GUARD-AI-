import api from './api';

const paramsFor = (elderId) => (elderId ? { params: { elder_id: elderId } } : undefined);

export const doctorRecordsService = {
  async listPrescriptions(elderId = null) {
    const response = await api.get('/doctor-records/prescriptions', paramsFor(elderId));
    return response.data;
  },

  async createPrescription(payload) {
    const response = await api.post('/doctor-records/prescriptions', payload);
    return response.data;
  },

  async deletePrescription(id) {
    const response = await api.delete(`/doctor-records/prescriptions/${id}`);
    return response.data;
  },

  async listReports(elderId = null) {
    const response = await api.get('/doctor-records/reports', paramsFor(elderId));
    return response.data;
  },

  async createReport(payload) {
    const response = await api.post('/doctor-records/reports', payload);
    return response.data;
  },

  async deleteReport(id) {
    const response = await api.delete(`/doctor-records/reports/${id}`);
    return response.data;
  },
};

export default doctorRecordsService;
