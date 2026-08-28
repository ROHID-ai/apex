import { ReactNode } from 'react';
import type { User } from '../../store/useAuthStore';

interface ProtectedRouteProps {
  user: User;
  onUnauthorized: () => void;
  children: ReactNode;
}

export function AdminRoute({ user, onUnauthorized, children }: ProtectedRouteProps) {
  if (user.role !== 'admin') {
    onUnauthorized();
    return null;
  }

  return <>{children}</>;
}

export function MemberRoute({ user, onUnauthorized, children }: ProtectedRouteProps) {
  if (user.role !== 'member') {
    onUnauthorized();
    return null;
  }

  return <>{children}</>;
}