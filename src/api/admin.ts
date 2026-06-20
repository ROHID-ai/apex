import api from './index';

export interface AdminMemberPayload {
  name: string;
  email: string;
  phone: string;
  password?: string;
  plan?: string;
  status?: string;
  age?: number;
  membership_type?: string;
}

export interface AttendanceQrConfig {
  qr_version: number;
  rotated_at: string;
  check_in_url: string;
  check_out_url: string;
}

export interface LiveAttendanceMember {
  attendance_id: number;
  member_name: string;
  membership_id: string;
  check_in: string;
}

export interface LiveAttendanceResponse {
  active_count: number;
  active_members: LiveAttendanceMember[];
}

export const adminApi = {
  getMembers: (search = '') => api.get(`/admin/members?search=${encodeURIComponent(search)}`),
  createMember: (payload: AdminMemberPayload) => api.post('/admin/members', payload),
  updateMember: (id: number, payload: Partial<AdminMemberPayload>) => api.put(`/admin/members/${id}`, payload),
  deleteMember: (id: number) => api.delete(`/admin/members/${id}`),
  getAttendanceQrConfig: () => api.get<AttendanceQrConfig>('/attendance/qr/config'),
  refreshAttendanceQrConfig: () => api.post<AttendanceQrConfig>('/attendance/qr/refresh'),
  getLiveAttendance: () => api.get<LiveAttendanceResponse>('/attendance/live'),
};
