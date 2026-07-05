import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { TeacherDashboard } from './components/TeacherDashboard';
import { LiveSessionMonitor } from './components/LiveSessionMonitor';
import { StudentPortal } from './components/StudentPortal';
import { StudentHistory } from './components/StudentHistory';
import { StudentDocuments } from './components/StudentDocuments';
import { StudentCheckIn, StudentQrScanner, StudentCheckInConfirm, StudentManualCheckIn } from './components/StudentCheckIn';
import { LocationTracker } from './components/LocationTracker';
import { TeacherStudents } from './components/TeacherStudents';
import { TeacherSessions } from './components/TeacherSessions';
import { TeacherScores } from './components/TeacherScores';
import { TeacherAttendance } from './components/TeacherAttendance';
import { TeacherPaymentReport } from './components/TeacherPaymentReport';
import { TeacherDocumentUpload } from './components/TeacherDocumentUpload';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2, LogOut, ShieldCheck } from 'lucide-react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { cn } from './lib/utils';

function AppContent() {
  const { user, loading, logout, branding } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSession, setActiveSession] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-noir-950 text-accent relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center gap-6">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-white" />
        </div>
        <p className="text-accent-muted uppercase tracking-[0.3em] text-[10px] animate-pulse">Initializing Neural Interface</p>
      </div>
    );
  }

  const isPublicRoute = location.pathname.startsWith('/checkin') || location.pathname === '/location';
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  if (!user && !isPublicRoute) {
    return <Login />;
  }

  // 🎓 Public Unauthenticated Check-in Flow (Standalone Screen)
  if (!user && isPublicRoute) {
    return (
      <div className="min-h-screen relative overflow-x-hidden transition-colors duration-500 bg-noir-950 text-accent">
        <div className="noise-overlay" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col justify-center min-h-screen p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <Routes>
                <Route path="/checkin" element={<StudentCheckIn />} />
                <Route path="/checkin/scan" element={<StudentQrScanner />} />
                <Route path="/checkin/confirm/:sessionId/:token" element={<StudentCheckInConfirm />} />
                <Route path="/checkin/confirm" element={<StudentCheckInConfirm />} />
                <Route path="/location" element={<LocationTracker />} />
                <Route path="*" element={<Navigate to="/checkin" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (user && !isTeacher && !isStudent) {
    const backendUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace(/\/api\/?$/, '');

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-noir-950 text-accent relative overflow-hidden">
        <div className="noise-overlay" />
        <div className="w-full max-w-md glass p-8 rounded-3xl relative z-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/10 flex items-center justify-center mx-auto mb-5">
            <ShieldCheck className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{branding.systemName}</h1>
          <p className="text-accent-muted text-sm mb-6">
            This React portal supports teacher and student accounts. Your account is registered as {user.role}.
          </p>
          <div className="flex flex-col gap-3">
            <a
              href={`${backendUrl}/admin`}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Open Admin Panel
            </a>
            <button
              type="button"
              onClick={logout}
              className="w-full border border-black/10 dark:border-white/10 text-accent-muted font-semibold py-3 rounded-xl hover:text-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <Routes location={location}>
            {/* Teacher Routes */}
            {isTeacher && (
              <>
                <Route path="/dashboard" element={
                  <TeacherDashboard 
                    onSessionSelect={(session) => {
                      setActiveSession(session);
                      navigate('/sessions');
                    }} 
                    onViewAllSessions={() => navigate('/sessions')}
                  />
                } />
                <Route path="/sessions" element={
                  activeSession ? (
                    <LiveSessionMonitor 
                      session={activeSession} 
                      onBack={() => setActiveSession(null)} 
                    />
                  ) : (
                    <TeacherSessions onSessionSelect={(session) => setActiveSession(session)} />
                  )
                } />
                <Route path="/students" element={<TeacherStudents />} />
                <Route path="/scores/:classId" element={<TeacherScores />} />
                <Route path="/location" element={<LocationTracker />} />
                <Route path="/attendance" element={<TeacherAttendance />} />
                <Route path="/payments" element={<TeacherPaymentReport />} />
                <Route path="/documents" element={<TeacherDocumentUpload />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </>
            )}

            {/* Student Routes */}
            {isStudent && (
              <>
                <Route path="/portal" element={<StudentPortal />} />
                <Route path="/history" element={<StudentHistory />} />
                <Route path="/documents" element={<StudentDocuments />} />
                <Route path="/checkin" element={<StudentCheckIn onBack={() => navigate('/portal')} />} />
                <Route path="/checkin/scan" element={<StudentQrScanner />} />
                <Route path="/checkin/confirm/:sessionId/:token" element={<StudentCheckInConfirm />} />
                <Route path="/checkin/confirm" element={<StudentCheckInConfirm />} />
                <Route path="/checkin/manual" element={<StudentManualCheckIn />} />
                <Route path="/location" element={<LocationTracker />} />
                <Route path="/" element={<Navigate to="/portal" replace />} />
              </>
            )}

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
