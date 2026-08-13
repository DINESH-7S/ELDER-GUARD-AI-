export function getUserId(user) {
  return user?.id || user?.user_id || '';
}

export function displayHospitalName(currentUser, profile) {
  return profile?.office_name || currentUser?.name || currentUser?.email || 'Hospital account';
}

export function initials(value) {
  const text = String(value || '').trim();
  if (!text) return 'HG';
  return text.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'HG';
}

export function doctorDisplayName(doctor) {
  return doctor?.name || doctor?.email || doctor?.user_id || 'Doctor account';
}
