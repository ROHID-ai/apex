import { useEffect, useMemo, useState } from 'react';
import {
  Lock,
  Mail,
  ArrowRight,
  Sun,
  Moon,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  LineChart,
  CircleDot,
  Activity,
  Clock3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from './Logo';
import { authApi } from '../api/auth';
import { useAuthStore, type UserRole } from '../store/useAuthStore';

interface LoginPageProps {
  onLogin: () => void;
  isDark: boolean;
  toggleTheme: () => void;
}

export default function LoginPage({ onLogin, isDark, toggleTheme }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('admin');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const { setAuth } = useAuthStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('remembered_email');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timeout = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const roleLabel = useMemo(() => (role === 'admin' ? 'Administrator' : 'Member Access'), [role]);

  const onPasswordKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(e.getModifierState('CapsLock'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authApi.login({
        email: email.trim().toLowerCase(),
        password,
        role,
      });

      if (rememberMe) {
        localStorage.setItem('remembered_email', email.trim().toLowerCase());
      } else {
        localStorage.removeItem('remembered_email');
      }

      setToast({ type: 'success', message: 'Authentication successful' });
      setAuth(response.data.user, response.data.token);
      onLogin();
    } catch (err: any) {
      const status = err.response?.status;
      const responseData = err.response?.data;
      const contentType = String(err.response?.headers?.['content-type'] || '');

      let message = 'Login failed';
      if (!err.response) {
        message = 'Unable to reach server. Please start backend on port 8010.';
      } else if (status === 502 || status === 503 || status === 504) {
        message = 'Authentication service is unavailable. Ensure backend is running on port 8010.';
      } else if (status === 404 || contentType.includes('text/html') || typeof responseData === 'string') {
        message = 'Authentication endpoint is unavailable. Verify frontend proxy and backend API route.';
      } else if (Array.isArray(responseData?.detail)) {
        message = responseData.detail
          .map((entry: any) => entry?.msg)
          .filter(Boolean)
          .join(', ') || 'Invalid login request';
      } else if (typeof responseData?.detail === 'string') {
        message = responseData.detail;
      } else if (typeof responseData?.message === 'string') {
        message = responseData.message;
      } else if (status) {
        message = `Login failed (${status})`;
      }

      setToast({ type: 'error', message });
      if (!err.response) {
        setError(message);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-apex-surface text-apex-heading">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`fixed right-4 top-4 z-50 rounded-xl border px-4 py-3 text-sm backdrop-blur-md ${
              toast.type === 'success' ? 'border-blue-500/20 bg-apex-primary/10 text-blue-100' : 'border-blue-500/20 bg-white/90 text-blue-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? <ShieldCheck className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(0,0,255,0.10),transparent_30%),radial-gradient(circle_at_85%_70%,rgba(0,0,255,0.07),transparent_36%)]" />
        <motion.div
          className="absolute -top-24 left-0 h-72 w-72 rounded-full bg-apex-primary/8 blur-[110px]"
          animate={{ x: [0, 24, 0], y: [0, -10, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="absolute right-4 top-4 z-20">
        <button
          onClick={toggleTheme}
          className="rounded-full border border-slate-200 bg-white/80 p-2.5 text-slate-300 transition-colors hover:border-slate-300 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
        >
          {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </button>
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 items-center gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <motion.section
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="hidden lg:block"
        >
          <div className="space-y-8">
            <Logo size="xl" />

            <div className="max-w-xl space-y-4">
              <p className="inline-flex items-center gap-2 rounded-full border border-apex-primary/20 bg-apex-primary-light px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-apex-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secure Operations Cloud
              </p>
              <h1 className="text-[2rem] font-semibold leading-[1.2] tracking-tight text-apex-heading xl:text-[2.35rem]">
                Premium gym operations,
                <span className="block text-apex-primary">built with enterprise precision.</span>
              </h1>
              <p className="max-w-lg text-sm leading-6 text-apex-body">
                Unified management for attendance, memberships, plans, and analytics. Designed for modern fitness brands that value reliability.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white/80 p-3.5">
                <p className="text-[11px] uppercase tracking-[0.14em] text-apex-body">System Uptime</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">99.9%</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white/80 p-3.5">
                <p className="text-[11px] uppercase tracking-[0.14em] text-apex-body">Active Members</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">1,284</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-medium text-apex-body">Weekly Operations Snapshot</p>
                <LineChart className="h-4 w-4 text-blue-400" />
              </div>
              <div className="space-y-3">
                {[
                  { day: 'Mon', value: 68 },
                  { day: 'Tue', value: 72 },
                  { day: 'Wed', value: 76 },
                  { day: 'Thu', value: 74 },
                  { day: 'Fri', value: 81 },
                ].map((item) => (
                  <div key={item.day} className="grid grid-cols-[32px_1fr_36px] items-center gap-3">
                    <span className="text-xs text-apex-body">{item.day}</span>
                    <div className="h-1.5 rounded-full bg-slate-100">
                      <div className="h-1.5 rounded-full bg-gradient-to-r from-apex-primary/70 to-blue-400/70" style={{ width: `${item.value}%` }} />
                    </div>
                    <span className="text-right text-xs text-apex-body">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="flex items-center justify-center"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-[rgba(9,10,12,0.82)] p-5 shadow-[0_24px_48px_-32px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:p-6">
            <div className="mb-6 border-b border-white/10 pb-5">
              <div className="lg:hidden">
                <Logo className="mx-auto" size="lg" />
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">Sign in</h2>
              <p className="mt-1 text-sm text-white/80">Access your secure gym management workspace.</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/70">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-white/90">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-300" />
                  JWT Protected
                </span>
                <span className="inline-flex items-center gap-1.5 text-white/70">
                  <Clock3 className="h-3.5 w-3.5 text-white/60" />
                  Last login: Today, 09:42
                </span>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Login As</label>
                <div className="grid grid-cols-2 rounded-xl border border-white/15 bg-white/10 p-1">
                  {[
                    { value: 'admin', label: 'Admin' },
                    { value: 'member', label: 'Member' },
                  ].map((option) => {
                    const active = role === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setRole(option.value as UserRole)}
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                          active
                            ? 'bg-gradient-to-r from-blue-700 to-[#4F5DFF] text-white shadow-[0_8px_18px_-12px_rgba(0,0,255,0.75)]'
                            : 'text-white/80 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-white/70">{roleLabel}</p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/85 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500 transition-all focus:border-apex-primary/50 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    placeholder="Email address"
                    required
                  />
                </div>

                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={onPasswordKey}
                    onKeyDown={onPasswordKey}
                    className="w-full rounded-xl border border-slate-200 bg-white/85 py-2.5 pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-500 transition-all focus:border-apex-primary/50 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    placeholder="Password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-900"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {capsLockOn && (
                <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs text-white/85">Caps Lock is ON</div>
              )}

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-white/85">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-white/30 bg-transparent text-apex-primary focus:ring-blue-600"
                  />
                  Remember me
                </label>
                <button type="button" className="text-sm text-white/70 transition-colors hover:text-white">
                  Forgot password?
                </button>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ y: loading ? 0 : -1 }}
                whileTap={{ scale: loading ? 1 : 0.99 }}
                className="group w-full rounded-xl border border-apex-primary/30 bg-gradient-to-r from-blue-700 to-[#4F5DFF] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:from-blue-700 hover:to-[#4F5DFF] hover:shadow-[0_14px_24px_-18px_rgba(0,0,255,0.8)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </span>
              </motion.button>

              <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs text-white/65">
                <span className="inline-flex items-center gap-1.5">
                  <CircleDot className="h-3.5 w-3.5 text-blue-300" />
                  Enterprise-grade security
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-blue-300" />
                  Role-based access
                </span>
              </div>
            </form>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
