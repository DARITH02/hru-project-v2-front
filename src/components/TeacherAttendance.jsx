import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ClipboardCheck,
  Camera,
  FileText,
  LogIn,
  LogOut,
  Loader2,
  RefreshCw,
  Send,
  TimerReset,
  TrendingUp,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Scanner from 'react-qr-scanner';
import { cn } from '../lib/utils';
import { useApp } from '../context/AppContext';
import api from '../lib/api';

const pad = (value) => String(value).padStart(2, '0');
const formatClock = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
const formatDateParam = (date) => {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
};

const readPageData = (payload) => Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
const sortByStartTime = (items) => [...items].sort((a, b) => new Date(a.scheduled_start_time) - new Date(b.scheduled_start_time));
const readName = (value, fallback = 'N/A') => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  return value.name || value.code || value.title || fallback;
};
const formatApiTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 5);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
const formatApiDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
};
const isPresentStatus = (status) => ['on_time', 'late', 'very_late', 'teaching', 'completed', 'early_leave', 'permission'].includes(status);
const isClosedStatus = (status) => ['completed', 'cancelled', 'rescheduled', 'absent'].includes(status);
const normalizeStatus = (status) => {
  if (!status) return 'scheduled';
  return String(status).toLowerCase();
};
const displayStatus = (status) => {
  const normalized = normalizeStatus(status);
  return normalized.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};
const readId = (value) => {
  if (!value) return '';
  if (typeof value === 'object') return value.id || value.code || value.name || '';
  return value;
};

export const TeacherAttendance = () => {
  const { t } = useApp();
  const [now, setNow] = useState(new Date());
  const [confirming, setConfirming] = useState(null);
  const [markedSessions, setMarkedSessions] = useState({});
  const [toast, setToast] = useState(null);
  const [todaySessions, setTodaySessions] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [scanTarget, setScanTarget] = useState(null);
  const [corrections, setCorrections] = useState([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [permissionSubmitting, setPermissionSubmitting] = useState(false);
  const [permissionForm, setPermissionForm] = useState({
    attendanceSessionId: '',
    permissionType: 'full_day',
    date: formatDateParam(new Date()),
    startTime: '',
    endTime: '',
    reason: '',
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAttendance = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const today = formatDateParam(new Date());
      const [todayRes, historyRes, correctionsRes] = await Promise.all([
        api.get('/teacher/attendance/sessions', { params: { from: today, to: today, per_page: 100 } }),
        api.get('/teacher/attendance/sessions', { params: { per_page: 100 } }),
        api.get('/teacher/attendance/corrections'),
      ]);

      setTodaySessions(sortByStartTime(readPageData(todayRes.data)));
      setHistory(readPageData(historyRes.data));
      setCorrections(readPageData(correctionsRes.data));
    } catch (err) {
      console.error('Failed to fetch teacher attendance', err);
      setError(err.response?.data?.message || t('attendanceDataFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePermissionSubmit = async (event) => {
    event.preventDefault();
    if (!permissionForm.reason.trim()) {
      showToast(t('permissionReasonRequired'));
      return;
    }

    const selectedSession = history.find((item) => String(item.id) === String(permissionForm.attendanceSessionId));
    const selectedDate = selectedSession?.attendance_date
      ? formatDateParam(new Date(selectedSession.attendance_date))
      : permissionForm.date;

    const payload = {
      request_type: 'wrong_status',
      requested_status: 'permission',
      reason: [
        `${t('permissionType')}: ${t(permissionForm.permissionType)}`,
        permissionForm.reason.trim(),
      ].join('\n'),
    };

    if (permissionForm.attendanceSessionId) {
      payload.attendance_session_id = permissionForm.attendanceSessionId;
    }

    if (selectedDate && permissionForm.startTime) {
      payload.requested_check_in_time = `${selectedDate} ${permissionForm.startTime}`;
    }

    if (selectedDate && permissionForm.endTime) {
      payload.requested_check_out_time = `${selectedDate} ${permissionForm.endTime}`;
    }

    if (selectedDate && permissionForm.permissionType === 'full_day') {
      payload.requested_check_in_time = `${selectedDate} 00:00`;
      payload.requested_check_out_time = `${selectedDate} 23:59`;
    }

    setPermissionSubmitting(true);
    try {
      const res = await api.post('/teacher/attendance/corrections', payload);
      setCorrections((prev) => [res.data?.correction, ...prev].filter(Boolean));
      setPermissionForm({
        attendanceSessionId: '',
        permissionType: 'full_day',
        date: formatDateParam(new Date()),
        startTime: '',
        endTime: '',
        reason: '',
      });
      showToast(t('permissionRequestSent'));
      fetchAttendance({ silent: true });
    } catch (err) {
      console.error('Failed to submit permission request', err);
      showToast(err.response?.data?.message || t('permissionRequestFailed'));
    } finally {
      setPermissionSubmitting(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const stats = useMemo(() => {
    const totals = history.reduce((acc, item) => {
      const status = normalizeStatus(item.attendance_status);
      if (['cancelled', 'rescheduled'].includes(status)) return acc;

      acc.eligible += 1;
      if (isPresentStatus(status)) acc.present += 1;
      if (['late', 'very_late'].includes(status)) acc.late += 1;
      return acc;
    }, { eligible: 0, present: 0, late: 0 });
    const attendanceRate = totals.eligible > 0 ? Math.round((totals.present / totals.eligible) * 100) : 0;

    return [
      {
        label: t('thisMonth'),
        value: `${totals.present}/${totals.eligible}`,
        sub: t('daysPresent'),
        color: 'text-blue-600',
        icon: CalendarCheck,
      },
      {
        label: t('attendanceRate'),
        value: `${attendanceRate}%`,
        sub: t('pastFiveDays'),
        color: attendanceRate >= 80 ? 'text-green-500' : 'text-amber-500',
        icon: TrendingUp,
      },
      {
        label: t('lateArrivals'),
        value: totals.late,
        sub: t('thisWeek'),
        color: 'text-amber-500',
        icon: TimerReset,
      },
    ];
  }, [history, t]);

  const groupedHistory = useMemo(() => {
    const groups = new Map();

    history.forEach((record) => {
      const subjectName = readName(record.subject);
      const groupName = readName(record.class_group, t('classGroup'));
      const subjectKey = readId(record.subject) || subjectName;
      const groupKey = readId(record.class_group) || groupName;
      const key = `${subjectKey}:${groupKey}`;

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          subjectName,
          groupName,
          sessions: [],
        });
      }

      groups.get(key).sessions.push({
        id: record.id,
        date: formatApiDate(record.attendance_date),
        checkIn: formatApiTime(record.check_in_time),
        checkOut: formatApiTime(record.check_out_time),
        room: record.room_name || readName(record.class_room, t('room')),
        status: record.attendance_status,
      });
    });

    return Array.from(groups.values());
  }, [history, t]);

  const toggleHistoryGroup = useCallback((key) => {
    setExpandedHistoryId((currentKey) => currentKey === key ? null : key);
  }, []);

  const dateLabel = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const topSession = todaySessions.find((session) => {
    const status = normalizeStatus(session.attendance_status);
    return !session.check_out_time && !isClosedStatus(status);
  }) || todaySessions[0] || null;

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  };

  const getSessionRule = (session) => {
    const index = todaySessions.findIndex((item) => item.id === session?.id);
    const action = session?.check_in_time && !session?.check_out_time ? 'check-out' : 'check-in';
    const method = action === 'check-out' || index === 0 ? 'qr' : 'manual';

    return {
      action,
      method,
      requiresQr: method === 'qr',
      isFirstSession: index === 0,
    };
  };

  const openQrScanner = (session, action) => {
    if (!session) return;
    setScanTarget({ session, action });
  };

  const handleSessionAction = async (session, forcedAction = null, method = 'manual') => {
    if (!session) return;
    const status = normalizeStatus(session.attendance_status);
    const hasCheckedIn = Boolean(session.check_in_time);
    const hasCheckedOut = Boolean(session.check_out_time);
    const action = forcedAction || (hasCheckedIn && !hasCheckedOut ? 'check-out' : 'check-in');

    if (hasCheckedOut || isClosedStatus(status)) return;

    setMarkedSessions((prev) => ({ ...prev, [session.id]: true }));
    try {
      const res = await api.post(`/teacher/attendance/sessions/${session.id}/${action}`, { method });
      const updatedSession = res.data?.session || session;
      setTodaySessions((prev) => sortByStartTime(prev.map((item) => item.id === session.id ? updatedSession : item)));
      setHistory((prev) => prev.map((item) => item.id === session.id ? updatedSession : item));
      setConfirming(null);
      setScanTarget(null);
      showToast(action === 'check-in' ? t('checkInRecorded') : t('checkOutRecorded'));
      fetchAttendance({ silent: true });
    } catch (err) {
      console.error('Failed to update teacher attendance session', err);
      showToast(err.response?.data?.message || t('attendanceFailed'));
    } finally {
      setMarkedSessions((prev) => ({ ...prev, [session.id]: false }));
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('myAttendance')}</h2>
          <p className="text-accent-muted">{t('teacherAttendanceSub')}</p>
        </div>
        <div className="glass px-4 py-2 rounded-xl flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium uppercase tracking-wider">{t('systemLive')}</span>
        </div>
      </header>

      <section className="glass relative overflow-hidden rounded-[1.75rem] p-6 md:p-8 border border-black/5 dark:border-white/10">
        <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-blue-600 via-cyan-500 to-green-500" />
        <div className="absolute top-0 right-0 w-56 h-56 bg-blue-600/10 blur-3xl rounded-full pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent-muted mb-3">{t('currentTime')}</p>
            <p className="font-mono text-5xl md:text-6xl font-black tracking-tight leading-none text-blue-600 dark:text-blue-400">{formatClock(now)}</p>
            <p className="text-sm text-accent-muted mt-3">{dateLabel}</p>
          </div>

          <AttendanceAction
            session={topSession}
            checkedIn={Boolean(topSession?.check_in_time)}
            checkedOut={Boolean(topSession?.check_out_time) || normalizeStatus(topSession?.attendance_status) === 'completed'}
            requiresQrCheckIn={topSession ? getSessionRule(topSession).requiresQr : false}
            confirming={confirming}
            checkInTime={formatApiTime(topSession?.check_in_time)}
            checkOutTime={formatApiTime(topSession?.check_out_time)}
            onConfirming={setConfirming}
            onCheckIn={() => getSessionRule(topSession).requiresQr ? openQrScanner(topSession, 'check-in') : handleSessionAction(topSession, 'check-in', 'manual')}
            onCheckOut={() => openQrScanner(topSession, 'check-out')}
            t={t}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((item) => (
          <motion.div
            key={item.label}
            whileHover={{ y: -4 }}
            className="glass p-6 rounded-[1.5rem] border border-black/5 dark:border-white/10 relative overflow-hidden hover:border-blue-600/20"
          >
            <item.icon className="absolute right-5 top-5 w-12 h-12 opacity-5" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-accent-muted mb-2">{item.label}</p>
            <p className={cn('text-4xl font-black tracking-tight', item.color)}>{item.value}</p>
            <p className="text-xs text-accent-muted mt-2">{item.sub}</p>
          </motion.div>
        ))}
      </section>

      <section className="glass rounded-[1.75rem] overflow-hidden border border-black/5 dark:border-white/10">
        <div className="p-5 md:p-6 border-b border-black/5 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-black/[0.02] dark:bg-white/[0.03]">
          <h3 className="font-bold flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600" />
            {t('requestPermission')}
          </h3>
          <p className="text-xs text-accent-muted">{t('requestPermissionSub')}</p>
        </div>

        <form onSubmit={handlePermissionSubmit} className="p-5 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
          <label className="lg:col-span-4 space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-accent-muted">{t('session')}</span>
            <select
              value={permissionForm.attendanceSessionId}
              onChange={(event) => setPermissionForm((prev) => ({ ...prev, attendanceSessionId: event.target.value }))}
              className="w-full rounded-xl bg-white/80 dark:bg-noir-900/80 border border-black/10 dark:border-white/10 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
            >
              <option value="">{t('wholeDayOrCustomTime')}</option>
              {history.map((session) => (
                <option key={session.id} value={session.id}>
                  {formatApiDate(session.attendance_date)} / {readName(session.subject)} / {formatApiTime(session.scheduled_start_time)}
                </option>
              ))}
            </select>
          </label>

          <label className="lg:col-span-3 space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-accent-muted">{t('permissionType')}</span>
            <select
              value={permissionForm.permissionType}
              onChange={(event) => setPermissionForm((prev) => ({ ...prev, permissionType: event.target.value }))}
              className="w-full rounded-xl bg-white/80 dark:bg-noir-900/80 border border-black/10 dark:border-white/10 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
            >
              <option value="full_day">{t('full_day')}</option>
              <option value="late_arrival">{t('late_arrival')}</option>
              <option value="early_leave">{t('early_leave')}</option>
              <option value="custom_time">{t('custom_time')}</option>
            </select>
          </label>

          <label className="lg:col-span-2 space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-accent-muted">{t('date')}</span>
            <input
              type="date"
              value={permissionForm.date}
              disabled={Boolean(permissionForm.attendanceSessionId)}
              onChange={(event) => setPermissionForm((prev) => ({ ...prev, date: event.target.value }))}
              className="w-full rounded-xl bg-white/80 dark:bg-noir-900/80 border border-black/10 dark:border-white/10 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 disabled:opacity-50"
            />
          </label>

          <label className="lg:col-span-1 space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-accent-muted">{t('from')}</span>
            <input
              type="time"
              value={permissionForm.startTime}
              disabled={permissionForm.permissionType === 'full_day'}
              onChange={(event) => setPermissionForm((prev) => ({ ...prev, startTime: event.target.value }))}
              className="w-full rounded-xl bg-white/80 dark:bg-noir-900/80 border border-black/10 dark:border-white/10 px-3 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 disabled:opacity-50"
            />
          </label>

          <label className="lg:col-span-1 space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-accent-muted">{t('to')}</span>
            <input
              type="time"
              value={permissionForm.endTime}
              disabled={permissionForm.permissionType === 'full_day'}
              onChange={(event) => setPermissionForm((prev) => ({ ...prev, endTime: event.target.value }))}
              className="w-full rounded-xl bg-white/80 dark:bg-noir-900/80 border border-black/10 dark:border-white/10 px-3 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 disabled:opacity-50"
            />
          </label>

          <div className="lg:col-span-1 flex items-end">
            <button
              type="submit"
              disabled={permissionSubmitting}
              className="cursor-pointer w-full rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-600/15"
            >
              {permissionSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t('send')}
            </button>
          </div>

          <label className="lg:col-span-12 space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-accent-muted">{t('reason')}</span>
            <textarea
              value={permissionForm.reason}
              onChange={(event) => setPermissionForm((prev) => ({ ...prev, reason: event.target.value }))}
              rows={3}
              placeholder={t('permissionReasonPlaceholder')}
              className="w-full resize-none rounded-xl bg-white/80 dark:bg-noir-900/80 border border-black/10 dark:border-white/10 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
            />
          </label>
        </form>

        {corrections.length > 0 && (
          <div className="px-5 md:px-6 pb-5 md:pb-6">
            <div className="rounded-2xl bg-white/60 dark:bg-white/[0.03] divide-y divide-black/5 dark:divide-white/5 overflow-hidden border border-black/5 dark:border-white/10">
              {corrections.slice(0, 3).map((item) => (
                <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                  <div>
                    <p className="font-bold">{displayStatus(item.requested_status || item.request_type)}</p>
                    <p className="text-xs text-accent-muted">{item.reason}</p>
                  </div>
                  <span className="w-max rounded-full bg-amber-500/15 text-amber-500 px-3 py-1 text-[11px] font-bold">
                    {displayStatus(item.status)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="glass rounded-[1.75rem] overflow-hidden border border-black/5 dark:border-white/10">
        <div className="p-5 md:p-6 border-b border-black/5 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-black/[0.02] dark:bg-white/[0.03]">
          <h3 className="font-bold flex items-center gap-3">
            <ClipboardCheck className="w-5 h-5 text-blue-600" />
            {t('todaysSessions')}
          </h3>
          <button
            onClick={() => fetchAttendance({ silent: true })}
            disabled={refreshing}
            className="cursor-pointer text-xs text-accent-muted hover:text-blue-600 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
            {t('refresh')}
          </button>
        </div>

        {loading ? (
          <LoadingBlock label={t('syncingData')} />
        ) : error ? (
          <EmptyBlock label={error} />
        ) : todaySessions.length === 0 ? (
          <EmptyBlock label={t('noSessionsFound')} />
        ) : (
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {todaySessions.map((session, index) => {
              const status = normalizeStatus(session.attendance_status);
              const hasCheckedIn = Boolean(session.check_in_time);
              const hasCheckedOut = Boolean(session.check_out_time);
              const marked = Boolean(markedSessions[session.id]) || isPresentStatus(status);
              const disabled = Boolean(markedSessions[session.id]) || hasCheckedOut || isClosedStatus(status);
              const rule = getSessionRule(session);
              const buttonLabel = markedSessions[session.id]
                ? t('verifying')
                : hasCheckedOut || status === 'completed'
                  ? t('completed')
                  : rule.requiresQr
                    ? (rule.action === 'check-out' ? t('scanQrCheckOut') : t('scanQrCheckIn'))
                    : t('manualSubmit');

              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className={cn(
                    'p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors',
                    marked ? 'bg-green-500/10' : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0',
                      marked ? 'bg-green-500 text-white shadow-lg shadow-green-500/15' : 'bg-blue-600/10 text-blue-600 dark:text-blue-400'
                    )}>
                      {marked ? <Check className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className="font-bold">{readName(session.subject)}</h4>
                      <p className="text-xs text-accent-muted mt-1">
                        {formatApiTime(session.scheduled_start_time)} - {formatApiTime(session.scheduled_end_time)} / {session.room_name || readName(session.class_room, t('room'))} / {readName(session.class_group, t('classGroup'))}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => rule.requiresQr ? openQrScanner(session, rule.action) : handleSessionAction(session, rule.action, 'manual')}
                    disabled={disabled}
                    className={cn(
                      'cursor-pointer px-5 py-2.5 rounded-xl text-sm font-bold transition-all w-full md:w-auto',
                      disabled ? 'cursor-not-allowed opacity-70' : '',
                      hasCheckedOut || status === 'completed'
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/15'
                        : 'bg-white/80 dark:bg-white/[0.06] text-accent hover:text-blue-600 hover:bg-blue-600/10 border border-black/5 dark:border-white/10'
                  )}
                >
                    <span className="inline-flex items-center justify-center gap-2">
                      {rule.requiresQr && !disabled && <Camera className="w-4 h-4" />}
                      {buttonLabel}
                    </span>
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      <section className="glass rounded-[1.75rem] overflow-hidden border border-black/5 dark:border-white/10">
        <div className="p-5 md:p-6 border-b border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03]">
          <h3 className="font-bold flex items-center gap-3">
            <CalendarCheck className="w-5 h-5 text-blue-600" />
            {t('recentAttendanceHistory')}
          </h3>
        </div>

        {loading ? (
          <LoadingBlock label={t('syncingData')} />
        ) : error ? (
          <EmptyBlock label={error} />
        ) : history.length === 0 ? (
          <EmptyBlock label={t('noRecordsFound')} />
        ) : (
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {groupedHistory.map((group) => (
              <HistoryGroupRow
                key={group.key}
                group={group}
                isExpanded={expandedHistoryId === group.key}
                onToggle={toggleHistoryGroup}
                t={t}
              />
            ))}
          </div>
        )}
      </section>

      <AnimatePresence>
        {scanTarget && (
          <TeacherQrScanModal
            target={scanTarget}
            onClose={() => setScanTarget(null)}
            onScanned={() => handleSessionAction(scanTarget.session, scanTarget.action, 'qr')}
            t={t}
          />
        )}

        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-6 right-6 z-[60] rounded-2xl bg-noir-900 text-accent px-5 py-3 text-sm font-medium border border-black/10 dark:border-white/10 shadow-2xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AttendanceAction = ({
  session,
  checkedIn,
  checkedOut,
  requiresQrCheckIn,
  confirming,
  checkInTime,
  checkOutTime,
  onConfirming,
  onCheckIn,
  onCheckOut,
  t,
}) => {
  if (!session) {
    return (
      <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl px-5 py-3 text-sm font-bold text-accent-muted">
        {t('noSessionsFound')}
      </div>
    );
  }

  if (!checkedIn && !checkedOut) {
    return confirming === 'in' ? (
        <ConfirmActions
        onCancel={() => onConfirming(null)}
        onConfirm={onCheckIn}
        confirmLabel={requiresQrCheckIn ? t('scanQrCheckIn') : t('confirmCheckIn')}
        confirmClassName="bg-green-500 hover:bg-green-400"
        cancelLabel={t('cancel')}
      />
    ) : (
      <button
        onClick={() => onConfirming('in')}
        className="cursor-pointer bg-green-500 hover:bg-green-400 text-white px-7 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-green-500/20 transition-colors"
      >
        {requiresQrCheckIn ? <Camera className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
        {requiresQrCheckIn ? t('scanQrCheckIn') : t('checkInNow')}
      </button>
    );
  }

  if (checkedIn && !checkedOut) {
    return (
      <div className="flex flex-col items-start lg:items-end gap-3">
        <p className="text-sm text-accent-muted">
          {t('checkedInAt')} <span className="font-bold text-accent">{checkInTime}</span>
        </p>
        {confirming === 'out' ? (
          <ConfirmActions
            onCancel={() => onConfirming(null)}
            onConfirm={onCheckOut}
            confirmLabel={t('scanQrCheckOut')}
            confirmClassName="bg-amber-500 hover:bg-amber-400"
            cancelLabel={t('cancel')}
          />
        ) : (
          <button
            onClick={() => onConfirming('out')}
            className="cursor-pointer bg-amber-500 hover:bg-amber-400 text-white px-7 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-amber-500/20 transition-colors"
          >
            <Camera className="w-5 h-5" />
            {t('scanQrCheckOut')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start lg:items-end gap-3">
      <p className="text-sm text-accent-muted">
        {t('in')} <span className="font-bold text-accent">{checkInTime}</span> / {t('out')}{' '}
        <span className="font-bold text-accent">{checkOutTime}</span>
      </p>
      <div className="bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-2xl px-5 py-3 text-sm font-bold flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5" />
        {t('attendanceComplete')}
      </div>
    </div>
  );
};

const TeacherQrScanModal = ({ target, onClose, onScanned, t }) => {
  const [error, setError] = useState(null);
  const scannedRef = React.useRef(false);

  const handleScan = (data) => {
    if (!data || scannedRef.current) return;
    const qrText = (typeof data === 'string' ? data : data.text || '').trim();
    if (!qrText) return;

    scannedRef.current = true;
    onScanned(qrText);
  };

  const handleError = (err) => {
    console.error('Teacher attendance QR camera error:', err);
    setError(t('cameraUnavailable'));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="glass w-full max-w-md rounded-[1.75rem] p-6 border border-black/10 dark:border-white/10"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="text-xl font-bold">{target.action === 'check-out' ? t('scanQrCheckOut') : t('scanQrCheckIn')}</h3>
            <p className="text-sm text-accent-muted mt-1">{readName(target.session.subject)} / {formatApiTime(target.session.scheduled_start_time)}</p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative aspect-square overflow-hidden rounded-3xl border border-black/10 dark:border-white/10 bg-black">
          <Scanner
            delay={300}
            onError={handleError}
            onScan={handleScan}
            constraints={{
              audio: false,
              video: { facingMode: 'environment' },
            }}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-8 border-2 border-white/25 rounded-2xl">
              <motion.div
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.9)]"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 text-center">
          <p className="text-sm font-bold">{t('alignQr')}</p>
          <p className="text-xs text-accent-muted mt-1">{t('teacherQrScanSub')}</p>
          {error && <p className="text-xs text-red-500 font-bold mt-3">{error}</p>}
        </div>
      </motion.div>
    </motion.div>
  );
};

const ConfirmActions = ({ onCancel, onConfirm, confirmLabel, confirmClassName, cancelLabel }) => (
  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
    <button
      onClick={onCancel}
      className="cursor-pointer bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-accent border border-black/10 dark:border-white/10 px-5 py-3 rounded-2xl font-bold transition-colors"
    >
      {cancelLabel}
    </button>
    <button
      onClick={onConfirm}
      className={cn('cursor-pointer text-white px-5 py-3 rounded-2xl font-bold transition-colors', confirmClassName)}
    >
      {confirmLabel}
    </button>
  </div>
);

const HistoryGroupRow = React.memo(({ group, isExpanded, onToggle, t }) => (
  <div className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
    <button
      type="button"
      onClick={() => onToggle(group.key)}
      className="cursor-pointer w-full px-5 md:px-6 py-4 flex items-center justify-between gap-4 text-left"
    >
      <div className="min-w-0">
        <p className="font-bold truncate">{group.subjectName}</p>
        <p className="text-xs text-accent-muted mt-1 truncate">{group.groupName}</p>
      </div>
      <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
        {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </div>
    </button>

    <AnimatePresence initial={false}>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="overflow-hidden"
        >
          <div className="px-5 md:px-6 pb-5 space-y-3">
            {group.sessions.map((session) => (
              <HistorySessionCard key={session.id} session={session} t={t} />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
));

const HistorySessionCard = React.memo(({ session, t }) => (
  <div className="rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-black/5 dark:border-white/10 p-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <HistoryDetail label={t('date')} value={session.date} />
      <HistoryDetail label={t('checkInTime')} value={session.checkIn} monospace />
      <HistoryDetail label={t('checkOut')} value={session.checkOut} monospace />
      <HistoryDetail label={t('room')} value={session.room} />
      <div className="rounded-xl bg-white/70 dark:bg-white/[0.04] border border-black/5 dark:border-white/10 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-accent-muted mb-2">{t('status')}</p>
        <StatusBadge status={session.status} />
      </div>
    </div>
  </div>
));

const HistoryDetail = ({ label, value, monospace = false }) => (
  <div className="rounded-xl bg-white/70 dark:bg-white/[0.04] border border-black/5 dark:border-white/10 px-4 py-3">
    <p className="text-[10px] font-bold uppercase tracking-widest text-accent-muted mb-1">{label}</p>
    <p className={cn('text-sm font-bold text-accent truncate', monospace && 'font-mono')}>
      {value}
    </p>
  </div>
);

const LoadingBlock = ({ label }) => (
  <div className="py-12 flex flex-col items-center justify-center gap-3 text-accent-muted">
    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
    <p className="text-xs font-bold uppercase tracking-widest">{label}</p>
  </div>
);

const EmptyBlock = ({ label }) => (
  <div className="py-12 px-6 text-center text-sm text-accent-muted">
    {label}
  </div>
);

const StatusBadge = ({ status }) => {
  const normalized = normalizeStatus(status);
  const className = isPresentStatus(normalized)
    ? 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20'
    : ['late', 'very_late', 'missing_check_out', 'scheduled'].includes(normalized)
      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20'
      : 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20';

  return (
    <span className={cn('inline-flex px-3 py-1 rounded-full text-[11px] font-bold border', className)}>
      {displayStatus(normalized)}
    </span>
  );
};
