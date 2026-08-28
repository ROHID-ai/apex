import { useEffect, useState } from 'react';
import { Loader2, Mail, Phone, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';
import MemberPageIntro from './MemberPageIntro';
import { memberCard, memberPage } from './memberStyles';
import { memberApi } from '../../api/member';

interface Profile {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'member';
  phone?: string;
  age?: number;
  membership_type?: string;
  plan?: string;
  status?: string;
  join_date?: string;
  membership_id?: string;
}

export default function MemberProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const response = await memberApi.getProfile();
      setProfile(response.data);
    };

    fetchProfile().catch(console.error);
  }, []);

  if (!profile) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-10 h-10 text-apex-primary animate-spin" /></div>;
  }

  const details = [
    { label: 'Full Name', value: profile.name, icon: UserRound },
    { label: 'Email', value: profile.email, icon: Mail },
    { label: 'Phone', value: profile.phone || 'Not provided', icon: Phone },
    { label: 'Age', value: profile.age ? String(profile.age) : 'Not provided', icon: UserRound },
    { label: 'Membership Type', value: profile.membership_type || profile.plan || 'Unassigned', icon: UserRound },
    { label: 'Membership ID', value: profile.membership_id || 'Pending', icon: UserRound },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={memberPage}>
      <MemberPageIntro description="Your account information and membership identity." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {details.map((detail) => (
          <div key={detail.label} className={memberCard}>
            <div className="mb-3 flex items-center gap-2">
              <detail.icon className="h-4 w-4 text-apex-primary" />
              <h2 className="text-sm font-semibold text-apex-heading">{detail.label}</h2>
            </div>
            <p className="text-sm text-apex-body sm:text-base">{detail.value}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}