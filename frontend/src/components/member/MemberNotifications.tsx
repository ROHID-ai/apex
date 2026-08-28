import { useEffect, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { memberApi } from '../../api/member';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  platform: string;
  target: string;
  created_at: string;
}

export default function MemberNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    memberApi.getNotifications()
      .then((response) => setItems(response.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-10 h-10 text-apex-primary animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
        <p className="text-apex-body mt-1">Updates, reminders, and messages for your membership.</p>
      </div>
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-apex-body">No notifications available.</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-3"><Bell className="w-5 h-5 text-apex-primary" /><h2 className="text-lg font-bold text-slate-900">{item.title}</h2></div>
              <p className="text-apex-body mb-4">{item.message}</p>
              <div className="flex items-center justify-between text-xs text-apex-body uppercase tracking-wider">
                <span>{item.platform}</span>
                <span>{new Date(item.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}