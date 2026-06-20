import { useState, useEffect } from 'react';
import { UserPlus, Search, Trash2, Ban, CheckCircle, Loader2 } from 'lucide-react';
import { adminApi } from '../api/admin';
import { motion, AnimatePresence } from 'framer-motion';
import PageHero from './ui/PageHero';
import Button from './ui/Button';
import Badge from './ui/Badge';
import EmptyState from './ui/EmptyState';

interface Member {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  membership_id: string;
  plan?: string;
}

export default function MemberManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    plan: 'Basic',
    password: 'member123',
  });

  const planOptions = ['Basic', 'Pro', 'Premium'];

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async (search = '') => {
    setLoading(true);
    try {
      const response = await adminApi.getMembers(search);
      setMembers(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchMembers(searchTerm);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await adminApi.createMember(formData);
      alert(
        `Member created successfully.\n\nLogin email: ${response.data.email}\nPassword: ${formData.password}\nMembership ID: ${response.data.membership_id}`,
      );
      setShowAddModal(false);
      fetchMembers();
      setFormData({ name: '', email: '', phone: '', plan: 'Basic', password: 'member123' });
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this member?')) {
      try {
        await adminApi.deleteMember(id);
        fetchMembers();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const toggleStatus = async (member: Member) => {
    const newStatus = member.status === 'active' ? 'blocked' : 'active';
    try {
      await adminApi.updateMember(member.id, { status: newStatus });
      fetchMembers();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredMembers = members.filter((member) =>
    statusFilter === 'all' ? true : member.status === statusFilter,
  );

  const memberStats = {
    total: members.length,
    active: members.filter((m) => m.status === 'active').length,
    blocked: members.filter((m) => m.status === 'blocked').length,
    newThisWeek: members.filter((m) => {
      const joined = new Date((m as Member & { join_date?: string }).join_date || 0);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return joined >= weekAgo;
    }).length,
  };

  return (
    <div className="space-y-5">
      <PageHero
        badge="Member Directory"
        title="Members"
        description="Search, onboard, and manage member accounts with clear status visibility."
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: 'Total Members', value: memberStats.total },
          { label: 'Active', value: memberStats.active },
          { label: 'Blocked', value: memberStats.blocked },
          { label: 'New This Week', value: memberStats.newThisWeek },
        ].map((stat) => (
          <div key={stat.label} className="apex-card p-4">
            <p className="text-sm font-medium text-apex-body">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-apex-heading">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="apex-card flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-apex-muted" />
          <input
            type="text"
            placeholder="Search by name, email, phone, or membership ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="apex-input pl-12 py-2.5"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'blocked')}
          className="apex-input w-full lg:w-44"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
        <Button onClick={() => setShowAddModal(true)} className="shrink-0">
          <UserPlus className="h-4 w-4" />
          Add Member
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-apex-primary" />
        </div>
      ) : filteredMembers.length === 0 ? (
        <EmptyState
          title="No members found"
          description="Try adjusting your search or add a new member to populate your directory."
          action={
            <Button onClick={() => setShowAddModal(true)}>
              <UserPlus className="h-4 w-4" />
              Add First Member
            </Button>
          }
        />
      ) : (
        <div className="apex-table-wrap max-h-[min(70vh,640px)] overflow-auto">
          <div className="overflow-x-auto">
            <table className="apex-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Contact</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {filteredMembers.map((member) => (
                    <motion.tr key={member.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <td>
                        <p className="font-semibold text-apex-heading">{member.name}</p>
                        <p className="mt-0.5 font-mono text-xs text-apex-body">{member.membership_id}</p>
                      </td>
                      <td>
                        <p className="text-sm text-apex-heading">{member.email}</p>
                        <p className="text-xs text-apex-body">{member.phone}</p>
                      </td>
                      <td>
                        <Badge tone="primary">{member.plan || 'No Plan'}</Badge>
                      </td>
                      <td>
                        <Badge tone={member.status === 'active' ? 'success' : 'danger'}>{member.status}</Badge>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleStatus(member)}
                            className="rounded-btn p-2 text-apex-body hover:bg-apex-primary-light hover:text-apex-primary"
                            title={member.status === 'active' ? 'Block' : 'Activate'}
                          >
                            {member.status === 'active' ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(member.id)}
                            className="rounded-btn p-2 text-apex-body hover:bg-red-50 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-apex-heading/25 p-4 backdrop-blur-[2px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl rounded-card border border-apex-border bg-white p-8 shadow-card-hover"
          >
            <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold text-apex-heading">
              <UserPlus className="text-apex-primary" />
              Add New Member
            </h2>
            <form onSubmit={handleAddMember} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {[
                  { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Enter full name' },
                  { label: 'Email Address', key: 'email', type: 'email', placeholder: 'Enter email' },
                  { label: 'Phone Number', key: 'phone', type: 'tel', placeholder: 'Enter phone' },
                  { label: 'Password', key: 'password', type: 'text', placeholder: 'Enter login password' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="apex-label mb-2 block">{field.label}</label>
                    <input
                      required={field.key !== 'phone'}
                      minLength={field.key === 'password' ? 6 : undefined}
                      type={field.type}
                      value={formData[field.key as keyof typeof formData]}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      className="apex-input"
                      placeholder={field.placeholder}
                    />
                  </div>
                ))}
                <div>
                  <label className="apex-label mb-2 block">Select Plan</label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    className="apex-input"
                  >
                    {planOptions.map((plan) => (
                      <option key={plan} value={plan}>
                        {plan}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={submitting}>
                  Add Member
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
