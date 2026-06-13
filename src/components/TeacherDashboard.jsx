import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import { 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  QrCode, 
  ChevronRight,
  MoreHorizontal,
  BookOpen,
  Calendar,
  Activity,
  RefreshCcw,
  Loader2,
  Hash
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

import { useNavigate } from 'react-router-dom';

export const TeacherDashboard = ({ onSessionSelect, onViewAllSessions }) => {
  const { t, theme } = useApp();
  const navigate = useNavigate();
  const [data, setData] = useState({
    summary: { cohortDensity: 0, riskIndex: 0, velocity: '0%' },
    sessions: [],
    riskStudents: [],
    attendanceTrends: [],
    performance: []
  });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, sessionsRes, studentsRes] = await Promise.all([
        api.get('/teacher/summary'),
        api.get('/teacher/sessions'),
        api.get('/teacher/students')
      ]);

        const s = summaryRes.data || {};
        setData({
          summary: {
            cohortDensity: s.total_students || 0,
            riskIndex: s.total_classes || 0,
            velocity: (s.attendance_rate || 0) + '%'
          },
          sessions: sessionsRes.data || [],
          riskStudents: (studentsRes.data || []).filter(s => (s.attendance_percentage || 0) < 75).slice(0, 4),
          attendanceTrends: s.trends || [
            { name: 'Mon', value: 85 }, { name: 'Tue', value: 90 },
            { name: 'Wed', value: 88 }, { name: 'Thu', value: 92 }, { name: 'Fri', value: 89 }
          ],
          performance: (s.performance || []).map(p => ({
            ...p,
            name: typeof p.name === 'object' ? (p.name.name || p.name.code || 'Unknown') : (p.name || 'Unknown')
          }))
        });
    } catch (err) {
      console.error("Dashboard fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-accent-muted">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="animate-pulse">{t('gatheringIntelligence')}</p>
      </div>
    );
  }

  const chartColor = theme === 'dark' ? '#3b82f6' : '#2563eb';
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const tooltipBg = theme === 'dark' ? '#0a0a0a' : '#ffffff';
  const tooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('intelligenceDashboard')}</h2>
          <p className="text-accent-muted">{t('dashboardSub')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            className="glass p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <RefreshCcw className="w-4 h-4 text-accent-muted" />
          </button>
          <div className="glass px-4 py-2 rounded-xl flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium uppercase tracking-wider">{t('systemLive')}</span>
          </div>
        </div>
      </header>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
          title={t('cohortDensity')} 
          value={data.summary.cohortDensity || 0} 
          subValue={t('activeStudentsSub')}
          icon={Users}
          trend="up"
        />
        <MetricCard 
          title={t('riskIndex')} 
          value={data.summary.riskIndex || 0} 
          subValue={t('interventionSub')}
          icon={AlertTriangle}
          trend={data.summary.riskIndex > 0 ? "up" : "down"}
          color={data.summary.riskIndex > 0 ? "text-red-500" : "text-green-500"}
        />
        <MetricCard 
          title={t('engagementVelocity')} 
          value={data.summary.velocity || '0%'} 
          subValue={t('avgParticipationSub')}
          icon={TrendingUp}
          trend="up"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Session Feed */}
        <div className="lg:col-span-2 space-y-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-accent-muted" />
                {t('activeSessions')}
              </h3>
              <button 
                onClick={() => onViewAllSessions && onViewAllSessions()}
                className="text-sm text-accent-muted hover:text-blue-600 transition-colors"
              >{t('viewAllArchive')}</button>
            </div>
            <div className="space-y-4">
              {data.sessions.length > 0 ? data.sessions.slice(0, 5).map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onSessionSelect && onSessionSelect(session)}
                  className="glass glass-hover p-5 rounded-2xl flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      (typeof session.status === 'object' ? session.status.name : session.status) === 'Active' 
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                        : "bg-blue-600/10 text-accent-muted"
                    )}>
                      {(typeof session.status === 'object' ? session.status.name : session.status) === 'Active' ? <QrCode className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className="font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all">
                        {typeof session.subject === 'object' ? (session.subject?.name || t('unknown')) : (session.subject || t('unknown'))}
                      </h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-blue-600 flex items-center gap-1 font-mono font-bold">
                          <Hash className="w-3 h-3" /> ID {session.id}
                        </span>
                        <span className="text-xs text-accent-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {session.start_time || session.time}
                        </span>
                        <span className={cn(
                          "text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full",
                          (typeof session.status === 'object' ? session.status.name : session.status) === 'Active' ? "bg-green-500/20 text-green-500" : 
                          (typeof session.status === 'object' ? session.status.name : session.status) === 'Completed' ? "bg-blue-500/20 text-blue-500" : "bg-black/5 dark:bg-white/10 text-accent-muted"
                        )}>
                          {typeof session.status === 'object' ? session.status.name : session.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {(session.attendance_count !== undefined) && (
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold">{session.attendance_percentage || '0'}%</p>
                        <p className="text-[10px] text-accent-muted uppercase">{session.attendance_count} {t('presentCount')}</p>
                      </div>
                    )}
                    <button className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                      <ChevronRight className="w-5 h-5 text-accent-muted" />
                    </button>
                  </div>
                </motion.div>
              )) : (
                <div className="glass p-10 rounded-2xl text-center text-accent-muted italic text-sm">
                  {t('noData')}
                </div>
              )}
            </div>
          </div>

          {/* Risk Intelligence */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                {t('riskIntelligence')}
              </h3>
              <button className="text-sm text-accent-muted hover:text-blue-600 transition-colors">{t('fullReport') || 'Full Report'}</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.riskStudents.map((student, index) => (
                <motion.div 
                  key={student.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass p-4 rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 font-bold text-xs">
                      {student.name?.split(' ').map(n => n[0]).join('') || 'S'}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{student.name}</p>
                      <p className="text-[10px] text-accent-muted font-mono">{student.code || student.student_id || student.id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-500">{Math.round(student.attendance_percentage || student.attendance || 0)}%</p>
                    <p className="text-[10px] text-accent-muted uppercase tracking-tighter">{t('attendance')}</p>
                  </div>
                </motion.div>
              ))}
              {data.riskStudents.length === 0 && (
                <div className="col-span-2 glass p-6 rounded-2xl text-center text-accent-muted text-sm border border-green-500/20">
                  {t('excellent')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Analytics Sidebar */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">{t('weeklyTrends')}</h3>
          <div className="glass p-6 rounded-3xl h-[240px] relative">
            <ResponsiveContainer width="99%" height="100%" minHeight={0} minWidth={0}>
              <AreaChart data={data.attendanceTrends || []}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '12px', color: 'var(--text-primary)' }}
                />
                <Area type="monotone" dataKey="value" stroke={chartColor} fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <h3 className="text-xl font-semibold">{t('subjectPerformance')}</h3>
          <div className="glass p-6 rounded-3xl h-[240px] relative">
            <ResponsiveContainer width="99%" height="100%" minHeight={0} minWidth={0}>
              <BarChart data={data.performance && data.performance.length > 0 ? data.performance : [{ name: t('na'), value: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '12px', color: 'var(--text-primary)' }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                />
                <Bar dataKey="value" fill={chartColor} radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="glass p-6 rounded-3xl space-y-4">
            <h4 className="text-sm font-medium text-accent-muted uppercase tracking-wider">{t('quickActions')}</h4>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => navigate('/students')}
                className="glass glass-hover p-4 rounded-2xl text-center group"
              >
                <Users className="w-5 h-5 mx-auto mb-2 text-accent-muted group-hover:text-blue-600 transition-colors" />
                <span className="text-xs group-hover:text-blue-600 transition-colors">{t('directory')}</span>
              </button>
              <button 
                onClick={() => navigate('/sessions')}
                className="glass glass-hover p-4 rounded-2xl text-center group"
              >
                <BookOpen className="w-5 h-5 mx-auto mb-2 text-accent-muted group-hover:text-blue-600 transition-colors" />
                <span className="text-xs group-hover:text-blue-600 transition-colors">{t('sessions')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, subValue, icon: Icon, trend, color = "text-accent" }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="glass p-6 rounded-3xl relative overflow-hidden group border border-white/5 hover:border-white/20 transition-all duration-500"
  >
    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
      <Icon className="w-20 h-20" />
    </div>
    <p className="text-sm text-accent-muted font-medium mb-2">{title}</p>
    <div className="flex items-baseline gap-2">
      <h3 className={cn("text-4xl font-bold tracking-tight", color)}>{value}</h3>
      {trend && (
        <span className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
          trend === 'up' ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
        )}>
          {trend === 'up' ? '↑' : '↓'}
        </span>
      )}
    </div>
    <p className="text-xs text-accent-muted mt-2">{subValue}</p>
  </motion.div>
);

const cn = (...inputs) => inputs.filter(Boolean).join(' ');
