import api from './api';

export const hospitalService = {
  async overview() {
    const response = await api.get('/hospital/overview');
    return response.data;
  },

  async listDepartments() {
    const response = await api.get('/hospital/departments');
    return response.data;
  },

  async createDepartment(payload) {
    const response = await api.post('/hospital/departments', payload);
    return response.data;
  },

  async listPatients() {
    const response = await api.get('/hospital/patients');
    return response.data;
  },

  async createPatient(payload) {
    const response = await api.post('/hospital/patients', payload);
    return response.data;
  },

  async listQueue() {
    const response = await api.get('/hospital/queue');
    return response.data;
  },

  async createQueueEntry(payload) {
    const response = await api.post('/hospital/queue', payload);
    return response.data;
  },

  async listBilling() {
    const response = await api.get('/hospital/billing');
    return response.data;
  },

  async createBillingRecord(payload) {
    const response = await api.post('/hospital/billing', payload);
    return response.data;
  },
};

export default hospitalService;
