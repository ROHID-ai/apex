import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Clock, CheckCircle2, Camera, X, AlertCircle, CheckCircle, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Webcam from 'react-webcam';
import { memberApi } from '../../api/member';

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold border shadow-xl ${
              toast.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                : 'bg-apex-primary/15 border-apex-primary/30 text-blue-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4"><Clock className="w-5 h-5 text-apex-primary" /><h2 className="text-xl font-bold text-slate-900">My Attendance</h2></div>
          <p className="text-apex-body text-sm">Total visits recorded</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{data.total_visits}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4"><CheckCircle2 className="w-5 h-5 text-apex-primary" /><h2 className="text-xl font-bold text-slate-900">Current Status</h2></div>
          <p className={`text-lg font-semibold ${data.active_session ? 'text-blue-500' : 'text-apex-body'}`}>
            {data.active_session ? 'Checked In' : 'Not Checked In'}
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Camera Attendance</h3>
            <p className="text-sm text-apex-body mt-1">Use your device camera to mark today&apos;s check-in.</p>
          </div>
          <button
            onClick={handleOpenCamera}
            disabled={data.active_session}
            className="w-full sm:w-auto min-w-[220px] inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-apex-primary to-blue-500 text-white font-bold hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera className="w-5 h-5" />
            Mark Attendance
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">QR Express Attendance</h3>
            <p className="text-sm text-apex-body mt-1">Scan the gym check-in/check-out QR from your phone camera for instant attendance.</p>
          </div>
          {qrProcessing && (
            <div className="inline-flex items-center gap-2 text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing QR...
            </div>
          )}
        </div>

        <AnimatePresence>
          {qrResult && !qrProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              className="mt-5 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-4"
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-300 mt-0.5" />
                <div>
                  <p className="text-emerald-200 font-semibold capitalize">{qrResult.action} successful</p>
                  <p className="text-emerald-100/90 text-sm mt-1">Status: {qrResult.status.replace('_', ' ')} | Time: {new Date(qrResult.occurred_at).toLocaleString()}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-200 bg-slate-100">
          <h3 className="text-xl font-bold text-slate-900">Recent Visits</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-apex-body uppercase tracking-wider">Check In</th>
                <th className="px-6 py-4 text-xs font-bold text-apex-body uppercase tracking-wider">Check Out</th>
                <th className="px-6 py-4 text-xs font-bold text-apex-body uppercase tracking-wider">Duration</th>
                <th className="px-6 py-4 text-xs font-bold text-apex-body uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.recent_visits.map((record) => (
                <tr key={record.id} className="hover:bg-slate-100 transition-colors">
                  <td className="px-6 py-4 text-apex-body text-sm">{new Date(record.check_in).toLocaleString()}</td>
                  <td className="px-6 py-4 text-apex-body text-sm">{record.check_out ? new Date(record.check_out).toLocaleString() : '--'}</td>
                  <td className="px-6 py-4 text-apex-body text-sm">{record.duration ? `${record.duration}m` : '--'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${record.check_out ? 'bg-slate-100 text-apex-body' : 'bg-apex-primary/20 text-blue-500'}`}>
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