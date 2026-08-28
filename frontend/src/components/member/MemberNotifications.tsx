import { useEffect, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import MemberPageIntro from './MemberPageIntro';
import { memberCard, memberCardTitle, memberPage } from './memberStyles';
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={memberPage}>
      <MemberPageIntro description="Updates, reminders, and messages for your membership." />
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className={`${memberCard} text-sm text-apex-body`}>No notifications available.</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className={memberCard}>
              <div className="mb-2 flex items-center gap-2">
                <Bell className="h-4 w-4 text-apex-primary" />
                <h2 className={memberCardTitle}>{item.title}</h2>
              </div>
              <p className="mb-3 text-sm text-apex-body">{item.message}</p>
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-apex-muted">
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