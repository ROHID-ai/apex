import { useEffect, useState } from 'react';
import { Activity, Bell, CalendarCheck, ShieldCheck, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { memberApi } from '../../api/member';

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
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-10 h-10 text-apex-primary animate-spin" />
      </div>
    );
  }

  const cards = [
    { label: 'Total Visits', value: data.total_visits, icon: CalendarCheck },
    { label: 'Current Plan', value: data.current_plan || 'Unassigned', icon: Activity },
    { label: 'Membership Status', value: data.membership_status, icon: ShieldCheck },
    { label: 'Notifications', value: data.notification_count, icon: Bell },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Member Dashboard</h1>
        <p className="text-apex-body mt-1">Your attendance, plans, and membership details in one place.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {cards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <card.icon className="w-6 h-6 text-apex-primary" />
              <span className="text-[10px] uppercase tracking-widest text-apex-body">Live</span>
            </div>
            <p className="text-apex-body text-sm">{card.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">{card.value}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}