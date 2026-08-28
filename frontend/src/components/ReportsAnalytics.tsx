import { useEffect, useState } from 'react';
import { TrendingUp, Users, DollarSign, Activity, UserCheck, Repeat } from 'lucide-react';
import api from '../api';
import PageHero from './ui/PageHero';
import KpiCard from './ui/KpiCard';
import Card from './ui/Card';
import SectionHeader from './ui/SectionHeader';

export default function ReportsAnalytics() {
  const [summary, setSummary] = useState({
    growth_rate: 0,
    total_members: 0,
    revenue_growth: 0,
    average_attendance_per_day: 0,
  });

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await api.get('/reports/summary');
      setSummary(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const memberGrowth = [
    { month: 'Jul', members: 180 },
    { month: 'Aug', members: 195 },
    { month: 'Sep', members: 210 },
    { month: 'Oct', members: 225 },
    { month: 'Nov', members: 235 },
    { month: 'Dec', members: 248 },
  ];

  const incomeData = [
    { month: 'Jul', income: 14200 },
    { month: 'Aug', income: 15800 },
    { month: 'Sep', income: 16500 },
    { month: 'Oct', income: 17200 },
    { month: 'Nov', income: 17800 },
    { month: 'Dec', income: 18420 },
  ];

  const maxMembers = Math.max(...memberGrowth.map((m) => m.members));
  const maxIncome = Math.max(...incomeData.map((i) => i.income));

  const renderBarChart = (
    data: { label: string; value: number; display: string }[],
    max: number,
  ) => (
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
        description="Executive reporting with membership, attendance, revenue, and retention metrics."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Growth Rate" value={`${summary.growth_rate}%`} change="Last 6 months" icon={TrendingUp} />
        <KpiCard title="Total Members" value={summary.total_members.toString()} change="+68 new" icon={Users} />
        <KpiCard title="Revenue Growth" value={`${summary.revenue_growth}%`} change="Last 6 months" icon={DollarSign} />
        <KpiCard title="Avg Attendance" value={summary.average_attendance_per_day.toString()} change="Per day" icon={Activity} />
      </div>

      <section>
        <SectionHeader title="Performance Charts" description="Trend analysis across core business metrics." />
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card title="Membership Growth" description="Monthly member acquisition trend">
            {renderBarChart(
              memberGrowth.map((d) => ({
                label: d.month,
                value: d.members,
                display: d.members.toString(),
              })),
              maxMembers,
            )}
          </Card>

          <Card title="Revenue Trends" description="Monthly revenue performance">
            {renderBarChart(
              incomeData.map((d) => ({
                label: d.month,
                value: d.income,
                display: `$${(d.income / 1000).toFixed(1)}k`,
              })),
              maxIncome,
            )}
          </Card>

          <Card title="Attendance Trends" description="Peak usage by time of day">
            <div className="space-y-4">
              {renderProgress('Morning (6AM - 12PM)', 65)}
              {renderProgress('Afternoon (12PM - 6PM)', 45)}
              {renderProgress('Evening (6PM - 10PM)', 85)}
            </div>
          </Card>

          <Card title="Retention Metrics" description="Member engagement and renewal health">
            <div className="space-y-4">
              {renderProgress('30-Day Retention', 88)}
              {renderProgress('Renewal Rate', 72)}
              {renderProgress('Churn Risk (High)', 14)}
            </div>
          </Card>
        </div>
      </section>

      <section>
        <SectionHeader title="Plan Distribution" description="Membership mix across tiers." />
        <Card>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {renderProgress('Basic Plan', 28)}
            {renderProgress('Standard Plan', 42)}
            {renderProgress('Premium Plan', 30)}
          </div>
        </Card>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Active Members', value: '82%', icon: UserCheck },
          { label: 'Repeat Visits', value: '64%', icon: Repeat },
          { label: 'Avg. Session Length', value: '58m', icon: Activity },
        ].map((item) => (
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
    </div>
  );
}
