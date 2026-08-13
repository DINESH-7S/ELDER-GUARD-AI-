import api from './api';

export const profilesService = {
  // --- ELDER PROFILES ---
  async getElderProfile(userId) {
    const response = await api.get(`/profiles/elder/${userId}`);
    return response.data;
  },

  async createElderProfile(profileData) {
    const response = await api.post('/profiles/elder/', profileData);
    return response.data;
  },

  async updateElderProfile(userId, profileData) {
    const response = await api.put(`/profiles/elder/${userId}`, profileData);
    return response.data;
  },

  // --- CAREGIVER PROFILES ---
  async getCaregiverProfile(userId) {
    const response = await api.get(`/profiles/caregiver/${userId}`);
    return response.data;
  },

  async createCaregiverProfile(profileData) {
    const response = await api.post('/profiles/caregiver/', profileData);
    return response.data;
  },

  async updateCaregiverProfile(userId, profileData) {
    const response = await api.put(`/profiles/caregiver/${userId}`, profileData);
    return response.data;
  },

  // --- DOCTOR PROFILES ---
  async getDoctorProfile(userId) {
    const response = await api.get(`/profiles/doctor/${userId}`);
    return response.data;
  },

  async createDoctorProfile(profileData) {
    const response = await api.post('/profiles/doctor/', profileData);
    return response.data;
  },

  async updateDoctorProfile(userId, profileData) {
    const response = await api.put(`/profiles/doctor/${userId}`, profileData);
    return response.data;
  },

  // --- HOSPITAL PROFILES ---
  async getHospitalProfile(userId) {
    const response = await api.get(`/profiles/hospital/${userId}`);
    return response.data;
  },

  async createHospitalProfile(profileData) {
    const response = await api.post('/profiles/hospital/', profileData);
    return response.data;
  },

  async updateHospitalProfile(userId, profileData) {
    const response = await api.put(`/profiles/hospital/${userId}`, profileData);
    return response.data;
  },

  // --- PHARMACY PROFILES ---
  async getPharmacyProfile(userId) {
    const response = await api.get(`/profiles/pharmacy/${userId}`);
    return response.data;
  },

  async createPharmacyProfile(profileData) {
    const response = await api.post('/profiles/pharmacy/', profileData);
    return response.data;
  },

  async updatePharmacyProfile(userId, profileData) {
    const response = await api.put(`/profiles/pharmacy/${userId}`, profileData);
    return response.data;
  },

  // --- PROFILE LINKAGE (Elder ↔ Caregiver ↔ Doctor ↔ Hospital) ---
  async getLinkedCaregivers(elderId) {
    const response = await api.get(`/profiles/links/caregivers/${elderId}`);
    return response.data;
  },

  async getLinkedElders(caregiverId) {
    const response = await api.get(`/profiles/links/elders/${caregiverId}`);
    return response.data;
  },

  async linkCaregiver(elderId, caregiverId, relationship = 'Caregiver') {
    const response = await api.post('/profiles/links/elder-caregiver', {
      elder_id: elderId,
      caregiver_id: caregiverId,
    });
    return response.data;
  },

  async connectWithElderId(elderId) {
    const response = await api.post('/profiles/links/connect-elder', { elder_id: elderId });
    return response.data;
  }
};
