import api from './api';
import tabStorage from '../utils/tabStorage';

export const authService = {
  // Login with Email or Phone Number + Password
  async loginWithEmail(identifier, password) {
    const response = await api.post('/auth/login/email', { identifier, password });
    if (response.data && response.data.access_token) {
      tabStorage.setItem('elderguard_access_token', response.data.access_token);
      tabStorage.setItem('elderguard_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Signup with Email, Password & Role
  async signupWithEmail(email, password, role) {
    const response = await api.post('/auth/signup/email', { email, password, role });
    if (response.data && response.data.access_token) {
      tabStorage.setItem('elderguard_access_token', response.data.access_token);
      tabStorage.setItem('elderguard_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Google OAuth Login
  async loginWithGoogle(idToken, role = 'elder') {
    const response = await api.post('/auth/google', { id_token: idToken, role });
    if (response.data && response.data.access_token) {
      tabStorage.setItem('elderguard_access_token', response.data.access_token);
      tabStorage.setItem('elderguard_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // OTP Authentication
  async sendOTP(phoneNo) {
    const response = await api.post('/auth/send-otp', { phone_no: phoneNo });
    return response.data;
  },

  async verifyOTP(phoneNo, otpCode) {
    const response = await api.post('/auth/verify-otp', { phone_no: phoneNo, otp_code: otpCode });
    if (response.data && response.data.access_token) {
      tabStorage.setItem('elderguard_access_token', response.data.access_token);
      tabStorage.setItem('elderguard_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Logout Session
  logout() {
    tabStorage.removeItem('elderguard_access_token');
    tabStorage.removeItem('elderguard_user');
  },

  // Get Current Authenticated User
  getCurrentUser() {
    const userStr = tabStorage.getItem('elderguard_user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        return null;
      }
    }
    return null;
  }
};
