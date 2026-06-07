import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MapPin,
  Navigation,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Clock,
  Crosshair,
  Map,
} from "lucide-react";
import api from "../lib/api";
import { useApp } from "../context/AppContext";
import { cn } from "../lib/utils";
import { buildLocationPayload, getCampusSettings } from "../lib/location";

const formatDistance = (meters) => {
  if (meters > 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
};

const formatTime = () => {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ─── Sub-components ───────────────────────────────────────────────

const StatusPill = ({ status }) => {
  const { t } = useApp();
  const config = {
    idle: {
      label: t("ready") || "Ready",
      dot: "bg-gray-400",
      pill: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/50",
    },
    loading: {
      label: t("locating"),
      dot: "bg-blue-500 animate-pulse",
      pill: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    },
    success: {
      label: t("verified") || "Verified",
      dot: "bg-green-500",
      pill: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
    },
    error: {
      label: t("outsideCampus"),
      dot: "bg-red-500",
      pill: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    },
  };
  const { label, dot, pill } = config[status] ?? config.idle;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide transition-all duration-300",
        pill,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dot)} />
      {label}
    </span>
  );
};

const DataRow = ({ icon: Icon, label, value, valueClass }) => (
  <div className="flex items-center justify-between py-3 px-4 border-b border-gray-100 dark:border-white/5 last:border-0">
    <span className="flex items-center gap-2 text-xs  font-medium">
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
    <span className={cn("font-mono text-xs font-bold", valueClass)}>
      {value}
    </span>
  </div>
);

const Alert = ({ type = "error", icon: Icon = AlertCircle, children }) => {
  const styles = {
    error:
      "bg-red-50 border-red-200 text-red-800 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400",
    success:
      "bg-green-50 border-green-200 text-green-800 dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-400",
    warning:
      "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className={cn(
        "flex items-start gap-2.5 px-4 py-3 rounded-xl border text-xs leading-relaxed font-medium",
        styles[type],
      )}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </motion.div>
  );
};

// ─── Main Component ────────────────────────────────────────────────

export const LocationTracker = () => {
  const { t, branding } = useApp();
  const campusSettings = getCampusSettings(branding);
  const [status, setStatus] = useState("idle");
  const [locationData, setLocationData] = useState(null);
  const [campusDistance, setCampusDistance] = useState(null);
  const [timestamp, setTimestamp] = useState(null);
  const [error, setError] = useState(null);

  const reset = () => {
    setError(null);
  };

  const handleTrackLocation = () => {
    if (!navigator.geolocation) {
      setError(t("actionFailed") + ": Geolocation not supported");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError(null);
    setLocationData(null);
    setCampusDistance(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const data = buildLocationPayload(
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          branding,
        );

        setCampusDistance(data.distance);
        setLocationData(data);
        setTimestamp(formatTime());
        sendToServer(data, campusSettings.radius);
      },
      (err) => {
        const msgs = {
          [err.PERMISSION_DENIED]: t("restrictedAccess"),
          [err.POSITION_UNAVAILABLE]: t("noRecordsFound"),
          [err.TIMEOUT]: t("actionFailed"),
        };
        setError(msgs[err.code] ?? t("actionFailed"));
        setStatus("error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const sendToServer = async (data, radius) => {
    if (!data.isInsideCampus) {
      setError(t("outsideCampusWarning"));
      setStatus("error");
      return;
    }

    try {
      const response = await api.post("/location/record", data);
      if (response.data.status) {
        setStatus("success");
      } else {
        setError(response.data.message || t("actionFailed"));
        setStatus("error");
      }
    } catch (err) {
      let serverMsg = err.response?.data?.message || t("actionFailed");
      // Translate common server messages
      if (serverMsg.includes("Too Many Attempts"))
        serverMsg = t("tooManyAttempts") || serverMsg;

      let msg = serverMsg;
      if (data.accuracy > 500) msg += t("lowAccuracyNote");
      else if (data.distance > radius) msg += t("outsideRadiusError");
      setError(msg);
      setStatus("error");
    }
  };

  const isLoading = status === "loading";
  const showData = !!locationData;

  return (
    <div className="w-full min-h-[calc(100vh-120px)] flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ── Left Panel: Status & Action ── */}
      <div className="flex-1 space-y-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden h-full flex flex-col justify-between"
        >
          {/* Background Decorative Glows */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-600/10 blur-[100px] rounded-full" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="bg-blue-600/10 p-3 rounded-2xl border border-blue-500/20">
                <Navigation className="w-8 h-8 text-blue-500" />
              </div>
              <StatusPill status={status} />
            </div>

            <h1 className="text-4xl font-black  mb-4 tracking-tighter uppercase italic leading-none">
              {t("attendanceVerification")}
            </h1>
            <p className="text-accent-muted text-lg font-medium leading-relaxed max-w-md mb-12">
              {t("campusBoundaryVerif")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <button
                onClick={handleTrackLocation}
                disabled={isLoading}
                className={cn(
                  "group   relative overflow-hidden rounded-2xl p-6 transition-all duration-300 active:scale-[0.98] border-2",
                  isLoading
                    ? " border-white/10 cursor-not-allowed"
                    : " shadow-glow shadow-white/10",
                )}
              >
                <div className="relative z-10 flex flex-col items-center gap-3 font-black uppercase tracking-widest text-sm">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>{t("verifying")}</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      <span>{t("verifyLocation")}</span>
                    </>
                  )}
                </div>
              </button>

              <a
                href={`https://www.google.com/maps?q=${campusSettings.lat},${campusSettings.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-blue-600/10 hover:bg-blue-600/20 border-2 border-blue-600/20 rounded-2xl p-6 flex flex-col items-center gap-3 transition-colors"
              >
                <Map className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform" />
                <span className="font-black uppercase tracking-widest text-sm text-blue-500">
                  {t("viewCampusMap")}
                </span>
              </a>
            </div>
          </div>

          <div className="relative z-10 mt-auto pt-8 border-t border-white/5 flex items-center gap-3 opacity-60">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">
              {t("secureUplink")} · Human Resource University
            </span>
          </div>
        </motion.div>
      </div>

      {/* ── Right Panel: Diagnostics & Map Preview ── */}
      <div className="w-full lg:w-96 space-y-6">
        {/* 📊 Live Statistics */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-3xl p-6 border border-white/5 flex flex-col h-full"
        >
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-accent-muted mb-6 flex items-center gap-2">
            <Crosshair className="w-4 h-4" /> {t("liveIntelligence")}
          </h3>

          <div className="space-y-4 flex-1">
            <AnimatePresence mode="wait">
              {showData ? (
                <motion.div
                  key="data"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex justify-between items-center text-xs uppercase tracking-widest font-black">
                      <span className="opacity-50 tracking-tighter">
                        {t("distance")}
                      </span>
                      <span
                        className={cn(
                          "font-mono px-2 py-1 rounded",
                          campusDistance > campusSettings.radius
                            ? "text-rose-500 bg-rose-500/10"
                            : "text-emerald-500 bg-emerald-500/10",
                        )}
                      >
                        {formatDistance(campusDistance)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs uppercase tracking-widest font-black">
                      <span className="opacity-50 tracking-tighter">
                        {t("precision")}
                      </span>
                      <span
                        className={cn(
                          "font-mono",
                          locationData.accuracy > 100
                            ? "text-amber-500"
                            : "text-white",
                        )}
                      >
                        ±{Math.round(locationData.accuracy)}M
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs uppercase tracking-widest font-black">
                      <span className="opacity-50 tracking-tighter">
                        {t("uplinkTime")}
                      </span>
                      <span className="font-mono">{timestamp}</span>
                    </div>
                  </div>

                  {campusDistance > campusSettings.radius && (
                    <Alert type="error" icon={AlertCircle}>
                      {t("outsideCampusWarning")}
                    </Alert>
                  )}

                  {/* Mini Map Iframe */}
                  <div className="aspect-square rounded-2xl overflow-hidden border border-white/10 opacity-80 hover:opacity-100 transition-opacity">
                    <iframe
                      title="Campus Map"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      style={{
                        border: 0,
                        filter:
                          "invert(90%) hue-rotate(180deg) brightness(95%) contrast(90%)",
                      }}
                      src={`https://maps.google.com/maps?q=${campusSettings.lat},${campusSettings.lng}&z=16&output=embed`}
                      allowFullScreen
                    />
                    {/* Note: I'm using an embed link. For production, the user would need an API key 
                                            or I can use a simpler static link. Let's use a simpler URL for now. */}
                  </div>
                </motion.div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-center opacity-30 border-2 border-dashed border-white/10 rounded-3xl">
                  <MapPin className="w-12 h-12 mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    Waiting for Uplink...
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-8">
            {status === "success" && !error && (
              <Alert type="success" icon={CheckCircle}>
                {t("verifiedOnCampus")}
              </Alert>
            )}
            {error && (
              <Alert type="error" icon={AlertCircle}>
                {error}
              </Alert>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
