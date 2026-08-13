import api from './api';
import tabStorage from '../utils/tabStorage';

export const authService = {
  async loginEmail(identifier, password) {
    const response = await api.post('/auth/login/email', {
      identifier,
      password,
    });
    if (response.data.access_token) {
      tabStorage.setItem('elderguard_access_token', response.data.access_token);
      tabStorage.setItem('elderguard_refresh_token', response.data.refresh_token);
      tabStorage.setItem('elderguard_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async loginWithEmail(identifier, password) {
    return this.loginEmail(identifier, password);
  },

  async connectWithElder(elderId) {
    const response = await api.post('/profiles/links/connect-elder', {
      elder_id: elderId,
    });
    return response.data;
  },

  async signupEmail(email, phone_no, password, role = 'elder') {
    const response = await api.post('/auth/signup/email', {
      email: email || null,
      phone_no: phone_no || null,
      password,
      role,
    });
    if (response.data.access_token) {
      tabStorage.setItem('elderguard_access_token', response.data.access_token);
      tabStorage.setItem('elderguard_refresh_token', response.data.refresh_token);
      tabStorage.setItem('elderguard_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async signupWithEmail(email, password, role = 'elder') {
    return this.signupEmail(email, null, password, role);
  },

  async loginWithGoogle(idToken, role = 'elder') {
    const response = await api.post('/auth/google', {
      id_token: idToken,
      role,
    });
    if (response.data.access_token) {
      tabStorage.setItem('elderguard_access_token', response.data.access_token);
      tabStorage.setItem('elderguard_refresh_token', response.data.refresh_token);
      tabStorage.setItem('elderguard_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async sendOTP(phone_no) {
    const response = await api.post('/auth/send-otp', { phone_no });
    return response.data;
  },

  async verifyOTP(phone_no, otp_code) {
    const response = await api.post('/auth/verify-otp', { phone_no, otp_code });
    return response.data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore error on logout call
    } finally {
      tabStorage.removeItem('elderguard_access_token');
      tabStorage.removeItem('elderguard_refresh_token');
      tabStorage.removeItem('elderguard_user');
    }
  },

  getCurrentUser() {
    try {
      const token = tabStorage.getItem('elderguard_access_token');
      if (!token || token === 'undefined' || token === 'null') {
        return null;
      }
      const userStr = tabStorage.getItem('elderguard_user');
      if (!userStr || userStr === 'undefined' || userStr === 'null') {
        return null;
      }
      const parsed = JSON.parse(userStr);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) {
      return null;
    }
  }
};

export default authService;
