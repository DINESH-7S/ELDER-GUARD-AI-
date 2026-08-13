import tabStorage from '../../utils/tabStorage';
import broadcastRealtimeEvent from '../../utils/realtimeBus';

export function getUserId(user) {
  return user?.id || user?.user_id || '';
}

export function displayDoctorName(currentUser, doctorProfile) {
  return doctorProfile?.name || currentUser?.name || currentUser?.email || 'Doctor';
}

export function displayPatientName(appointment) {
  return appointment?.elder_name || appointment?.elder_email || appointment?.elder_id || 'Linked elder';
}

export function patientInitials(nameOrId) {
  const value = String(nameOrId || '').trim();
  if (!value) return 'EG';
  const parts = value.split(/[\s@._-]+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'EG';
}

export function appointmentPatientSummary(appointment, index = 0) {
  const patientName = displayPatientName(appointment);
  const status = String(appointment.status || 'scheduled').replace(/_/g, ' ');
  const mode = appointment.mode === 'telemedicine' ? 'Telehealth' : 'In-Clinic';
  return {
    id: appointment.id,
    elderId: appointment.elder_id,
    token: appointment.queue_token || `#${String(index + 1).padStart(3, '0')}`,
    time: appointment.start_time || '',
    date: appointment.appointment_date || '',
    name: patientName,
    mrn: appointment.elder_id ? `ID-${String(appointment.elder_id).slice(0, 8).toUpperCase()}` : 'Not assigned',
    type: mode,
    complaint: appointment.notes || 'Booked appointment',
    status: status.charAt(0).toUpperCase() + status.slice(1),
    email: appointment.elder_email,
    phone: appointment.elder_phone_no,
    avatar: appointment.elder_profile_pic_url,
  };
}

// Single Source of Truth for Selected Doctor Patient Context
export function getSelectedPatient() {
  try {
    const data = tabStorage.getItem('elderguard_doctor_selected_patient');
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn('Error reading selected patient:', e);
    return null;
  }
}

export function setSelectedPatient(patient) {
  if (!patient) return;
  try {
    tabStorage.setItem('elderguard_doctor_selected_patient', JSON.stringify(patient));
    broadcastRealtimeEvent('elderguard:patient-selected', patient);
  } catch (e) {
    console.warn('Error setting selected patient:', e);
  }
}
