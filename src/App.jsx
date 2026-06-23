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
import { Loader2 } from 'lucide-react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { cn } from './lib/utils';

function AppContent() {
  const { user, loading, theme } = useApp();
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

  // Define valid routes based on role (Authenticated layout flow)
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

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
