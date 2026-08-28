import { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import AdminLayout from './components/AdminLayout';
import Dashboard from './components/Dashboard';
import MemberManagement from './components/MemberManagement';
import DietWorkoutManager from './components/DietWorkoutManager';
import AttendanceManagement from './components/AttendanceManagement';
import PaymentManagement from './components/PaymentManagement';
import ReportsAnalytics from './components/ReportsAnalytics';
import NotificationSystem from './components/NotificationSystem';
import Settings from './components/Settings';
import MemberDashboard from './components/member/MemberDashboard';
import MemberAttendance from './components/member/MemberAttendance';
import MemberPlans from './components/member/MemberPlans';
import MemberProfile from './components/member/MemberProfile';
import EditProfile from './components/member/EditProfile';
import ChangePassword from './components/member/ChangePassword';
import MembershipDetails from './components/member/MembershipDetails';
import MemberNotifications from './components/member/MemberNotifications';
import { Bell, CalendarCheck, CreditCard, LayoutDashboard, Settings as SettingsIcon, User, Users, Apple, BarChart3, Dumbbell, Utensils, BadgeInfo, UserCog, KeyRound } from 'lucide-react';
import { useAuthStore } from './store/useAuthStore';
import { AdminRoute, MemberRoute } from './components/routes/ProtectedRoutes';

const adminMenuItems = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'diet-workout', label: 'Diet & Workout', icon: Apple },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { id: 'payments', label: 'Finances', icon: CreditCard },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
] as const;

const memberMenuItems = [
  { id: 'dashboard', label: 'Member Dashboard', icon: LayoutDashboard },
  { id: 'my-attendance', label: 'My Attendance', icon: CalendarCheck },
  { id: 'my-diet', label: 'My Diet Plan', icon: Utensils },
  { id: 'my-workout', label: 'My Workout Plan', icon: Dumbbell },
  { id: 'membership-details', label: 'Membership Details', icon: BadgeInfo },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'my-profile', label: 'My Profile', icon: User },
  { id: 'edit-profile', label: 'Edit Profile', icon: UserCog },
  { id: 'change-password', label: 'Change Password', icon: KeyRound },
] as const;

const getRoleBasePath = (role: 'admin' | 'member') => `/${role}`;

const getDefaultPage = () => 'dashboard';

const getPageFromPath = (pathname: string, role: 'admin' | 'member') => {
  const basePath = getRoleBasePath(role);
  if (!pathname.startsWith(basePath)) {
    return null;
  }

  const page = pathname.slice(basePath.length + 1);
  return page || getDefaultPage();
};

const navigateToRolePage = (role: 'admin' | 'member', page: string, replace = false) => {
  const nextPath = `${getRoleBasePath(role)}/${page}`;
  if (replace) {
    window.history.replaceState({}, '', nextPath);
  } else {
    window.history.pushState({}, '', nextPath);
  }
};

const getUnauthorizedRedirect = (role: 'admin' | 'member') => () => {
  navigateToRolePage(role, getDefaultPage(), true);
};

const isAttendanceDeepLink = (pathname: string) => pathname === '/attendance/checkin' || pathname === '/attendance/checkout';

const resolveAttendanceDeepLink = (rawUrl: string) => {
  const parsed = new URL(rawUrl, window.location.origin);
  if (!isAttendanceDeepLink(parsed.pathname)) {
    return null;
  }

  const token = parsed.searchParams.get('token') || parsed.searchParams.get('qr');
  if (!token) {
    return '/member/my-attendance';
  }

  return `/member/my-attendance?qr=${encodeURIComponent(token)}`;
};

const resolvePostLoginPath = (role: 'admin' | 'member', candidateUrl: string) => {
  const parsed = new URL(candidateUrl, window.location.origin);
  const candidatePath = `${parsed.pathname}${parsed.search}`;

  if (role === 'member') {
    const attendanceRedirect = resolveAttendanceDeepLink(candidatePath);
    if (attendanceRedirect) {
      return attendanceRedirect;
    }
  }

  const requestedPage = getPageFromPath(parsed.pathname, role);
  if (requestedPage) {
    return `${getRoleBasePath(role)}/${requestedPage}${parsed.search}`;
  }

  return null;
};

function App() {
  const { user, logout } = useAuthStore();
  const isLoggedIn = !!user;
  const [currentPage, setCurrentPage] = useState(window.location.pathname);

  const [isDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, [isDark]);

  const toggleTheme = () => {};

  useEffect(() => {
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>(
        'main .apex-card, main .rounded-3xl, main .rounded-2xl, main .glass-card, main .group, main section',
      ),
    );

    if (!targets.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).setAttribute('data-reveal', 'visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -40px 0px' }
    );

    targets.forEach((el, index) => {
      if (el.getAttribute('data-reveal') !== 'visible') {
        el.style.setProperty('--reveal-delay', `${Math.min(index * 45, 320)}ms`);
        el.setAttribute('data-reveal', 'pending');
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, [currentPage, isLoggedIn]);

  useEffect(() => {
    const syncPath = () => {
      setCurrentPage(window.location.pathname);
    };

    window.addEventListener('popstate', syncPath);
    return () => window.removeEventListener('popstate', syncPath);
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'member') {
      return;
    }

    if (!isAttendanceDeepLink(window.location.pathname)) {
      return;
    }

    const attendanceRedirect = resolveAttendanceDeepLink(`${window.location.pathname}${window.location.search}`);
    if (!attendanceRedirect) {
      return;
    }

    window.history.replaceState({}, '', attendanceRedirect);
    setCurrentPage(window.location.pathname);
  }, [user]);

  const handleLogin = () => {
    const role = useAuthStore.getState().user?.role;
    if (!role) {
      return;
    }

    const postLoginRedirect = sessionStorage.getItem('post_login_redirect');
    if (postLoginRedirect) {
      sessionStorage.removeItem('post_login_redirect');
    }

    const currentUrl = `${window.location.pathname}${window.location.search}`;
    const resolvedPath = resolvePostLoginPath(role, postLoginRedirect || currentUrl);
    if (resolvedPath) {
      window.history.replaceState({}, '', resolvedPath);
      setCurrentPage(window.location.pathname);
      return;
    }

    navigateToRolePage(role, getDefaultPage(), true);
    setCurrentPage(window.location.pathname);
  };

  const handleLogout = () => {
    logout();
    window.history.replaceState({}, '', '/');
    setCurrentPage('/');
  };

  const handleNavigate = (page: string) => {
    if (!user) {
      return;
    }
    navigateToRolePage(user.role, page);
    setCurrentPage(window.location.pathname);
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} isDark={isDark} toggleTheme={toggleTheme} />;
  }

  const role = user.role;

  const allowedMenuItems = role === 'admin' ? adminMenuItems : memberMenuItems;
  const resolvedPage = getPageFromPath(currentPage, role);

  if (!resolvedPage) {
    navigateToRolePage(role, getDefaultPage(), true);
    return null;
  }

  const allowedPageIds = new Set<string>(allowedMenuItems.map((item) => item.id));
  if (!allowedPageIds.has(resolvedPage)) {
    navigateToRolePage(role, getDefaultPage(), true);
    return null;
  }

  const onUnauthorized = getUnauthorizedRedirect(role);

  const renderPage = () => {
    if (role === 'admin') {
      return (
        <AdminRoute user={user} onUnauthorized={onUnauthorized}>
          {(() => {
            switch (resolvedPage) {
              case 'dashboard':
                return <Dashboard onNavigate={handleNavigate} />;
              case 'members':
                return <MemberManagement />;
              case 'diet-workout':
                return <DietWorkoutManager />;
              case 'attendance':
                return <AttendanceManagement />;
              case 'payments':
                return <PaymentManagement />;
              case 'reports':
                return <ReportsAnalytics />;
              case 'notifications':
                return <NotificationSystem />;
              case 'settings':
                return <Settings />;
              default:
                return <Dashboard onNavigate={handleNavigate} />;
            }
          })()}
        </AdminRoute>
      );
    }

    return (
      <MemberRoute user={user} onUnauthorized={onUnauthorized}>
        {(() => {
          switch (resolvedPage) {
            case 'dashboard':
              return <MemberDashboard />;
            case 'my-attendance':
              return <MemberAttendance />;
            case 'my-diet':
              return <MemberPlans mode="diet" />;
            case 'my-workout':
              return <MemberPlans mode="workout" />;
            case 'membership-details':
              return <MembershipDetails />;
            case 'notifications':
              return <MemberNotifications />;
            case 'my-profile':
              return <MemberProfile />;
            case 'edit-profile':
              return <EditProfile />;
            case 'change-password':
              return <ChangePassword />;
            default:
              return <MemberDashboard />;
          }
        })()}
      </MemberRoute>
    );
  };

  return (
    <AdminLayout
      currentPage={resolvedPage}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      menuItems={allowedMenuItems as any}
      user={user}
    >
      {renderPage()}
    </AdminLayout>
  );
}

export default App;
