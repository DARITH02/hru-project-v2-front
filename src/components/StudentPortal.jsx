import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import {
  BookOpen,
  Camera,
  FileText,
  History,
  Keyboard,
  QrCode,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Number(value) || 0));

const gradeFromRate = (rate) => {
  if (rate >= 90) return 'A';
  if (rate >= 80) return 'B+';
  if (rate >= 70) return 'B';
  if (rate >= 60) return 'C+';
  return 'R';
};

const gradeTone = (rate) => {
  if (rate >= 80) return 'record-grade--good';
  if (rate >= 60) return 'record-grade--warn';
  return 'record-grade--risk';
};

const formatDate = (value, lang) => {
  if (!value) return null;
  return new Intl.DateTimeFormat(lang === 'kh' ? 'km-KH' : 'en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
};

const resolveMediaUrl = (value) => {
  if (!value) return '';
  const mediaValue = typeof value === 'string' ? value : value?.url;
  if (!mediaValue) return '';

  if (mediaValue.startsWith('http') || mediaValue.startsWith('//') || mediaValue.startsWith('data:') || mediaValue.startsWith('blob:')) {
    return mediaValue;
  }

  const backendUrl = api.defaults.baseURL.replace(/\/api\/?$/, '');
  const path = mediaValue.startsWith('/') ? mediaValue : `/${mediaValue}`;
  return `${backendUrl}${path}`;
};

const studentInitials = (name = 'Student') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

export const StudentPortal = () => {
  const { t, lang, user } = useApp();
  const navigate = useNavigate();
  const [portalData, setPortalData] = useState(null);
  const [classes, setClasses] = useState([]);
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('subject');

  useEffect(() => {
    const fetchPortalData = async () => {
      try {
        const [portalResult, classesResult, transcriptResult] = await Promise.allSettled([
          api.get('/student/portal'),
          api.get('/student/classes'),
          api.get('/student/transcript'),
        ]);

        if (portalResult.status === 'fulfilled') setPortalData(portalResult.value.data);
        if (classesResult.status === 'fulfilled') setClasses(classesResult.value.data || []);
        if (transcriptResult.status === 'fulfilled') setTranscript(transcriptResult.value.data || null);
      } catch (err) {
        console.error('Failed to fetch portal data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPortalData();
  }, []);

  const activeSession = portalData?.active_session;
  const stats = portalData?.stats || {};
  const student = portalData?.student || transcript?.student || {};
  const studentName = student?.name || user?.name || 'Student';
  const studentPhotoUrl = resolveMediaUrl(
    student?.primary_photo_url ||
    student?.profile_photo_url ||
    student?.photo_url ||
    user?.profile_photo_url,
  );
  const attendanceRate = clamp(stats?.rate);
  const latestGpa = Number(transcript?.summary?.latest_gpa || 0);
  const cumulativeGpa = Number(transcript?.summary?.cumulative_gpa || 0);
  const ringValue = latestGpa > 0 ? clamp((latestGpa / 4) * 100) : attendanceRate;
  const ringLabel = latestGpa > 0 ? t('studentPortalCurrentGpa') : t('studentPortalAttendance');
  const ringNumber = latestGpa > 0 ? latestGpa.toFixed(2) : `${attendanceRate}%`;

  const subjectRows = useMemo(() => {
    const classRows = (classes || []).map((item) => ({
      id: item.id,
      name: item.name || 'N/A',
      code: item.code || 'N/A',
      teacher: item.teacher || 'N/A',
      sessions: item.sessions_count || 0,
      attended: item.attended_count || 0,
      rate: clamp(item.attendance_rate),
      average: clamp(item.class_average_rate),
      remaining: Number(item.remaining_sessions) || 0,
      grade: gradeFromRate(clamp(item.attendance_rate)),
    }));

    if (classRows.length) return classRows;

    const latestHistory = transcript?.histories?.[0];
    const grades = latestHistory?.subject_grades || latestHistory?.subjectGrades || [];
    return grades.map((grade, index) => ({
      id: grade.id || index,
      name: grade.subject_name || grade.name || 'N/A',
      code: grade.subject_code || grade.code || 'N/A',
      teacher: grade.teacher || grade.teacher_name || 'N/A',
      sessions: grade.credits || grade.credit || 0,
      attended: grade.score || grade.total_score || 0,
      rate: clamp(grade.score || grade.total_score),
      average: clamp(grade.class_average_rate || grade.class_average || grade.average_score),
      remaining: 0,
      grade: grade.grade || gradeFromRate(clamp(grade.score || grade.total_score)),
    }));
  }, [classes, transcript]);

  const comparisonRows = useMemo(() => {
    if (viewMode === 'semester') {
      const histories = transcript?.histories || [];
      return histories.slice(0, 6).reverse().map((item) => ({
        label: `${item.academic_year || ''} S${item.semester || ''}`.trim(),
        student: clamp(((Number(item.semester_gpa) || 0) / 4) * 100),
        average: clamp(((Number(item.class_average_gpa || item.cohort_average_gpa || item.class_average) || 0) / 4) * 100),
      }));
    }

    if (viewMode === 'year') {
      const grouped = {};
      (transcript?.histories || []).forEach((item) => {
        const year = item.academic_year || 'Current';
        grouped[year] = grouped[year] || [];
        grouped[year].push({
          student: Number(item.semester_gpa) || 0,
          average: Number(item.class_average_gpa || item.cohort_average_gpa || item.class_average) || 0,
        });
      });

      return Object.entries(grouped).slice(0, 5).map(([year, values]) => {
        const studentAverage = values.reduce((sum, value) => sum + value.student, 0) / Math.max(1, values.length);
        const classValues = values.map((value) => value.average).filter((value) => value > 0);
        const classAverage = classValues.reduce((sum, value) => sum + value, 0) / Math.max(1, classValues.length);
        return { label: year, student: clamp((studentAverage / 4) * 100), average: clamp((classAverage / 4) * 100) };
      });
    }

    return subjectRows.slice(0, 6).map((row) => ({
      label: row.name.length > 16 ? `${row.name.slice(0, 14)}...` : row.name,
      student: row.rate,
      average: row.average,
    }));
  }, [subjectRows, transcript, viewMode]);

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-accent-muted">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl" />
          <div className="relative z-10 h-12 w-12 animate-spin rounded-full border-4 border-blue-600/20 border-t-blue-600" />
        </div>
        <p className="mt-4 animate-pulse text-[10px] font-black uppercase tracking-[0.3em]">
          {t('gatheringIntelligence') || 'Gathering academic record...'}
        </p>
      </div>
    );
  }

  return (
    <div className="student-record-shell">
      <style>{`
        .student-record-shell {
          --record-paper: color-mix(in srgb, var(--bg-secondary) 84%, #ffffff);
          --record-card: color-mix(in srgb, var(--bg-primary) 94%, #f8fafc);
          --record-ink: var(--text-primary);
          --record-muted: var(--text-secondary);
          --record-rule: color-mix(in srgb, var(--text-primary) 14%, transparent);
          --record-blue: #2563eb;
          --record-blue-deep: #1d4ed8;
          --record-green: #15803d;
          --record-gold: #a16207;
          --record-red: #dc2626;
          width: 100%;
          color: var(--record-ink);
        }
        .dark .student-record-shell {
          --record-paper: color-mix(in srgb, var(--bg-secondary) 92%, #172033);
          --record-card: color-mix(in srgb, var(--bg-secondary) 88%, #111827);
          --record-rule: color-mix(in srgb, #ffffff 13%, transparent);
        }
        .record-sheet {
          position: relative;
          overflow: hidden;
             }
        .record-sheet::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: .28;
               background-size: 28px 28px;
            }
        .record-font-serif { font-family: Georgia, "Times New Roman", serif; }
        .record-card {
          position: relative;
          border: 1px solid var(--record-rule);
          background: color-mix(in srgb, var(--record-card) 94%, transparent);
          box-shadow: 0 3px 0 color-mix(in srgb, var(--record-ink) 10%, transparent);
        }
        .record-card::after {
          content: "";
          position: absolute;
          inset: 5px;
          border: 1px solid color-mix(in srgb, var(--record-ink) 6%, transparent);
          pointer-events: none;
        }
        .record-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px dashed var(--record-rule);
          padding: 14px 18px;
        }
        .record-card-body { position: relative; z-index: 1; padding: 18px; }
        .record-table { width: 100%; border-collapse: collapse; }
        .record-table th {
          border-bottom: 2px solid color-mix(in srgb, var(--record-ink) 70%, transparent);
          padding: 8px 9px 10px;
          text-align: left;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .12em;
          color: var(--record-muted);
          text-transform: uppercase;
          white-space: nowrap;
        }
        .record-table td {
          border-bottom: 1px dashed var(--record-rule);
          padding: 11px 9px;
          vertical-align: middle;
        }
        .record-table tr:last-child td { border-bottom: 0; }
        .record-grade {
          display: inline-flex;
          width: 30px;
          height: 30px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1.5px solid currentColor;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 12px;
          font-weight: 800;
        }
        .record-grade--good { color: var(--record-green); }
        .record-grade--warn { color: var(--record-gold); }
        .record-grade--risk { color: var(--record-red); }
        .record-kpi {
          position: relative;
          overflow: hidden;
          border: 1px solid var(--record-rule);
          background: color-mix(in srgb, var(--record-card) 93%, transparent);
          box-shadow: 0 3px 0 color-mix(in srgb, var(--record-ink) 10%, transparent);
        }
        .record-kpi::before {
          content: "";
          position: absolute;
          right: 0;
          top: 0;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 0 34px 34px 0;
          border-color: transparent color-mix(in srgb, var(--record-blue) 10%, transparent) transparent transparent;
        }
        .record-tag {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          border: 1px solid currentColor;
          padding: 4px 9px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .09em;
          text-transform: uppercase;
        }
        .record-bar {
          height: 9px;
          border: 1px solid var(--record-rule);
          background: color-mix(in srgb, var(--record-muted) 10%, transparent);
          overflow: hidden;
        }
        .record-bar span {
          display: block;
          height: 100%;
          background: var(--record-blue);
        }
        .record-comparison-card {
          --chart-maroon: #7a2e2e;
          --chart-maroon-deep: #5c2020;
          --chart-average: #c9bc9e;
          --chart-rule: #e3d7bd;
          --chart-paper: #fbf7ee;
          background:
            linear-gradient(180deg, rgba(255,255,255,.38), transparent),
            var(--chart-paper);
          border-color: #d7c8a9;
          box-shadow: 0 4px 0 rgba(36, 31, 24, .14);
        }
        .dark .record-comparison-card {
          --chart-maroon: #c94f4f;
          --chart-maroon-deep: #933f3f;
          --chart-average: #9f916e;
          --chart-rule: rgba(226, 214, 188, .18);
          --chart-paper: #11100e;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, .055), rgba(255, 255, 255, .015) 42%, rgba(0, 0, 0, .2)),
            radial-gradient(circle at 0 0, rgba(201, 79, 79, .08), transparent 42%),
            #11100e;
          border-color: rgba(226, 214, 188, .45);
          box-shadow: 0 5px 0 rgba(226, 214, 188, .12), 0 18px 42px rgba(0, 0, 0, .28);
        }
        .dark .record-comparison-card::after {
          border-color: rgba(226, 214, 188, .12);
        }
        .record-chart-title {
          color: var(--record-ink);
        }
        .dark .record-chart-title {
          color: #f8fafc;
          text-shadow: 0 2px 0 rgba(201, 79, 79, .45);
        }
        .record-chart-tabs {
          display: inline-flex;
          border: 1px solid #d2c19b;
          background: #eadfc9;
          padding: 2px;
        }
        .dark .record-chart-tabs {
          border-color: rgba(226, 214, 188, .28);
          background: rgba(226, 214, 188, .1);
        }
        .record-chart-tab {
          min-height: 32px;
          padding: 0 15px;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: var(--record-muted);
          transition: background .16s ease, color .16s ease;
        }
        .record-chart-tab:hover {
          color: var(--record-ink);
        }
        .record-chart-tab.is-active {
          background: var(--chart-maroon);
          color: #fffaf0;
        }
        .record-chart-legend {
          display: flex;
          gap: 22px;
          flex-wrap: wrap;
          padding: 18px 4px 10px;
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--record-muted);
        }
        .record-chart-legend span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .record-chart-legend i {
          width: 12px;
          height: 12px;
          border-radius: 3px;
          display: inline-block;
        }
        .record-chart-plot {
          position: relative;
          display: grid;
          grid-template-columns: 28px minmax(560px, 1fr);
          min-height: 390px;
          padding-top: 10px;
          overflow-x: auto;
        }
        .record-chart-y {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding-bottom: 36px;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--record-muted);
        }
        .record-chart-area {
          position: relative;
          display: grid;
          grid-template-rows: 1fr 36px;
          border-left: 1px solid var(--chart-rule);
          border-bottom: 1px solid #cdbd9e;
          background:
            repeating-linear-gradient(
              to top,
              transparent 0,
              transparent calc(10% - 1px),
              var(--chart-rule) calc(10% - 1px),
              var(--chart-rule) 10%
            );
        }
        .dark .record-chart-area {
          border-bottom-color: rgba(226, 214, 188, .34);
          background:
            repeating-linear-gradient(
              to top,
              transparent 0,
              transparent calc(10% - 1px),
              var(--chart-rule) calc(10% - 1px),
              var(--chart-rule) 10%
            ),
            linear-gradient(180deg, rgba(255,255,255,.035), transparent);
        }
        .record-chart-bars {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(var(--chart-count), minmax(84px, 1fr));
          gap: 26px;
          align-items: end;
          padding: 0 50px;
        }
        .record-chart-group {
          display: flex;
          justify-content: center;
          align-items: end;
          gap: 28px;
          height: 100%;
          min-width: 84px;
        }
        .record-chart-bar {
          width: 32px;
          min-height: 3px;
          border-radius: 4px 4px 0 0;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.12);
        }
        .record-chart-bar--student {
          background: var(--chart-maroon);
          box-shadow: 0 0 0 1px rgba(0,0,0,.08), inset 0 1px 0 rgba(255,255,255,.16);
        }
        .record-chart-bar--average {
          background: var(--chart-average);
          box-shadow: 0 0 0 1px rgba(0,0,0,.08), inset 0 1px 0 rgba(255,255,255,.12);
        }
        .record-chart-labels {
          display: grid;
          grid-template-columns: repeat(var(--chart-count), minmax(84px, 1fr));
          gap: 26px;
          align-items: start;
          padding: 11px 50px 0;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--record-muted);
          text-align: center;
        }
        .record-chart-labels span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        @media (max-width: 760px) {
          .record-chart-plot {
            grid-template-columns: 24px minmax(520px, 1fr);
          }
          .record-chart-bars,
          .record-chart-labels {
            padding-left: 32px;
            padding-right: 32px;
          }
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24 }}
        className="record-sheet  "
      >
        <header className="relative z-10 mb-7 flex flex-col gap-5 border-b-2 border-accent pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-blue-600">
              {t('studentPortalRegistrar')}
            </div>
            <h1 className="record-font-serif mt-2 text-4xl font-semibold italic tracking-tight sm:text-5xl">
              {studentName}
            </h1>
            <p className="mt-2 text-xs font-semibold text-accent-muted">
              {t('studentPortalStudentId')} {student?.code || student?.student_code || 'N/A'} - {student?.major || 'N/A'} - {student?.group || 'N/A'}
            </p>
            <span className="record-tag mt-4 text-blue-600">{portalData?.term_label || 'N/A'}</span>
          </div>

          <div className="flex items-end gap-4 lg:text-right">
            <div className="hidden text-xs leading-7 text-accent-muted sm:block">
              {t('studentPortalIssued')} <b className="text-accent">{formatDate(portalData?.issued_at, lang) || t('studentPortalNotIssued')}</b><br />
              {t('studentPortalStatus')} <b className="text-accent">{portalData?.standing || 'N/A'}</b><br />
              {t('studentPortalPortal')} <b className="text-accent">{portalData?.portal_name || 'N/A'}</b>
            </div>
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden border-2 border-blue-600 bg-blue-600/10 text-xl font-black text-blue-600 shadow-sm">
              {studentPhotoUrl ? (
                <img src={studentPhotoUrl} alt={studentName} className="h-full w-full object-cover" />
              ) : (
                studentInitials(studentName)
              )}
            </div>
          </div>
        </header>

        <section className="relative z-10 mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: ShieldCheck, label: t('studentPortalMeanPresence'), value: `${attendanceRate}%`, note: `${stats?.present || 0}/${stats?.total || 0} ${t('studentPortalSessions')}`, tone: attendanceRate >= 70 ? 'text-green-600' : 'text-red-600' },
            { icon: FileText, label: t('studentPortalRecordedAbsences'), value: stats?.absent || 0, note: t('studentPortalCurrentRecord'), tone: stats?.absent > 3 ? 'text-red-600' : 'text-green-600' },
            { icon: BookOpen, label: t('studentPortalSubjectsTracked'), value: subjectRows.length, note: t('studentPortalEnrolledClasses'), tone: 'text-blue-600' },
            { icon: QrCode, label: t('studentPortalActiveCheckIn'), value: activeSession?.status === 'active' ? t('studentPortalLive') : t('studentPortalWaiting'), note: activeSession?.subject?.name || activeSession?.subject || t('studentPortalNoLiveSession'), tone: activeSession?.status === 'active' ? 'text-green-600' : 'text-amber-600' },
          ].map((item) => (
            <div key={item.label} className="record-kpi p-4">
              <item.icon className={cn('h-5 w-5', item.tone)} />
              <div className="mt-4 text-[10px] font-black uppercase tracking-[0.14em] text-accent-muted">{item.label}</div>
              <div className="record-font-serif mt-1 text-3xl font-bold">{item.value}</div>
              <span className={cn('record-tag mt-3', item.tone)}>{item.note}</span>
            </div>
          ))}
        </section>

        <section className="relative z-10 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
          <div className="record-card rounded-xl">
            <div className="record-card-head">
              <h2 className="record-font-serif text-lg font-semibold">{t('studentPortalTranscriptBySubject')}</h2>
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-accent-muted">{subjectRows.length} {t('studentPortalSubjects')}</span>
            </div>
            <div className="record-card-body overflow-x-auto">
              <table className="record-table min-w-[620px]">
                <thead>
                  <tr>
                    <th>{t('studentPortalSubject')}</th>
                    <th>{t('studentPortalTeacher')}</th>
                    <th>{t('studentPortalSessions')}</th>
                    <th>{t('studentPortalRate')}</th>
                    <th>{t('studentPortalGrade')}</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectRows.slice(0, 8).map((row) => (
                    <tr key={row.id || row.name}>
                      <td>
                        <div className="record-font-serif text-base font-semibold">{row.name}</div>
                        <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-accent-muted">{row.code}</div>
                      </td>
                      <td className="text-xs text-accent-muted">{row.teacher}</td>
                      <td className="font-mono text-xs text-accent-muted">{row.attended}/{row.sessions}</td>
                      <td>
                        <div className="flex min-w-[120px] items-center gap-3">
                          <div className="record-bar flex-1"><span style={{ width: `${row.rate}%` }} /></div>
                          <span className="w-9 text-right font-mono text-xs font-bold">{row.rate}%</span>
                        </div>
                      </td>
                      <td><span className={cn('record-grade', gradeTone(row.rate))}>{row.grade}</span></td>
                    </tr>
                  ))}
                  {!subjectRows.length && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-xs font-bold uppercase tracking-[0.18em] text-accent-muted">
                        {t('studentPortalNoSubjectRecords')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="record-card rounded-xl">
            <div className="record-card-head">
              <h2 className="record-font-serif text-lg font-semibold">{latestGpa > 0 ? t('studentPortalGpa') : t('studentPortalAttendanceStanding')}</h2>
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-accent-muted">{latestGpa > 0 ? t('studentPortalFourScale') : t('studentPortalLiveRate')}</span>
            </div>
            <div className="record-card-body">
              <div className="flex flex-col items-center">
                <div className="relative h-[156px] w-[156px]">
                  <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(148,163,184,.22)" strokeWidth="10" />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="#2563eb"
                      strokeLinecap="round"
                      strokeWidth="10"
                      strokeDasharray={`${(ringValue / 100) * 314} 314`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <strong className="record-font-serif text-4xl">{ringNumber}</strong>
                    <span className="mt-1 text-[10px] font-black uppercase tracking-[0.15em] text-accent-muted">{ringLabel}</span>
                  </div>
                </div>

                <div className="mt-5 grid w-full grid-cols-3 border-t border-dashed border-black/10 pt-4 text-center dark:border-white/10">
                  <div>
                    <span className="record-font-serif block text-xl font-bold">{cumulativeGpa ? cumulativeGpa.toFixed(2) : stats?.present || 0}</span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-accent-muted">{cumulativeGpa ? t('studentPortalCumulative') : t('studentPortalPresent')}</span>
                  </div>
                  <div>
                    <span className="record-font-serif block text-xl font-bold">{transcript?.summary?.total_credits || stats?.total || 0}</span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-accent-muted">{transcript?.summary?.total_credits ? t('studentPortalCredits') : t('studentPortalTotal')}</span>
                  </div>
                  <div>
                    <span className="record-font-serif block text-xl font-bold">{stats?.remaining || 0}</span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-accent-muted">{t('studentPortalRemaining')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="record-card record-comparison-card rounded-xl">
            <div className="record-card-head flex-col items-start sm:flex-row sm:items-start">
              <div>
                <h2 className="record-font-serif record-chart-title text-3xl font-bold leading-tight">{t('studentPortalPerformanceComparison')}</h2>
              </div>
              <div className="record-chart-tabs">
                {[
                  ['subject', t('studentPortalBySubject')],
                  ['semester', t('studentPortalBySemester')],
                  ['year', t('studentPortalByYear')],
                ].map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      'record-chart-tab',
                      viewMode === mode && 'is-active'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="record-card-body">
              <div className="record-chart-legend">
                <span><i style={{ background: 'var(--chart-maroon)' }} />{studentName}</span>
                <span><i style={{ background: 'var(--chart-average)' }} />{t('studentPortalClassAverage')}</span>
              </div>
              <div
                className="record-chart-plot"
                style={{ '--chart-count': Math.max(1, (comparisonRows.length ? comparisonRows : [{ label: t('studentPortalNoData') }]).length) }}
              >
                <div className="record-chart-y" aria-hidden="true">
                  {[100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0].map((tick) => (
                    <span key={tick}>{tick}</span>
                  ))}
                </div>
                <div className="record-chart-area">
                  <div className="record-chart-bars">
                    {(comparisonRows.length ? comparisonRows : [{ label: t('studentPortalNoData'), student: 0, average: 0 }]).map((row) => (
                      <div key={row.label} className="record-chart-group" title={`${row.label}: student ${Math.round(row.student)} / class ${Math.round(row.average)}`}>
                        <div
                          className="record-chart-bar record-chart-bar--student"
                          style={{ height: `${clamp(row.student)}%` }}
                        />
                        <div
                          className="record-chart-bar record-chart-bar--average"
                          style={{ height: `${clamp(row.average)}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="record-chart-labels">
                    {(comparisonRows.length ? comparisonRows : [{ label: t('studentPortalNoData') }]).map((row) => (
                      <span key={row.label} title={row.label}>{row.label}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <button
              type="button"
              onClick={() => navigate('/checkin/scan')}
              className="record-card group rounded-xl p-5 text-left transition-transform hover:-translate-y-0.5"
            >
              <Camera className="h-7 w-7 text-blue-600" />
              <div className="record-font-serif mt-4 text-2xl font-semibold">{t('studentPortalScanAttendance')}</div>
              <p className="mt-1 text-xs font-semibold text-accent-muted">{t('studentPortalScanAttendanceSub')}</p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/checkin/manual', { state: { activeSession } })}
              disabled={activeSession?.status !== 'active'}
              className={cn(
                'record-card rounded-xl p-5 text-left transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              <Keyboard className="h-7 w-7 text-blue-600" />
              <div className="record-font-serif mt-4 text-2xl font-semibold">{t('studentPortalManualEntry')}</div>
              <p className="mt-1 text-xs font-semibold text-accent-muted">
                {activeSession?.status === 'active' ? t('studentPortalTypeCode') : t('studentPortalWaitingTeacher')}
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate('/history')}
              className="record-card rounded-xl p-5 text-left transition-transform hover:-translate-y-0.5"
            >
              <History className="h-7 w-7 text-blue-600" />
              <div className="record-font-serif mt-4 text-2xl font-semibold">{t('studentPortalFullHistory')}</div>
              <p className="mt-1 text-xs font-semibold text-accent-muted">{t('studentPortalFullHistorySub')}</p>
            </button>
          </div>
        </section>

        {activeSession && (
          <section className="relative z-10 mt-5 record-card rounded-xl p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center border border-blue-600 bg-blue-600 text-white">
                  <QrCode className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', activeSession.status === 'active' ? 'bg-green-500' : 'bg-amber-500')} />
                    <span className={cn('text-[10px] font-black uppercase tracking-[0.16em]', activeSession.status === 'active' ? 'text-green-600' : 'text-amber-600')}>
                      {activeSession.status === 'active' ? t('studentPortalLiveNow') : activeSession.status || t('studentPortalWaiting')}
                    </span>
                  </div>
                  <h3 className="record-font-serif mt-1 text-xl font-semibold">
                    {activeSession.subject?.name || (typeof activeSession.subject === 'string' ? activeSession.subject : t('studentPortalActiveSession'))}
                  </h3>
                  <p className="text-xs font-semibold text-accent-muted">{activeSession.teacher} / {activeSession.room || t('studentPortalRoomTbd')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/checkin')}
                className="inline-flex h-11 items-center justify-center gap-2 bg-blue-600 px-5 text-sm font-black uppercase tracking-[0.1em] text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700"
              >
                <TrendingUp className="h-4 w-4" />
                {t('checkInNow')}
              </button>
            </div>
          </section>
        )}

        <footer className="relative z-10 mt-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-accent-muted">
          {t('studentPortalGeneratedNotice')}
        </footer>
      </motion.div>
    </div>
  );
};
