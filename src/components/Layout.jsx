import React, { useMemo, useRef, useState } from 'react';
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
  PanelLeftClose,
  PanelLeftOpen,
  QrCode,
  Navigation,
  CalendarCheck,
  DollarSign,
  FileUp,
  Camera,
  Loader2,
  UserRound,
  Upload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChatLauncher } from './ChatModal';
import api from '../lib/api';

const profileImageFields = [
  'profile_photo_url',
  'profile_photo',
  'profile_image_url',
  'profile_image',
  'avatar_url',
  'avatar',
  'photo_url',
  'photo',
  'image_url',
  'image',
];

const resolveMediaUrl = (value) => {
  if (!value) return '';
  if (value.startsWith('http') || value.startsWith('//') || value.startsWith('data:') || value.startsWith('blob:')) {
    return value;
  }

  const backendUrl = api.defaults.baseURL.replace(/\/api\/?$/, '');
  const path = value.startsWith('/') ? value : `/${value}`;
  return `${backendUrl}${path}`;
};

const getProfileImage = (profile) => {
  const rawValue = profileImageFields.map((field) => profile?.[field]).find(Boolean);
  return resolveMediaUrl(rawValue);
};

const getUserInitial = (profile) => {
  const name = profile?.name || profile?.email || profile?.role || 'U';
  return name.trim().charAt(0).toUpperCase();
};

const getUpdatedUser = (currentUser, payload, fallbackUrl) => {
  const responseUser = payload?.user || payload?.profile || payload?.data || payload;
  const nextUser = responseUser && typeof responseUser === 'object' ? responseUser : {};
  const responseImage = getProfileImage(nextUser) || resolveMediaUrl(payload?.profile_photo_url || payload?.profile_image_url || payload?.avatar_url || payload?.image_url);

  return {
    ...currentUser,
    ...nextUser,
    profile_image_url: responseImage || fallbackUrl,
  };
};

export const Layout = ({ children }) => {
  const { t, lang, toggleLang, theme, toggleTheme, user, setUser, branding, triggerAlert } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedProfileImage, setSelectedProfileImage] = useState(null);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState('');
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const profileFileInputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = user?.role === 'teacher' ? [
    { id: 'dashboard', path: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'sessions', path: '/sessions', label: t('sessions'), icon: BookOpen },
    { id: 'students', path: '/students', label: t('students'), icon: Users },
    { id: 'location', path: '/location', label: t('location'), icon: Navigation },
    { id: 'attendance', path: '/attendance', label: t('myAttendance'), icon: CalendarCheck },
    { id: 'payments', path: '/payments', label: t('paymentReport'), icon: DollarSign },
    { id: 'documents', path: '/documents', label: t('documents'), icon: FileUp },
  ] : [
    { id: 'portal', path: '/portal', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'checkin', path: '/checkin', label: t('checkIn'), icon: QrCode },
    { id: 'documents', path: '/documents', label: t('documents'), icon: FileUp },
    { id: 'history', path: '/history', label: t('history'), icon: History },
    { id: 'location', path: '/location', label: t('location'), icon: Navigation },
  ];

  const handleLogout = () => {
    setUser(null);
    triggerAlert('logoutSuccess');
    navigate('/');
  };

  const currentPath = location.pathname;
  const ToggleIcon = isSidebarCollapsed ? PanelLeftOpen : PanelLeftClose;
  const languageLabel = lang === 'en' ? 'ភាសាខ្មែរ' : 'English';
  const profileImageUrl = useMemo(() => getProfileImage(user), [user]);
  const activeProfileImageUrl = profilePreviewUrl || profileImageUrl;
  const profileName = user?.name || user?.email || 'Profile';
  const profileRole = user?.role ? user.role.replace(/_/g, ' ') : 'Account';

  const closeProfileSettings = () => {
    setIsProfileOpen(false);
    setProfileError('');
    setSelectedProfileImage(null);
    if (profilePreviewUrl) {
      URL.revokeObjectURL(profilePreviewUrl);
      setProfilePreviewUrl('');
    }
  };

  const handleProfileImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileError('Please choose an image file.');
      return;
    }

    if (profilePreviewUrl) {
      URL.revokeObjectURL(profilePreviewUrl);
    }

    setProfileError('');
    setSelectedProfileImage(file);
    setProfilePreviewUrl(URL.createObjectURL(file));
  };

  const uploadProfileImage = async () => {
    if (!selectedProfileImage) {
      setProfileError('Choose a profile image first.');
      return;
    }

    setIsUploadingProfile(true);
    setProfileError('');

    try {
      const formData = new FormData();
      formData.append('profile_photo', selectedProfileImage);

      const response = await api.post('/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUser((currentUser) => getUpdatedUser(currentUser, response.data, profilePreviewUrl));
      setSelectedProfileImage(null);
      setProfilePreviewUrl('');
      setIsProfileOpen(false);
    } catch (error) {
      setProfileError(error.response?.data?.message || 'Profile image update failed.');
    } finally {
      setIsUploadingProfile(false);
    }
  };

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
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.button
            type="button"
            aria-label="Close navigation menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 glass border-r border-white/5 transform transition-all duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 shrink-0",
        isSidebarCollapsed ? "md:w-24" : "md:w-72",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className={cn(
          "relative flex h-full flex-col overflow-y-auto transition-all duration-300",
          isSidebarCollapsed ? "p-4" : "p-6"
        )}>
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((value) => !value)}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              "hidden md:flex absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white/70 text-accent-muted shadow-sm backdrop-blur transition-all hover:border-blue-500/30 hover:bg-blue-600 hover:text-white dark:border-white/10 dark:bg-white/5",
              isSidebarCollapsed && "right-1/2 translate-x-1/2"
            )}
          >
            <ToggleIcon className="h-4 w-4" />
          </button>

          <button
            onClick={() => {
              navigate(user?.role === 'teacher' ? '/dashboard' : '/portal');
              setIsMobileMenuOpen(false);
            }}
            className={cn(
              "hidden md:flex group cursor-pointer text-left w-full hover:opacity-90 transition-all",
              isSidebarCollapsed ? "mt-10 mb-10 items-center justify-center" : "mb-12 items-center gap-4 pr-10"
            )}
            title={branding.systemName}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className={cn(
                "bg-linear-to-br from-blue-600/20 to-blue-600/5 rounded-2xl border border-blue-500/20 flex items-center justify-center shrink-0 shadow-2xl relative overflow-hidden group-hover:border-blue-500/40 transition-colors duration-500",
                isSidebarCollapsed ? "p-2.5" : "p-3"
              )}>
                <div className="absolute inset-0 bg-linear-to-tr from-blue-600/5 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <img
                  src={branding.logo}
                  alt="Logo"
                  className={cn(
                    "object-contain drop-shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-transform duration-700 group-hover:scale-110 group-hover:rotate-[5deg]",
                    isSidebarCollapsed ? "h-9 w-9" : "h-11 w-11"
                  )}
                />
              </div>
            </div>
            <div className={cn("transition-all duration-200", isSidebarCollapsed && "hidden")}>
              <p className="text-xl font-black text-blue-600 dark:text-blue-500 uppercase tracking-tighter leading-none mb-1">{branding.university || t('academicOS')}</p>
              <p className="text-[8px] text-accent-muted font-bold uppercase tracking-[0.2em]">{branding.systemName}</p>
            </div>
          </button>

          <button
            onClick={() => {
              navigate(user?.role === 'teacher' ? '/dashboard' : '/portal');
              setIsMobileMenuOpen(false);
            }}
            className="md:hidden flex items-center gap-4 mb-8 group cursor-pointer text-left w-full"
          >
            <div className="bg-linear-to-br from-blue-600/20 to-blue-600/5 p-3 rounded-2xl border border-blue-500/20 flex items-center justify-center shrink-0 shadow-2xl">
              <img src={branding.logo} alt="Logo" className="w-11 h-11 object-contain" />
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
                  type="button"
                  title={isSidebarCollapsed ? item.label : undefined}
                  onClick={() => {
                    navigate(item.path);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "relative w-full flex cursor-pointer items-center rounded-xl transition-all duration-200 group",
                    isSidebarCollapsed ? "justify-center px-0 py-3" : "gap-3 px-4 py-3",
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "border border-transparent text-accent-muted hover:border-blue-500/10 hover:bg-blue-600/5 hover:text-blue-600 dark:hover:text-blue-400"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : "group-hover:scale-110 transition-transform")} />
                  <span className={cn("font-medium whitespace-nowrap transition-all duration-200", isSidebarCollapsed && "hidden")}>{item.label}</span>
                  {isActive && isSidebarCollapsed && (
                    <span className="absolute right-2 h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className={cn(
            "pt-6 border-t border-black/5 dark:border-white/5 space-y-2",
            isSidebarCollapsed && "flex flex-col items-center"
          )}>
            <button
              type="button"
              onClick={toggleLang}
              title={isSidebarCollapsed ? languageLabel : undefined}
              className={cn(
                "w-full flex cursor-pointer items-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-accent-muted transition-colors",
                isSidebarCollapsed ? "h-11 justify-center px-0" : "gap-3 px-4 py-2"
              )}
            >
              <Languages className="w-4 h-4" />
              <span className={cn("text-sm", isSidebarCollapsed && "hidden")}>{languageLabel}</span>
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              title={isSidebarCollapsed ? (theme === 'dark' ? t('lightMode') : t('darkMode')) : undefined}
              className={cn(
                "w-full flex cursor-pointer items-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-accent-muted transition-colors",
                isSidebarCollapsed ? "h-11 justify-center px-0" : "gap-3 px-4 py-2"
              )}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className={cn("text-sm", isSidebarCollapsed && "hidden")}>{theme === 'dark' ? t('lightMode') : t('darkMode')}</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              title={isSidebarCollapsed ? t('logout') : undefined}
              className={cn(
                "w-full flex cursor-pointer items-center rounded-xl hover:bg-red-500/10 text-red-500 transition-colors mt-4",
                isSidebarCollapsed ? "h-11 justify-center px-0" : "gap-3 px-4 py-2"
              )}
            >
              <LogOut className="w-4 h-4" />
              <span className={cn("text-sm", isSidebarCollapsed && "hidden")}>{t('logout')}</span>
            </button>
          </div>

          <div className={cn(
            "pt-4",
            isSidebarCollapsed && "flex justify-center"
          )}>
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              title={isSidebarCollapsed ? profileName : undefined}
              className={cn(
                "group w-full rounded-xl border border-black/5 bg-black/[0.02] text-left transition-all hover:border-blue-500/20 hover:bg-blue-600/5 dark:border-white/5 dark:bg-white/[0.03]",
                isSidebarCollapsed ? "flex h-14 w-14 items-center justify-center p-1" : "flex items-center gap-3 p-3"
              )}
            >
              <span className={cn(
                "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-600/10 text-blue-600 ring-1 ring-blue-500/15",
                isSidebarCollapsed ? "h-11 w-11" : "h-12 w-12"
              )}>
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt={profileName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-bold">{getUserInitial(user)}</span>
                )}
                <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-tl-lg bg-blue-600 text-white shadow-sm">
                  <Camera className="h-3 w-3" />
                </span>
              </span>
              <span className={cn("min-w-0 flex-1 transition-all duration-200", isSidebarCollapsed && "hidden")}>
                <span className="block truncate text-sm font-semibold text-accent">{profileName}</span>
                <span className="block truncate text-xs capitalize text-accent-muted">{profileRole}</span>
              </span>
            </button>
          </div>

        </div>
      </aside>

      <AnimatePresence>
        {isProfileOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close profile settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeProfileSettings}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            />
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-label="Profile settings"
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 18 }}
              transition={{ duration: 0.18 }}
              className="fixed left-1/2 top-1/2 z-[70] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-noir-900"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-accent">Profile settings</h2>
                  <p className="mt-1 text-sm text-accent-muted">Update your sidebar profile image.</p>
                </div>
                <button
                  type="button"
                  onClick={closeProfileSettings}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-accent-muted transition-colors hover:bg-black/5 hover:text-accent dark:hover:bg-white/10"
                  aria-label="Close profile settings"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-col items-center">
                <div className="relative mb-4 flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl bg-blue-600/10 text-blue-600 ring-1 ring-blue-500/20">
                  {activeProfileImageUrl ? (
                    <img src={activeProfileImageUrl} alt={profileName} className="h-full w-full object-cover" />
                  ) : (
                    <UserRound className="h-12 w-12" />
                  )}
                </div>

                <input
                  ref={profileFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfileImageChange}
                />

                <div className="flex w-full gap-3">
                  <button
                    type="button"
                    onClick={() => profileFileInputRef.current?.click()}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 px-4 text-sm font-semibold text-accent transition-colors hover:border-blue-500/30 hover:bg-blue-600/5 dark:border-white/10"
                  >
                    <Camera className="h-4 w-4" />
                    Choose image
                  </button>
                  <button
                    type="button"
                    onClick={uploadProfileImage}
                    disabled={isUploadingProfile || !selectedProfileImage}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isUploadingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Save
                  </button>
                </div>

                {profileError && (
                  <p className="mt-4 w-full rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-500">{profileError}</p>
                )}
              </div>
            </motion.section>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="min-w-0 flex-1 p-4 md:p-8 xl:p-10 overflow-y-auto relative">
        <div className="w-full max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
      <ChatLauncher />
    </div>
  );
};
