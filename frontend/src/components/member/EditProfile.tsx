import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { memberApi } from '../../api/member';

interface ProfileForm {
  name: string;
  phone: string;
  age: string;
  membership_type: string;
}

export default function EditProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState<ProfileForm>({
    name: '',
    phone: '',
    age: '',
    membership_type: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const response = await memberApi.getProfile();
        const profile = response.data;
        setForm({
          name: profile.name || '',
          phone: profile.phone || '',
          age: profile.age ? String(profile.age) : '',
          membership_type: profile.membership_type || profile.plan || '',
        });
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Unable to load profile');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      await memberApi.updateProfile({
        name: form.name,
        phone: form.phone,
        age: form.age ? Number(form.age) : undefined,
        membership_type: form.membership_type || undefined,
      });
      setMessage('Profile updated successfully');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-10 h-10 text-apex-primary animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Edit Profile</h1>
        <p className="text-apex-body mt-1">Update your personal details.</p>
      </div>

      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 max-w-2xl">
        {error ? <div className="text-sm text-blue-500 bg-apex-primary/10 border border-apex-primary/30 rounded-xl px-4 py-3">{error}</div> : null}
        {message ? <div className="text-sm text-blue-400 bg-apex-primary/10 border border-apex-primary/30 rounded-xl px-4 py-3">{message}</div> : null}

        <div>
          <label className="block text-sm text-apex-body mb-2">Name</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-apex-primary"
          />
        </div>

        <div>
          <label className="block text-sm text-apex-body mb-2">Phone</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-apex-primary"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-apex-body mb-2">Age</label>
            <input
              type="number"
              min={0}
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-apex-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-apex-body mb-2">Membership Type</label>
            <input
              type="text"
              value={form.membership_type}
              onChange={(e) => setForm({ ...form, membership_type: e.target.value })}
              className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-apex-primary"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 bg-apex-primary hover:bg-apex-primary-hover text-white font-semibold rounded-xl transition-all disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </form>
    </motion.div>
  );
}
