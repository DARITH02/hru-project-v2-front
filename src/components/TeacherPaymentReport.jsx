import React, { useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  Calendar,
  CheckCircle2,
  DollarSign,
  FileText,
  Loader2,
  RefreshCw,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import { cn } from '../lib/utils';

const buildDateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

const readName = (value, fallback = 'N/A') => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  return value.name || value.code || value.title || fallback;
};

const readCollection = (payload) => {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const readStatus = (value) => {
  if (!value) return 'scheduled';
  if (typeof value === 'object') return String(value.name || value.status || 'scheduled').toLowerCase();
  return String(value).toLowerCase();
};

const readSessionDate = (session) => {
  const rawValue = session.start_time || session.scheduled_start_time || session.date || session.session_date;
  if (!rawValue) return null;
  const parsed = new Date(rawValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const readSessionEnd = (session) => {
  const rawValue = session.end_time || session.scheduled_end_time;
  if (!rawValue) return null;
  const parsed = new Date(rawValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const readAttendanceCount = (session) => {
  const rawValue = session.presence_count
    ?? session.attendance_count
    ?? session.present_count
    ?? session.students_present
    ?? session.student_count
    ?? 0;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value) => new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value);

const formatDateLabel = (value) => {
  if (!value) return '-';
  return value.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatTimeLabel = (value) => {
  if (!value) return '--:--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatStatus = (status) => status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const isPayableSession = (session) => {
  const status = readStatus(session.status);
  if (['cancelled', 'rescheduled'].includes(status)) {
    return false;
  }
  if (status === 'completed') {
    return true;
  }

  const sessionEnd = readSessionEnd(session);
  return Boolean(sessionEnd && sessionEnd < new Date() && status !== 'active');
};

const SummaryCard = ({ icon: Icon, label, value, subValue, accentClass = 'text-blue-600' }) => (
  <motion.div
    whileHover={{ y: -4 }}
    className="glass p-6 rounded-[1.5rem] border border-black/5 dark:border-white/10 relative overflow-hidden"
  >
    <Icon className="absolute right-5 top-5 w-12 h-12 opacity-5" />
    <p className="text-[10px] font-bold uppercase tracking-widest text-accent-muted mb-2">{label}</p>
    <p className={cn('text-4xl font-black tracking-tight', accentClass)}>{value}</p>
    <p className="text-xs text-accent-muted mt-2">{subValue}</p>
  </motion.div>
);

export const TeacherPaymentReport = () => {
  const { t } = useApp();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState(buildDateValue(getMonthStart()));
  const [toDate, setToDate] = useState(buildDateValue(new Date()));
  const [ratePerSession, setRatePerSession] = useState(() => localStorage.getItem('teacher_payment_rate') || '');

  const fetchSessions = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await api.get('/teacher/sessions');
      setSessions(readCollection(res.data));
    } catch (err) {
      console.error('Failed to fetch teacher sessions for payment report', err);
      setError(err.response?.data?.message || t('attendanceDataFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    localStorage.setItem('teacher_payment_rate', ratePerSession);
  }, [ratePerSession]);

  const filteredSessions = useMemo(() => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59`) : null;

    return [...sessions]
      .filter((session) => {
        const status = readStatus(session.status);
        const sessionDate = readSessionDate(session);

        if (statusFilter !== 'all' && status !== statusFilter) {
          return false;
        }
        if (from && sessionDate && sessionDate < from) {
          return false;
        }
        if (to && sessionDate && sessionDate > to) {
          return false;
        }
        return true;
      })
      .sort((left, right) => {
        const leftDate = readSessionDate(left)?.getTime() || 0;
        const rightDate = readSessionDate(right)?.getTime() || 0;
        return rightDate - leftDate;
      });
  }, [fromDate, sessions, statusFilter, toDate]);

  const numericRate = Number(ratePerSession) || 0;

  const totals = useMemo(() => {
    const payableSessions = filteredSessions.filter(isPayableSession);
    const attendanceCount = filteredSessions.reduce((sum, session) => sum + readAttendanceCount(session), 0);
    const estimatedPayment = payableSessions.length * numericRate;
    const averageAttendance = filteredSessions.length > 0
      ? (attendanceCount / filteredSessions.length).toFixed(1)
      : '0.0';

    return {
      totalSessions: filteredSessions.length,
      payableSessions: payableSessions.length,
      attendanceCount,
      estimatedPayment,
      averageAttendance,
    };
  }, [filteredSessions, numericRate]);

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('paymentReport')}</h2>
          <p className="text-accent-muted">{t('attendanceSummarySub')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchSessions({ silent: true })}
            disabled={refreshing}
            className="glass p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4 text-accent-muted', refreshing && 'animate-spin')} />
          </button>
          <div className="glass px-4 py-2 rounded-xl flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium uppercase tracking-wider">{t('systemLive')}</span>
          </div>
        </div>
      </header>

      <section className="glass rounded-[1.75rem] border border-black/5 dark:border-white/10 p-5 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <label className="lg:col-span-3 space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-accent-muted">{t('from')}</span>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="w-full rounded-xl bg-white/80 dark:bg-noir-900/80 border border-black/10 dark:border-white/10 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
            />
          </label>

          <label className="lg:col-span-3 space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-accent-muted">{t('to')}</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="w-full rounded-xl bg-white/80 dark:bg-noir-900/80 border border-black/10 dark:border-white/10 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
            />
          </label>

          <label className="lg:col-span-3 space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-accent-muted">{t('status')}</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-xl bg-white/80 dark:bg-noir-900/80 border border-black/10 dark:border-white/10 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
            >
              <option value="all">{t('all')}</option>
              <option value="scheduled">{t('scheduled')}</option>
              <option value="active">{t('active')}</option>
              <option value="completed">{t('completed')}</option>
            </select>
          </label>

          <label className="lg:col-span-3 space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-accent-muted">{t('paymentRate')}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={ratePerSession}
              onChange={(event) => setRatePerSession(event.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl bg-white/80 dark:bg-noir-900/80 border border-black/10 dark:border-white/10 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
            />
          </label>
        </div>

        <div className="mt-4 rounded-2xl bg-blue-600/10 text-blue-700 dark:text-blue-300 px-4 py-3 flex items-center gap-3 text-sm">
          <Calculator className="w-4 h-4 shrink-0" />
          <span>{t('sessionPaymentBreakdownSub')}</span>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <SummaryCard
          icon={Calendar}
          label={t('totalSessions')}
          value={totals.totalSessions}
          subValue={t('sessionTimeline')}
        />
        <SummaryCard
          icon={CheckCircle2}
          label={t('payableSessions')}
          value={totals.payableSessions}
          subValue={t('completedSessionsHelp')}
          accentClass="text-green-500"
        />
        <SummaryCard
          icon={Users}
          label={t('totalAttendanceCount')}
          value={totals.attendanceCount}
          subValue={t('presentCount')}
          accentClass="text-cyan-500"
        />
        <SummaryCard
          icon={DollarSign}
          label={t('estimatedPayment')}
          value={formatCurrency(totals.estimatedPayment)}
          subValue={`${t('avgAttendancePerSession')}: ${totals.averageAttendance}`}
          accentClass="text-amber-500"
        />
      </section>

      <section className="glass rounded-[1.75rem] overflow-hidden border border-black/5 dark:border-white/10">
        <div className="p-5 md:p-6 border-b border-black/5 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-black/[0.02] dark:bg-white/[0.03]">
          <h3 className="font-bold flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600" />
            {t('sessionPaymentBreakdown')}
          </h3>
          <p className="text-xs text-accent-muted">
            {t('totalSessions')}: {totals.totalSessions} / {t('estimatedPayment')}: {formatCurrency(totals.estimatedPayment)}
          </p>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-4 text-accent-muted">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            <p className="animate-pulse">{t('retrievingSessions')}</p>
          </div>
        ) : error ? (
          <div className="py-16 px-6 text-center text-red-500">{error}</div>
        ) : filteredSessions.length === 0 ? (
          <div className="py-16 px-6 text-center text-accent-muted">{t('noPaymentRows')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-black/[0.02] dark:bg-white/[0.03]">
                <tr className="text-left">
                  <th className="px-5 py-4 text-[10px] uppercase tracking-widest text-accent-muted font-bold">{t('date')}</th>
                  <th className="px-5 py-4 text-[10px] uppercase tracking-widest text-accent-muted font-bold">{t('session')}</th>
                  <th className="px-5 py-4 text-[10px] uppercase tracking-widest text-accent-muted font-bold">{t('classGroup')}</th>
                  <th className="px-5 py-4 text-[10px] uppercase tracking-widest text-accent-muted font-bold">{t('status')}</th>
                  <th className="px-5 py-4 text-[10px] uppercase tracking-widest text-accent-muted font-bold">{t('attendanceCountColumn')}</th>
                  <th className="px-5 py-4 text-[10px] uppercase tracking-widest text-accent-muted font-bold">{t('payable')}</th>
                  <th className="px-5 py-4 text-[10px] uppercase tracking-widest text-accent-muted font-bold">{t('amount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filteredSessions.map((session) => {
                  const status = readStatus(session.status);
                  const payable = isPayableSession(session);
                  const attendanceCount = readAttendanceCount(session);
                  const startDate = readSessionDate(session);
                  const amount = payable ? numericRate : 0;

                  return (
                    <tr key={session.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                      <td className="px-5 py-4 align-top">
                        <div className="font-medium">{formatDateLabel(startDate)}</div>
                        <div className="text-xs text-accent-muted">
                          {formatTimeLabel(session.start_time || session.scheduled_start_time)} - {formatTimeLabel(session.end_time || session.scheduled_end_time)}
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top font-medium">{readName(session.subject, t('unknown'))}</td>
                      <td className="px-5 py-4 align-top text-accent-muted">{readName(session.class_group, t('classGroup'))}</td>
                      <td className="px-5 py-4 align-top">
                        <span className={cn(
                          'inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider',
                          status === 'completed'
                            ? 'bg-green-500/15 text-green-500'
                            : status === 'active'
                              ? 'bg-blue-500/15 text-blue-500'
                              : 'bg-black/5 dark:bg-white/10 text-accent-muted'
                        )}>
                          {formatStatus(status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-top font-bold">{attendanceCount}</td>
                      <td className="px-5 py-4 align-top">
                        <span className={cn(
                          'inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider',
                          payable ? 'bg-amber-500/15 text-amber-500' : 'bg-black/5 dark:bg-white/10 text-accent-muted'
                        )}>
                          {payable ? t('yes') : t('no')}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-top font-bold text-amber-500">{formatCurrency(amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
