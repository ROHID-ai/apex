import { useEffect, useState } from 'react';
import { BadgeCheck, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { memberApi } from '../../api/member';

interface MembershipData {
  membership_id: string | null;
  member_id?: string | null;
  name: string;
  email: string;
  plan: string | null;
  membership_type?: string | null;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  payment_status?: string | null;
  join_date: string | null;
}

export default function MembershipDetails() {
  const [details, setDetails] = useState<MembershipData | null>(null);

  useEffect(() => {
    memberApi.getMembership().then((response) => setDetails(response.data)).catch(console.error);
  }, []);

  if (!details) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-10 h-10 text-apex-primary animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6"><BadgeCheck className="w-6 h-6 text-apex-primary" /><h1 className="text-2xl font-bold text-slate-900">Membership Details</h1></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-slate-100 border border-slate-200">
            <p className="text-apex-body text-sm">Membership ID</p>
            <p className="text-xl font-bold text-slate-900 mt-2">{details.membership_id || 'Pending'}</p>
          </div>
          <div className="p-5 rounded-2xl bg-slate-100 border border-slate-200">
            <p className="text-apex-body text-sm">Plan</p>
            <p className="text-xl font-bold text-slate-900 mt-2">{details.membership_type || details.plan || 'Unassigned'}</p>
          </div>
          <div className="p-5 rounded-2xl bg-slate-100 border border-slate-200">
            <p className="text-apex-body text-sm">Status</p>
            <p className="text-xl font-bold text-slate-900 mt-2 capitalize">{details.status}</p>
          </div>
          <div className="p-5 rounded-2xl bg-slate-100 border border-slate-200">
            <p className="text-apex-body text-sm">Join Date</p>
            <p className="text-xl font-bold text-slate-900 mt-2">{details.join_date ? new Date(details.join_date).toLocaleDateString() : '--'}</p>
          </div>
          <div className="p-5 rounded-2xl bg-slate-100 border border-slate-200">
            <p className="text-apex-body text-sm">Membership Start</p>
            <p className="text-xl font-bold text-slate-900 mt-2">{details.start_date ? new Date(details.start_date).toLocaleDateString() : '--'}</p>
          </div>
          <div className="p-5 rounded-2xl bg-slate-100 border border-slate-200">
            <p className="text-apex-body text-sm">Membership End</p>
            <p className="text-xl font-bold text-slate-900 mt-2">{details.end_date ? new Date(details.end_date).toLocaleDateString() : '--'}</p>
          </div>
          <div className="p-5 rounded-2xl bg-slate-100 border border-slate-200">
            <p className="text-apex-body text-sm">Payment Status</p>
            <p className="text-xl font-bold text-slate-900 mt-2 capitalize">{details.payment_status || '--'}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}