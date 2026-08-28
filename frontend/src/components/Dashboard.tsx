import {
  Users,
  UserCheck,
  Calendar,
  DollarSign,
  RefreshCw,
  UserPlus,
  CreditCard,
  QrCode,
  Dumbbell,
  Bell,
  Clock,
  Loader2,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import KpiCard from './ui/KpiCard';
import Card from './ui/Card';
import SectionHeader from './ui/SectionHeader';
import AttendanceHeatmap from './ui/AttendanceHeatmap';
import { useDashboardData } from '../hooks/useDashboardData';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const m = useDashboardData();

  const quickActions = [
    { label: 'Add Member', icon: UserPlus, page: 'members' },
    { label: 'Record Payment', icon: CreditCard, page: 'payments' },
    { label: 'Generate QR', icon: QrCode, page: 'attendance' },
    { label: 'Create Workout Plan', icon: Dumbbell, page: 'diet-workout' },
    { label: 'Send Notification', icon: Bell, page: 'notifications' },
  ];

  if (m.loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-apex-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-apex-muted">Operations</p>
          <h1 className="text-xl font-bold text-apex-heading sm:text-2xl">Enterprise Dashboard</h1>
          <p className="mt-1 text-sm text-apex-body">Real-time gym performance, attendance, and revenue intelligence.</p>
        </div>
        <div className="flex items-center gap-2 rounded-btn border border-apex-border bg-white px-3 py-2 text-sm text-apex-body">
          <Clock className="h-4 w-4 text-apex-primary" />
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* Row 1 — Primary KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Total Members" value={m.totalMembers.toString()} icon={Users} />
        <KpiCard title="Active Members" value={m.activeMembers.toString()} icon={UserCheck} />
        <KpiCard title="Today's Attendance" value={m.attendanceToday.toString()} icon={Calendar} />
        <KpiCard title="Revenue" value={`$${m.revenue.toLocaleString()}`} icon={DollarSign} />
        <KpiCard title="Membership Renewals" value={m.membershipRenewals.toString()} icon={RefreshCw} />
      </div>

      {/* Row 2 — Trend + Activity */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-10">
        <Card className="xl:col-span-7" title="Attendance Trend" description="Daily check-ins · last 12 months">
          <div className="rounded-btn border border-apex-border bg-apex-surface px-3 py-3">
            <AttendanceHeatmap days={m.attendanceHeatmap} />
          </div>
        </Card>

        <Card className="xl:col-span-3" title="Recent Activity" description="Compact operational feed">
          <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
            {m.recentActivity.length === 0 ? (
              <p className="text-sm text-apex-body">No recent activity recorded.</p>
            ) : (
              m.recentActivity.map((item) => (
                <div
                  key={`${item.type}-${item.member}-${item.sortKey}`}
                  className="flex items-start gap-2 rounded-btn border border-apex-border/80 bg-apex-surface px-2.5 py-2"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-apex-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-apex-heading">{item.type}</p>
                    <p className="truncate text-[11px] text-apex-body">
                      {item.member} · {item.time}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Row 3 — Operational widgets + Quick Actions */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="apex-card p-4">
          <p className="text-sm font-medium text-apex-body">Expiring Memberships</p>
          <p className="mt-1 text-2xl font-bold text-apex-heading">{m.expiringMemberships}</p>
          <p className="mt-1 text-xs text-apex-body">Due within 7 days</p>
        </div>
        <div className="apex-card p-4">
          <p className="text-sm font-medium text-apex-body">Pending Payments</p>
          <p className="mt-1 text-2xl font-bold text-apex-heading">{m.pendingPayments}</p>
          <p className="mt-1 text-xs text-apex-body">${m.outstandingPayments.toLocaleString()} outstanding</p>
        </div>
        <div className="apex-card p-4">
          <p className="text-sm font-medium text-apex-body">New Registrations</p>
          <p className="mt-1 text-2xl font-bold text-apex-heading">{m.newRegistrations}</p>
          <p className="mt-1 text-xs text-apex-body">Last 7 days</p>
        </div>
        <div className="apex-card p-4">
          <SectionHeader title="Quick Actions" description="Common admin workflows" className="mb-3" />
          <div className="grid grid-cols-1 gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => onNavigate(action.page)}
                className="flex items-center gap-2 rounded-btn border border-apex-border bg-apex-surface px-3 py-2 text-left text-sm font-medium text-apex-heading hover:border-apex-primary/30 hover:bg-apex-primary-light"
              >
                <action.icon className="h-4 w-4 shrink-0 text-apex-primary" />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4 — Attendance + Revenue analytics */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Attendance Analytics" description="Today's operational attendance metrics">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Present Today', value: m.presentToday.toString(), icon: UserCheck },
              { label: 'Absent Today', value: m.absentToday.toString(), icon: AlertCircle },
              { label: 'Weekly Attendance', value: `${m.weeklyAttendancePct}%`, icon: TrendingUp },
              { label: 'Peak Hours', value: m.peakHours, icon: Clock },
            ].map((item) => (
              <div key={item.label} className="rounded-btn border border-apex-border bg-apex-surface p-3">
                <div className="mb-2 flex items-center gap-2 text-apex-primary">
                  <item.icon className="h-4 w-4" />
                  <span className="text-xs font-medium text-apex-body">{item.label}</span>
                </div>
                <p className="text-lg font-bold text-apex-heading">{item.value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Revenue Analytics" description="Collections and receivables overview">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Daily Revenue', value: `$${m.dailyRevenue.toLocaleString()}` },
              { label: 'Weekly Revenue', value: `$${m.weeklyRevenue.toLocaleString()}` },
              { label: 'Monthly Revenue', value: `$${m.monthlyRevenue.toLocaleString()}` },
              { label: 'Outstanding', value: `$${m.outstandingPayments.toLocaleString()}` },
            ].map((item) => (
              <div key={item.label} className="rounded-btn border border-apex-border bg-apex-surface p-3">
                <p className="text-xs font-medium text-apex-body">{item.label}</p>
                <p className="mt-1 text-lg font-bold text-apex-heading">{item.value}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
