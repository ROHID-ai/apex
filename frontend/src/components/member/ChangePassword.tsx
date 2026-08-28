import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { memberApi } from '../../api/member';
import MemberPageIntro from './MemberPageIntro';
import { memberCard, memberPage } from './memberStyles';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const response = await memberApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setMessage(response.data.message || 'Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={memberPage}>
      <MemberPageIntro description="Keep your account secure with a strong password." />

      <form onSubmit={submit} className={`${memberCard} mx-auto max-w-2xl space-y-4`}>
        {error ? <div className="text-sm text-blue-500 bg-apex-primary/10 border border-apex-primary/30 rounded-xl px-4 py-3">{error}</div> : null}
        {message ? <div className="text-sm text-blue-400 bg-apex-primary/10 border border-apex-primary/30 rounded-xl px-4 py-3">{message}</div> : null}

        <div>
          <label className="block text-sm text-apex-body mb-2">Current Password</label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-apex-primary"
          />
        </div>

        <div>
          <label className="block text-sm text-apex-body mb-2">New Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-apex-primary"
          />
        </div>

        <div>
          <label className="block text-sm text-apex-body mb-2">Confirm New Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-apex-primary"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 bg-apex-primary hover:bg-apex-primary-hover text-white font-semibold rounded-xl transition-all disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          Update Password
        </button>
      </form>
    </motion.div>
  );
}
