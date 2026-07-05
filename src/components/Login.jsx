import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, UserCircle, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export const Login = () => {
  const { t, theme, login, triggerAlert, branding } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(null); // 'staff' | 'student' | null
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const loginPayload = {
      email: email.trim(),
    };

    if (role === 'student') {
      loginPayload.role = 'student';
      loginPayload.student_code = password.trim();
      loginPayload.password = password.trim();
    } else {
      loginPayload.password = password;
    }

    const res = await login(loginPayload);

    if (!res.success) {
      setError(res.message);
      triggerAlert('loginFailed');
    } else {
      triggerAlert('loginSuccess');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-noir-950 relative overflow-hidden transition-colors duration-500 text-accent">
      <div className="noise-overlay" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Role Selection */}
      <AnimatePresence mode="wait">
        {!role ? (
          <motion.div
            key="selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md glass p-8 md:p-10 rounded-3xl relative z-10"
          >
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-white dark:bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-2 shadow-2xl shadow-blue-600/10 border border-black/5 dark:border-white/10 overflow-hidden group">
                {branding?.logo ? (
                  <img
                    src={branding.logo}
                    alt="University Logo"
                    className="w-full h-full object-contain p-3 group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <GraduationCap className="w-10 h-10 text-blue-600" />
                )}
              </div>
              <h1 className="text-blue-700 font-black tracking-tight mb-2 uppercase font-outfit text-4xl">{branding?.university || t('academicEcosystem')}</h1>
              <p className="text-accent-muted text-sm font-medium">{t('selectPortal')}</p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setRole('staff')}
                className="w-full group glass glass-hover p-6 rounded-2xl flex items-center justify-between transition-all border border-black/5 dark:border-white/5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <UserCircle className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">{t('loginAsTeacher')}</h3>
                    <p className="text-xs text-accent-muted">{t('facultyAdminAccess')}</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-accent-muted group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => setRole('student')}
                className="w-full group glass glass-hover p-6 rounded-2xl flex items-center justify-between transition-all border border-black/5 dark:border-white/5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">{t('loginAsStudent')}</h3>
                    <p className="text-xs text-accent-muted">{t('studentParentPortal')}</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-accent-muted group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </button>
            </div>

            <div className="mt-10 pt-6 border-t border-black/5 dark:border-white/5 text-center">
              <p className="text-[10px] text-accent-muted uppercase tracking-[0.2em] font-medium">{branding?.systemName || "Academic OS v1"}</p>
            </div>
            <h1 className='text-xs text-center mt-5'>Copyright <span className='font-bold'>HRU</span> | 2026 @Darith</h1>
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md glass p-8 md:p-10 rounded-3xl relative z-10"
          >
            <button
              onClick={() => setRole(null)}
              className="text-xs text-accent-muted hover:text-blue-600 mb-6 flex items-center gap-1 transition-colors"
            >
              ← {t('backToSelection')}
            </button>

            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight mb-2">{t('welcomeBack')}</h1>
              <p className="text-accent-muted italic">
                {t('loginAs')} <span className="capitalize text-blue-600 font-bold">
                  {role === 'staff' ? t('loginAsTeacher') : role}
                </span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-accent-muted">{t('emailIdentity')} / Phone</label>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10  rounded-xl px-4 py-3 focus:border-blue-600 focus:outline-none transition-colors"
                  placeholder="name@university.edu or Phone"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-accent-muted">
                  {role === 'student' ? 'Student Code' : t('securityKey')}
                </label>
                <input
                  type={role === 'student' ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 rounded-xl px-4 py-3 focus:border-blue-600 focus:outline-none transition-colors"
                  placeholder={role === 'student' ? "STD-XXXXX" : "••••••••"}
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-2 text-red-500 bg-red-500/10 p-3 rounded-lg text-sm border border-red-500/20"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20 focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>{t('authorizeConnectivity')}</span>}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
};
