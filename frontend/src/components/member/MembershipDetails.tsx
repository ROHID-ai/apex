import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { memberApi } from '../../api/member';
import MemberPageIntro from './MemberPageIntro';
import { memberCard, memberPage } from './memberStyles';

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

const fields = (details: MembershipData) => [
  { label: 'Membership ID', value: details.membership_id || 'Pending' },
  { label: 'Plan', value: details.membership_type || details.plan || 'Unassigned' },
  { label: 'Status', value: details.status },
  { label: 'Join Date', value: details.join_date ? new Date(details.join_date).toLocaleDateString() : '—' },
  { label: 'Membership Start', value: details.start_date ? new Date(details.start_date).toLocaleDateString() : '—' },
  { label: 'Membership End', value: details.end_date ? new Date(details.end_date).toLocaleDateString() : '—' },
  { label: 'Payment Status', value: details.payment_status || '—' },
];

export default function MembershipDetails() {
  const [details, setDetails] = useState<MembershipData | null>(null);

  useEffect(() => {
    memberApi.getMembership().then((response) => setDetails(response.data)).catch(console.error);
  }, []);

  if (!details) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-apex-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={memberPage}>
      <MemberPageIntro description="Your active membership plan, dates, and payment status." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {fields(details).map((field) => (
          <div key={field.label} className={`${memberCard} bg-apex-surface/50`}>
            <p className="text-xs text-apex-body sm:text-sm">{field.label}</p>
            <p className="mt-1 text-lg font-semibold capitalize text-apex-heading sm:text-xl">{field.value}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
