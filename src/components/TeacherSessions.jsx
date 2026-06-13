import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import {
  Calendar,
  Clock,
  Search,
  QrCode,
  ChevronRight,
  Filter,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Plus,
  Play,
  Check,
  Hash
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export const TeacherSessions = ({ onSessionSelect }) => {
  const { t } = useApp();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchSessions = async () => {
    try {
      const res = await api.get('/teacher/sessions');
      setSessions(res.data || []);
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleStatusUpdate = async (e, sessionId, newStatus) => {
    e.stopPropagation();
    try {
      await api.post(`/teacher/session/${sessionId}/status-update`, { status: newStatus });
      fetchSessions(); // Refresh list
    } catch (err) {
      console.error("Failed to update status", err);
      alert("Failed to update session status");
    }
  };

  const filteredSessions = (sessions || []).filter(s => {
    if (filter === 'all') return true;
    const currentStatus = typeof s.status === 'object' ? s.status.name : s.status;
    return (currentStatus || '').toLowerCase() === filter.toLowerCase();
  });

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-accent-muted">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="animate-pulse">{t('gatheringIntelligence')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('sessions')}</h2>
          <p className="text-accent-muted">{t('dashboardSub')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass flex p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
            {['all', 'active', 'scheduled', 'completed'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "cursor-pointer px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                  filter === f
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-accent-muted hover:text-blue-600"
                )}
              >
                {t(f)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSessions.map((session, i) => {
          const status = typeof session.status === 'object' ? session.status.name : session.status;
          const statusLower = status?.toLowerCase();
          return (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSessionSelect(session)}
              className="glass glass-hover p-6 rounded-[2rem] group cursor-pointer border border-black/5 dark:border-white/5 relative overflow-hidden"
            >
              <div className={cn(
                "absolute top-0 right-0 w-32 h-32 blur-3xl opacity-5 transition-opacity group-hover:opacity-10",
                statusLower === 'active' ? "bg-green-500" : "bg-blue-600"
              )} />

              <div className="flex items-center justify-between mb-6">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110",
                  statusLower === 'active'
                    ? "bg-green-500 text-white shadow-lg shadow-green-500/20"
                    : "bg-black/5 dark:bg-white/5 text-accent-muted"
                )}>
                  {statusLower === 'active' ? <QrCode className="w-6 h-6 " /> : <Calendar className="w-6 h-6" />}
                </div>
                {/* Status Badge & Dropdown combined */}
                <div className="relative z-20 group shrink-0" onClick={e => e.stopPropagation()}>
                  <select
                    value={statusLower}
                    onChange={(e) => handleStatusUpdate(e, session.id, e.target.value)}
                    className={cn(
                      "text-[10px] sm:text-xs font-bold uppercase tracking-widest pl-4 pr-9 py-2 rounded-xl border outline-none appearance-none cursor-pointer transition-all shadow-sm",
                      statusLower === 'active' ? "border-green-500/30 bg-green-500/10 text-green-500 hover:bg-green-500/20" :
                        statusLower === 'completed' ? "border-blue-500/30 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" :
                          "border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 text-accent hover:bg-black/10 dark:hover:bg-white/20"
                    )}
                  >
                    <option value="scheduled" className="text-blue-700 dark:bg-noir-900   font-sans tracking-normal capitalize">{t('scheduled')}</option>
                    <option value="active" className="text-blue-700 dark:bg-noir-900  font-sans tracking-normal capitalize">{t('active')}</option>
                    <option value="completed" className="text-blue-700 dark:bg-noir-900  font-sans tracking-normal capitalize">{t('completed')}</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all font-outfit">
                {typeof session.subject === 'object' ? (session.subject?.name || t('unknown')) : (session.subject || t('unknown'))}
              </h3>

              <div className="space-y-3 mt-6">
                <div className="flex items-center gap-3 text-sm text-blue-600 bg-blue-600/10 py-2 px-3 rounded-xl w-max">
                  <Hash className="w-4 h-4" />
                  <span className="font-mono font-bold">ID {session.id}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-accent-muted bg-black/5 dark:bg-white/5 py-2 px-3 rounded-xl w-max">
                  <Clock className="w-4 h-4" />
                  <span className="font-mono">{new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-accent-muted bg-black/5 dark:bg-white/5 py-2 px-3 rounded-xl w-max">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(session.start_time).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                <div className="flex flex-col text-left">
                  <p className="text-sm font-bold text-accent">{session.presence_count || 0} {t('students')}</p>
                  <p className="text-[10px] text-accent-muted uppercase tracking-tighter">{t('attendance')}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg shadow-blue-600/20">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredSessions.length === 0 && (
        <div className="text-center py-20 glass rounded-[2.5rem] border border-dashed border-black/10 dark:border-white/10">
          <Calendar className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-accent-muted">{t('noSessionsFound')}</p>
        </div>
      )}
    </div>
  );
};
