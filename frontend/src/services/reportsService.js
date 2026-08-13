import api from './api';

export const reportsService = {
  async uploadReport(payload) {
    const response = await api.post('/reports/upload', payload);
    return response.data;
  },

  async getReportsList(elderId, reportType = null) {
    let url = `/reports/list/${elderId}`;
    if (reportType) url += `?report_type=${reportType}`;
    const response = await api.get(url);
    return response.data;
  },

  async getReportDetails(id) {
    const response = await api.get(`/reports/${id}`);
    return response.data;
  },

  async deleteReport(id) {
    const response = await api.delete(`/reports/${id}`);
    return response.data;
  },

  async scanPrescription(payload) {
    const response = await api.post('/ocr/scan-prescription', payload);
    return response.data;
  },

  async scanLabReport(payload) {
    const response = await api.post('/ocr/scan-report', payload);
    return response.data;
  },

  async getOcrHistory(elderId) {
    const response = await api.get(`/ocr/history/${elderId}`);
    return response.data;
  }
};

export default reportsService;
