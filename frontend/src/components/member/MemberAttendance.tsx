import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Clock, CheckCircle2, Camera, X, AlertCircle, CheckCircle, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Webcam from 'react-webcam';
import { memberApi } from '../../api/member';
import MemberPageIntro from './MemberPageIntro';
import { memberCard, memberCardTitle, memberPage } from './memberStyles';

interface AttendanceRecord {
  id: number;
  check_in: string;
  check_out: string | null;
  duration: number | null;
  member_name: string;
  membership_id: string;
  captured_image?: string | null;
}

interface AttendanceResponse {
  total_visits: number;
  active_session: boolean;
  recent_visits: AttendanceRecord[];
}

interface QrAttendanceResult {
  action: string;
  status: string;
  occurred_at: string;
}

export default function MemberAttendance() {
  const webcamRef = useRef<Webcam | null>(null);

  const [data, setData] = useState<AttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [qrProcessing, setQrProcessing] = useState(false);
  const [qrResult, setQrResult] = useState<QrAttendanceResult | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const processedQrRef = useRef<string | null>(null);

  const videoConstraints = useMemo(
    () => ({
      width: 1280,
      height: 720,
      facingMode: 'user',
    }),
    []
  );

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
  }, []);

  const fetchAttendance = useCallback(async () => {
    try {
      const response = await memberApi.getAttendance();
      setData(response.data);
    } catch (err) {
      console.error(err);
      showToast('error', 'Unable to fetch attendance details');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const getDeviceInfo = () => {
    const parts = [navigator.platform, navigator.userAgent].filter(Boolean);
    const device = parts.join(' | ').trim();
    return device.slice(0, 255);
  };

  const processQrAttendance = useCallback(
    async (token: string) => {
      if (!token || processedQrRef.current === token) {
        return;
      }

      processedQrRef.current = token;
      setQrProcessing(true);
      setQrResult(null);

      try {
        const response = await memberApi.markQrAttendance({
          qr_token: token,
          device_info: getDeviceInfo(),
        });

        setData(response.data.attendance);
        setQrResult({
          action: response.data.action,
          status: response.data.status,
          occurred_at: response.data.occurred_at,
        });
        showToast('success', response.data.message);

        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      } catch (err: any) {
        const detail = err?.response?.data?.detail || 'Unable to process QR attendance';
        showToast('error', detail);
      } finally {
        setQrProcessing(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const qrToken = search.get('qr') || search.get('token');
    if (!qrToken) {
      return;
    }

    processQrAttendance(qrToken);
  }, [processQrAttendance]);

  const parseCameraError = (err: any) => {
    const name = err?.name || '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'Camera permission denied. Please allow camera access to mark attendance.';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'No camera found on this device.';
    }
    return 'Unable to access camera right now.';
  };

  const handleOpenCamera = async () => {
    setCameraError('');
    setCapturedImage(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('No camera found on this device.');
      setIsCameraOpen(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      setIsCameraOpen(true);
    } catch (err: any) {
      setCameraError(parseCameraError(err));
      setIsCameraOpen(true);
    }
  };

  const handleCapture = () => {
    setCameraError('');
    const screenshot = webcamRef.current?.getScreenshot();
    if (!screenshot) {
      setCameraError('Could not capture image. Please try again.');
      return;
    }
    setCapturedImage(screenshot);
  };

  const handleMarkAttendance = async () => {
    if (!capturedImage) {
      setCameraError('Capture an image before marking attendance.');
      return;
    }

    setUploading(true);
    try {
      const response = await memberApi.markAttendance({
        image_data: capturedImage,
        enable_face_verification: false,
      });

      setData(response.data);
      setIsCameraOpen(false);
      setCapturedImage(null);
      setCameraError('');
      showToast('success', 'Attendance Marked Successfully');
    } catch (err: any) {
      const statusCode = err?.response?.status;
      if (statusCode === 409) {
        showToast('error', 'Attendance Already Marked');
      } else {
        showToast('error', err?.response?.data?.detail || 'Attendance upload failed');
      }
    } finally {
      setUploading(false);
    }
  };

  const closeCameraModal = () => {
    if (uploading) {
      return;
    }
    setIsCameraOpen(false);
    setCapturedImage(null);
    setCameraError('');
  };

  if (loading || !data) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-10 h-10 text-apex-primary animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={memberPage}>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed left-3 right-3 top-16 z-50 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg sm:left-auto sm:right-4 sm:top-4 sm:max-w-sm ${
              toast.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MemberPageIntro description="Track visits, check in with camera, or scan the gym QR code." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className={memberCard}>
          <div className="mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-apex-primary" />
            <h2 className="text-sm font-semibold text-apex-heading">Visits</h2>
          </div>
          <p className="text-2xl font-bold text-apex-heading sm:text-3xl">{data.total_visits}</p>
        </div>
        <div className={memberCard}>
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-apex-primary" />
            <h2 className="text-sm font-semibold text-apex-heading">Status</h2>
          </div>
          <p className={`text-sm font-semibold sm:text-base ${data.active_session ? 'text-apex-primary' : 'text-apex-body'}`}>
            {data.active_session ? 'Checked In' : 'Not Checked In'}
          </p>
        </div>
      </div>

      <div className={memberCard}>
        <div className="space-y-4">
          <div>
            <h3 className={memberCardTitle}>Camera Attendance</h3>
            <p className="mt-1 text-sm text-apex-body">Use your device camera to mark today&apos;s check-in.</p>
          </div>
          <button
            onClick={handleOpenCamera}
            disabled={data.active_session}
            className="inline-flex w-full items-center justify-center gap-2 rounded-btn bg-apex-primary px-4 py-3 text-sm font-semibold text-white shadow-btn transition-all hover:bg-[#2432CC] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[200px]"
          >
            <Camera className="h-4 w-4" />
            Mark Attendance
          </button>
        </div>
      </div>

      <div className={memberCard}>
        <div className="space-y-3">
          <div>
            <h3 className={memberCardTitle}>QR Express Attendance</h3>
            <p className="mt-1 text-sm text-apex-body">Scan the gym QR from your phone camera for instant check-in.</p>
          </div>
          {qrProcessing && (
            <div className="inline-flex items-center gap-2 rounded-btn border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing QR...
            </div>
          )}
        </div>

        <AnimatePresence>
          {qrResult && !qrProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-4 rounded-btn border border-emerald-200 bg-emerald-50 p-3 sm:p-4"
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-semibold capitalize text-emerald-800">{qrResult.action} successful</p>
                  <p className="mt-1 text-sm text-emerald-700">
                    {qrResult.status.replace('_', ' ')} · {new Date(qrResult.occurred_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={`${memberCard} overflow-hidden p-0`}>
        <div className="border-b border-apex-border px-4 py-3 sm:px-5">
          <h3 className={memberCardTitle}>Recent Visits</h3>
        </div>

        <div className="divide-y divide-apex-border md:hidden">
          {data.recent_visits.length === 0 ? (
            <p className="px-4 py-6 text-sm text-apex-body">No visits recorded yet.</p>
          ) : (
            data.recent_visits.map((record) => (
              <div key={record.id} className="space-y-2 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-apex-heading">{new Date(record.check_in).toLocaleDateString()}</p>
                  <span className={`rounded-pill px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${record.check_out ? 'bg-slate-100 text-apex-body' : 'bg-apex-primary-light text-apex-primary'}`}>
                    {record.check_out ? 'Completed' : 'Active'}
                  </span>
                </div>
                <p className="text-xs text-apex-body">In: {new Date(record.check_in).toLocaleTimeString()}</p>
                <p className="text-xs text-apex-body">Out: {record.check_out ? new Date(record.check_out).toLocaleTimeString() : '—'}</p>
                <p className="text-xs text-apex-body">Duration: {record.duration ? `${record.duration}m` : '—'}</p>
              </div>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-apex-border bg-apex-surface">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-apex-body">Check In</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-apex-body">Check Out</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-apex-body">Duration</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-apex-body">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-apex-border">
              {data.recent_visits.map((record) => (
                <tr key={record.id} className="hover:bg-apex-surface/60">
                  <td className="px-5 py-3 text-sm text-apex-body">{new Date(record.check_in).toLocaleString()}</td>
                  <td className="px-5 py-3 text-sm text-apex-body">{record.check_out ? new Date(record.check_out).toLocaleString() : '—'}</td>
                  <td className="px-5 py-3 text-sm text-apex-body">{record.duration ? `${record.duration}m` : '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-pill px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${record.check_out ? 'bg-slate-100 text-apex-body' : 'bg-apex-primary-light text-apex-primary'}`}>
                      {record.check_out ? 'Completed' : 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isCameraOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white/90 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">Mark Attendance</h3>
                <button onClick={closeCameraModal} disabled={uploading} className="p-2 rounded-lg text-apex-body hover:text-slate-900 hover:bg-slate-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-4">
                {cameraError && (
                  <div className="px-4 py-3 rounded-xl border border-apex-primary/30 bg-apex-primary/10 text-blue-400 text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5" />
                    <span>{cameraError}</span>
                  </div>
                )}

                <div className="w-full rounded-2xl border border-slate-200 bg-[#F5F5F5] overflow-hidden aspect-video relative">
                  {capturedImage ? (
                    <img src={capturedImage} alt="Captured member" className="w-full h-full object-contain" />
                  ) : (
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      screenshotQuality={0.92}
                      videoConstraints={videoConstraints}
                      onUserMediaError={(err) => setCameraError(parseCameraError(err))}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {uploading && (
                    <div className="absolute inset-0 bg-[#F5F5F5]/85 flex items-center justify-center">
                      <div className="inline-flex items-center gap-2 text-slate-900 text-sm font-semibold">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        Uploading attendance...
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                  {capturedImage ? (
                    <>
                      <button
                        onClick={() => {
                          setCapturedImage(null);
                          setCameraError('');
                        }}
                        disabled={uploading}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-apex-body hover:bg-slate-100 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Retake
                      </button>
                      <button
                        onClick={handleMarkAttendance}
                        disabled={uploading}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-apex-primary to-blue-500 text-white font-bold hover:from-blue-500 hover:to-blue-400 transition-all disabled:opacity-50"
                      >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        {uploading ? 'Marking...' : 'Confirm & Mark'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleCapture}
                      disabled={uploading || !!cameraError}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-apex-primary to-blue-500 text-white font-bold hover:from-blue-500 hover:to-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Camera className="w-4 h-4" />
                      Capture
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}