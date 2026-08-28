import { useEffect, useState } from 'react';
import api from '../api';
import { adminApi } from '../api/admin';

export interface ActivityItem {
  type: string;
  member: string;
  time: string;
  sortKey: number;
}

export interface DashboardMetrics {
  totalMembers: number;
  activeMembers: number;
  attendanceToday: number;
  revenue: number;
  membershipRenewals: number;
  presentToday: number;
  absentToday: number;
  weeklyAttendancePct: number;
  peakHours: string;
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  outstandingPayments: number;
  pendingPayments: number;
  newRegistrations: number;
  expiringMemberships: number;
  attendanceTrend: { label: string; value: number }[];
  attendanceHeatmap: { date: string; count: number }[];
  recentActivity: ActivityItem[];
  loading: boolean;
}

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} day ago`;
}

export function useDashboardData() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalMembers: 0,
    activeMembers: 0,
    attendanceToday: 0,
    revenue: 0,
    membershipRenewals: 0,
    presentToday: 0,
    absentToday: 0,
    weeklyAttendancePct: 0,
    peakHours: '—',
    dailyRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    outstandingPayments: 0,
    pendingPayments: 0,
    newRegistrations: 0,
    expiringMemberships: 0,
    attendanceTrend: [],
    attendanceHeatmap: [],
    recentActivity: [],
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [statsRes, attendanceStatsRes, paymentsRes, logsRes, membersRes, historyRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/attendance/stats'),
          api.get('/payments'),
          api.get('/attendance/logs'),
          adminApi.getMembers(''),
          api.get('/plan-assignments/history').catch(() => ({ data: [] })),
        ]);

        if (cancelled) return;

        const stats = statsRes.data;
        const attendanceStats = attendanceStatsRes.data;
        const payments: Array<{ amount: number; status: string; date: string; member_name: string }> = paymentsRes.data;
        const logs: Array<{ check_in: string; member_name: string }> = logsRes.data;
        const members: Array<{ join_date?: string; status: string; name: string; created_at?: string }> = membersRes.data;
        const history: Array<{ plan_name: string; created_at: string; plan_type: string }> = historyRes.data || [];

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfDay);
        startOfWeek.setDate(startOfWeek.getDate() - 6);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const dailyRevenue = payments
          .filter((p) => p.status === 'paid' && new Date(p.date) >= startOfDay)
          .reduce((sum, p) => sum + p.amount, 0);

        const weeklyRevenue = payments
          .filter((p) => p.status === 'paid' && new Date(p.date) >= startOfWeek)
          .reduce((sum, p) => sum + p.amount, 0);

        const monthlyRevenue = payments
          .filter((p) => p.status === 'paid' && new Date(p.date) >= startOfMonth)
          .reduce((sum, p) => sum + p.amount, 0);

        const pendingPayments = payments.filter((p) => p.status === 'pending');
        const outstandingPayments = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

        const sevenDaysAgo = new Date(startOfDay);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

        const newRegistrations = members.filter((m) => {
          const joined = new Date(m.join_date || m.created_at || 0);
          return joined >= sevenDaysAgo;
        }).length;

        const expiringMemberships = members.filter((m) => {
          if (m.status !== 'active') return false;
          const joined = new Date(m.join_date || m.created_at || 0);
          const daysSinceJoin = Math.floor((now.getTime() - joined.getTime()) / 86400000);
          return daysSinceJoin >= 23 && daysSinceJoin <= 30;
        }).length;

        const membershipRenewals = members.filter((m) => m.status === 'active').length;

        const trendMap = new Map<string, number>();
        for (let i = 6; i >= 0; i -= 1) {
          const d = new Date(startOfDay);
          d.setDate(d.getDate() - i);
          trendMap.set(d.toDateString(), 0);
        }
        logs.forEach((log) => {
          const key = new Date(log.check_in).toDateString();
          if (trendMap.has(key)) trendMap.set(key, (trendMap.get(key) || 0) + 1);
        });
        const attendanceTrend = Array.from(trendMap.entries()).map(([key, value]) => ({
          label: dayLabels[new Date(key).getDay()],
          value,
        }));

        const heatmapStart = new Date(startOfDay);
        heatmapStart.setDate(heatmapStart.getDate() - 364);
        const heatmapMap = new Map<string, number>();
        for (let d = new Date(heatmapStart); d <= startOfDay; d.setDate(d.getDate() + 1)) {
          const y = d.getFullYear();
          const mo = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          heatmapMap.set(`${y}-${mo}-${day}`, 0);
        }
        logs.forEach((log) => {
          const d = new Date(log.check_in);
          if (Number.isNaN(d.getTime()) || d < heatmapStart) return;
          const y = d.getFullYear();
          const mo = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const key = `${y}-${mo}-${day}`;
          if (heatmapMap.has(key)) heatmapMap.set(key, (heatmapMap.get(key) || 0) + 1);
        });
        const attendanceHeatmap = Array.from(heatmapMap.entries()).map(([date, count]) => ({
          date,
          count,
        }));

        const weekCheckIns = logs.filter((log) => new Date(log.check_in) >= startOfWeek).length;
        const weeklyDenominator = Math.max(stats.active_members * 7, 1);
        const weeklyAttendancePct = Math.min(100, Math.round((weekCheckIns / weeklyDenominator) * 100));

        const hourCounts = new Map<number, number>();
        logs
          .filter((log) => new Date(log.check_in).toDateString() === startOfDay.toDateString())
          .forEach((log) => {
            const hour = new Date(log.check_in).getHours();
            hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
          });
        let peakHours = '—';
        if (hourCounts.size > 0) {
          const peak = [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0];
          const end = peak[0] + 1;
          peakHours = `${peak[0] % 12 || 12}${peak[0] >= 12 ? 'PM' : 'AM'} – ${end % 12 || 12}${end >= 12 ? 'PM' : 'AM'}`;
        }

        const activity: ActivityItem[] = [
          ...logs.slice(0, 6).map((log) => ({
            type: 'Check-in',
            member: log.member_name,
            time: formatRelativeTime(log.check_in),
            sortKey: new Date(log.check_in).getTime(),
          })),
          ...payments.slice(0, 6).map((payment) => ({
            type: 'Payment',
            member: payment.member_name,
            time: formatRelativeTime(payment.date),
            sortKey: new Date(payment.date).getTime(),
          })),
          ...members
            .filter((m) => m.join_date || m.created_at)
            .slice(0, 4)
            .map((member) => ({
              type: 'New Member',
              member: member.name,
              time: formatRelativeTime(member.join_date || member.created_at || ''),
              sortKey: new Date(member.join_date || member.created_at || 0).getTime(),
            })),
          ...history.slice(0, 4).map((item) => ({
            type: 'Plan Assignment',
            member: item.plan_name,
            time: formatRelativeTime(item.created_at),
            sortKey: new Date(item.created_at).getTime(),
          })),
        ]
          .sort((a, b) => b.sortKey - a.sortKey)
          .slice(0, 8);

        setMetrics({
          totalMembers: stats.total_members,
          activeMembers: stats.active_members,
          attendanceToday: stats.attendance_today,
          revenue: stats.revenue,
          membershipRenewals,
          presentToday: attendanceStats.present_now,
          absentToday: Math.max(0, stats.active_members - stats.attendance_today),
          weeklyAttendancePct,
          peakHours,
          dailyRevenue,
          weeklyRevenue,
          monthlyRevenue,
          outstandingPayments,
          pendingPayments: pendingPayments.length,
          newRegistrations,
          expiringMemberships,
          attendanceTrend,
          attendanceHeatmap,
          recentActivity: activity,
          loading: false,
        });
      } catch (err) {
        console.error(err);
        if (!cancelled) setMetrics((prev) => ({ ...prev, loading: false }));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return metrics;
}
