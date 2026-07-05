import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import api from "../lib/api";
import { QRCodeSVG } from "qrcode.react";
import {
  Users,
  Clock,
  ShieldCheck,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  UserPlus,
  Download,
  CheckCircle,
  Trash2,
  FileText,
  Send,
  X,
  ArrowLeft,
  Loader2,
  Activity as ActivityIcon,
  Hash,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { buildLocationPayload } from "../lib/location";

const frontendUrl = (import.meta.env.VITE_FRONTEND_URL || window.location.origin).replace(/\/$/, "");
const buildStudentCheckInUrl = (sessionId, token) => (
  `${frontendUrl}/checkin/confirm/${sessionId}/${encodeURIComponent(token)}`
);

export const LiveSessionMonitor = ({ session, onBack }) => {
  const { t, branding } = useApp();
  const [qrData, setQrData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState({ present: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [newStudentCode, setNewStudentCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qrError, setQrError] = useState(null);
  const [isFullScreenQr, setIsFullScreenQr] = useState(false);
  const [permissionTarget, setPermissionTarget] = useState(null);
  const [permissionSubmitting, setPermissionSubmitting] = useState(false);
  const [permissionForm, setPermissionForm] = useState({
    type: "sick",
    reason: "",
  });

  const sessionId = session?.id;
  const sessionDate = session?.start_time
    ? new Date(session.start_time).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const fetchMonitorData = async () => {
    if (!sessionId) return;
    try {
      const res = await api.get(`/teacher/session/${sessionId}/monitor`);
      setAttendance(res.data.data || []);
      setStats({
        present: res.data.present_count,
        total: res.data.total_count,
      });
    } catch (err) {
      console.error("Failed to fetch monitor data", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQrToken = async () => {
    if (!sessionId) return;
    try {
      const res = await api.get(`/teacher/session/${sessionId}/qr`);
      setQrData(res.data);
      setTimeLeft(res.data.refresh_in || 60);
    } catch (err) {
      if (err.response?.status === 403) {
        setQrError("FORBIDDEN_ACCESS");
        console.error(
          "Access Forbidden: You do not have permission to view QR for this session.",
        );
      } else {
        setQrError("FETCH_ERROR");
        console.error("Failed to fetch QR token", err);
      }
    }
  };

  useEffect(() => {
    fetchMonitorData();
    fetchQrToken();

    // Refresh attendance every 10 seconds
    const monitorInterval = setInterval(fetchMonitorData, 10000);

    // Refresh QR token every 60 seconds
    const qrInterval = setInterval(fetchQrToken, 60000);

    return () => {
      clearInterval(monitorInterval);
      clearInterval(qrInterval);
    };
  }, [sessionId]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const handleManualAdd = async (e) => {
    e.preventDefault();
    if (!newStudentCode) return;
    setIsSubmitting(true);

    try {
      // Find student ID from code or handle on backend
      // Backend manualCheckin expects student_id, let's assume code for now or adapt
      // In this system, we might need a search student by code first or backend handles code
      // Based on TeacherController.php:182 it expects student_id (numeric)

      // For now, let's look up the student in our attendance list if they exist but are absent
      const studentCode = newStudentCode.trim();
      const student = attendance.find(
        (s) =>
          (s.student_code || "").toLowerCase() === studentCode.toLowerCase(),
      );
      if (!student) {
        alert("Student not found in this session group.");
        return;
      }

      const studentStatus = (student.status || "").toUpperCase();
      const permissionType = (student.permission_type || "").toUpperCase();
      const hasExcuse =
        studentStatus === "EXCUSED" ||
        permissionType === "EXCUSED" ||
        Boolean(student.permission_reason);

      if (hasExcuse) {
        alert(
          t("manualAttendanceExcusedBlocked") ||
            "This student has an approved excuse and cannot be marked present manually.",
        );
        return;
      }

      const requireLocation = branding?.requireLocation !== false;
      if (requireLocation) {
        if (!navigator.geolocation) {
          alert("Geolocation is not supported by your browser.");
          return;
        }

        const locationPayload = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) =>
              resolve(
                buildLocationPayload(
                  {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                  },
                  branding,
                ),
              ),
            reject,
            { enableHighAccuracy: true, timeout: 8000 },
          );
        });

        if (!locationPayload.isInsideCampus) {
          alert(t("outsideCampusWarning"));
          return;
        }
      }

      await api.post(`/teacher/session/${sessionId}/checkin`, {
        student_id: student.id,
        status: "present",
      });

      fetchMonitorData();
      setNewStudentCode("");
      setIsManualModalOpen(false);
    } catch (err) {
      if (err?.code) {
        alert(`${t("restrictedAccess")}: ${t("enableGpsAdvice")}`);
      } else {
        alert(err.response?.data?.message || "Manual check-in failed");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (attendanceId) => {
    if (!attendanceId) return;
    if (!confirm("Are you sure you want to remove this attendance record?"))
      return;

    try {
      await api.delete(`/teacher/attendance/${attendanceId}`);
      fetchMonitorData();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const openPermissionRequest = (record) => {
    setPermissionTarget(record);
    setPermissionForm({
      type: record.permission_type || "sick",
      reason: record.permission_reason || "",
    });
  };

  const handlePermissionSubmit = async (event) => {
    event.preventDefault();
    if (!permissionTarget || !permissionForm.reason.trim()) return;

    setPermissionSubmitting(true);
    try {
      await api.post("/teacher/student-permissions", {
        student_id: permissionTarget.id,
        attendance_session_id: sessionId,
        start_date: sessionDate,
        end_date: sessionDate,
        type: permissionForm.type,
        reason: permissionForm.reason.trim(),
      });
      setPermissionTarget(null);
      setPermissionForm({ type: "sick", reason: "" });
      fetchMonitorData();
    } catch (err) {
      console.error("Failed to submit permission request", err);
      alert(err.response?.data?.message || "Failed to submit permission request");
    } finally {
      setPermissionSubmitting(false);
    }
  };

  const handleMarkAllPresent = async () => {
    alert("This feature requires bulk API implementation on the backend.");
  };

  const handleDownloadReport = async () => {
    if (!sessionId) return;

    try {
      const response = await api.get(`/teacher/session/${sessionId}/export`, {
        responseType: "blob",
      });
      const disposition = response.headers["content-disposition"] || "";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] || `attendance_${sessionId}.xlsx`;
      const url = URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download attendance report", err);
      alert(err.response?.data?.message || "Failed to download report");
    }
  };

  const filteredAttendance = (attendance || []).filter(
    (a) =>
      (a.name || "")
        .toLowerCase()
        .includes((searchQuery || "").toLowerCase()) ||
      (a.student_code || "").includes(searchQuery),
  );

  if (!session) {
    return (
      <div className="text-center py-20 glass rounded-4xl border border-black/5 dark:border-white/10">
        <h3 className="text-xl font-bold mb-4">{t("noSessionSelected")}</h3>
        <button
          onClick={onBack}
          className="text-white bg-blue-600 px-6 py-2 rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
        >
          {t("goBack")}
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-accent-muted">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="animate-pulse">{t("loadingFeed")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {isFullScreenQr && qrData?.qr_token && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(10px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            onClick={() => setIsFullScreenQr(false)}
            className="fixed inset-0 z-[100] bg-noir-950/90 flex flex-col items-center justify-center p-8 cursor-zoom-out"
          >
            <div
              className="bg-white p-8 md:p-12 rounded-[3rem] shadow-[0_0_100px_rgba(37,99,235,0.3)] mb-8 transition-transform hover:scale-[1.02]"
              onClick={(e) => e.stopPropagation()}
            >
              <QRCodeSVG
                value={buildStudentCheckInUrl(sessionId, qrData.qr_token)}
                size={Math.min(
                  window.innerWidth * 0.8,
                  window.innerHeight * 0.6,
                )}
                level="H"
              />
            </div>
            <p className="dark:text-green-700  text-xl md:text-2xl font-bold tracking-widest uppercase">
              {session.subject?.name || session.subject || t("unknown")} •{" "}
              {session.classRoom?.name || t("live")}
            </p>
            <div className="flex items-center gap-3 mt-4 bg-white/10 px-6 py-2 rounded-full border border-white/10">
              <RefreshCw className="w-4 h-4 text-blue-400 animate-spin-slow" />
              <p className="dark:text-green-700  font-mono tracking-widest">
                {t("refreshIn")} {timeLeft}s
              </p>
            </div>

            <button
              onClick={() => setIsFullScreenQr(false)}
              className="absolute top-8 right-8 text-white/50 hover:text-white glass rounded-full p-4 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={onBack}
        className="flex items-center gap-2 text-accent-muted hover:text-blue-600 transition-colors mb-2 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("backToDashboard")}
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-6 text-left">
        {/* QR Engine Section */}
        <div className="space-y-6">
          <div className="glass p-5 rounded-[1.5rem] flex flex-col items-center text-center relative overflow-hidden border border-black/5 dark:border-white/10">
            <div className="absolute top-0 left-0 w-full h-1 bg-black/5 dark:bg-white/5">
              <motion.div
                className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                key={qrData?.qr_token}
              />
            </div>

            <div className="mb-4">
              <h3 className="text-xl font-black tracking-tight font-outfit">
                {session.subject?.name ||
                  (typeof session.subject === "string"
                    ? session.subject
                    : t("unknown"))}
              </h3>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                <span className="bg-blue-600/10 text-blue-600 px-3 py-1 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5">
                  <Hash className="w-3 h-3" />
                  ID {sessionId}
                </span>
                <span className="bg-blue-600/10 text-blue-600 px-3 py-1 rounded-lg text-xs font-bold font-mono">
                  {session.start_time
                    ? new Date(session.start_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : t("live")}
                </span>
                <span className="w-1 h-1 rounded-full bg-accent-muted/30" />
                <span className="text-accent-muted text-xs font-medium uppercase tracking-widest">
                  {session.room || t("unknown")}
                </span>
              </div>
            </div>

            <div
              className="bg-white p-4 rounded-[1.5rem] shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-zoom-in group relative border border-black/5 dark:border-white/10"
              onClick={() => {
                if (qrData?.qr_token && session.status === "active")
                  setIsFullScreenQr(true);
              }}
            >
              {(() => {
                if (session.status === "scheduled") {
                  return (
                    <div className="w-[180px] h-[180px] flex flex-col items-center justify-center text-yellow-500 gap-3 border-2 border-yellow-500/10 rounded-[1.25rem] bg-yellow-500/5 p-5 text-center">
                      <Clock className="w-12 h-12 animate-pulse" />
                      <div>
                        <p className="text-sm font-black uppercase tracking-widest">
                          {t("scheduled")}
                        </p>
                        <p className="text-[10px] font-medium opacity-60 mt-1">
                          {t("waitingToStart") ||
                            "Waiting for you to start the session..."}
                        </p>
                      </div>
                    </div>
                  );
                }
                if (qrData?.qr_token) {
                  const qrUrl = buildStudentCheckInUrl(sessionId, qrData.qr_token);

                  return (
                    <>
                      <QRCodeSVG value={qrUrl} size={180} level="H" />
                      <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-all rounded-[1.5rem] flex items-center justify-center backdrop-blur-[2px]">
                        <div className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-blue-600/30 flex items-center gap-2">
                          <ActivityIcon className="w-4 h-4 animate-pulse" />
                          {t("viewAll")}
                        </div>
                      </div>
                    </>
                  );
                }
                if (qrError === "FORBIDDEN_ACCESS") {
                  return (
                    <div className="w-[180px] h-[180px] flex flex-col items-center justify-center text-red-500 gap-3 border-2 border-red-500/10 rounded-[1.25rem] bg-red-500/5 p-5 text-center">
                      <XCircle className="w-12 h-12" />
                      <p className="text-xs font-bold leading-relaxed">
                        {t("restrictedAccess")}
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="w-[180px] h-[180px] flex items-center justify-center text-blue-600">
                    <RefreshCw className="w-12 h-12 animate-spin" />
                  </div>
                );
              })()}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-widest mt-5">
              <div className="flex items-center gap-2 text-accent-muted">
                <RefreshCw className="w-4 h-4 animate-spin-slow text-blue-600" />
                <span>
                  {t("refreshIn")} {timeLeft}s
                </span>
              </div>
              <div className="w-1 h-1 rounded-full bg-accent-muted/30" />
              <div className="flex items-center gap-2 text-green-500 bg-green-500/10 px-3 py-1 rounded-full">
                <ShieldCheck className="w-4 h-4" />
                <span>SECURED</span>
              </div>
            </div>

            <div className="mt-6 w-full grid grid-cols-2 gap-3">
              <div className="glass bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/5">
                <p className="text-xl font-black text-blue-600">
                  {stats.present}/{stats.total}
                </p>
                <p className="text-[10px] text-accent-muted uppercase tracking-widest font-bold mt-1">
                  {t("present")}
                </p>
              </div>
              <div className="glass bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/5">
                <p className="text-xl font-black text-green-500">
                  {stats.total > 0
                    ? Math.round((stats.present / stats.total) * 100)
                    : 0}
                  %
                </p>
                <p className="text-[10px] text-accent-muted uppercase tracking-widest font-bold mt-1">
                  {t("attendance")}
                </p>
              </div>
            </div>
          </div>

          <div className="glass p-4 rounded-2xl space-y-3 border border-black/5 dark:border-white/10">
            <h4 className="font-bold flex items-center gap-2 text-sm uppercase tracking-widest text-accent-muted">
              <ActivityIcon className="w-4 h-4 text-blue-600" />
              {t("liveDiagnostics")}
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between text-sm py-1.5 border-b border-black/5 dark:border-white/5">
                <span className="text-accent-muted">Session ID</span>
                <span className="font-mono font-bold text-blue-600">
                  {sessionId}
                </span>
              </div>
              <div className="flex justify-between text-sm py-1.5 border-b border-black/5 dark:border-white/5">
                <span className="text-accent-muted">{t("status")}</span>
                <span
                  className={cn(
                    "font-bold uppercase tracking-tight flex items-center gap-2",
                    session.status === "active"
                      ? "text-green-500"
                      : session.status === "scheduled"
                        ? "text-yellow-500"
                        : "text-blue-500",
                  )}
                >
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full animate-pulse",
                      session.status === "active"
                        ? "bg-green-500"
                        : session.status === "scheduled"
                          ? "bg-yellow-500"
                          : "bg-blue-500",
                    )}
                  />
                  {t(session.status) || session.status}
                </span>
              </div>
              <div className="flex justify-between text-sm py-1.5">
                <span className="text-accent-muted">{t("room")}</span>
                <span className="font-bold">
                  {session.room || t("unknown")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Stream Section */}
        <div className="space-y-6 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-xl font-bold flex items-center gap-2 font-outfit">
              <Users className="w-5 h-5 text-blue-600" />
              {t("attendanceList")}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsManualModalOpen(true)}
                className="glass glass-hover p-2.5 rounded-xl text-accent-muted hover:text-blue-600 hover:bg-blue-600/5 transition-all shadow-sm border border-black/5 dark:border-white/5"
                title={t("manualEntry")}
              >
                <UserPlus className="w-5 h-5" />
              </button>
              <button
                onClick={handleDownloadReport}
                className="glass glass-hover p-2.5 rounded-xl text-accent-muted hover:text-blue-600 hover:bg-blue-600/5 transition-all shadow-sm border border-black/5 dark:border-white/5"
                title={t("exportReport")}
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-muted" />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-blue-600 transition-all font-medium"
            />
          </div>

          <div className="glass rounded-4xl overflow-hidden shadow-2xl border border-black/5 dark:border-white/10">
            <div className="hidden lg:grid grid-cols-[minmax(240px,1.6fr)_140px_90px_130px_130px_130px] gap-3 border-b border-black/5 bg-black/[0.03] px-5 py-4 text-[10px] font-black uppercase tracking-widest text-accent-muted dark:border-white/10 dark:bg-white/[0.03]">
              <span>{t("students")}</span>
              <span>{t("studentId")}</span>
              <span>{t("history")}</span>
              <span>{t("status")}</span>
              <span>{t("verification") || "Verification"}</span>
              <span className="text-right">Actions</span>
            </div>

            <div className="divide-y divide-black/5 dark:divide-white/5">
              <AnimatePresence mode="popLayout">
                {filteredAttendance.map((record) => (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group grid grid-cols-1 gap-4 px-5 py-4 transition-all hover:bg-blue-600/5 lg:grid-cols-[minmax(240px,1.6fr)_140px_90px_130px_130px_130px] lg:items-center lg:gap-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-black shadow-sm"
                        style={{
                          backgroundColor: (record.avatar_color || "#2563eb") + "20",
                          color: record.avatar_color || "#2563eb",
                        }}
                      >
                        {record.initials ||
                          (record.name || "S")
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="block truncate text-sm font-black text-accent transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {record.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] font-medium text-accent-muted">
                          {[record.group_name, record.major_name].filter(Boolean).join(" / ") || "Student"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 lg:block">
                      <span className="text-[10px] font-black uppercase tracking-widest text-accent-muted lg:hidden">
                        {t("studentId")}
                      </span>
                      <span className="font-mono text-sm text-accent-muted">{record.student_code}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3 lg:block">
                      <span className="text-[10px] font-black uppercase tracking-widest text-accent-muted lg:hidden">
                        {t("history")}
                      </span>
                      <span className="font-mono text-sm text-accent-muted">{record.check_in_time || "-"}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3 lg:block">
                      <span className="text-[10px] font-black uppercase tracking-widest text-accent-muted lg:hidden">
                        {t("status")}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter shadow-sm",
                          record.status?.toUpperCase() === "PRESENT"
                            ? "bg-green-500/10 text-green-500"
                            : record.status?.toUpperCase() === "LATE"
                              ? "bg-yellow-500/10 text-yellow-500"
                              : "bg-red-500/10 text-red-500",
                        )}
                      >
                        {record.status?.toUpperCase() === "PRESENT" ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Clock className="h-3.5 w-3.5" />
                        )}
                        {t(record.status?.toLowerCase()) || record.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 lg:block">
                      <span className="text-[10px] font-black uppercase tracking-widest text-accent-muted lg:hidden">
                        {t("verification") || "Verification"}
                      </span>
                      {record.permission_type || record.permission_status || record.permission_reason ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-wider shadow-sm",
                            record.permission_status === "approved" || record.status === "EXCUSED"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-amber-500/10 text-amber-500",
                          )}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {[record.permission_status, record.permission_type].filter(Boolean).join(" / ") || "Permission"}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-xl bg-black/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-accent-muted dark:bg-white/5">
                          No
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      {!record.permission_reason && (
                        <button
                          type="button"
                          onClick={() => openPermissionRequest(record)}
                          className="inline-flex items-center gap-2 rounded-xl border border-blue-500/15 bg-blue-600/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-blue-600 transition-colors hover:bg-blue-600 hover:text-white"
                          title="Assign permission request"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Request</span>
                        </button>
                      )}
                      {record.attendance_id && (
                        <button
                          onClick={() => handleDelete(record.attendance_id)}
                          className="rounded-xl border border-transparent p-2.5 text-red-500 transition-colors hover:border-red-500/20 hover:bg-red-500/10"
                          title="Remove Record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="hidden">
              <table className="w-full min-w-[900px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5">
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest text-accent-muted font-black whitespace-nowrap">
                      {t("students")}
                    </th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest text-accent-muted font-black whitespace-nowrap">
                      {t("studentId")}
                    </th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest text-accent-muted font-black whitespace-nowrap">
                      {t("history")}
                    </th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest text-accent-muted font-black whitespace-nowrap">
                      {t("status")}
                    </th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest text-accent-muted font-black whitespace-nowrap">
                      {t("verification") || "Verification"}
                    </th>
                    <th className="px-4 py-4 text-right text-[10px] uppercase tracking-widest text-accent-muted font-black whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  <AnimatePresence mode="popLayout">
                    {filteredAttendance.map((record) => (
                      <motion.tr
                        key={record.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group hover:bg-blue-600/5 transition-all cursor-default"
                      >
                        <td className="px-4 py-4 text-left">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black shadow-sm"
                              style={{
                                backgroundColor:
                                  (record.avatar_color || "#2563eb") + "20",
                                color: record.avatar_color || "#2563eb",
                              }}
                            >
                              {record.initials ||
                                (record.name || "S")
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="block truncate text-sm font-bold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {record.name}
                              </span>
                              {(record.group_name || record.major_name) && (
                                <span className="mt-0.5 block truncate text-[11px] font-medium text-accent-muted">
                                  {[record.group_name, record.major_name].filter(Boolean).join(" / ")}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-accent-muted font-mono whitespace-nowrap">
                          {record.student_code}
                        </td>
                        <td className="px-4 py-4 text-sm text-accent-muted font-mono whitespace-nowrap">
                          {record.check_in_time || "—"}
                        </td>
                        <td className="px-4 py-4 text-left">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter shadow-sm",
                              record.status?.toUpperCase() === "PRESENT"
                                ? "bg-green-500/10 text-green-500"
                                : record.status?.toUpperCase() === "LATE"
                                  ? "bg-yellow-500/10 text-yellow-500"
                                  : "bg-red-500/10 text-red-500",
                            )}
                          >
                            {record.status?.toUpperCase() === "PRESENT" ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <Clock className="w-3.5 h-3.5" />
                            )}
                            {t(record.status?.toLowerCase()) || record.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-left">
                          {record.permission_type || record.permission_status || record.permission_reason ? (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm whitespace-nowrap",
                                record.permission_status === "approved" || record.status === "EXCUSED"
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : "bg-amber-500/10 text-amber-500",
                              )}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              {[record.permission_status, record.permission_type].filter(Boolean).join(" / ") || "Permission"}
                            </span>
                          ) : (
                            <span className="inline-flex px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest text-accent-muted whitespace-nowrap">
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 transition-all">
                            {!record.permission_reason && (
                              <button
                                type="button"
                                onClick={() => openPermissionRequest(record)}
                                className="inline-flex items-center gap-2 rounded-xl border border-blue-500/15 bg-blue-600/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-blue-600 transition-colors hover:bg-blue-600 hover:text-white"
                                title="Assign permission request"
                              >
                                <FileText className="w-4 h-4" />
                                <span className="hidden xl:inline">Request</span>
                              </button>
                            )}
                            {record.attendance_id && (
                              <button
                                onClick={() =>
                                  handleDelete(record.attendance_id)
                                }
                                className="p-2.5 rounded-xl hover:bg-red-500/10 text-red-500 transition-colors border border-transparent hover:border-red-500/20"
                                title="Remove Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            {filteredAttendance.length === 0 && (
              <div className="p-20 text-center text-accent-muted">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-10" />
                <p className="text-lg font-bold">{t("noResultsFound")}</p>
                <p className="text-sm mt-1">{t("dashboardSub")}</p>
              </div>
            )}
          </div>
        </div>
        {/* Manual Override Modal */}
        <AnimatePresence>
          {isManualModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-noir-950/90 backdrop-blur-md flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="glass p-8 md:p-10 rounded-[2.5rem] w-full max-w-md relative border border-black/5 dark:border-white/10 shadow-2xl"
              >
                <button
                  onClick={() => setIsManualModalOpen(false)}
                  className="absolute top-8 right-8 text-accent-muted hover:text-blue-600 transition-colors p-2"
                >
                  <X className="w-6 h-6" />
                </button>

                <h3 className="text-2xl font-black mb-3 font-outfit">
                  {t("manualEntry")}
                </h3>
                <p className="text-accent-muted text-sm mb-10 leading-relaxed font-medium">
                  {t("manualEntryDescription")}
                </p>

                <form onSubmit={handleManualAdd} className="space-y-6">
                  <div className="text-left">
                    <label className="block text-xs font-black uppercase tracking-[0.2em] text-accent-muted mb-3">
                      {t("studentId")}
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={newStudentCode}
                      onChange={(e) => setNewStudentCode(e.target.value)}
                      className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl py-4 px-5 focus:outline-none focus:border-blue-600 transition-all font-mono text-lg"
                      placeholder="e.g. S-2024-001"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl mt-4 hover:bg-blue-700 transition-all disabled:opacity-50 shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-6 h-6" />
                        {t("verifyCheckIn")}
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {permissionTarget && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-noir-950/90 backdrop-blur-md flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="glass p-8 md:p-10 rounded-[2.5rem] w-full max-w-lg relative border border-black/5 dark:border-white/10 shadow-2xl"
              >
                <button
                  type="button"
                  onClick={() => setPermissionTarget(null)}
                  className="absolute top-8 right-8 text-accent-muted hover:text-blue-600 transition-colors p-2"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="pr-12">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-black mb-2 font-outfit">
                    Assign Permission Request
                  </h3>
                  <p className="text-accent-muted text-sm leading-relaxed font-medium">
                    {permissionTarget.name} / {permissionTarget.student_code} / Session #{sessionId} / {sessionDate}
                  </p>
                </div>

                <form onSubmit={handlePermissionSubmit} className="mt-8 space-y-5">
                  <label className="block text-left space-y-2">
                    <span className="block text-xs font-black uppercase tracking-[0.2em] text-accent-muted">
                      Permission Type
                    </span>
                    <select
                      value={permissionForm.type}
                      onChange={(event) => setPermissionForm((prev) => ({ ...prev, type: event.target.value }))}
                      className="w-full rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 px-5 py-4 text-sm outline-none focus:border-blue-600 transition-all"
                    >
                      <option value="sick">Sick</option>
                      <option value="event">Event</option>
                      <option value="personal">Personal</option>
                      <option value="official">Official</option>
                    </select>
                  </label>

                  <label className="block text-left space-y-2">
                    <span className="block text-xs font-black uppercase tracking-[0.2em] text-accent-muted">
                      Reason
                    </span>
                    <textarea
                      required
                      rows={4}
                      value={permissionForm.reason}
                      onChange={(event) => setPermissionForm((prev) => ({ ...prev, reason: event.target.value }))}
                      className="w-full resize-none rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 px-5 py-4 text-sm outline-none focus:border-blue-600 transition-all"
                      placeholder="Explain why this student should be excused for this session..."
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={permissionSubmitting || !permissionForm.reason.trim()}
                    className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl hover:bg-blue-700 transition-all disabled:opacity-50 shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3"
                  >
                    {permissionSubmitting ? (
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-6 h-6" />
                        Submit Permission Request
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
