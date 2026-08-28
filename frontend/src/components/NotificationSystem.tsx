import { useState } from 'react';
import { Mail, MessageSquare, Bell, Send } from 'lucide-react';
import api from '../api';
import PageHero from './ui/PageHero';
import Button from './ui/Button';
import Card from './ui/Card';
import SectionHeader from './ui/SectionHeader';
import EmptyState from './ui/EmptyState';
import Badge from './ui/Badge';

export default function NotificationSystem() {
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    platform: 'email',
    target: 'All Members',
  });

  const history = [
    { id: 1, title: 'Summer Special Offer', type: 'Email', status: 'Sent', date: '2024-03-15' },
    { id: 2, title: 'Renewal Reminder', type: 'SMS', status: 'Delivered', date: '2024-03-14' },
    { id: 3, title: 'Holiday Schedule', type: 'App', status: 'Sent', date: '2024-03-10' },
  ];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const response = await api.post('/notifications/send', formData);
      alert(response.data.message);
      setFormData({ title: '', message: '', platform: 'email', target: 'All Members' });
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHero
        badge="Communications"
        title="Notifications"
        description="Build campaigns, select audiences, and review delivery history."
      />

      <div className="flex gap-1 border-b border-apex-border">
        {[
          { id: 'compose' as const, label: 'Compose Campaign' },
          { id: 'history' as const, label: 'Notification History' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-apex-primary text-apex-primary'
                : 'text-apex-body hover:text-apex-heading'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'compose' ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <SectionHeader title="Campaign Builder" description="Define message content and delivery channel." />
            <Card>
              <form className="space-y-5" onSubmit={handleSend}>
                <div>
                  <label className="apex-label mb-2 block">Campaign Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="apex-input"
                    placeholder="e.g. Summer Body Challenge"
                    required
                  />
                </div>
                <div>
                  <label className="apex-label mb-2 block">Platform</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'email', icon: Mail, label: 'Email' },
                      { id: 'sms', icon: MessageSquare, label: 'SMS' },
                      { id: 'app', icon: Bell, label: 'App' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, platform: item.id })}
                        className={`flex flex-col items-center rounded-btn border p-3 transition-colors ${
                          formData.platform === item.id
                            ? 'border-apex-primary bg-apex-primary-light text-apex-primary'
                            : 'border-apex-border bg-apex-surface text-apex-body hover:border-apex-primary/30'
                        }`}
                      >
                        <item.icon className="mb-1 h-5 w-5" />
                        <span className="text-xs font-semibold">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="apex-label mb-2 block">Message Content</label>
                  <textarea
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="apex-input resize-none"
                    placeholder="Type your message here..."
                    required
                  />
                </div>
                <Button type="submit" loading={sending} className="w-full sm:w-auto">
                  <Send className="h-4 w-4" />
                  Send to {formData.target}
                </Button>
              </form>
            </Card>
          </div>

          <div className="xl:col-span-5">
            <SectionHeader title="Audience Selection" description="Choose who receives this campaign." />
            <Card>
              <div className="space-y-2">
                {['All Members', 'Active Members', 'Expired Members', 'Specific Member'].map((option) => (
                  <label
                    key={option}
                    className={`flex cursor-pointer items-center rounded-btn border px-3 py-3 transition-colors ${
                      formData.target === option
                        ? 'border-apex-primary/25 bg-apex-primary-light'
                        : 'border-apex-border bg-apex-surface hover:border-apex-primary/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="audience"
                      checked={formData.target === option}
                      onChange={() => setFormData({ ...formData, target: option })}
                      className="h-4 w-4 text-apex-primary"
                    />
                    <span
                      className={`ml-3 text-sm font-semibold ${
                        formData.target === option ? 'text-apex-primary' : 'text-apex-heading'
                      }`}
                    >
                      {option}
                    </span>
                  </label>
                ))}
              </div>
            </Card>

            <div className="apex-card mt-4 p-4">
              <p className="text-sm font-semibold text-apex-heading">Delivery Preview</p>
              <p className="mt-2 text-sm text-apex-body">
                {formData.title || 'Campaign title'} via {formData.platform.toUpperCase()} to {formData.target}.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <section>
          <SectionHeader title="Notification History" description="Past campaigns and delivery status." />
          {history.length === 0 ? (
            <EmptyState
              title="No campaigns sent yet"
              description="Compose your first notification to engage members."
              action={
                <Button onClick={() => setActiveTab('compose')}>
                  <Send className="h-4 w-4" />
                  Create Campaign
                </Button>
              }
            />
          ) : (
            <div className="apex-table-wrap">
              <table className="apex-table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id}>
                      <td className="font-semibold">{item.title}</td>
                      <td>
                        <span className="inline-flex items-center gap-2 text-sm text-apex-body">
                          {item.type === 'Email' ? <Mail className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                          {item.type}
                        </span>
                      </td>
                      <td className="text-apex-body">{item.date}</td>
                      <td>
                        <Badge tone="primary">{item.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
