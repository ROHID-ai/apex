import { useState, useEffect, useMemo } from 'react';
import { Search, Download, Plus, Loader2, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import api from '../api';
import PageHero from './ui/PageHero';
import Button from './ui/Button';
import Card from './ui/Card';
import SectionHeader from './ui/SectionHeader';
import EmptyState from './ui/EmptyState';
import Badge from './ui/Badge';

interface Payment {
  id: number;
  amount: number;
  status: string;
  date: string;
  method: string;
  member_name: string;
}

interface Member {
  id: number;
  name: string;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function PaymentManagement() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    user_id: 0,
    amount: '',
    method: 'cash',
    status: 'paid',
  });

  useEffect(() => {
    fetchPayments();
    fetchMembers();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await api.get('/payments');
      setPayments(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await api.get('/members');
      setMembers(response.data);
      if (response.data.length > 0) {
        setFormData((prev) => ({ ...prev, user_id: response.data[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.user_id || !formData.amount) return;
    setSubmitting(true);
    try {
      await api.post('/payments', {
        user_id: formData.user_id,
        amount: Number(formData.amount),
        method: formData.method,
        status: formData.status,
      });
      setShowAddModal(false);
      setFormData((prev) => ({ ...prev, amount: '', method: 'cash', status: 'paid' }));
      fetchPayments();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const revenue = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const paid = payments.filter((p) => p.status === 'paid');
    const pending = payments.filter((p) => p.status === 'pending');

    const sum = (list: Payment[]) => list.reduce((acc, p) => acc + p.amount, 0);

    const daily = sum(paid.filter((p) => new Date(p.date) >= todayStart));
    const weekly = sum(paid.filter((p) => new Date(p.date) >= weekStart));
    const monthly = sum(paid.filter((p) => new Date(p.date) >= monthStart));
    const outstanding = sum(pending);

    const monthPaid = paid.filter((p) => new Date(p.date) >= monthStart);

    return { daily, weekly, monthly, outstanding, pending, monthPaid };
  }, [payments]);

  const filteredPayments = payments.filter((p) => {
    const q = searchTerm.toLowerCase();
    if (!q) return true;
    return (
      p.member_name.toLowerCase().includes(q) ||
      p.method.toLowerCase().includes(q) ||
      p.status.toLowerCase().includes(q) ||
      `TX-${p.id}`.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <PageHero
        badge="Finances"
        title="Payment Management"
        description="Track transactions, record payments, and monitor collections at a glance."
        action={
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            Record Payment
          </Button>
        }
      />

      <section>
        <SectionHeader title="Revenue Summary" description="Daily, weekly, and monthly collection overview." />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: 'Daily Revenue', value: `$${revenue.daily.toLocaleString()}`, icon: DollarSign },
            { label: 'Weekly Revenue', value: `$${revenue.weekly.toLocaleString()}`, icon: Calendar },
            { label: 'Monthly Revenue', value: `$${revenue.monthly.toLocaleString()}`, icon: Calendar },
            { label: 'Outstanding Payments', value: `$${revenue.outstanding.toLocaleString()}`, icon: AlertCircle },
          ].map((item) => (
            <div key={item.label} className="apex-card p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-apex-body">{item.label}</p>
                <item.icon className="h-4 w-4 shrink-0 text-apex-primary" />
              </div>
              <p className="mt-2 text-2xl font-bold text-apex-heading">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title="Outstanding Dues" description="Payments awaiting collection" className="xl:col-span-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-apex-primary" />
            </div>
          ) : revenue.pending.length === 0 ? (
            <EmptyState
              title="No outstanding dues"
              description="All member payments are up to date."
            />
          ) : (
            <div className="max-h-64 space-y-2 overflow-auto">
              {revenue.pending.slice(0, 8).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between rounded-btn border border-apex-border bg-apex-surface px-3 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-apex-heading">{payment.member_name}</p>
                    <p className="text-xs text-apex-body">TX-{payment.id} · {payment.method}</p>
                  </div>
                  <p className="font-bold text-apex-heading">${payment.amount}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Monthly Collections" description={`${revenue.monthPaid.length} transactions this month`} className="xl:col-span-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-apex-primary" />
            </div>
          ) : revenue.monthPaid.length === 0 ? (
            <EmptyState
              title="No collections yet"
              description="Recorded payments for this month will appear here."
              action={
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="h-4 w-4" />
                  Record Payment
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Transactions', value: revenue.monthPaid.length },
                { label: 'Collected', value: `$${revenue.monthly.toLocaleString()}` },
                { label: 'Avg. Ticket', value: `$${Math.round(revenue.monthly / revenue.monthPaid.length).toLocaleString()}` },
                { label: 'Pending', value: revenue.pending.length },
              ].map((stat) => (
                <div key={stat.label} className="rounded-btn border border-apex-border bg-apex-surface p-3">
                  <p className="text-xs font-medium text-apex-body">{stat.label}</p>
                  <p className="mt-1 text-lg font-bold text-apex-heading">{stat.value}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <section>
        <SectionHeader title="Recent Transactions" description="Search and review payment activity." />
        <div className="apex-card mb-3 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-apex-body" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="apex-input pl-10 py-2.5"
            />
          </div>
          <button type="button" className="pro-button-secondary inline-flex items-center justify-center gap-2 px-4 py-2.5">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        <div className="apex-table-wrap max-h-[min(60vh,520px)] overflow-auto">
          <table className="apex-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Member</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-apex-primary" />
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12">
                    <EmptyState
                      title="No transactions found"
                      description={searchTerm ? 'Try a different search term.' : 'Record a payment to start tracking finances.'}
                      action={
                        !searchTerm ? (
                          <Button onClick={() => setShowAddModal(true)}>
                            <Plus className="h-4 w-4" />
                            Record Payment
                          </Button>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <p className="font-mono text-xs text-apex-body">TX-{payment.id}</p>
                    </td>
                    <td>
                      <p className="font-semibold text-apex-heading">{payment.member_name}</p>
                    </td>
                    <td>
                      <p className="font-bold">${payment.amount}</p>
                    </td>
                    <td className="capitalize text-apex-body">{payment.method}</td>
                    <td className="text-apex-body">{new Date(payment.date).toLocaleDateString()}</td>
                    <td>
                      <Badge tone={payment.status === 'paid' ? 'success' : 'warning'}>{payment.status}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-apex-heading/25 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-xl rounded-card border border-apex-border bg-white p-8 shadow-card-hover">
            <h2 className="mb-6 text-2xl font-bold text-apex-heading">Record Payment</h2>
            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="apex-label mb-2 block">Member</label>
                <select
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: Number(e.target.value) })}
                  className="apex-input"
                >
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="apex-label mb-2 block">Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="apex-input"
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="apex-label mb-2 block">Method</label>
                  <select
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                    className="apex-input"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="bank">Bank</option>
                  </select>
                </div>
                <div>
                  <label className="apex-label mb-2 block">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="apex-input"
                  >
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={submitting}>
                  Save Payment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
