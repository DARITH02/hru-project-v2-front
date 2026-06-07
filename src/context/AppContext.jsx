import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../lib/api";
import { DEFAULT_CAMPUS_LOCATION } from "../lib/location";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [lang, setLang] = useState(localStorage.getItem("lang") || "en");
  const [theme, setTheme] = useState(
    localStorage.getItem("theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"),
  );
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState({
    university: "HRU",
    systemName: "Attendance System",
    logo: "https://res.cloudinary.com/dnrblpkal/image/upload/q_auto/f_auto/v1775536855/branding/k6obqtagifkszo8pehnd.png",
    campusLat: DEFAULT_CAMPUS_LOCATION.lat,
    campusLng: DEFAULT_CAMPUS_LOCATION.lng,
    campusRadius: DEFAULT_CAMPUS_LOCATION.radius,
    requireLocation: true,
  });

  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await api.get("/profile");
          setUser(res.data.user || res.data);
        } catch (err) {
          localStorage.removeItem("token");
          setUser(null);
        }
      }
    };

    const fetchBranding = async () => {
      try {
        const res = await api.get("/branding");
        if (res.data) {
          const backendUrl = api.defaults.baseURL.replace(/\/api$/, "");
          let logoUrl = res.data.app_logo || res.data.logo;

          if (
            logoUrl &&
            !logoUrl.startsWith("http") &&
            !logoUrl.startsWith("//")
          ) {
            // Prepend a slash if missing
            logoUrl = logoUrl.startsWith("/") ? logoUrl : "/" + logoUrl;
            logoUrl = backendUrl + logoUrl;
          }

          setBranding((prev) => ({
            ...prev,
            systemName:
              res.data.system_name || res.data.app_sub || prev.systemName,
            logo: logoUrl || prev.logo,
            university:
              res.data.university || res.data.app_name || prev.university,
            campusLat:
              parseFloat(res.data.campus_lat ?? res.data.campusLat) ||
              DEFAULT_CAMPUS_LOCATION.lat,
            campusLng:
              parseFloat(res.data.campus_lng ?? res.data.campusLng) ||
              DEFAULT_CAMPUS_LOCATION.lng,
            campusRadius:
              parseInt(
                res.data.campus_radius_meters ?? res.data.campusRadius,
                10,
              ) || DEFAULT_CAMPUS_LOCATION.radius,
            requireLocation:
              res.data.require_location !== undefined
                ? res.data.require_location
                : true,
          }));
        }
      } catch (err) {
        console.error("Failed to fetch branding", err);
      }
    };

    Promise.allSettled([checkAuth(), fetchBranding()]).finally(() =>
      setLoading(false),
    );
  }, []);

  const login = async (credentials) => {
    try {
      const res = await api.post("/login", credentials);
      const { token, user: userData } = res.data;
      const requestedRole = credentials.role?.toLowerCase();
      const returnedRole = userData?.role?.toLowerCase();

      if (requestedRole && returnedRole && returnedRole !== requestedRole) {
        return {
          success: false,
          message: `This account is registered as ${userData.role}, not ${credentials.role}.`,
        };
      }
      localStorage.setItem("token", token);
      setUser(userData);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Login failed",
      };
    }
  };

  const logout = async () => {
    try {
      await api.post("/logout");
    } catch (err) {
      console.error("Logout error", err);
    } finally {
      localStorage.removeItem("token");
      setUser(null);
    }
  };

  const translations = {
    en: {
      dashboard: "Dashboard",
      sessions: "Sessions",
      students: "Students",
      history: "History",
      active: "Active",
      scheduled: "Scheduled",
      completed: "Completed",
      attendance: "Attendance Rate",
      riskIndex: "Academic Standing",
      cohortDensity: "Class Occupancy",
      scanAttendance: "Check-in Portal",
      logout: "Sign Out",
      loginAsTeacher: "Faculty Portal",
      loginAsStudent: "Student Portal",
      studentId: "Student Identifier",
      checkIn: "Confirm Presence",
      present: "Present",
      absent: "Absent",
      late: "Late Arrival",
      academicMastery: "Learning Progress",
      meanPresence: "Average Attendance",
      sessionQuotas: "Session Allocation",
      searchStudent: "Search Identifier...",
      liveMonitor: "Live Monitor",
      qrToken: "QR Token",
      refreshIn: "Refresh in",
      attendanceList: "Attendance Roster",
      manualEntry: "Manual Entry",
      exportReport: "Export Data",
      restrictedAccess: "Restricted Access",
      sessionReady: "Session Ready",
      liveDiagnostics: "Live Diagnostics",
      status: "Status",
      room: "Room",
      searchPlaceholder: "Search by identifier...",
      welcomeBack: "Welcome back",
      liveNow: "Live Now",
      remaining: "sessions remaining",
      subjectPortfolio: "Subject Portfolio",
      scanningQr: "Scanning Session QR",
      alignQr: "Align the QR code within the frame to check in",
      verifyingIdentity: "Verifying Identity...",
      sessionQuotasLabel: "Session Quotas",
      lightMode: "Light Mode",
      darkMode: "Dark Mode",
      academicOS: "Academic OS",
      intelligenceDashboard: "Analytics Dashboard",
      dashboardSub: "Real-time cohort insights and session monitoring",
      gatheringIntelligence: "Retrieving Academic Intelligence...",
      activeSessions: "Active Sessions",
      viewAll: "View All Archive",
      riskIntelligence: "Risk Intelligence",
      fullReport: "Full Report",
      recentSessions: "Recent Sessions",
      noData: "No recent data detected in the database",
      presentCount: "Present",
      activeStudentsSub: "Active students in your track",
      interventionSub: "Students requiring intervention",
      engagementVelocity: "Engagement Velocity",
      avgParticipationSub: "Avg. session participation",
      systemLive: "System Live",
      attendanceLedger: "Attendance Ledger",
      historyAnalyticsSub: "Comprehensive history and analytics",
      syncingData: "Syncing Data...",
      accountVerified: "Account Verified",
      totalClasses: "Total Classes",
      sessionTimeline: "Session Timeline",
      all: "All",
      noRecordsFound: "No Records Found",
      noRecordsFoundSub: "Try switching the filter or check back later.",
      cameraCheckIn: "Camera check-in",
      typeStudentCode: "Type student code",
      weeklyTrends: "Weekly Trends",
      subjectPerformance: "Subject Performance",
      quickActions: "Quick Actions",
      directory: "Student Directory",
      excellent:
        "Excellent! No students fall below the 75% attendance threshold.",
      na: "N/A",
      unknown: "Unknown",
      viewAllArchive: "View All Archive",
      academicEcosystem: "Academic Ecosystem",
      selectPortal: "Select your portal to continue",
      facultyAdminAccess: "Faculty & Admin access",
      studentParentPortal: "Student & Parent portal",
      backToSelection: "Back to selection",
      loginAs: "Login as",
      emailIdentity: "Email Identity",
      securityKey: "Security Key",
      authorizeConnectivity: "Authorize Connectivity",
      studentDirectory: "Student Directory",
      studentDirectorySub:
        "Centralized repository of student academic presence",
      studentIdentity: "Student Identity",
      efficiency: "Efficiency",
      healthStatus: "Health Status",
      action: "Action",
      noResultsFound: "No results found in our academic index.",
      backToDirectory: "Back to Directory",
      mappingEcosystem: "Mapping Student Ecosystem...",
      historicalTimeline: "Historical Timeline",
      subjectDate: "Subject / Date",
      decryptingLogs: "Decrypting logs...",
      noHistoricalData: "No historical data available for this entity.",
      generateIntervention: "Generate Intervention Report",
      viewMetadata: "View User Metadata",
      major: "Major",
      classGroup: "Class Group",
      department: "Department",
      classDirectory: "Class Directory",
      classDirectorySub: "Select a class to view its students",
      backToClasses: "Back to Classes",
      searchClasses: "Search classes...",
      classInfo: "Class Information",
      studentsCount: "Students",
      attendanceEfficacy: "Efficacy",
      enrolled: "Enrolled",
      loadingStudents: "Accessing Student Directory...",
      noClassesFound: "No classes found in your track.",
      noSessionsFound: "No sessions found in this frequency.",
      retrievingSessions: "Retrieving Session Archives...",

      manualEntryDescription:
        "Mark a student present by their unique academic code.",
      goBack: "Go Back",
      noSessionSelected: "No Session Selected",
      backToDashboard: "Back to Dashboard",
      verifyCheckIn: "Verify & Check In",
      scanAdvice: "Point camera at the teacher's screen",
      confirmAttendance: "Confirm Attendance",
      studentIdSub: "Provide your ID to confirm presence",
      studentIdPlaceholder: "Your student ID code",
      sessionIdSub: "Ask your teacher for the session ID",
      activeSession: "Active Session",
      verifying: "Verifying...",
      thankYou: "Thank You",
      attendanceSuccess: "Your attendance has been recorded successfully.",
      exit: "Exit",
      tryAgain: "Try Again",
      scanAgain: "Scan Again",
      safeToClose: "You can close this browser now. (Safe to close)",
      processComplete: "Process Complete!",
      // General Alerts
      loginSuccess: "Successfully logged in!",
      loginFailed: "Login failed. Please check your credentials.",
      logoutSuccess: "Successfully logged out!",
      actionSuccess: "Action completed successfully!",
      actionFailed: "Action failed. Please try again.",
      attendanceMarked: "Attendance marked successfully!",
      attendanceFailed: "Failed to mark attendance.",
      manualAttendanceExcusedBlocked:
        "This student has an approved excuse and cannot be marked present manually.",
      sessionUpdated: "Session updated successfully!",
      dataExported: "Data exported successfully!",
      location: "Location Tracker",
      attendanceVerification: "Attendance Verification",
      campusBoundaryVerif:
        "Your location will be verified against the HRU Campus Boundary.",
      verifyLocation: "Verify Current Location",
      locating: "Locating...",
      verifiedOnCampus: "Verified on Campus",
      verificationFailed: "Verification Failed",
      campusDistance: "Campus Distance",
      accuracy: "Accuracy",
      outsideCampusWarning:
        "Attendance is only permitted within 500m of campus center.",
      openMapTracking: "Open Map Tracking",
      secureUplink: "Secure Encrypted Attendance Uplink",
      lowAccuracyNote:
        " (Note: Your location accuracy is very low. Try enabling GPS or using a mobile device.)",
      outsideRadiusError:
        " (Error: You are outside the authorized HRU campus radius.)",
      viewCampusMap: "View Campus Map",
      liveIntelligence: "Live Intelligence",
      uplinkTime: "Uplink Time",
      outsideCampus: "Outside campus",
      distance: "Distance",
      precision: "Precision",
      tooManyAttempts: "Too Many Attempts. Please wait a moment.",
      verification: "Verification",
      ready: "Ready",
      verified: "Verified",
      warning: "Warning",
      good: "Good",
      critical: "Critical Warning",
      enableGpsAdvice:
        "Please enable GPS and grant location access to complete your check-in.",
      inputScore: "Input Score",
      midtermScore: "Midterm (15%)",
      assignmentScore: "Assignment (15%)",
      finalScore: "Final Exam (50%)",
      saveScore: "Save Results",
      scoreSuccess: "Academic results updated successfully",
      scoring: "Grading Terminal",
      selectAssignment: "Select Subject/Semester",
      attendanceScore: "Attendance (20%)",
      myAttendance: "My Attendance",
      teacherAttendanceSub: "Mark and track your daily attendance record",
      currentTime: "Current Time",
      thisMonth: "This Month",
      daysPresent: "Days present",
      attendanceRate: "Attendance Rate",
      pastFiveDays: "Past 5 days",
      lateArrivals: "Late Arrivals",
      thisWeek: "This week",
      checkInNow: "Check In",
      checkOutNow: "Check Out",
      confirmCheckIn: "Confirm Check-In",
      confirmCheckOut: "Confirm Check-Out",
      checkedInAt: "Checked in at",
      attendanceComplete: "Attendance Complete",
      todaysSessions: "Today's Sessions",
      markAttendancePerSession: "Mark attendance per session",
      markPresent: "Mark Present",
      recentAttendanceHistory: "Recent Attendance History",
      date: "Date",
      checkInTime: "Check-In",
      checkOut: "Check-Out",
      checkInRecorded: "Check-in recorded successfully",
      checkOutRecorded: "Check-out recorded successfully",
      sessionAttendanceMarked: "Session attendance marked",
      attendanceDataFailed: "Failed to load teacher attendance data.",
      refresh: "Refresh",
      scanQrCheckIn: "Scan QR Check-In",
      scanQrCheckOut: "Scan QR Check-Out",
      manualSubmit: "Manual Submit",
      teacherQrScanSub: "Scanning will submit this teacher attendance action as QR verified.",
      cameraUnavailable: "Camera unavailable. Please allow camera access and try again.",
      requestPermission: "Request Permission",
      requestPermissionSub: "Submit a day or time permission request for admin review",
      session: "Session",
      wholeDayOrCustomTime: "Whole day or custom time",
      permissionType: "Permission Type",
      full_day: "Full Day",
      late_arrival: "Late Arrival",
      early_leave: "Early Leave",
      custom_time: "Custom Time",
      from: "From",
      to: "To",
      reason: "Reason",
      send: "Send",
      permissionReasonPlaceholder: "Explain the reason for this permission request...",
      permissionReasonRequired: "Please provide a reason for the permission request.",
      permissionRequestSent: "Permission request sent for review.",
      permissionRequestFailed: "Failed to submit permission request.",
      cancel: "Cancel",
      in: "In:",
      out: "Out:",
    },
    kh: {
      dashboard: "ទិដ្ឋភាពទូទៅនៃស្ថិតិ",
      sessions: "សម័យសិក្សា",
      students: "បញ្ជីឈ្មោះនិស្សិត",
      history: "ប្រវត្តិនៃការសិក្សា",
      active: "កំពុងសិក្សា",
      scheduled: "កម្មវិធីខាងមុខ",
      completed: "បានបញ្ចប់",
      attendance: "កម្រិតវត្តមាន",
      riskIndex: "ស្ថានភាពសិក្សា",
      cohortDensity: "ចំនួននិស្សិតតាមថ្នាក់",
      logout: "ចាកចេញពីប្រព័ន្ធ",
      loginAsTeacher: "គណនីសាស្ត្រាចារ្យ",
      loginAsStudent: "គណនីនិស្សិត",
      studentId: "អត្តសញ្ញាណនិស្សិត",
      checkIn: "បញ្ជាក់វត្តមាន",
      present: "មានវត្តមាន",
      absent: "អវត្តមាន",
      late: "មកយឺត",
      excused: "សំុច្បាប់",
      academicMastery: "វឌ្ឍនភាពសិក្សា",
      meanPresence: "វត្តមានមធ្យម",
      sessionQuotas: "ចំនួនវគ្គសិក្សា",
      searchStudent: "ស្វែងរកអត្តសញ្ញាណ...",
      liveMonitor: "ការត្រួតពិនិត្យផ្ទាល់",
      qrToken: "កូដ QR",
      attendanceList: "បញ្ជីវត្តមាន",
      manualEntry: "បញ្ចូលដោយដៃ",
      exportReport: "ទាញយកទិន្នន័យ",
      restrictedAccess: "ការចូលប្រើត្រូវបានកម្រិត",
      sessionReady: "វគ្គសិក្សារួចរាល់",
      liveDiagnostics: "វិភាគស្ថានភាពផ្ទាល់",
      status: "ស្ថានភាព",
      room: "បន្ទប់",
      searchPlaceholder: "ស្វែងរកតាមអត្តសញ្ញាណ...",
      welcomeBack: "សូមស្វាគមន៍ត្រឡប់មកវិញ",
      liveNow: "កំពុងបន្តផ្ទាល់",
      remaining: "វគ្គសិក្សានៅសល់",
      subjectPortfolio: "កម្រងមុខវិជ្ជាសិក្សា",
      scanningQr: "កំពុងស្កែនកូដ QR",
      alignQr: "សូមតម្រង់កូដ QR ក្នុងប្រអប់ដើម្បីចុះវត្តមាន",
      verifyingIdentity: "កំពុងផ្ទៀងផ្ទាត់...",
      sessionQuotasLabel: "កូតាវគ្គសិក្សា",
      lightMode: "របៀបពន្លឺ",
      darkMode: "របៀបងងឹត",
      academicOS: "ប្រព័ន្ធប្រតិបត្តិការសិក្សា",
      intelligenceDashboard: "ផ្ទាំងវិភាគទិន្នន័យ",
      dashboardSub: "ការយល់ដឹងពីក្រុមនិស្សិត និងការត្រួតពិនិត្យជាក់ស្តែង",
      gatheringIntelligence: "កំពុងទាញយកទិន្នន័យសិក្សា...",
      activeSessions: "សម័យសិក្សាបច្ចុប្បន្ន",
      viewAll: "មើលប័ណ្ណសារទាំងអស់",
      riskIntelligence: "របាយការណ៍ហានិភ័យ",
      fullReport: "របាយការណ៍ពេញលេញ",
      recentSessions: "សម័យសិក្សាថ្មីៗ",
      noData: "មិនមានទិន្នន័យថ្មីៗក្នុងមូលដ្ឋានទិន្នន័យឡើយ",
      presentCount: "វត្តមាន",
      activeStudentsSub: "ចំនួននិស្សិតសកម្មក្នុងក្រុមរបស់អ្នក",
      interventionSub: "និស្សិតដែលត្រូវការការយកចិត្តទុកដាក់",
      engagementVelocity: "សន្ទស្សន៍នៃការចូលរួម",
      avgParticipationSub: "ការចូលរួមជាមធ្យម",
      systemLive: "ប្រព័ន្ធកំពុងដំណើរការ",
      attendanceLedger: "បញ្ជីវត្តមានលម្អិត",
      historyAnalyticsSub: "ប្រវត្តិ និងការវិភាគរៀបរាប់ពេញលេញ",
      syncingData: "កំពុងធ្វើសមកាលកម្មទិន្នន័យ...",
      accountVerified: "បានផ្ទៀងផ្ទាត់គណនី",
      totalClasses: "ថ្នាក់រៀនសរុប",
      sessionTimeline: "ពេលវេលាសម័យសិក្សា",
      all: "ទាំងអស់",
      noRecordsFound: "មិនមានទិន្នន័យកំណត់ត្រាឡើយ",
      noRecordsFoundSub: "សូមព្យាយាមប្តូរការច្រោះ ឬត្រលប់មកវិញពេលក្រោយ។",
      cameraCheckIn: "ស្កែនដោយកាមេរ៉ា",
      typeStudentCode: "វាយបញ្ចូលកូដនិស្សិត",
      weeklyTrends: "និន្នាការប្រចាំសប្តាហ៍",
      subjectPerformance: "លទ្ធផលតាមមុខវិជ្ជា",
      quickActions: "សកម្មភាពរហ័ស",
      directory: "បញ្ជីឈ្មោះនិស្សិត",
      excellent: "ល្អណាស់! គ្មាននិស្សិតណាដែលមានវត្តមានទាបជាង ៧៥% ឡើយ។",
      na: "មិនមាន",
      unknown: "មិនស្គាល់",
      viewAllArchive: "មើលប័ណ្ណសារទាំងអស់",
      academicEcosystem: "ប្រព័ន្ធសិក្សាអប់រំ",
      selectPortal: "សូមជ្រើសរើសច្រកចូលដើម្បីបន្ត",
      facultyAdminAccess: "ការចូលប្រើសម្រាប់សាស្ត្រាចារ្យ និងរដ្ឋបាល",
      studentParentPortal: "ការចូលប្រើសម្រាប់និស្សិត",
      backToSelection: "ត្រឡប់ទៅការជ្រើសរើសវិញ",
      loginAs: "ចូលប្រើជា",
      emailIdentity: "អាសយដ្ឋានអ៊ីមែល",
      securityKey: "លេខសម្ងាត់សុវត្ថិភាព",
      authorizeConnectivity: "ចូលប្រើប្រព័ន្ធ",
      studentDirectory: "បញ្ជីឈ្មោះនិស្សិត",
      studentDirectorySub: "ឃ្លាំងប្រមូលផ្តុំនៃវត្តមានសិក្សារបស់និស្សិត",
      studentIdentity: "អត្តសញ្ញាណនិស្សិត",
      efficiency: "ប្រសិទ្ធភាព",
      healthStatus: "ស្ថានភាពសិក្សា",
      action: "សកម្មភាព",
      noResultsFound: "រកមិនឃើញលទ្ធផលក្នុងលិបិក្រមសិក្សារបស់យើងទេ។",
      backToDirectory: "ត្រឡប់ទៅបញ្ជីឈ្មោះវិញ",
      mappingEcosystem: "កំពុងរៀបចំទិន្នន័យនិស្សិត...",
      historicalTimeline: "ប្រវត្តិពេលវេលា",
      subjectDate: "មុខវិជ្ជា / កាលបរិច្ឆេទ",
      decryptingLogs: "កំពុងទាញយកកំណត់ត្រា...",
      noHistoricalData: "មិនមានទិន្នន័យប្រវត្តិសម្រាប់អង្គភាពនេះទេ។",
      generateIntervention: "បង្កើតរបាយការណ៍អន្តរាគមន៍",
      viewMetadata: "មើលទិន្នន័យអ្នកប្រើប្រាស់",
      major: "ជំនាញ",
      classGroup: "ក្រុមសិក្សា",

      noSessionsFound: "មិនមានសម័យសិក្សាក្នុងប្រេកង់នេះទេ។",
      retrievingSessions: "កំពុងទាញយកប័ណ្ណសារសម័យសិក្សា...",
      loadingFeed: "កំពុងទាញយកទិន្នន័យបន្តផ្ទាល់...",
      manualEntryDescription:
        "ចំណាំនិស្សិតថាមានវត្តមានតាមរយៈកូដសិក្សាឡែករបស់ពួកគេ។",
      department: "ដេប៉ាតឺម៉ង់",
      classDirectory: "បញ្ជីថ្នាក់រៀន",
      classDirectorySub: "ជ្រើសរើសថ្នាក់ដើម្បីមើលបញ្ជីឈ្មោះនិស្សិត",
      backToClasses: "ត្រឡប់ទៅបញ្ជីថ្នាក់វិញ",
      searchClasses: "ស្វែងរកថ្នាក់...",
      classInfo: "ព័ត៌មានថ្នាក់រៀន",
      studentsCount: "ចំនួននិស្សិត",
      attendanceEfficacy: "ប្រសិទ្ធភាព",
      enrolled: "បានចុះឈ្មោះ",
      loadingStudents: "កំពុងទាញយកបញ្ជីឈ្មោះនិស្សិត...",
      noClassesFound: "មិនមានថ្នាក់រៀនក្នុងបញ្ជីរបស់អ្នកឡើយ។",
      goBack: "ត្រឡប់ក្រោយ",

      noSessionSelected: "មិនមានសម័យសិក្សាដែលបានជ្រើសរើសទេ",
      backToDashboard: "ត្រឡប់ទៅផ្ទាំងគ្រប់គ្រងវិញ",
      refreshIn: "ផ្ទុកឡើងវិញក្នុងរយៈពេល",
      verifyCheckIn: "ផ្ទៀងផ្ទាត់ និងកត់ត្រាវត្តមាន",
      scanAdvice: "តម្រង់កាមេរ៉ាទៅកាន់អេក្រង់របស់គ្រូ",
      confirmAttendance: "បញ្ជាក់វត្តមាន",

      studentIdSub: "ផ្តល់លេខសម្គាល់របស់អ្នកដើម្បីបញ្ជាក់វត្តមាន",
      studentIdPlaceholder: "លេខសម្គាល់និស្សិតរបស់អ្នក",
      sessionIdSub: "សួរគ្រូរបស់អ្នកសម្រាប់លេខសម្គាល់សម័យសិក្សា",
      activeSession: "វគ្គសិក្សាសកម្ម",
      verifying: "កំពុងផ្ទៀងផ្ទាត់...",
      thankYou: "សូមអរគុណ!",
      attendanceSuccess: "ការចុះវត្តមានរបស់អ្នកទទួលបានជោគជ័យ។",
      exit: "ចាកចេញ",
      tryAgain: "ព្យាយាមម្តងទៀត",
      scanAgain: "ស្កែនម្តងទៀត",
      safeToClose: "អ្នកអាចបិទកម្មវិធីរុករកនេះបានឥឡូវនេះ។",
      processComplete: "ដំណើរការត្រូវបានបញ្ចប់!",
      // General Alerts
      loginSuccess: "ចូលប្រព័ន្ធដោយជោគជ័យ!",
      loginFailed: "ការចូលប្រព័ន្ធបរាជ័យ។ សូមពិនិត្យមើលព័ត៌មានរបស់អ្នក។",
      logoutSuccess: "បានចាកចេញពីប្រព័ន្ធដោយជោគជ័យ!",
      actionSuccess: "សកម្មភាពបានបញ្ចប់ដោយជោគជ័យ!",
      actionFailed: "បរាជ័យសកម្មភាព។ សូមព្យាយាមម្តងទៀត។",
      attendanceMarked: "បានកត់ត្រាវត្តមានដោយជោគជ័យ!",
      attendanceFailed: "បរាជ័យក្នុងការកត់ត្រាវត្តមាន។",
      manualAttendanceExcusedBlocked:
      "ចុមចង់ Fake វត្តមានមែនសិស្សមិនមកដាក់មក🤺 ផ្មោងលូវហើយ☝🏼",
        // "និស្សិតនេះមានច្បាប់អនុញ្ញាតរួចហើយ ដូច្នេះមិនអាចកត់ត្រាវត្តមានដោយដៃបានទេ។",
      sessionUpdated: "វគ្គសិក្សាត្រូវបានធ្វើបច្ចុប្បន្នភាពដោយជោគជ័យ!",
      dataExported: "ទិន្នន័យត្រូវបានបញ្ចេញដោយជោគជ័យ!",
      location: "កម្មវិធីតាមដានទីតាំង",
      attendanceVerification: "ការផ្ទៀងផ្ទាត់វត្តមាន",
      campusBoundaryVerif:
        "ទីតាំងរបស់អ្នកនឹងត្រូវបានផ្ទៀងផ្ទាត់ជាមួយបរិវេណសាលា HRU។",
      verifyLocation: "ផ្ទៀងផ្ទាត់ទីតាំងបច្ចុប្បន្ន",
      locating: "កំពុងស្វែងរកទីតាំង...",
      verifiedOnCampus: "បានផ្ទៀងផ្ទាត់នៅក្នុងបរិវេណសាលា",
      verificationFailed: "ការផ្ទៀងផ្ទាត់បានបរាជ័យ",
      campusDistance: "ចម្ងាយពីសាលា",
      accuracy: "ភាពត្រឹមត្រូវ",
      outsideCampusWarning:
        "វត្តមានត្រូវបានអនុញ្ញាតក្នុងរង្វង់ ៥០០ ម៉ែត្រពីកណ្តាលសាលាប៉ុណ្ណោះ។",
      openMapTracking: "បើកការតាមដានលើផែនទី",
      secureUplink: "ការបញ្ជូនទិន្នន័យវត្តមានដែលមានសុវត្ថិភាព",
      lowAccuracyNote:
        " (សម្គាល់៖ ភាពត្រឹមត្រូវនៃទីតាំងរបស់អ្នកទាបណាស់។ សូមព្យាយាមបើក GPS ឬប្រើទូរស័ព្ទដៃ។)",
      outsideRadiusError:
        " (កំហុស៖ អ្នកស្ថិតនៅក្រៅកាំបរិវេណសាលា HRU ដែលបានអនុញ្ញាត។)",
      viewCampusMap: "មើលផែនទីសាលា",
      liveIntelligence: "ព័ត៌មានជាក់ស្តែង",
      uplinkTime: "ពេលវេលាបញ្ជូន",
      outsideCampus: "នៅក្រៅបរិវេណសាលា",
      distance: "ចម្ងាយ",
      precision: "ភាពច្បាស់លាស់",
      tooManyAttempts: "ការប៉ុនប៉ងច្រើនពេក។ សូមរង់ចាំមួយភ្លែត។",
      verification: "ការផ្ទៀងផ្ទាត់",
      ready: "រួចរាល់",
      verified: "បានផ្ទៀងផ្ទាត់",
      warning: "ការព្រមាន",
      good: "ល្អ",
      critical: "ការព្រមានកម្រិតខ្ពស់",
      enableGpsAdvice:
        "សូមបើក GPS និងអនុញ្ញាតការចូលប្រើទីតាំង ដើម្បីបញ្ចប់ការចុះវត្តមានរបស់អ្នក។",
      inputScore: "បញ្ចូលពិន្ទុ",
      midtermScore: "ពាក់កណ្តាលមាស (១៥%)",
      assignmentScore: "កិច្ចការ (១៥%)",
      finalScore: "ប្រឡងបញ្ចប់ (៥០%)",
      saveScore: "រក្សាទុកលទ្ធផល",
      scoreSuccess: "បានធ្វើបច្ចុប្បន្នភាពពិន្ទុជោគជ័យ",
      scoring: "ការដាក់ពិន្ទុ",
      selectAssignment: "ជ្រើសរើសមុខវិជ្ជា/ឆមាស",
      attendanceScore: "វត្តមាន (២០%)",
      myAttendance: "វត្តមានរបស់ខ្ញុំ",
      teacherAttendanceSub: "កត់ត្រា និងតាមដានវត្តមានប្រចាំថ្ងៃរបស់អ្នក",
      currentTime: "ពេលវេលាបច្ចុប្បន្ន",
      thisMonth: "ខែនេះ",
      daysPresent: "ថ្ងៃមានវត្តមាន",
      attendanceRate: "អត្រាវត្តមាន",
      pastFiveDays: "៥ ថ្ងៃចុងក្រោយ",
      lateArrivals: "ការមកយឺត",
      thisWeek: "សប្តាហ៍នេះ",
      checkInNow: "ចុះវត្តមានចូល",
      checkOutNow: "ចុះវត្តមានចេញ",
      confirmCheckIn: "បញ្ជាក់ការចូល",
      confirmCheckOut: "បញ្ជាក់ការចេញ",
      checkedInAt: "បានចូលនៅម៉ោង",
      attendanceComplete: "វត្តមានបានបញ្ចប់",
      todaysSessions: "វគ្គសិក្សាថ្ងៃនេះ",
      markAttendancePerSession: "កត់ត្រាវត្តមានតាមវគ្គ",
      markPresent: "កត់ត្រាមានវត្តមាន",
      recentAttendanceHistory: "ប្រវត្តិវត្តមានថ្មីៗ",
      date: "កាលបរិច្ឆេទ",
      checkInTime: "ចូល",
      checkOut: "ចេញ",
      checkInRecorded: "បានកត់ត្រាការចូលដោយជោគជ័យ",
      checkOutRecorded: "បានកត់ត្រាការចេញដោយជោគជ័យ",
      sessionAttendanceMarked: "បានកត់ត្រាវត្តមានវគ្គសិក្សា",
      attendanceDataFailed: "បរាជ័យក្នុងការទាញយកទិន្នន័យវត្តមានគ្រូ",
      refresh: "ផ្ទុកឡើងវិញ",
      scanQrCheckIn: "ស្កែន QR ដើម្បីចូល",
      scanQrCheckOut: "ស្កែន QR ដើម្បីចេញ",
      manualSubmit: "បញ្ជូនដោយដៃ",
      teacherQrScanSub: "ការស្កែននឹងបញ្ជូនសកម្មភាពវត្តមានគ្រូជា QR verified។",
      cameraUnavailable: "មិនអាចប្រើកាមេរ៉ាបានទេ។ សូមអនុញ្ញាតកាមេរ៉ា ហើយព្យាយាមម្តងទៀត។",
      requestPermission: "ស្នើសុំការអនុញ្ញាត",
      requestPermissionSub: "ដាក់សំណើអនុញ្ញាតតាមថ្ងៃ ឬពេលវេលា សម្រាប់រដ្ឋបាលពិនិត្យ",
      session: "វគ្គសិក្សា",
      wholeDayOrCustomTime: "ពេញមួយថ្ងៃ ឬពេលវេលាផ្ទាល់ខ្លួន",
      permissionType: "ប្រភេទការអនុញ្ញាត",
      full_day: "ពេញមួយថ្ងៃ",
      late_arrival: "មកយឺត",
      early_leave: "ចេញមុន",
      custom_time: "ពេលវេលាផ្ទាល់ខ្លួន",
      from: "ពី",
      to: "ដល់",
      reason: "មូលហេតុ",
      send: "ផ្ញើ",
      permissionReasonPlaceholder: "ពន្យល់មូលហេតុសម្រាប់សំណើអនុញ្ញាតនេះ...",
      permissionReasonRequired: "សូមបញ្ចូលមូលហេតុសម្រាប់សំណើអនុញ្ញាត។",
      permissionRequestSent: "បានផ្ញើសំណើអនុញ្ញាតសម្រាប់ពិនិត្យ។",
      permissionRequestFailed: "បរាជ័យក្នុងការផ្ញើសំណើអនុញ្ញាត។",
      cancel: "បោះបង់",
      in: "ចូល:",
      out: "ចេញ:",
    },
  };

  const t = (key) => translations[lang]?.[key] || key;

  const triggerAlert = (key) => {
    alert(t(key));
  };

  const toggleLang = () => setLang((prev) => (prev === "en" ? "kh" : "en"));
  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <AppContext.Provider
      value={{
        lang,
        toggleLang,
        theme,
        toggleTheme,
        user,
        setUser,
        loading,
        login,
        logout,
        branding,
        t,
        triggerAlert,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
