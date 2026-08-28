import { useEffect, useState } from 'react';
import { Activity, Bell, CalendarCheck, ShieldCheck, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { memberApi } from '../../api/member';
import MemberPageIntro from './MemberPageIntro';
import { memberCard, memberPage, memberStatGrid } from './memberStyles';

interface DashboardData {
  total_visits: number;
  current_plan: string | null;
  membership_status: string;
  notification_count: number;
}

export default function MemberDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await memberApi.getDashboard();
        setData(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-apex-primary" />
      </div>
    );
  }

  const cards = [
    { label: 'Total Visits', value: data.total_visits, icon: CalendarCheck },
    { label: 'Current Plan', value: data.current_plan || 'Unassigned', icon: Activity },
    { label: 'Membership', value: data.membership_status, icon: ShieldCheck },
    { label: 'Notifications', value: data.notification_count, icon: Bell },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={memberPage}>
      <MemberPageIntro description="Your attendance, plans, and membership details in one place." />

      <div className={memberStatGrid}>
        {cards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={memberCard}
          >
            <div className="mb-3 flex items-center justify-between">
              <card.icon className="h-5 w-5 text-apex-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-apex-muted">Live</span>
            </div>
            <p className="text-xs text-apex-body sm:text-sm">{card.label}</p>
            <p className="mt-1 truncate text-xl font-bold capitalize text-apex-heading sm:text-2xl">{card.value}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
