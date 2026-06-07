import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';

import { useApp } from '../context/AppContext';
import api from '../lib/api';
import {
  CheckCircle2, XCircle, Loader2, Camera, ArrowLeft,
  Clock, BookOpen, MapPin, User, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import Scanner from 'react-qr-scanner';
import { buildLocationPayload } from '../lib/location';

// ─── Step 1: QR Scanner ───────────────────────────────
export const StudentQrScanner = () => {
  const navigate = useNavigate();
  const { t } = useApp();
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(true);

  const scannedRef = React.useRef(false);

  const handleScan = (data) => {
    if (!data || scannedRef.current) return;
    const qrText = (typeof data === 'string' ? data : data.text || '').trim();
    if (!qrText) return;

    try {
      console.log('Scanned QR:', qrText);

      // 1. Support new simplified format: checkin:sessionId:token
      if (qrText.startsWith('checkin:')) {
        const parts = qrText.split(':');
        if (parts.length >= 3) {
          const sid = parts[1];
          const token = parts.slice(2).join(':'); // handle tokens with colons
          scannedRef.current = true;
          setScanning(false);
          navigate(`/checkin/confirm/${sid}/${encodeURIComponent(token)}`);
          return;
        }
      }

      // 2. Robust URL handling (handles query params and path segments)
      if (qrText.startsWith('http')) {
        const url = new URL(qrText);
        
        // 2a. Match new path structure: .../checkin/confirm/:id/:token
        const parts = url.pathname.split('/');
        if (parts.length >= 5 && parts[2] === 'confirm') {
          const sid = parts[3];
          const token = decodeURIComponent(parts.slice(4).join('/'));
          scannedRef.current = true;
          setScanning(false);
          navigate(`/checkin/confirm/${sid}/${encodeURIComponent(token)}`);
          return;
        }

        // 2b. Fallback to legacy query params
        const qToken = url.searchParams.get('token');
        const qSession = url.searchParams.get('session');
        if (qToken && qSession) {
          scannedRef.current = true;
          setScanning(false);
          navigate(`/checkin/confirm/${qSession}/${encodeURIComponent(qToken)}`);
          return;
        }
      }


      // 3. Legacy: Try JSON format
      try {
        const payload = JSON.parse(qrText);
        if (payload.t && payload.s) {
          scannedRef.current = true;
          setScanning(false);
          navigate(`/checkin/confirm/${payload.s}/${encodeURIComponent(payload.t)}`);
          return;
        }
      } catch (e) { /* not json */ }

    } catch (err) {
      console.error('Scan handling error:', err);
      // Optional: Handle raw data as a token if it's not a URL or JSON? 
      // But we need a session ID too, so raw data alone isn't enough.

      setError(t('invalidQr'));
      setTimeout(() => setError(null), 2500);
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto text-left">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/checkin')} className="text-accent-muted hover:text-blue-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-outfit">{t('scanAttendance')}</h2>
          <p className="text-accent-muted text-sm">{t('scanAdvice')}</p>
        </div>
      </div>

      <div className="glass p-6 rounded-4xl flex flex-col items-center gap-6 border border-black/5 dark:border-white/10 shadow-2xl">
        <div className="w-full aspect-square max-w-xs relative rounded-3xl overflow-hidden border-2 border-black/10 dark:border-white/20 shadow-inner">
          <Scanner
            delay={300}
            onError={(err) => console.error('Camera error:', err)}
            onScan={handleScan}
            constraints={{
              audio: false,
              video: { facingMode: 'environment' }
            }}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {/* Animated scan line */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-8 border-2 border-white/20 rounded-2xl">
              <motion.div
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute left-0 right-0 h-0.5 bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.8)]"
              />
            </div>
            {/* Corner brackets */}
            <div className="absolute top-6 left-6 w-8 h-8 border-t-4 border-l-4 border-blue-600 rounded-tl-xl shadow-lg" />
            <div className="absolute top-6 right-6 w-8 h-8 border-t-4 border-r-4 border-blue-600 rounded-tr-xl shadow-lg" />
            <div className="absolute bottom-6 left-6 w-8 h-8 border-b-4 border-l-4 border-blue-600 rounded-bl-xl shadow-lg" />
            <div className="absolute bottom-6 right-6 w-8 h-8 border-b-4 border-r-4 border-blue-600 rounded-br-xl shadow-lg" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-bold text-accent">{t('alignQr')}</p>
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-600/10 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
               {t('scanningActive')}
            </div>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass bg-red-500/10 border border-red-500/20 px-6 py-4 rounded-2xl flex items-center gap-3 text-red-500 text-sm font-bold mt-4"
        >
          <XCircle className="w-5 h-5 shrink-0" />
          {error}
        </motion.div>
      )}
    </div>
  );
};

// ─── Step 2: Confirm Page (after scan) ───────────────
export const StudentCheckInConfirm = () => {
  const { sessionId: pSessionId, token: pToken } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, triggerAlert, branding } = useApp();

  const token = pToken || searchParams.get('token');
  const sessionId = pSessionId || searchParams.get('session');


  const [sessionInfo, setSessionInfo] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState(null);
  const [studentCode, setStudentCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [hasExited, setHasExited] = useState(false);

  const [capturingLocation, setCapturingLocation] = useState(false);

  useEffect(() => {
    if (!token || !sessionId) {
      navigate('/checkin');
      return;
    }
    const fetchSession = async () => {
      try {
        const res = await api.get(`/student/scan/${sessionId}`);
        const data = res.data?.data || res.data || {};
        setSessionInfo(data);
      } catch (err) {
        const msg = err.response?.data?.message;
        setSessionError(msg || null);
      } finally {
        setLoadingSession(false);
      }
    };
    fetchSession();
  }, [sessionId, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentCode.trim()) return;
    setIsSubmitting(true);

    const performVerification = async (locationData = {}) => {
      const payload = {
        qr_token: token,
        session_id: parseInt(sessionId),
        student_code: studentCode.trim(),
        ...locationData
      };

      try {
        const res = await api.post('/student/verify', payload);
        setResult({ success: true, message: res.data?.message || t('attendanceMarked') });
        triggerAlert('attendanceMarked');
      } catch (err) {
        setResult({
          success: false,
          message: err.response?.data?.message || t('attendanceFailed') || 'Verification failed.'
        });
        triggerAlert('attendanceFailed');
      } finally {
        setIsSubmitting(false);
        setCapturingLocation(false);
      }
    };

    // 📍 Capture Location before submitting
    const requireLocation = branding?.requireLocation !== false; // Default true

    if (navigator.geolocation) {
      setCapturingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const locationPayload = buildLocationPayload({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          }, branding);

          if (requireLocation && !locationPayload.isInsideCampus) {
            setResult({ success: false, message: t('outsideCampusWarning') });
            setIsSubmitting(false);
            setCapturingLocation(false);
            return;
          }

          performVerification(locationPayload);
        },
        (err) => {
          console.warn("Location check failed:", err.message);
          if (requireLocation) {
             setResult({ success: false, message: `${t('restrictedAccess')}: ${t('enableGpsAdvice')}` });
             setIsSubmitting(false);
             setCapturingLocation(false);
          } else {
             performVerification();
          }
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      if (requireLocation) {
        setResult({ success: false, message: "Geolocation is not supported by your browser." });
        setIsSubmitting(false);
      } else {
        performVerification();
      }
    }
  };

  if (result) {
    if (hasExited) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 p-6 max-w-md mx-auto text-center">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
            <motion.div 
               animate={{ rotate: 360 }}
               transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
               className="w-24 h-24 mb-6 mx-auto opacity-10"
            >
                <CheckCircle2 className="w-full h-full" />
            </motion.div>
            <h3 className="text-2xl font-black mb-3 font-outfit">{t('processComplete')}</h3>
            <p className="text-accent-muted text-sm border border-black/5 dark:border-white/5 glass px-8 py-4 rounded-2xl inline-block font-medium">
              {t('safeToClose')}
            </p>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-8 p-6 max-w-md mx-auto text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className={cn(
            'w-32 h-32 rounded-4xl flex items-center justify-center shadow-2xl border',
            result.success ? 'bg-green-500/10 border-green-500/20 shadow-green-500/10' : 'bg-red-500/10 border-red-500/20 shadow-red-500/10'
          )}
        >
          {result.success
            ? <CheckCircle2 className="w-16 h-16 text-green-500" />
            : <XCircle className="w-16 h-16 text-red-500" />
          }
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <h3 className={cn('text-3xl font-black mb-3 font-outfit', result.success ? 'text-green-500' : 'text-red-500')}>
            {result.success ? t('thankYou') : t('attendanceFailed')}
          </h3>
          <p className="text-accent-muted font-medium max-w-xs mx-auto">
            {result.success 
              ? t('attendanceSuccess') 
              : `${result.message} ${t('tryAgain')}`}
          </p>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-4 w-full">
          {!result.success ? (
            <>
              <button 
                onClick={() => navigate('/checkin/scan')} 
                className="glass glass-hover flex-1 py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-3 shadow-lg border border-black/5 dark:border-white/10"
              >
                <Camera className="w-5 h-5 text-blue-600" /> {t('scanAgain')}
              </button>
              <button
                onClick={() => setHasExited(true)}
                className="flex-1 py-4 rounded-2xl text-sm font-black bg-accent text-noir-950 dark:text-white dark:bg-noir-800 hover:scale-[1.02] transition-all"
              >
                {t('exit')}
              </button>
            </>
          ) : (
            <button
              onClick={() => setHasExited(true)}
              className="w-full bg-green-500 text-white py-5 rounded-2xl text-sm font-black hover:bg-green-600 hover:scale-[1.02] transition-all shadow-xl shadow-green-500/20"
            >
              {t('exit')}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (loadingSession) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-accent-muted">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-sm font-bold animate-pulse">{t('retrievingSessions')}</p>
      </div>
    );
  }

  const subject = sessionInfo?.subject_name
    || sessionInfo?.subject?.name
    || sessionInfo?.class_name
    || sessionInfo?.class?.name
    || `${t('activeSession')} #${sessionId}`;
  const startTime = sessionInfo?.start_time
    ? new Date(sessionInfo.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;
  const endTime = sessionInfo?.end_time
    ? new Date(sessionInfo.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;
  const room = sessionInfo?.room || sessionInfo?.location || null;

  return (
    <div className="space-y-6 max-w-md mx-auto text-left">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/checkin/scan')} className="text-accent-muted hover:text-blue-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-outfit">{t('confirmAttendance')}</h2>
          <p className="text-accent-muted text-sm">{t('studentIdSub')}</p>
        </div>
      </div>

      <div className={cn(
        'glass p-6 rounded-4xl border space-y-4 shadow-xl',
        sessionError ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-blue-600/10 bg-blue-600/5'
      )}>
        <div className={cn(
          'flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]',
          sessionError || sessionInfo?.status === 'scheduled' ? 'text-yellow-500' : 'text-blue-600'
        )}>
          <div className={cn(
            'w-2 h-2 rounded-full animate-pulse',
            sessionError || sessionInfo?.status === 'scheduled' ? 'bg-yellow-500' : 'bg-blue-600'
          )} />
          {sessionError ? t('verifySession') : (sessionInfo?.status === 'scheduled' ? t('scheduled') : t('liveNow'))}
        </div>

        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full w-fit">
          <ShieldCheck className="w-3.5 h-3.5" />
          {t('secureUplink')}
        </div>

        <h3 className="text-xl font-black font-outfit">{subject}</h3>

        <div className="space-y-3">
          {startTime && (
            <div className="flex items-center gap-3 text-sm font-medium text-accent">
              <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center">
                 <Clock className="w-4 h-4 text-accent-muted" />
              </div>
              <span className="font-mono">{startTime}{endTime ? ` — ${endTime}` : ''}</span>
            </div>
          )}
          {room && (
            <div className="flex items-center gap-3 text-sm font-medium text-accent">
              <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center">
                 <MapPin className="w-4 h-4 text-accent-muted" />
              </div>
              <span>{room}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm font-medium text-accent">
            <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-accent-muted" />
            </div>
            <span>ID: <span className="font-mono text-blue-600">{sessionId}</span></span>
          </div>
        </div>
      </div>

      <div className="glass p-8 rounded-4xl space-y-6 border border-black/5 dark:border-white/10 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="font-black text-sm uppercase tracking-widest">{t('studentId')}</p>
            <p className="text-xs text-accent-muted font-medium">{t('studentIdSub')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="text"
            required
            autoFocus
            value={studentCode}
            onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
            className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl py-5 px-6 text-xl focus:outline-none focus:border-blue-600 transition-all font-mono tracking-[0.2em] text-center font-black"
            placeholder="— — — —"
          />
          <button
            type="submit"
            disabled={isSubmitting || !studentCode.trim()}
            className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl hover:bg-blue-700 transition-all disabled:opacity-40 flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20"
          >
            {isSubmitting
              ? <><Loader2 className="w-6 h-6 animate-spin" /> {capturingLocation ? t('locating') : t('verifying')}</>
              : <><CheckCircle2 className="w-6 h-6" /> {t('verifyCheckIn')}</>
            }
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── Default export: Choice screen ───────────────────
export const StudentCheckIn = ({ onBack }) => {
  const { t } = useApp();
  const navigate = useNavigate();

  return (
    <div className="space-y-8 mx-auto text-left">
      <div className="flex items-center gap-4">
        {onBack && (
          <button onClick={onBack} className="text-accent-muted hover:text-blue-600 transition-colors p-2 glass rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h2 className="text-3xl font-black tracking-tight font-outfit">{t('checkIn')}</h2>
          <p className="text-accent-muted font-medium">{t('chooseProtocol')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <button
          onClick={() => navigate('/checkin/scan')}
          className="glass glass-hover p-10 rounded-4xl flex flex-col items-center gap-6 group border border-black/5 dark:border-white/5 hover:border-blue-600/30 transition-all shadow-xl"
        >
          <div className="w-20 h-20 rounded-3xl bg-blue-600 text-white flex items-center justify-center shadow-2xl shadow-blue-600/40 group-hover:scale-110 transition-transform">
            <Camera className="w-10 h-10" />
          </div>
          <div className="text-center">
            <p className="font-black text-xl font-outfit">{t('scanAttendance')}</p>
            <p className="text-xs text-accent-muted mt-2 font-medium">{t('useOptometric')}</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/checkin/manual')}
          className="glass glass-hover p-10 rounded-4xl flex flex-col items-center gap-6 group border border-black/5 dark:border-white/5 hover:border-blue-600/30 transition-all shadow-xl"
        >
          <div className="w-20 h-20 rounded-3xl bg-black/5 dark:bg-white/5 text-accent-muted flex items-center justify-center group-hover:scale-110 transition-transform group-hover:bg-blue-600/10 group-hover:text-blue-600">
            <User className="w-10 h-10" />
          </div>
          <div className="text-center">
            <p className="font-black text-xl font-outfit">{t('manualEntry')}</p>
            <p className="text-xs text-accent-muted mt-2 font-medium">{t('overrideCredentials')}</p>
          </div>
        </button>
      </div>
    </div>
  );
};

// ─── Manual entry without QR ─────────────────────────
export const StudentManualCheckIn = () => {
  const navigate = useNavigate();
  const { t, triggerAlert, branding } = useApp();
  const [studentCode, setStudentCode] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const [capturingLocation, setCapturingLocation] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const performVerification = async (locationData = {}) => {
      try {
        const res = await api.post('/student/verify', {
          student_code: studentCode.trim(),
          session_id: parseInt(sessionId),
          ...locationData
        });
        setResult({ success: true, message: res.data?.message || t('attendanceMarked') });
        triggerAlert('attendanceMarked');
      } catch (err) {
        setResult({
          success: false,
          message: err.response?.data?.message || t('attendanceFailed') || 'Verification failed. Check your code and session ID.'
        });
        triggerAlert('attendanceFailed');
      } finally {
        setIsSubmitting(false);
        setCapturingLocation(false);
      }
    };

    // 📍 Capture Location for Manual Check in
    const requireLocation = branding?.requireLocation !== false;

    if (navigator.geolocation) {
      setCapturingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const locationPayload = buildLocationPayload({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          }, branding);

          if (requireLocation && !locationPayload.isInsideCampus) {
            setResult({ success: false, message: t('outsideCampusWarning') });
            setIsSubmitting(false);
            setCapturingLocation(false);
            return;
          }

          performVerification(locationPayload);
        },
        (err) => {
          console.warn("Manual location check failed:", err.message);
          if (requireLocation) {
            setResult({ success: false, message: `${t('restrictedAccess')}: ${t('enableGpsAdvice')}` });
            setIsSubmitting(false);
            setCapturingLocation(false);
          } else {
            performVerification();
          }
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      if (requireLocation) {
        setResult({ success: false, message: "Geolocation is not supported." });
        setIsSubmitting(false);
      } else {
        performVerification();
      }
    }
  };

  if (result) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-8 p-6 max-w-md mx-auto text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className={cn('w-32 h-32 rounded-4xl flex items-center justify-center shadow-2xl border',
            result.success ? 'bg-green-500/10 border-green-500/20 shadow-green-500/10' : 'bg-red-500/10 border-red-500/20 shadow-red-500/10')}
        >
          {result.success
            ? <CheckCircle2 className="w-16 h-16 text-green-500" />
            : <XCircle className="w-16 h-16 text-red-500" />
          }
        </motion.div>
        <div className="text-center">
          <h3 className={cn('text-3xl font-black mb-3 font-outfit', result.success ? 'text-green-500' : 'text-red-500')}>
            {result.success ? t('thankYou') : t('attendanceFailed')}
          </h3>
          <p className="text-accent-muted font-medium">{result.message}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          {!result.success && (
            <button onClick={() => setResult(null)} className="glass glass-hover flex-1 py-4 rounded-2xl text-sm font-black border border-black/5 dark:border-white/10">
              {t('tryAgain')}
            </button>
          )}
          <button onClick={() => navigate('/portal')} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl text-sm font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20">
            {t('backToDashboard')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-md mx-auto text-left">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/checkin')} className="text-accent-muted hover:text-blue-600 transition-colors p-2 glass rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-3xl font-black tracking-tight font-outfit">{t('manualEntry')}</h2>
          <p className="text-accent-muted font-medium">{t('enterCredentials')}</p>
        </div>
      </div>

      <div className="glass p-8 rounded-4xl space-y-6 border border-black/5 dark:border-white/10 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent-muted mb-2 ml-1">
              {t('studentId')}
            </label>
            <input
              type="text" required autoFocus value={studentCode}
              onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
              className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl py-4 px-5 text-lg focus:outline-none focus:border-blue-600 font-mono transition-all font-bold"
              placeholder={t('studentIdPlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent-muted mb-2 ml-1">
              {t('sessionId')}
            </label>
            <input
              type="number" required value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl py-4 px-5 text-lg focus:outline-none focus:border-blue-600 font-mono transition-all font-bold"
              placeholder={t('egSessionId')}
            />
            <p className="text-[10px] text-accent-muted mt-2 font-medium italic opacity-60">* {t('sessionIdSub')}</p>
          </div>
          <button
            type="submit" disabled={isSubmitting}
            className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl hover:bg-blue-700 transition-all disabled:opacity-40 flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20 mt-4"
          >
            {isSubmitting
              ? <><Loader2 className="w-6 h-6 animate-spin" /> {capturingLocation ? t('locating') : t('verifying')}</>
              : <><CheckCircle2 className="w-6 h-6" /> {t('verifyCheckIn')}</>
            }
          </button>
        </form>
      </div>
    </div>
  );
};
