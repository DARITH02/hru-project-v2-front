import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ShieldCheck,
  TrendingUp,
  Filter,
  Loader2,
  ChevronRight,
  History,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import api from '../lib/api';

export const StudentHistory = () => {
  const { t, user } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classHistory, setClassHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [filter, setFilter] = useState('All');

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/student/classes');
      setClasses(res.data || []);
    } catch (err) {
      console.error("Fetch classes error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassHistory = async (classId) => {
    setLoadingHistory(true);
    try {
      const res = await api.get(`/student/classes/${classId}/history`);
      const data = res.data;
      
      setClassHistory({
        class: data.class,
        scores: data.scores || [],
        records: data.history.map((r) => ({
          id: r.id,
          subject: data.class.name,
          date: r.date ? new Date(r.date).toLocaleDateString() : 'N/A',
          status: r.status === 'PRESENT' ? 'Present' : 
                  r.status === 'LATE' ? 'Late' : 
                  r.status === 'SCHEDULED' ? 'Scheduled' : 'Absent',
          method: r.method || (r.status === 'SCHEDULED' ? 'PENDING' : 'SCAN'),
          scan_time: r.scan_time
        }))
      });
    } catch (err) {
      console.error("Fetch class history error:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleClassSelect = (cls) => {
    setSelectedClass(cls);
    fetchClassHistory(cls.id);
  };

  const handleBack = () => {
    if (selectedClass) {
      setSelectedClass(null);
      setClassHistory(null);
    } else {
      navigate('/portal');
    }
  };

  const filteredRecords = classHistory?.records.filter(r => filter === 'All' || r.status === filter) || [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-accent-muted space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        <p className="text-sm font-medium tracking-widest uppercase animate-pulse">{t('syncingData')}</p>
      </div>
    );
  }

  // 1️⃣ CLASS ATTENDANCE HISTORY VIEW
  if (selectedClass) {
    return (
      <div className="space-y-8 pb-12">
        <header className="flex items-center gap-4">
          <button 
            onClick={handleBack}
            className="w-12 h-12 rounded-2xl glass glass-hover flex items-center justify-center transition-transform hover:-translate-x-1"
          >
            <ArrowLeft className="w-5 h-5 text-accent-muted" />
          </button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{selectedClass.name}</h2>
            <p className="text-accent-muted">{selectedClass.teacher} • {t('attendanceLedger')}</p>
          </div>
        </header>

        {/* Quick Stats for this class */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass p-8 rounded-[2.5rem] relative overflow-hidden group">
            <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-blue-600/10 blur-[50px] rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-700" />
            <div className="flex items-center justify-between mb-4">
               <span className="text-xs font-bold uppercase text-accent-muted tracking-widest">{t('attendance')}</span>
               <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-5xl font-black text-blue-600 mb-2">{selectedClass.attendance_rate}%</p>
            <div className="h-1.5 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${selectedClass.attendance_rate}%` }}
                 className="h-full bg-blue-600 rounded-full"
               />
            </div>
          </div>
          <div className="glass p-8 rounded-[2.5rem] text-center">
             <p className="text-5xl font-black text-green-500 mb-2">{selectedClass.attended_count}</p>
             <p className="text-[10px] text-accent-muted font-bold uppercase tracking-widest">{t('present')}</p>
          </div>
          <div className="glass p-8 rounded-[2.5rem] text-center">
             <p className="text-5xl font-black text-accent-muted mb-2">{selectedClass.sessions_count}</p>
             <p className="text-[10px] text-accent-muted font-bold uppercase tracking-widest">{t('totalClasses')}</p>
          </div>
        </div>

        {/* Scores Section */}
        {classHistory?.scores?.length > 0 && (
          <div className="space-y-6">
            <h4 className="text-xl font-bold flex items-center gap-3">
              <Award className="w-5 h-5 text-accent-muted" />
              {t('academicScores') || 'Academic Scores'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classHistory.scores.map(score => (
                 <div key={score.assignment_id} className="glass p-6 rounded-[2rem] border border-black/5 dark:border-white/5 space-y-4">
                    <h5 className="font-bold text-lg">{score.semester}</h5>
                    <div className="space-y-3">
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-accent-muted">{t('attendanceScore') || 'Attendance (20)'}</span>
                          <span className="font-mono font-bold">{score.attendance_score}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-accent-muted">{t('midtermScore') || 'Midterm (15)'}</span>
                          <span className="font-mono font-bold">{score.midterm_score}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-accent-muted">{t('assignmentScore') || 'Assignment (15)'}</span>
                          <span className="font-mono font-bold">{score.assignment_score}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-accent-muted">{t('finalScore') || 'Final (50)'}</span>
                          <span className="font-mono font-bold">{score.final_score}</span>
                       </div>
                       <div className="pt-3 border-t border-black/5 dark:border-white/10 flex justify-between items-center">
                          <span className="font-bold uppercase tracking-widest text-xs">{t('totalScore') || 'Total'}</span>
                          <span className="text-xl font-black text-blue-600">{score.total_score}</span>
                       </div>
                    </div>
                 </div>
              ))}
            </div>
          </div>
        )}

        {/* History Timeline */}
        <div className="space-y-6">
           <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <h4 className="text-xl font-bold flex items-center gap-3">
                <History className="w-5 h-5 text-accent-muted" />
                {t('sessionTimeline')}
              </h4>
              <div className="flex bg-black/5 dark:bg-white/5 p-1.5 rounded-2xl border border-black/5 dark:border-white/10">
                {[{id: 'All', key: 'all'}, {id: 'Present', key: 'present'}, {id: 'Late', key: 'late'}, {id: 'Absent', key: 'absent'}].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                      filter === f.id 
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                        : "text-accent-muted hover:text-blue-600"
                    )}
                  >
                    {t(f.key)}
                  </button>
                ))}
              </div>
           </div>

           <div className="space-y-4 relative">
             {loadingHistory && (
               <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-xs flex items-center justify-center z-10 rounded-[2rem]">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
               </div>
             )}
             
             <AnimatePresence mode="popLayout">
                {filteredRecords.length > 0 ? filteredRecords.map((record, i) => (
                  <motion.div 
                    key={record.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass p-5 rounded-3xl flex items-center justify-between group border border-black/5 dark:border-white/5"
                  >
                    <div className="flex items-center gap-5">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center",
                        record.status === 'Present' ? "bg-green-500/10 text-green-500" : 
                        record.status === 'Late' ? "bg-yellow-500/10 text-yellow-500" : 
                        record.status === 'Scheduled' ? "bg-blue-600/10 text-blue-600" : "bg-red-500/10 text-red-500"
                      )}>
                        {record.status === 'Present' ? <CheckCircle2 className="w-6 h-6" /> : 
                         record.status === 'Late' ? <Clock className="w-6 h-6" /> : 
                         record.status === 'Scheduled' ? <Calendar className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                      </div>
                      <div className="text-left">
                         <p className="font-bold text-lg">{record.date}</p>
                         <p className="text-xs text-accent-muted uppercase tracking-widest font-bold">
                            {record.status === 'Scheduled' ? t('scheduled') : `${record.method} • ${record.scan_time || '--:--'}`}
                         </p>
                      </div>
                    </div>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg",
                      record.status === 'Present' ? "text-green-500 bg-green-500/10" : 
                      record.status === 'Late' ? "text-yellow-500 bg-yellow-500/10" : 
                      record.status === 'Scheduled' ? "text-blue-600 bg-blue-600/10" : "text-red-500 bg-red-500/10"
                    )}>
                      {t(record.status.toLowerCase())}
                    </span>
                  </motion.div>
                )) : (
                  <div className="text-center py-20 glass rounded-[2.5rem] border-dashed border-2 border-black/5">
                    <p className="text-accent-muted">{t('noRecordsFound')}</p>
                  </div>
                )}
             </AnimatePresence>
           </div>
        </div>
      </div>
    );
  }

  // 2️⃣ CLASS LIST VIEW (Default)
  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center gap-4">
        <button 
          onClick={handleBack}
          className="w-12 h-12 rounded-2xl glass glass-hover flex items-center justify-center transition-transform hover:-translate-x-1"
        >
          <ArrowLeft className="w-5 h-5 text-accent-muted" />
        </button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('subjectPortfolio') || 'Subject Portfolio'}</h2>
          <p className="text-accent-muted">{t('historyAnalyticsSub')}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.length > 0 ? classes.map((cls, i) => (
          <motion.div
            key={cls.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => handleClassSelect(cls)}
            className="glass glass-hover p-8 rounded-[2.5rem] cursor-pointer group relative overflow-hidden border border-black/5 dark:border-white/5"
          >
            <div className="absolute top-0 right-0 p-6">
               <div className="w-10 h-10 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <ChevronRight className="w-5 h-5" />
               </div>
            </div>

            <div className="w-16 h-16 rounded-3xl bg-blue-600/10 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
               <ShieldCheck className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-black mb-1 group-hover:text-blue-600 transition-colors leading-tight">{cls.name}</h3>
            <p className="text-sm text-accent-muted mb-6 font-medium">{cls.teacher}</p>

            <div className="space-y-4">
               <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                  <span className="text-accent-muted">{t('attendance')}</span>
                  <span className="text-blue-600">{cls.attendance_rate}%</span>
               </div>
               <div className="h-2 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${cls.attendance_rate}%` }}
                    className="h-full bg-blue-600 rounded-full shadow-lg shadow-blue-600/20"
                  />
               </div>
               <div className="flex items-center justify-between text-[10px] font-bold text-accent-muted opacity-70">
                  <span>{cls.attended_count} {t('present')}</span>
                  <span>{cls.sessions_count} {t('total')}</span>
               </div>
            </div>
          </motion.div>
        )) : (
          <div className="col-span-full py-20 text-center glass rounded-[3rem] border-dashed border-2 border-black/10">
             <p className="text-accent-muted">{t('noClassesFound')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const StatBox = ({ label, value, color }) => (
  <div className="glass glass-hover p-6 rounded-3xl text-center group transition-all hover:-translate-y-2 border border-black/5 dark:border-white/5">
    <p className={cn("text-5xl font-black mb-3 transition-transform group-hover:scale-110 duration-500", color, "drop-shadow-sm")}>{value}</p>
    <p className="text-[10px] text-accent-muted font-bold uppercase tracking-widest">{label}</p>
  </div>
);
