import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Users, DollarSign, Activity, UserCheck, Repeat } from 'lucide-react';
import api from '../api';
import { adminApi } from '../api/admin';
import PageHero from './ui/PageHero';
import KpiCard from './ui/KpiCard';
import Card from './ui/Card';
import SectionHeader from './ui/SectionHeader';

interface Summary {
  growth_rate: number;
  total_members: number;
  revenue_growth: number;
  average_attendance_per_day: number;
}

interface MemberRow {
  plan?: string;
  membership_type?: string;
  status: string;
  join_date?: string;
  created_at?: string;
}

interface PaymentRow {
  amount: number;
  status: string;
  date: string;
}

interface AttendanceLog {
  check_in: string;
  check_out?: string | null;
}

function lastMonths(count: number) {
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-US', { month: 'short' });
    months.push({ key, label });
  }
  return months;
}

function monthKey(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function ReportsAnalytics() {
  const [summary, setSummary] = useState<Summary>({
    growth_rate: 0,
    total_members: 0,
    revenue_growth: 0,
    average_attendance_per_day: 0,
  });
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [summaryRes, membersRes, paymentsRes, logsRes] = await Promise.all([
          api.get('/reports/summary'),
          adminApi.getMembers(''),
          api.get('/payments'),
          api.get('/attendance/logs'),
        ]);
        setSummary(summaryRes.data);
        setMembers(membersRes.data);
        setPayments(paymentsRes.data);
        setLogs(logsRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const months = useMemo(() => lastMonths(6), []);

  const memberGrowth = useMemo(() => {
    const counts = new Map(months.map((m) => [m.key, 0]));
    members.forEach((member) => {
      const key = monthKey(member.join_date || member.created_at || '');
      if (key && counts.has(key)) counts.set(key, (counts.get(key) || 0) + 1);
    });
    let runningTotal = members.filter((member) => {
      const joined = new Date(member.join_date || member.created_at || 0);
      const firstMonth = new Date(months[0].key + '-01');
      return !Number.isNaN(joined.getTime()) && joined < firstMonth;
    }).length;

    return months.map((month) => {
      runningTotal += counts.get(month.key) || 0;
      return { month: month.label, members: runningTotal };
    });
  }, [members, months]);

  const incomeData = useMemo(() => {
    const totals = new Map(months.map((m) => [m.key, 0]));
    payments
      .filter((payment) => payment.status === 'paid')
      .forEach((payment) => {
        const key = monthKey(payment.date);
        if (key && totals.has(key)) totals.set(key, (totals.get(key) || 0) + payment.amount);
      });
    return months.map((month) => ({
      month: month.label,
      income: totals.get(month.key) || 0,
    }));
  }, [payments, months]);

  const attendanceByPeriod = useMemo(() => {
    const buckets = { morning: 0, afternoon: 0, evening: 0 };
    logs.forEach((log) => {
      const hour = new Date(log.check_in).getHours();
      if (Number.isNaN(hour)) return;
      if (hour >= 6 && hour < 12) buckets.morning += 1;
      else if (hour >= 12 && hour < 18) buckets.afternoon += 1;
      else if (hour >= 18 && hour < 22) buckets.evening += 1;
    });
    const total = buckets.morning + buckets.afternoon + buckets.evening || 1;
    return [
      { label: 'Morning (6AM - 12PM)', value: Math.round((buckets.morning / total) * 100) },
      { label: 'Afternoon (12PM - 6PM)', value: Math.round((buckets.afternoon / total) * 100) },
      { label: 'Evening (6PM - 10PM)', value: Math.round((buckets.evening / total) * 100) },
    ];
  }, [logs]);

  const retentionMetrics = useMemo(() => {
    const active = members.filter((member) => member.status === 'active').length;
    const total = members.length || 1;
    const activeRate = Math.round((active / total) * 100);
    const renewed = members.filter((member) => {
      const joined = new Date(member.join_date || member.created_at || 0);
      if (Number.isNaN(joined.getTime())) return false;
      const daysSinceJoin = Math.floor((Date.now() - joined.getTime()) / 86400000);
      return member.status === 'active' && daysSinceJoin >= 30;
    }).length;
    const renewalRate = active > 0 ? Math.round((renewed / active) * 100) : 0;
    const churnRisk = Math.max(0, 100 - activeRate);
    return [
      { label: 'Active Member Rate', value: activeRate },
      { label: '30+ Day Active', value: renewalRate },
      { label: 'Inactive / Other', value: churnRisk },
    ];
  }, [members]);

  const planDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    members.forEach((member) => {
      const plan = (member.plan || member.membership_type || 'Unassigned').trim() || 'Unassigned';
      counts.set(plan, (counts.get(plan) || 0) + 1);
    });
    const total = members.length || 1;
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, count]) => ({
        label,
        value: Math.round((count / total) * 100),
      }));
  }, [members]);

  const sessionStats = useMemo(() => {
    const durations = logs
      .filter((log) => log.check_out)
      .map((log) => {
        const start = new Date(log.check_in).getTime();
        const end = new Date(log.check_out || '').getTime();
        if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
        return Math.round((end - start) / 60000);
      })
      .filter((mins) => mins > 0);

    const avgSession = durations.length
      ? `${Math.round(durations.reduce((sum, mins) => sum + mins, 0) / durations.length)}m`
      : '—';

    const memberVisitCounts = new Map<string, number>();
    logs.forEach((log) => {
      const day = new Date(log.check_in).toDateString();
      const key = day;
      memberVisitCounts.set(key, (memberVisitCounts.get(key) || 0) + 1);
    });
    const repeatDays = [...memberVisitCounts.values()].filter((count) => count > 1).length;
    const repeatPct = memberVisitCounts.size
      ? Math.round((repeatDays / memberVisitCounts.size) * 100)
      : 0;

    const activeMembers = members.filter((member) => member.status === 'active').length || 1;
    const activeRate = Math.round((activeMembers / Math.max(members.length, 1)) * 100);

    return [
      { label: 'Active Members', value: `${activeRate}%`, icon: UserCheck },
      { label: 'Busy Days (2+ visits)', value: `${repeatPct}%`, icon: Repeat },
      { label: 'Avg. Session Length', value: avgSession, icon: Activity },
    ];
  }, [logs, members]);

  const newMembersThisMonth = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return members.filter((member) => {
      const joined = new Date(member.join_date || member.created_at || 0);
      return !Number.isNaN(joined.getTime()) && joined >= monthStart;
    }).length;
  }, [members]);

  const maxMembers = Math.max(...memberGrowth.map((m) => m.members), 1);
  const maxIncome = Math.max(...incomeData.map((i) => i.income), 1);

  const renderBarChart = (
    data: { label: string; value: number; display: string }[],
    max: number,
    emptyMessage: string,
  ) => {
    const hasData = data.some((item) => item.value > 0);
    if (!hasData) {
      return (
        <div className="flex h-48 items-center justify-center rounded-btn border border-dashed border-apex-border bg-apex-surface p-4 text-sm text-apex-body">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="rounded-btn border border-apex-border bg-apex-surface p-4">
        <div className="flex h-48 items-end gap-3 border-b border-apex-border pb-3">
          {data.map((item) => (
            <div key={item.label} className="group flex flex-1 flex-col items-center justify-end gap-2">
              <span className="text-xs font-semibold text-apex-heading opacity-0 transition-opacity group-hover:opacity-100">
                {item.display}
              </span>
              <div
                className="w-full max-w-[48px] rounded-t-md bg-gradient-to-t from-apex-primary to-[#6B76FF]"
                style={{ height: `${Math.max((item.value / max) * 100, 8)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between gap-2">
          {data.map((item) => (
            <span key={item.label} className="flex-1 text-center text-xs font-semibold text-apex-body">
              {item.label}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderProgress = (label: string, value: number) => (
    <div key={label}>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-apex-body">{label}</span>
        <span className="font-semibold text-apex-heading">{value}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-pill bg-slate-200">
        <div className="h-full rounded-pill bg-gradient-to-r from-apex-primary to-[#6B76FF]" style={{ width: `${value}%` }} />
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHero
        badge="Analytics"
        title="Reports & Insights"
        description="Executive reporting with membership, attendance, revenue, and retention metrics from your live database."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Growth Rate" value={`${summary.growth_rate}%`} change="This month" icon={TrendingUp} />
        <KpiCard
          title="Total Members"
          value={summary.total_members.toString()}
          change={newMembersThisMonth > 0 ? `+${newMembersThisMonth} new` : 'No new members'}
          icon={Users}
        />
        <KpiCard title="Revenue Growth" value={`${summary.revenue_growth}%`} change="Month over month" icon={DollarSign} />
        <KpiCard title="Avg Attendance" value={summary.average_attendance_per_day.toString()} change="Per day" icon={Activity} />
      </div>

      {loading ? (
        <div className="rounded-xl border border-apex-border bg-apex-surface p-8 text-center text-sm text-apex-body">
          Loading report data...
        </div>
      ) : (
        <>
          <section>
            <SectionHeader title="Performance Charts" description="Trend analysis across core business metrics." />
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <Card title="Membership Growth" description="Cumulative members over the last 6 months">
                {renderBarChart(
                  memberGrowth.map((d) => ({
                    label: d.month,
                    value: d.members,
                    display: d.members.toString(),
                  })),
                  maxMembers,
                  'No member data yet.',
                )}
              </Card>

              <Card title="Revenue Trends" description="Paid revenue over the last 6 months">
                {renderBarChart(
                  incomeData.map((d) => ({
                    label: d.month,
                    value: d.income,
                    display: d.income > 0 ? `$${(d.income / 1000).toFixed(1)}k` : '$0',
                  })),
                  maxIncome,
                  'No payment data yet.',
                )}
              </Card>

              <Card title="Attendance Trends" description="Check-ins by time of day">
                <div className="space-y-4">
                  {logs.length === 0 ? (
                    <p className="text-sm text-apex-body">No attendance records yet.</p>
                  ) : (
                    attendanceByPeriod.map((item) => renderProgress(item.label, item.value))
                  )}
                </div>
              </Card>

              <Card title="Retention Metrics" description="Member status from live records">
                <div className="space-y-4">
                  {members.length === 0 ? (
                    <p className="text-sm text-apex-body">No members yet.</p>
                  ) : (
                    retentionMetrics.map((item) => renderProgress(item.label, item.value))
                  )}
                </div>
              </Card>
            </div>
          </section>

          <section>
            <SectionHeader title="Plan Distribution" description="Membership mix across tiers." />
            <Card>
              {planDistribution.length === 0 ? (
                <p className="text-sm text-apex-body">No plan assignments yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {planDistribution.map((item) => renderProgress(item.label, item.value))}
                </div>
              )}
            </Card>
          </section>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {sessionStats.map((item) => (
              <div key={item.label} className="apex-card flex items-center gap-3 p-4">
                <div className="rounded-btn bg-apex-primary-light p-2 text-apex-primary">
                  <item.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm text-apex-body">{item.label}</p>
                  <p className="text-lg font-bold text-apex-heading">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
