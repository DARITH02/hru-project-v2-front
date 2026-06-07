import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { QrCode, History, TrendingUp, Camera, Keyboard } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export const StudentPortal = () => {
  const { t, user } = useApp();
  const navigate = useNavigate();
  const [portalData, setPortalData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortalData = async () => {
      try {
        const res = await api.get('/student/portal');
        setPortalData(res.data);
      } catch (err) {
        console.error("Failed to fetch portal data");
      } finally {
        setLoading(false);
      }
    };
    fetchPortalData();
  }, []);

  const activeSession = portalData?.active_session;
  const stats = portalData?.stats;

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-accent-muted">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin relative z-10" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.3em] font-black animate-pulse mt-4">{t('gatheringIntelligence') || 'Gathering Intelligence...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8  mx-auto">
      <header className="flex items-center justify-between">
        <div className="text-left">
          <h2 className="text-3xl font-black tracking-tight font-outfit text-blue-600 dark:text-blue-500 uppercase">{t('academicMastery')}</h2>
          <div className="flex flex-col mt-1">
             <p className="text-accent-muted font-medium">{t('welcomeBack')}, <span className="text-accent font-bold">{portalData?.student?.name || user?.name}</span></p>
             <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black bg-blue-600/10 text-blue-600 px-2 py-0.5 rounded-md uppercase tracking-widest">{portalData?.student?.group}</span>
                <span className="text-[10px] font-bold text-accent-muted opacity-40 uppercase tracking-tighter">{portalData?.student?.major}</span>
             </div>
          </div>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-600 to-blue-700 p-0.5 shadow-xl shadow-blue-600/20 group">
          <div className="w-full h-full rounded-[0.9rem] bg-noir-950 flex items-center justify-center overflow-hidden">
             <span className="font-black text-xl text-blue-600 group-hover:scale-110 transition-transform">{(portalData?.student?.name || user?.name || 'S')[0]}</span>
          </div>
        </div>
      </header>

      {/* Check-In Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/checkin/scan')}
          className="glass glass-hover p-6 rounded-3xl flex flex-col items-center gap-3 group border border-black/5 dark:border-white/5 transition-all relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-600/5 blur-3xl rounded-full -mr-10 -mt-10 group-hover:bg-blue-600/10 transition-colors" />
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform">
            <Camera className="w-7 h-7" />
          </div>
          <div className="text-center relative z-10">
            <p className="font-black text-sm uppercase tracking-tight">{t('scanAttendance')}</p>
            <p className="text-[9px] font-bold text-accent-muted mt-0.5 uppercase tracking-widest opacity-60">{t('cameraCheckIn')}</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/checkin/manual')}
          className="glass glass-hover p-6 rounded-3xl flex flex-col items-center gap-3 group border border-black/5 dark:border-white/5 transition-all relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-600/5 blur-3xl rounded-full -mr-10 -mt-10 group-hover:bg-blue-600/10 transition-colors" />
          <div className="w-14 h-14 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform group-hover:bg-blue-600/10">
            <Keyboard className="w-7 h-7 text-accent-muted group-hover:text-blue-600" />
          </div>
          <div className="text-center relative z-10">
            <p className="font-black text-sm uppercase tracking-tight">{t('manualEntry')}</p>
            <p className="text-[9px] font-bold text-accent-muted mt-0.5 uppercase tracking-widest opacity-60">{t('typeStudentCode')}</p>
          </div>
        </button>
      </div>

      {/* Active Session Alert */}
      {activeSession && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative group"
        >
          <div className="absolute -inset-0.5 bg-linear-to-r from-blue-600/20 to-blue-400/5 rounded-4xl blur opacity-30 group-hover:opacity-50 transition duration-1000" />
          <div className="relative glass p-6 rounded-4xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
                <QrCode className="w-7 h-7" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    activeSession.status === 'active' ? "bg-green-500" : "bg-yellow-500"
                  )} />
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    activeSession.status === 'active' ? "text-green-500" : "text-yellow-500"
                  )}>
                    {activeSession.status === 'active' ? t('liveNow') : (activeSession.status === 'scheduled' ? t('scheduled') : t('waiting'))}
                  </span>
                </div>
                <h3 className="text-lg font-bold">
                  {activeSession.subject?.name || (typeof activeSession.subject === 'string' ? activeSession.subject : t('liveNow'))}
                </h3>
                <p className="text-sm text-accent-muted">
                   {activeSession.teacher} • {activeSession.room} 
                   {activeSession.status === 'scheduled' && <span className="ml-2 italic opacity-60">({t('waitingForTeacher') || 'Waiting for Teacher...'})</span>}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/checkin')}
              className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-600/20"
            >
              <Camera className="w-4 h-4" />
              {t('checkIn')}
            </button>
          </div>
        </motion.div>
      )}

      {/* Progress Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass p-6 rounded-3xl relative overflow-hidden group hover:border-blue-600/20 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 blur-3xl rounded-full -mr-12 -mt-12 group-hover:bg-blue-600/10 transition-colors" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-accent-muted">{t('meanPresence')}</span>
          </div>
          <p className="text-5xl font-black tracking-tighter font-mono">{stats?.rate || 0}%</p>
          <div className="w-full bg-black/5 dark:bg-white/10 h-2 rounded-full mt-6 overflow-hidden shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats?.rate || 0}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={cn(
                "h-full shadow-lg",
                (stats?.rate || 0) > 85 ? "bg-green-500 shadow-green-500/20" : 
                (stats?.rate || 0) > 70 ? "bg-blue-600 shadow-blue-600/20" : "bg-red-500 shadow-red-500/20"
              )}  
            />
          </div>
          <p className="text-[10px] text-accent-muted mt-3 uppercase font-bold tracking-widest opacity-60">
            {stats?.present || 0} / {stats?.total || 0} {t('sessions')}
          </p>
        </div>

        <button 
          onClick={() => navigate('/history')}
          className="glass glass-hover p-6 rounded-3xl text-left group border border-black/5 dark:border-white/5 transition-all flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 blur-3xl rounded-full -mr-12 -mt-12 group-hover:bg-blue-600/10 transition-colors" />
          <div className="w-full relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                <History className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-accent-muted">{t('history')}</span>
            </div>
            <p className="text-5xl font-black tracking-tighter font-mono group-hover:scale-105 origin-left transition-transform">
               {stats?.total || 0}/30
            </p>
          </div>
          <div className="flex items-center justify-between mt-6 w-full relative z-10">
            <div className="flex flex-col">
              <p className="text-[10px] font-bold text-accent-muted uppercase tracking-widest">{stats?.remaining || 0} {t('remaining')}</p>
              <div className="flex gap-1 mt-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={cn(
                    "w-3 h-1 rounded-full",
                    i < Math.floor((stats?.total || 0) / 6) ? "bg-blue-600" : "bg-black/10 dark:bg-white/10"
                  )} />
                ))}
              </div>
            </div>
            <span className="text-[10px] font-black text-blue-600 bg-blue-600/10 px-3 py-1.5 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all whitespace-nowrap shadow-sm">
              {t('viewAll')}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};
