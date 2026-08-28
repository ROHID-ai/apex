import api from './index';

export interface LoginPayload {
  email: string;
  password: string;
  role: 'admin' | 'member';
}

export const authApi = {
  login: (payload: LoginPayload) => api.post('/login', payload),
};
