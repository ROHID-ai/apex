import { useState } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import {
  Lock,
  Database,
  Key,
  UserCog,
  ChevronRight,
  Settings2,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  HardDrive,
  Archive,
  FileDown,
  FileSpreadsheet,
  CheckCircle2,
  Inbox,
} from 'lucide-react';
import api from '../api';
import PageHero from './ui/PageHero';
import SectionHeader from './ui/SectionHeader';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

export default function Settings() {
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [validationMessage, setValidationMessage] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [notificationToggles, setNotificationToggles] = useState({
    email: true,
    sms: true,
    reminders: true,
  });

  const { scrollYProgress } = useScroll();
  const progressScaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    mass: 0.3,
  });

  const roleItems = [
    {
      name: 'Main Admin',
      description: 'Full access to all features',
      status: 'Active',
    },
    {
      name: 'Trainer Admin',
      description: 'Access to members and diet/workout plans',
      status: 'Active',
    },
  ];

  const passwordScore =
    Number(passwordForm.new_password.length >= 8) +
    Number(/[A-Z]/.test(passwordForm.new_password)) +
    Number(/[0-9]/.test(passwordForm.new_password)) +
    Number(/[^A-Za-z0-9]/.test(passwordForm.new_password));

  const strengthLabel =
    passwordForm.new_password.length === 0
      ? 'Not set'
      : passwordScore <= 1
        ? 'Weak'
        : passwordScore <= 3
          ? 'Medium'
          : 'Strong';

  const strengthTone =
    strengthLabel === 'Strong' ? 'text-emerald-400' : strengthLabel === 'Medium' ? 'text-amber-400' : 'text-blue-500';

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationMessage('');

    if (passwordForm.new_password.length < 8) {
      setValidationMessage('Use at least 8 characters for better account protection.');
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setValidationMessage('New password and confirm password must match.');
      alert('New password and confirm password must match');
      return;
    }

    try {
      setIsUpdatingPassword(true);
      const response = await api.put('/settings/password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      alert(response.data.message);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      setValidationMessage(err.response?.data?.detail || 'Failed to update password. Please try again.');
      alert(err.response?.data?.detail || 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <motion.div className="relative space-y-8" variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div
        style={{ scaleX: progressScaleX }}
        className="fixed left-0 right-0 top-0 z-40 h-[2px] origin-left bg-gradient-to-r from-blue-700 via-blue-600 to-blue-400"
      />

      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          className="absolute -top-20 left-6 h-60 w-60 rounded-full bg-blue-700/10 blur-3xl"
          animate={{ y: [0, -18, 0], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/3 right-0 h-72 w-72 rounded-full bg-apex-primary/10 blur-3xl"
          animate={{ y: [0, 20, 0], x: [0, -14, 0], opacity: [0.28, 0.42, 0.28] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-apex-primary/8 blur-3xl"
          animate={{ scale: [1, 1.08, 1], opacity: [0.24, 0.36, 0.24] }}
          transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <PageHero
        badge="Admin Controls"
        title="Settings Center"
        description="Secure your workspace, manage integrations, and control operational defaults from one panel."
        action={
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-btn border border-apex-border bg-apex-surface px-4 py-3">
              <p className="text-xs font-medium text-apex-body">Security</p>
              <p className="mt-1 font-semibold text-apex-heading">High</p>
            </div>
            <div className="rounded-btn border border-apex-border bg-apex-surface px-4 py-3">
              <p className="text-xs font-medium text-apex-body">Integrations</p>
              <p className="mt-1 font-semibold text-apex-heading">2 Active</p>
            </div>
          </div>
        }
      />

      <section>
        <SectionHeader title="Account" description="Workspace identity and operational status." />
        <motion.div
          variants={fadeInUp}
          transition={{ delay: 0.08, duration: 0.45 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
        <motion.div whileHover={{ y: -4, scale: 1.01 }} className="group rounded-card border border-apex-border bg-white p-4 shadow-card transition-all duration-300 hover:border-apex-primary/20 hover:shadow-card-hover">
          <div className="mb-3 inline-flex rounded-lg bg-apex-primary/10 p-2 text-blue-500">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <p className="text-xs uppercase tracking-[0.14em] text-apex-body">Access Safety</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">Locked Down</p>
        </motion.div>
        <motion.div whileHover={{ y: -4, scale: 1.01 }} className="group rounded-card border border-apex-border bg-white p-4 shadow-card transition-all duration-300 hover:border-apex-primary/20 hover:shadow-card-hover">
          <div className="mb-3 inline-flex rounded-lg bg-apex-primary/10 p-2 text-blue-500">
            <Database className="h-4 w-4" />
          </div>
          <p className="text-xs uppercase tracking-[0.14em] text-apex-body">Data Resilience</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">Backup Ready</p>
        </motion.div>
        <motion.div whileHover={{ y: -4, scale: 1.01 }} className="group rounded-card border border-apex-border bg-white p-4 shadow-card transition-all duration-300 hover:border-apex-primary/20 hover:shadow-card-hover">
          <div className="mb-3 inline-flex rounded-lg bg-apex-primary/10 p-2 text-blue-500">
            <Settings2 className="h-4 w-4" />
          </div>
          <p className="text-xs uppercase tracking-[0.14em] text-apex-body">System Mode</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">Production</p>
        </motion.div>
        <motion.div whileHover={{ y: -4, scale: 1.01 }} className="group rounded-card border border-apex-border bg-white p-4 shadow-card transition-all duration-300 hover:border-apex-primary/20 hover:shadow-card-hover">
          <div className="mb-3 inline-flex rounded-lg bg-apex-primary/10 p-2 text-blue-500">
            <Key className="h-4 w-4" />
          </div>
          <p className="text-xs uppercase tracking-[0.14em] text-apex-body">Integrations</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">Connected</p>
        </motion.div>
        </motion.div>
      </section>

      <div className="grid gap-6 xl:grid-cols-12">
        <motion.div
          variants={fadeInUp}
          transition={{ delay: 0.12, duration: 0.45 }}
          className="space-y-6 xl:col-span-8"
        >
          <SectionHeader title="Security" description="Credentials, backups, and access protection." />
          <motion.section whileHover={{ y: -3, scale: 1.003 }} className="group relative overflow-hidden rounded-2xl border border-apex-primary/20 bg-[linear-gradient(160deg,rgba(245,245,250,0.78),rgba(245,245,245,0.86))] p-6 shadow-[0_30px_90px_-48px_rgba(0,0,0,0.95)] backdrop-blur-sm transition-all duration-300 hover:border-apex-primary/35 hover:shadow-[0_34px_95px_-52px_rgba(0,0,255,0.5)] sm:p-7">
            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-blue-700/10 blur-3xl" />
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="rounded-xl bg-gradient-to-br from-apex-primary/20 to-blue-900/20 p-3 ring-1 ring-blue-600/30 shadow-[0_0_0_1px_rgba(0,0,255,0.08)]">
                  <Lock className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-900">Change Admin Password</h2>
                  <p className="text-sm text-apex-body">Security-first credentials with enhanced visibility and strength guidance.</p>
                </div>
              </div>
              <span className="hidden rounded-full border border-blue-500/30 bg-apex-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-blue-400 sm:inline-flex">
                Security
              </span>
            </div>

            <div className="mb-5 rounded-xl border border-slate-200 bg-white/85 p-4">
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.12em]">
                <span className="text-apex-body">Password Strength</span>
                <span className={`font-semibold ${strengthTone}`}>{strengthLabel}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      passwordForm.new_password.length === 0
                        ? 'bg-slate-100'
                        : passwordScore >= step
                          ? strengthLabel === 'Strong'
                            ? 'bg-emerald-500/80'
                            : strengthLabel === 'Medium'
                              ? 'bg-amber-500/80'
                              : 'bg-apex-primary/80'
                          : 'bg-slate-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            {validationMessage && (
              <div className="mb-5 flex items-start gap-2 rounded-xl border border-apex-primary/35 bg-apex-primary/10 px-4 py-3 text-sm text-blue-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                <span>{validationMessage}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handlePasswordChange}>
              <div>
                <label className="mb-2 block text-sm font-medium text-apex-body">Current Password</label>
                <div className="relative">
                  <input
                    type={showPassword.current ? 'text' : 'password'}
                    value={passwordForm.current_password}
                    onChange={(e) => {
                      setValidationMessage('');
                      setPasswordForm({ ...passwordForm, current_password: e.target.value });
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white/95 px-4 py-3 pr-12 text-slate-900 transition-all duration-300 placeholder:text-apex-body focus:border-apex-primary/80 focus:outline-none focus:ring-2 focus:ring-blue-600/25 focus:shadow-[0_0_0_1px_rgba(0,0,255,0.3),0_0_20px_rgba(0,0,255,0.2)]"
                    placeholder="Enter your current password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => ({ ...prev, current: !prev.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-apex-body transition-colors hover:text-blue-400"
                    aria-label={showPassword.current ? 'Hide current password' : 'Show current password'}
                  >
                    {showPassword.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-apex-body">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword.next ? 'text' : 'password'}
                      value={passwordForm.new_password}
                      onChange={(e) => {
                        setValidationMessage('');
                        setPasswordForm({ ...passwordForm, new_password: e.target.value });
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white/95 px-4 py-3 pr-12 text-slate-900 transition-all duration-300 placeholder:text-apex-body focus:border-apex-primary/80 focus:outline-none focus:ring-2 focus:ring-blue-600/25 focus:shadow-[0_0_0_1px_rgba(0,0,255,0.3),0_0_20px_rgba(0,0,255,0.2)]"
                      placeholder="Create a strong new password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => ({ ...prev, next: !prev.next }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-apex-body transition-colors hover:text-blue-400"
                      aria-label={showPassword.next ? 'Hide new password' : 'Show new password'}
                    >
                      {showPassword.next ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-apex-body">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword.confirm ? 'text' : 'password'}
                      value={passwordForm.confirm_password}
                      onChange={(e) => {
                        setValidationMessage('');
                        setPasswordForm({ ...passwordForm, confirm_password: e.target.value });
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white/95 px-4 py-3 pr-12 text-slate-900 transition-all duration-300 placeholder:text-apex-body focus:border-apex-primary/80 focus:outline-none focus:ring-2 focus:ring-blue-600/25 focus:shadow-[0_0_0_1px_rgba(0,0,255,0.3),0_0_20px_rgba(0,0,255,0.2)]"
                      placeholder="Re-enter your new password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-apex-body transition-colors hover:text-blue-400"
                      aria-label={showPassword.confirm ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showPassword.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <motion.button
                type="submit"
                whileHover={{ scale: isUpdatingPassword ? 1 : 1.02 }}
                whileTap={{ scale: isUpdatingPassword ? 1 : 0.98 }}
                disabled={isUpdatingPassword}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 px-6 py-3 font-semibold text-white transition-all duration-300 hover:shadow-[0_14px_30px_-15px_rgba(0,0,255,0.9)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    Update Password
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </motion.button>
            </form>
          </motion.section>

          <SectionHeader title="System Preferences" description="Data resilience, exports, and operational defaults." className="pt-2" />
          <motion.section whileHover={{ y: -3, scale: 1.003 }} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-[linear-gradient(155deg,rgba(248,248,248,0.88),rgba(245,245,245,0.82))] p-6 shadow-[0_24px_80px_-42px_rgba(0,0,0,0.9)] backdrop-blur-sm transition-all duration-300 hover:border-apex-primary/30 hover:shadow-[0_30px_90px_-46px_rgba(0,0,255,0.42)] sm:p-7">
            <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-blue-700/10 blur-3xl" />
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="rounded-xl bg-apex-primary/10 p-3 ring-1 ring-blue-600/25">
                  <Database className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-900">Backup Data</h2>
                  <p className="text-sm text-apex-body">Manage snapshots, exports, and restore points with enterprise-grade control.</p>
                </div>
              </div>
              <span className="hidden items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 sm:inline-flex">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Healthy
              </span>
            </div>

            <div className="mb-5 grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-apex-surface p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.12em] text-apex-body">Storage Usage</span>
                  <HardDrive className="h-4 w-4 text-blue-400" />
                </div>
                <p className="text-lg font-semibold text-slate-900">64% Used</p>
                <div className="mt-3 h-2 rounded-full bg-slate-100">
                  <div className="h-2 w-[64%] rounded-full bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500" />
                </div>
                <p className="mt-2 text-xs text-apex-body">384 GB of 600 GB allocated</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-apex-surface p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.12em] text-apex-body">Backup Status</span>
                  <Archive className="h-4 w-4 text-blue-400" />
                </div>
                <p className="text-lg font-semibold text-slate-900">Scheduled Daily</p>
                <p className="mt-2 text-xs text-apex-body">Next automated run at 02:00 AM</p>
                <p className="mt-1 text-xs text-emerald-300">Last run completed successfully</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-apex-surface p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.12em] text-apex-body">Last Backup</span>
                  <Database className="h-4 w-4 text-blue-400" />
                </div>
                <p className="text-lg font-semibold text-slate-900">Jan 15, 2024</p>
                <p className="mt-2 text-xs text-apex-body">10:30 AM</p>
                <p className="mt-1 text-xs text-apex-body">Includes members, payments, attendance</p>
              </div>
            </div>

            <p className="mb-5 rounded-xl border border-slate-200 bg-white/85 px-4 py-3 text-sm text-apex-body">
              Create and restore backups of all your gym data while keeping reporting exports ready for finance and operations.
            </p>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <button className="rounded-xl bg-gradient-to-r from-blue-700 to-[#4F5DFF] px-6 py-3 font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:from-apex-primary hover:to-blue-500 hover:shadow-[0_14px_30px_-15px_rgba(0,0,255,0.9)]">
                Create Backup
              </button>
              <button className="rounded-xl border border-gray-700 bg-white/85 px-6 py-3 font-semibold text-apex-body transition-all duration-300 hover:scale-[1.02] hover:border-apex-primary/30 hover:bg-white hover:text-slate-900">
                Restore from Backup
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-5 py-3 font-semibold text-apex-body transition-all duration-300 hover:scale-[1.02] hover:border-apex-primary/30 hover:bg-apex-primary/10 hover:text-blue-700">
                <FileDown className="h-4 w-4 text-blue-400" />
                Export Reports
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-5 py-3 font-semibold text-apex-body transition-all duration-300 hover:scale-[1.02] hover:border-apex-primary/30 hover:bg-apex-primary/10 hover:text-blue-700">
                <FileSpreadsheet className="h-4 w-4 text-blue-400" />
                Download Attendance CSV
              </button>
            </div>
          </motion.section>

          <SectionHeader title="Integrations" description="External sync pipelines and API connections." className="pt-2" />
          <motion.section whileHover={{ y: -3, scale: 1.003 }} className="group rounded-2xl border border-slate-200 bg-[linear-gradient(160deg,rgba(248,248,248,0.86),rgba(245,245,245,0.8))] p-6 shadow-[0_24px_80px_-42px_rgba(0,0,0,0.9)] backdrop-blur-sm transition-all duration-300 hover:border-apex-primary/30 hover:shadow-[0_30px_90px_-46px_rgba(0,0,255,0.42)] sm:p-7">
            <div className="mb-6 flex items-center space-x-3">
              <div className="rounded-xl bg-apex-primary/10 p-3 ring-1 ring-blue-600/20">
                <Key className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Google Sheet / Database Connection</h2>
                <p className="text-sm text-apex-body">Maintain sync pipelines across tools you already use.</p>
              </div>
            </div>
            <p className="mb-4 text-apex-body">
              Connect your gym management system to Google Sheets or external database for data sync.
            </p>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-apex-body">API Key</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-gray-700 bg-[#F5F5F5]/70 px-4 py-3 text-slate-900 transition-all duration-200 placeholder:text-apex-body focus:border-apex-primary focus:outline-none focus:ring-2 focus:ring-blue-600/25"
                  placeholder="Enter API key"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-apex-body">Sheet ID / Database URL</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-gray-700 bg-[#F5F5F5]/70 px-4 py-3 text-slate-900 transition-all duration-200 placeholder:text-apex-body focus:border-apex-primary focus:outline-none focus:ring-2 focus:ring-blue-600/25"
                  placeholder="Enter Sheet ID or Database URL"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <motion.button whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }} className="rounded-xl bg-gradient-to-r from-blue-700 to-[#4F5DFF] px-6 py-3 font-semibold text-white transition-all duration-300 hover:from-apex-primary hover:to-blue-500 hover:shadow-[0_14px_30px_-15px_rgba(0,0,255,0.9)]">
                  Test Connection
                </motion.button>
                <motion.button whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }} className="rounded-xl border border-gray-700 px-6 py-3 font-semibold text-apex-body transition-all duration-300 hover:border-apex-primary/30 hover:bg-white hover:text-slate-900">
                  Save Configuration
                </motion.button>
              </div>
            </div>
          </motion.section>
        </motion.div>

        <motion.div
          variants={fadeInUp}
          transition={{ delay: 0.16, duration: 0.45 }}
          className="space-y-6 xl:col-span-4"
        >
          <SectionHeader title="Roles & Permissions" description="Admin access and team governance." />
          <motion.section whileHover={{ y: -3, scale: 1.003 }} className="rounded-2xl border border-slate-200 bg-[linear-gradient(160deg,rgba(248,248,248,0.86),rgba(245,245,245,0.8))] p-6 shadow-[0_24px_80px_-42px_rgba(0,0,0,0.9)] backdrop-blur-sm transition-all duration-300 hover:border-apex-primary/30 hover:shadow-[0_30px_90px_-46px_rgba(0,0,255,0.42)] sm:p-7">
            <div className="mb-6 flex items-center space-x-3">
              <div className="rounded-xl bg-apex-primary/10 p-3 ring-1 ring-blue-600/20">
                <UserCog className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Admin Role Management</h2>
                <p className="text-sm text-apex-body">Permission visibility for your internal team.</p>
              </div>
            </div>
            <p className="mb-4 text-apex-body">Manage admin users and their access permissions.</p>
            <div className="space-y-3">
              {roleItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white/85 p-5 text-center">
                  <Inbox className="mx-auto mb-2 h-5 w-5 text-blue-400" />
                  <p className="text-sm font-medium text-slate-900">No admin roles found</p>
                  <p className="mt-1 text-xs text-apex-body">Create your first role to start assigning permissions.</p>
                </div>
              ) : (
                roleItems.map((role) => (
                  <motion.div
                    key={role.name}
                    whileHover={{ x: 2 }}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-[#F5F5F5]/45 p-4"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{role.name}</p>
                      <p className="text-sm text-apex-body">{role.description}</p>
                    </div>
                    <span className="rounded-full bg-apex-primary/10 px-3 py-1 text-sm font-medium text-blue-500 ring-1 ring-blue-600/20">
                      {role.status}
                    </span>
                  </motion.div>
                ))
              )}
            </div>
            <motion.button whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-4 w-full rounded-xl bg-gradient-to-r from-blue-700 to-[#4F5DFF] px-6 py-3 font-semibold text-white transition-all duration-300 hover:from-apex-primary hover:to-blue-500 hover:shadow-[0_14px_30px_-15px_rgba(0,0,255,0.9)]">
              Add New Admin
            </motion.button>
          </motion.section>

          <SectionHeader title="Notification Preferences" description="Automated member communication channels." className="pt-2" />
          <motion.section whileHover={{ y: -3, scale: 1.003 }} className="rounded-2xl border border-slate-200 bg-[linear-gradient(160deg,rgba(248,248,248,0.86),rgba(245,245,245,0.8))] p-6 shadow-[0_24px_80px_-42px_rgba(0,0,0,0.9)] backdrop-blur-sm transition-all duration-300 hover:border-apex-primary/30 hover:shadow-[0_30px_90px_-46px_rgba(0,0,255,0.42)] sm:p-7">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-[#F5F5F5]/45 p-4">
                <div>
                  <p className="font-medium text-slate-900">Email Notifications</p>
                  <p className="text-sm text-apex-body">Send automated email notifications</p>
                </div>
                <motion.button
                  type="button"
                  onClick={() => setNotificationToggles((prev) => ({ ...prev, email: !prev.email }))}
                  className={`relative h-6 w-12 rounded-full transition-colors duration-300 ${notificationToggles.email ? 'bg-apex-primary' : 'bg-zinc-700'}`}
                >
                  <motion.span
                    animate={{ x: notificationToggles.email ? 24 : 4 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 30 }}
                    className="absolute top-1 h-4 w-4 rounded-full bg-[#F5F5F5]"
                  />
                </motion.button>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-[#F5F5F5]/45 p-4">
                <div>
                  <p className="font-medium text-slate-900">SMS Notifications</p>
                  <p className="text-sm text-apex-body">Send automated SMS notifications</p>
                </div>
                <motion.button
                  type="button"
                  onClick={() => setNotificationToggles((prev) => ({ ...prev, sms: !prev.sms }))}
                  className={`relative h-6 w-12 rounded-full transition-colors duration-300 ${notificationToggles.sms ? 'bg-apex-primary' : 'bg-zinc-700'}`}
                >
                  <motion.span
                    animate={{ x: notificationToggles.sms ? 24 : 4 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 30 }}
                    className="absolute top-1 h-4 w-4 rounded-full bg-[#F5F5F5]"
                  />
                </motion.button>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-[#F5F5F5]/45 p-4">
                <div>
                  <p className="font-medium text-slate-900">Auto Payment Reminders</p>
                  <p className="text-sm text-apex-body">Automatically remind members of due payments</p>
                </div>
                <motion.button
                  type="button"
                  onClick={() => setNotificationToggles((prev) => ({ ...prev, reminders: !prev.reminders }))}
                  className={`relative h-6 w-12 rounded-full transition-colors duration-300 ${notificationToggles.reminders ? 'bg-apex-primary' : 'bg-zinc-700'}`}
                >
                  <motion.span
                    animate={{ x: notificationToggles.reminders ? 24 : 4 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 30 }}
                    className="absolute top-1 h-4 w-4 rounded-full bg-[#F5F5F5]"
                  />
                </motion.button>
              </div>
            </div>
          </motion.section>
        </motion.div>
      </div>
    </motion.div>
  );
}
