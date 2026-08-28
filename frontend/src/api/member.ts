import api from './index';

export interface MemberProfileUpdatePayload {
  name?: string;
  phone?: string;
  age?: number;
  membership_type?: string;
}

export interface MemberPasswordPayload {
  current_password: string;
  new_password: string;
}

export interface MemberQrAttendancePayload {
  qr_token: string;
  device_info?: string;
}

export const memberApi = {
  getDashboard: () => api.get('/member/dashboard'),
  getProfile: () => api.get('/member/profile'),
  updateProfile: (payload: MemberProfileUpdatePayload) => api.put('/member/profile', payload),
  changePassword: (payload: MemberPasswordPayload) => api.put('/member/change-password', payload),
  getMembership: () => api.get('/member/membership'),
  getAttendance: () => api.get('/member/attendance'),
  markAttendance: (payload: { image_data: string; enable_face_verification?: boolean }) => api.post('/member/mark-attendance', payload),
  markQrAttendance: (payload: MemberQrAttendancePayload) => api.post('/member/attendance/qr-scan', payload),
  getWorkout: () => api.get('/member/workout'),
  getDiet: () => api.get('/member/diet'),
  getNotifications: () => api.get('/member/notifications'),
};
