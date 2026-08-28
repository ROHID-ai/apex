import { useState, useEffect } from 'react';
import { Clock, Calendar, Users, Loader2, ArrowRight, QrCode, RefreshCw, Copy, ExternalLink, CheckCircle, Download } from 'lucide-react';
import { downloadQrPosterPdf } from '../utils/qrPoster';
import QrPosterPreview from './ui/QrPosterPreview';
import api from '../api';
import { adminApi, type AttendanceQrConfig, type LiveAttendanceMember } from '../api/admin';
import PageHero from './ui/PageHero';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import SectionHeader from './ui/SectionHeader';
import EmptyState from './ui/EmptyState';

interface AttendanceRecord {
  id: number;
  check_in: string;
  check_out: string | null;
  duration: number | null;
  member_name: string;
  membership_id: string;
}

export default function AttendanceManagement() {
  const [membershipId, setMembershipId] = useState('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState({ present_now: 0, today_total: 0 });
  const [qrConfig, setQrConfig] = useState<AttendanceQrConfig | null>(null);
  const [liveMembers, setLiveMembers] = useState<LiveAttendanceMember[]>([]);
  const [qrLoading, setQrLoading] = useState(true);
  const [refreshingQr, setRefreshingQr] = useState(false);
  const [downloadingPoster, setDownloadingPoster] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const [logsResponse, statsResponse, liveResponse, qrResponse] = await Promise.all([
        api.get('/attendance/logs'),
        api.get('/attendance/stats'),
        adminApi.getLiveAttendance(),
        adminApi.getAttendanceQrConfig(),
      ]);

      setRecords(logsResponse.data);
      setStats(statsResponse.data);
      setLiveMembers(liveResponse.data.active_members);
      setQrConfig(qrResponse.data);
    } catch (err) {
      console.error(err);
    } finally {
      setQrLoading(false);
      setLoading(false);
    }
  };

  const refreshQrCodes = async () => {
    setRefreshingQr(true);
    try {
      const response = await adminApi.refreshAttendanceQrConfig();
      setQrConfig(response.data);
    } catch (err) {
      console.error(err);
      alert('Unable to refresh QR codes');
    } finally {
      setRefreshingQr(false);
    }
  };

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      alert('QR URL copied');
    } catch {
      alert('Copy failed. Please copy manually.');
    }
  };

  const downloadPoster = async (label: string, url: string, type: 'check-in' | 'check-out') => {
    setDownloadingPoster(label);
    try {
      await downloadQrPosterPdf({ type, url });
    } catch (err) {
      console.error(err);
      alert('Unable to generate PDF poster. Please try again.');
    } finally {
      setDownloadingPoster(null);
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!membershipId) return;
    setProcessing(true);
    try {
      const response = await api.post('/attendance/checkin', { membership_id: membershipId });
      alert(response.data.message);
      setMembershipId('');
      fetchRecords();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Check-in failed');
    } finally {
      setProcessing(false);
    }
  };

  const activeSessions = records.filter((r) => !r.check_out).length;
  const completedToday = records.filter((r) => r.check_out).length;

  return (
    <div className="space-y-5">
      <PageHero
        badge="Operations"
        title="Attendance Management"
        description="Monitor presence, manage QR entry, and review check-in activity."
      />

      <section>
        <SectionHeader title="Attendance Summary" description="Today's operational snapshot." />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: 'Present Now', value: stats.present_now, icon: Users },
            { label: "Today's Check-ins", value: stats.today_total, icon: Calendar },
            { label: 'Active Sessions', value: activeSessions, icon: Clock },
            { label: 'Completed Today', value: completedToday, icon: CheckCircle },
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

        <div className="apex-card mt-3 p-4">
          <form onSubmit={handleCheckIn} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="apex-label mb-2 block">Manual Check-in</label>
              <input
                type="text"
                value={membershipId}
                onChange={(e) => setMembershipId(e.target.value.toUpperCase())}
                placeholder="Enter membership ID (e.g. FIT-1234)"
                className="apex-input font-mono tracking-widest"
              />
            </div>
            <Button type="submit" disabled={processing || !membershipId} loading={processing} className="shrink-0">
              <ArrowRight className="h-4 w-4" />
              Check In
            </Button>
          </form>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Live Presence" description={`${liveMembers.length} members currently in gym`}>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-apex-primary" />
            </div>
          ) : liveMembers.length === 0 ? (
            <EmptyState title="No active check-ins" description="Members will appear here when they scan in." />
          ) : (
            <div className="max-h-72 space-y-2 overflow-auto smooth-scroll">
              {liveMembers.map((member) => (
                <div key={member.attendance_id} className="flex items-center justify-between rounded-btn border border-apex-border bg-apex-surface px-3 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-apex-heading">{member.member_name}</p>
                    <p className="font-mono text-xs text-apex-body">{member.membership_id}</p>
                  </div>
                  <Badge tone="success">In Gym</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="QR Management"
          description="Check-in and check-out QR codes for kiosk entry."
          action={
            <Button variant="secondary" onClick={refreshQrCodes} disabled={refreshingQr || qrLoading} loading={refreshingQr}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          }
        >
          {qrLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-7 w-7 animate-spin text-apex-primary" />
            </div>
          ) : !qrConfig ? (
            <EmptyState
              title="QR config unavailable"
              description="Refresh to generate check-in and check-out QR codes."
              action={
                <Button onClick={refreshQrCodes} loading={refreshingQr}>
                  <QrCode className="h-4 w-4" />
                  Generate QR Codes
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                { label: 'Check-In QR', url: qrConfig.check_in_url, type: 'check-in' as const },
                { label: 'Check-Out QR', url: qrConfig.check_out_url, type: 'check-out' as const },
              ].map((item) => (
                  <div key={item.label} className="apex-card-hover rounded-btn border border-apex-border bg-apex-surface p-4 transition-all duration-300 ease-smooth">
                    <p className="mb-2 text-sm font-semibold text-apex-heading">{item.label}</p>
                    <QrPosterPreview type={item.type} url={item.url} alt={item.label} />
                    <div className="mt-3 space-y-2">
                      <Button variant="secondary" className="w-full" onClick={() => copyToClipboard(item.url)}>
                        <Copy className="h-4 w-4" /> Copy URL
                      </Button>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="click-effect flex w-full items-center justify-center gap-2 rounded-btn border border-apex-primary/20 bg-apex-primary-light px-3 py-2 text-sm font-semibold text-apex-primary transition-all duration-200 ease-smooth hover:bg-apex-primary/10"
                      >
                        <ExternalLink className="h-4 w-4" /> Open Link
                      </a>
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => downloadPoster(item.label, item.url, item.type)}
                        disabled={downloadingPoster === item.label}
                        loading={downloadingPoster === item.label}
                      >
                        <Download className="h-4 w-4" /> Download PDF Poster
                      </Button>
                    </div>
                  </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <SectionHeader title="Recent Logs" description="Latest check-in and check-out activity." className="mb-0" />
          <button
            type="button"
            onClick={fetchRecords}
            className="click-effect rounded-btn border border-apex-border p-2 text-apex-body transition-all duration-200 ease-smooth hover:bg-apex-surface hover:text-apex-heading"
            title="Refresh"
          >
            <Clock className="h-5 w-5" />
          </button>
        </div>

        <div className="apex-table-wrap smooth-scroll max-h-[min(60vh,520px)] overflow-auto">
          <table className="apex-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-apex-primary" />
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8">
                    <EmptyState title="No attendance logs yet" description="Check-ins will appear here once members arrive." />
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <p className="font-semibold text-apex-heading">{record.member_name}</p>
                      <p className="font-mono text-xs text-apex-body">{record.membership_id}</p>
                    </td>
                    <td className="text-apex-body">
                      {new Date(record.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="text-apex-body">
                      {record.check_out
                        ? new Date(record.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '--'}
                    </td>
                    <td className="text-apex-body">{record.duration ? `${record.duration}m` : '--'}</td>
                    <td>
                      <Badge tone={record.check_out ? 'neutral' : 'success'}>
                        {record.check_out ? 'Completed' : 'Active'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
