import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  History,
  LogOut,
  Languages,
  Moon,
  Sun,
  Menu,
  X,
  QrCode,
  Navigation,
  CalendarCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';

export const Layout = ({ children }) => {
  const { t, lang, toggleLang, theme, toggleTheme, user, setUser, branding, triggerAlert } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = user?.role === 'teacher' ? [
    { id: 'dashboard', path: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'sessions', path: '/sessions', label: t('sessions'), icon: BookOpen },
    { id: 'students', path: '/students', label: t('students'), icon: Users },
    { id: 'location', path: '/location', label: t('location'), icon: Navigation },
    { id: 'attendance', path: '/attendance', label: t('myAttendance'), icon: CalendarCheck },
  ] : [
    { id: 'portal', path: '/portal', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'checkin', path: '/checkin', label: t('checkIn'), icon: QrCode },
    { id: 'history', path: '/history', label: t('history'), icon: History },
    { id: 'location', path: '/location', label: t('location'), icon: Navigation },
  ];

  const handleLogout = () => {
    setUser(null);
    triggerAlert('logoutSuccess');
    navigate('/');
  };

  const currentPath = location.pathname;

  return (
    <div className="min-h-screen flex flex-col md:flex-row transition-colors duration-500 bg-noir-950 text-accent">
      <div className="noise-overlay" />

      {/* Mobile Header */}
      <header className="md:hidden glass sticky top-0 z-40 p-4 flex items-center justify-between">
        <button
          onClick={() => navigate(user?.role === 'teacher' ? '/dashboard' : '/portal')}
          className="flex items-center gap-3 active:scale-95 transition-transform"
        >
          <div className="bg-blue-600/10 p-1.5 rounded-xl border border-blue-600/10 flex items-center justify-center shrink-0 shadow-glow shadow-blue-500/10">
            <img src={branding.logo} alt="Logo" className="w-8 h-8 object-contain drop-shadow-sm" />
          </div>
          <span className="font-bold tracking-tight">{branding.systemName}</span>
        </button>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 glass border-r border-white/5 transform transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 shrink-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex flex-col h-full overflow-y-auto">
          <button
            onClick={() => {
              navigate(user?.role === 'teacher' ? '/dashboard' : '/portal');
              setIsMobileMenuOpen(false);
            }}
            className="hidden md:flex items-center gap-4 mb-12 group cursor-pointer text-left w-full hover:opacity-90 transition-all"
          >
            <div className="relative">
              {/* Premium Glow Effect */}
              <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

              <div className="bg-linear-to-br from-blue-600/20 to-blue-600/5 p-3 rounded-2xl border border-blue-500/20 flex items-center justify-center shrink-0 shadow-2xl relative overflow-hidden group-hover:border-blue-500/40 transition-colors duration-500">
                <div className="absolute inset-0 bg-linear-to-tr from-blue-600/5 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <img
                  src={branding.logo}
                  alt="Logo"
                  className="w-11 h-11 object-contain drop-shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-transform duration-700 group-hover:scale-110 group-hover:rotate-[5deg]"
                />
              </div>
            </div>
            <div>
              <p className="text-xl font-black text-blue-600 dark:text-blue-500 uppercase tracking-tighter leading-none mb-1">{branding.university || t('academicOS')}</p>
              <p className="text-[8px] text-accent-muted font-bold uppercase tracking-[0.2em]">{branding.systemName}</p>
            </div>
          </button>

          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => {
              const isActive = currentPath === item.path;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(item.path);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex cursor-pointer items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "hover:bg-blue-600/5 text-accent-muted hover:text-blue-600 dark:hover:text-blue-400"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "group-hover:scale-110 transition-transform")} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="pt-6 border-t border-black/5 dark:border-white/5 space-y-2">
            <button
              onClick={toggleLang}
              className="w-full flex cursor-pointer items-center gap-3 px-4 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-accent-muted transition-colors"
            >
              <Languages className="w-4 h-4" />
              <span className="text-sm">{lang === 'en' ? 'ភាសាខ្មែរ' : 'English'}</span>
            </button>
            <button
              onClick={toggleTheme}
              className="w-full flex cursor-pointer items-center gap-3 px-4 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-accent-muted transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="text-sm">{theme === 'dark' ? t('lightMode') : t('darkMode')}</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex cursor-pointer items-center gap-3 px-4 py-2 rounded-xl hover:bg-red-500/10 text-red-500 transition-colors mt-4"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">{t('logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto relative ">
        <div className="max-w-6xl mx-auto ">
          {children}
        </div>
      </main>
    </div>
  );
};
