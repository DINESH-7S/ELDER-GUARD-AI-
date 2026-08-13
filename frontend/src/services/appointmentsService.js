import api from './api';

export const appointmentsService = {
  async getDoctors(specialty = null) {
    let url = '/appointments/doctors';
    if (specialty) url += `?specialization=${encodeURIComponent(specialty)}`;
    const response = await api.get(url);
    return response.data;
  },

  async bookAppointment(payload) {
    const response = await api.post('/appointments/book', payload);
    return response.data;
  },

  async getAppointments(elderId = null, doctorId = null) {
    let url = '/appointments/';
    const params = [];
    if (elderId) params.push(`elder_id=${elderId}`);
    if (doctorId) params.push(`doctor_id=${doctorId}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    const response = await api.get(url);
    return response.data;
  },

  async getAppointmentDetails(id) {
    const response = await api.get(`/appointments/${id}`);
    return response.data;
  },

  async confirmAppointment(id) {
    const response = await api.put(`/appointments/${id}/confirm`);
    return response.data;
  },

  async startConsultation(id) {
    const response = await api.put(`/appointments/${id}/start-consultation`);
    return response.data;
  },

  async completeAppointment(id) {
    const response = await api.put(`/appointments/${id}/complete`);
    return response.data;
  },

  async cancelAppointment(id, reason = 'User requested cancellation') {
    const response = await api.put(`/appointments/${id}/cancel`, { cancellation_reason: reason });
    return response.data;
  },

  async rescheduleAppointment(id, newDate, newTime, reason = 'Rescheduled by user') {
    const response = await api.put(`/appointments/${id}/reschedule`, {
      new_date: newDate,
      new_start_time: newTime,
      reason,
    });
    return response.data;
  },

  async getDoctorSlots(doctorId, targetDate) {
    const response = await api.get(`/appointments/slots/${doctorId}?target_date=${targetDate}`);
    return response.data;
  }
};

export default appointmentsService;
