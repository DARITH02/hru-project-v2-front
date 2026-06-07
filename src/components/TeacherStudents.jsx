import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import {
  Users,
  Search,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Clock,
  Activity,
  UserCircle,
  Loader2,
  History,
  BookOpen,
  Award,
  Save,
  X,
  Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export const TeacherStudents = () => {
  const { t, triggerAlert } = useApp();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentHistory, setStudentHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const fetchClasses = async () => {
    try {
      const res = await api.get('/teacher/classes');
      setClasses(res.data || []);
    } catch (err) {
      console.error("Failed to fetch classes", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsByClass = async (classId) => {
    setLoadingStudents(true);
    try {
      const res = await api.get(`/teacher/classes/${classId}/students`);
      setStudents(res.data || []);
    } catch (err) {
      console.error("Failed to fetch students for class", err);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleClassSelect = (cls) => {
    setSelectedClass(cls);
    fetchStudentsByClass(cls.id);
  };

  const fetchStudentDetail = async (studentId) => {
    setLoadingHistory(true);
    try {
      const res = await api.get(`/teacher/students/${studentId}/detail`);
      setStudentHistory(res.data);
    } catch (err) {
      console.error("Failed to fetch student history", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    fetchStudentDetail(student.id);
  };

  const filteredStudents = (students || []).filter(s =>
    (s.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (s.student_code || '').includes(searchQuery)
  );

  const filteredClasses = (classes || []).filter(c =>
    (c.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (c.code || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-accent-muted">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="animate-pulse">{t('mappingEcosystem')}</p>
      </div>
    );
  }

  // 1️⃣ STUDENT DETAIL VIEW
  if (selectedStudent) {
    return (
      <div className="space-y-8">
        <button
          onClick={() => {
            setSelectedStudent(null);
            setStudentHistory(null);
          }}
          className="flex items-center gap-2 text-accent-muted hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('backToDirectory')}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-8">
            <div className="glass p-8 rounded-[2.5rem] text-center border border-black/5 dark:border-white/10 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl rounded-full -mr-16 -mt-16 animate-pulse" />
              <div className="w-28 h-28 rounded-3xl bg-linear-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center mx-auto mb-6 text-4xl font-black shadow-2xl shadow-blue-600/30 ring-4 ring-white/10 dark:ring-black/10">
                {(studentHistory?.student?.user?.name || selectedStudent.name || 'S')[0]}
              </div>
              <h3 className="text-2xl font-black mb-1 text-blue-600 dark:text-blue-400 font-outfit uppercase tracking-tight">
                {studentHistory?.student?.user?.name || selectedStudent.name}
              </h3>
              <p className="text-accent-muted font-mono text-xs uppercase tracking-[0.2em] mb-8 py-1 px-3 bg-black/5 dark:bg-white/5 rounded-lg w-max mx-auto border border-black/5 dark:border-white/5">
                {studentHistory?.student?.student_code || selectedStudent.student_code}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="glass bg-black/5 dark:bg-white/5 p-5 rounded-3xl border border-white/5 shadow-inner">
                  <p className={cn(
                    "text-2xl font-black font-mono tracking-tighter",
                    (studentHistory?.stats?.attendance_rate || selectedStudent.attendance_percentage) > 85 ? "text-green-500" :
                      (studentHistory?.stats?.attendance_rate || selectedStudent.attendance_percentage) > 70 ? "text-yellow-500" : "text-red-500"
                  )}>
                    {studentHistory?.stats?.attendance_rate || selectedStudent.attendance_percentage}%
                  </p>
                  <p className="text-[9px] text-accent-muted uppercase font-bold tracking-widest mt-1 opacity-70">{t('attendance')}</p>
                </div>
                <div className="glass bg-black/5 dark:bg-white/5 p-5 rounded-3xl border border-white/5 shadow-inner">
                  <p className={cn(
                    "text-lg font-black uppercase tracking-tight",
                    (studentHistory?.student?.status || selectedStudent.status) === 'Warning' ? "text-red-500" :
                      (studentHistory?.student?.status || selectedStudent.status) === 'Excellent' ? "text-green-500" : "text-blue-500"
                  )}>
                    {t((studentHistory?.student?.status || selectedStudent.status)?.toLowerCase()) || (studentHistory?.student?.status || selectedStudent.status)}
                  </p>
                  <p className="text-[9px] text-accent-muted uppercase font-bold tracking-widest mt-1 opacity-70">{t('healthStatus')}</p>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-black/10 dark:border-white/10 space-y-5">
                <div className="flex flex-col items-start gap-1">
                  <span className="text-[10px] text-accent-muted uppercase font-bold tracking-[0.15em]">{t('studentId')}</span>
                  <span className="font-mono text-sm text-accent bg-black/5 dark:bg-white/5 py-1.5 px-3 rounded-lg w-full text-left border border-black/5 dark:border-white/5">
                    {studentHistory?.student?.student_code || selectedStudent.student_code}
                  </span>
                </div>
                <div className="flex flex-col items-start gap-1">
                  <span className="text-[10px] text-accent-muted uppercase font-bold tracking-[0.15em]">{t('major')}</span>
                  <span className="font-bold text-sm text-accent leading-tight text-left">
                    {studentHistory?.student?.major?.name || selectedStudent.major?.name || t('unknown')}
                  </span>
                </div>
                <div className="flex flex-col items-start gap-1">
                  <span className="text-[10px] text-accent-muted uppercase font-bold tracking-[0.15em]">{t('classGroup')}</span>
                  <span className="font-bold text-sm text-accent">
                    {studentHistory?.student?.group?.name || selectedStudent.group?.name || t('unknown')}
                  </span>
                </div>
                <div className="flex flex-col items-start gap-1">
                  <span className="text-[10px] text-accent-muted uppercase font-bold tracking-[0.15em]">{t('department')}</span>
                  <span className="font-bold text-sm text-accent text-left">
                    {studentHistory?.student?.major?.department?.name || selectedStudent.major?.department?.name || selectedStudent.department?.name || t('unknown')}
                  </span>
                </div>
              </div>
            </div>

            <div className="glass p-6 rounded-3xl space-y-4">
              <h4 className="font-semibold text-sm uppercase tracking-widest text-accent-muted">{t('quickActions')}</h4>
              <div className="grid grid-cols-1 gap-2">
                <button className="glass glass-hover p-4 rounded-xl text-left flex items-center gap-3">
                  <Activity className="w-4 h-4 text-accent-muted" />
                  <span className="text-sm">{t('generateIntervention')}</span>
                </button>
                <button className="glass glass-hover p-4 rounded-xl text-left flex items-center gap-3">
                  <UserCircle className="w-4 h-4 text-accent-muted" />
                  <span className="text-sm">{t('viewMetadata')}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <History className="w-5 h-5 text-accent-muted" />
              {t('historicalTimeline')}
            </h3>

            <div className="glass rounded-[2rem] shadow-2xl relative border border-black/5 dark:border-white/5 overflow-hidden max-h-[700px] flex flex-col">
              <div className="overflow-y-auto flex-1 custom-scrollbar scroll-smooth">
                <table className="w-full text-left border-collapse relative">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-md">
                      <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-accent-muted font-bold">{t('subjectDate')}</th>
                      <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-accent-muted font-bold">{t('status')}</th>
                      <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-accent-muted font-bold">{t('checkIn')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {loadingHistory ? (
                      <tr>
                        <td colSpan="3" className="px-6 py-10 text-center text-accent-muted">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                          <span>{t('decryptingLogs')}</span>
                        </td>
                      </tr>
                    ) : studentHistory?.history?.map((record, i) => (
                      <tr key={i} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium">
                            {typeof record.subject === 'object' ? (record.subject?.name || t('unknown')) : (record.subject || t('unknown'))}
                          </p>
                          <p className="text-[10px] text-accent-muted flex items-center gap-1 mt-1 uppercase tracking-tighter self-start font-mono">
                            <Calendar className="w-3 h-3" /> {new Date(record.date).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase",
                            record.status?.toUpperCase() === 'PRESENT' ? "bg-green-500/10 text-green-500" : 
                            record.status?.toUpperCase() === 'LATE' ? "bg-yellow-500/10 text-yellow-500" :
                            record.status?.toUpperCase() === 'SCHEDULED' ? "bg-blue-600/10 text-blue-600" : "bg-red-500/10 text-red-500"
                          )}>
                            {record.status?.toUpperCase() === 'SCHEDULED' ? (t('scheduled') || 'Scheduled') : (t(record.status?.toLowerCase()) || record.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-accent-muted font-mono">
                          {record.status?.toUpperCase() === 'SCHEDULED' ? (
                             <span className="flex items-center gap-1.5 text-[9px] font-black text-yellow-500 animate-pulse uppercase tracking-widest">
                               <Clock className="w-3 h-3" />
                               {t('waiting') || 'WAITING...'}
                             </span>
                          ) : (
                            <>
                              {record.scan_time || '—'}
                              <p className="text-[9px] uppercase tracking-tighter opacity-70">{record.method}</p>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!loadingHistory && (!studentHistory?.history || studentHistory.history.length === 0) && (
                <div className="p-14 text-center text-accent-muted">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-sm">{t('noHistoricalData')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2️⃣ STUDENT LIST VIEW (Within a class)
  if (selectedClass) {
    return (
      <div className="space-y-8 pb-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <button
              onClick={() => setSelectedClass(null)}
              className="flex items-center gap-2 text-accent-muted hover:text-blue-600 transition-colors mb-4 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('backToClasses') || 'Back to Classes'}
            </button>
            <h2 className="text-3xl font-bold tracking-tight">{selectedClass.name}</h2>
            <p className="text-accent-muted">{selectedClass.group_name} • {selectedClass.total_students_count} {t('students')}</p>
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="relative w-full md:w-[320px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-muted" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-blue-600 transition-all shadow-xl shadow-black/5"
              />
            </div>
          </div>
        </header>

        <div className="glass rounded-[2.5rem] overflow-hidden border border-black/5 dark:border-white/10 shadow-2xl relative min-h-[400px]">
          {loadingStudents ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/50 dark:bg-black/50 backdrop-blur-sm z-20">
               <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
               <p className="text-sm font-medium text-accent-muted animate-pulse">{t('loadingStudents') || 'Accessing Student Directory...'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5">
                    <th className="px-8 py-6 text-[10px] uppercase tracking-[0.2em] text-accent-muted font-bold text-left">{t('studentIdentity')}</th>
                    <th className="px-8 py-6 text-[10px] uppercase tracking-[0.2em] text-accent-muted font-bold text-center">{t('efficiency')}</th>
                    <th className="px-8 py-6 text-[10px] uppercase tracking-[0.2em] text-accent-muted font-bold text-left">{t('healthStatus')}</th>
                    <th className="px-8 py-6 text-[10px] uppercase tracking-[0.2em] text-accent-muted font-bold text-right">{t('action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {filteredStudents.map((student, i) => (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="group hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-300 cursor-pointer"
                      onClick={() => handleStudentSelect(student)}
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-600/20 to-blue-600/5 dark:from-blue-400/20 dark:to-blue-400/5 flex items-center justify-center text-xl font-black text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-lg shadow-blue-600/5 group-hover:shadow-blue-600/20 border border-blue-600/10">
                            {(student.name || 'S')[0]}
                          </div>
                          <div className="text-left space-y-0.5">
                            <p className="font-black text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-tight transition-colors">{student.name}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-accent-muted font-mono tracking-wider tabular-nums px-1.5 py-0.5 bg-black/5 dark:bg-white/5 rounded border border-black/5 dark:border-white/5">{student.student_code}</span>
                              <span className="text-[9px] uppercase font-bold text-accent-muted/60 tracking-widest">•</span>
                              <span className="text-[10px] font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-tighter">{student.group?.name || t('unknown')}</span>
                            </div>
                            <p className="text-[10px] text-accent-muted font-medium uppercase tracking-tight opacity-80 truncate max-w-[200px]">
                              {student.major?.name || t('unknown')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col items-center gap-2">
                          <span className={cn(
                            "text-xl font-black font-mono tracking-tighter",
                            student.attendance_percentage > 85 ? "text-green-500" : (student.attendance_percentage > 70 ? "text-yellow-500" : "text-red-500")
                          )}>{student.attendance_percentage}%</span>
                          <div className="w-28 bg-black/5 dark:bg-white/10 h-1.5 rounded-full overflow-hidden shadow-inner border border-black/5 dark:border-white/5">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${student.attendance_percentage}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className={cn(
                                "h-full shadow-lg",
                                student.attendance_percentage > 85 ? "bg-green-500 shadow-green-500/20" :
                                  (student.attendance_percentage > 70 ? "bg-yellow-500 shadow-yellow-500/20" : "bg-red-500 shadow-red-500/20")
                              )}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={cn(
                          "px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] border shadow-sm transition-all duration-500",
                          student.attendance_percentage > 85 ? "bg-green-500/10 text-green-500 border-green-500/20" :
                            student.attendance_percentage > 70 ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" : 
                            student.attendance_percentage > 50 ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                        )}>
                          {student.attendance_percentage > 85 ? (t('excellent') || 'Excellent') : 
                           student.attendance_percentage > 70 ? (t('good') || 'Good') : 
                           student.attendance_percentage > 50 ? (t('warning') || 'Warning') : (t('critical') || 'Critical Warning')}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="glass p-3 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm border border-black/5 dark:border-white/5">
                            <ChevronRight className="w-5 h-5 opacity-40 group-hover:opacity-100" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loadingStudents && filteredStudents.length === 0 && (
            <div className="p-20 text-center text-accent-muted">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">{t('noResultsFound')}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3️⃣ CLASS LIST VIEW (Default)
  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('classDirectory') || 'Class Directory'}</h2>
          <p className="text-accent-muted">{t('classDirectorySub') || 'Select a class to view its students'}</p>
        </div>
        <div className="relative w-full md:w-[320px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-muted" />
          <input
            type="text"
            placeholder={t('searchClasses') || 'Search classes...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-blue-600 transition-all shadow-xl shadow-black/5"
          />
        </div>
      </header>

      <div className="glass rounded-[2.5rem] overflow-hidden border border-black/5 dark:border-white/10 shadow-2xl relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5">
                <th className="px-8 py-6 text-[10px] uppercase tracking-[0.2em] text-accent-muted font-bold text-left">{t('classInfo') || 'Class Information'}</th>
                <th className="px-8 py-6 text-[10px] uppercase tracking-[0.2em] text-accent-muted font-bold text-center">{t('studentsCount') || 'Students'}</th>
                <th className="px-8 py-6 text-[10px] uppercase tracking-[0.2em] text-accent-muted font-bold text-center">{t('attendanceEfficacy') || 'Efficacy'}</th>
                <th className="px-8 py-6 text-[10px] uppercase tracking-[0.2em] text-accent-muted font-bold text-right">{t('action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {filteredClasses.map((cls, i) => (
                <motion.tr
                  key={cls.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="group hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-300 cursor-pointer"
                  onClick={() => handleClassSelect(cls)}
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-600/20 to-blue-600/5 dark:from-blue-400/20 dark:to-blue-400/5 flex items-center justify-center text-xl font-black text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-lg shadow-blue-600/5 group-hover:shadow-blue-600/20 border border-blue-600/10">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div className="text-left space-y-0.5">
                        <p className="font-black text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-tight transition-colors">{cls.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-accent-muted font-mono tracking-wider tabular-nums px-1.5 py-0.5 bg-black/5 dark:bg-white/5 rounded border border-black/5 dark:border-white/5">{cls.code}</span>
                          <span className="text-[9px] uppercase font-bold text-accent-muted/60 tracking-widest">•</span>
                          <span className="text-[10px] font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-tighter">{cls.group_name}</span>
                        </div>
                        <p className="text-[10px] text-accent-muted font-medium uppercase tracking-tight opacity-80">
                           Room {cls.room} • {cls.schedule}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col items-center">
                      <span className="text-xl font-black font-mono tracking-tighter text-accent flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-accent-muted" />
                        {cls.total_students_count}
                      </span>
                      <p className="text-[9px] text-accent-muted uppercase font-bold tracking-widest mt-1 opacity-70">{t('enrolled') || 'Enrolled'}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col items-center gap-2">
                      <span className={cn(
                        "text-xl font-black font-mono tracking-tighter",
                        cls.efficacy > 85 ? "text-green-500" : (cls.efficacy > 70 ? "text-yellow-500" : "text-red-500")
                      )}>{cls.efficacy}%</span>
                      <div className="w-24 bg-black/5 dark:bg-white/10 h-1 rounded-full overflow-hidden shadow-inner border border-black/5 dark:border-white/5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${cls.efficacy}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={cn(
                            "h-full shadow-lg",
                            cls.efficacy > 85 ? "bg-green-500 shadow-green-500/20" :
                              (cls.efficacy > 70 ? "bg-yellow-500 shadow-yellow-500/20" : "bg-red-500 shadow-red-500/20")
                          )}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/scores/${cls.id}`); }}
                        className="glass p-3 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-black/5 dark:border-white/5 group/score"
                        title={t('enterScore') || 'Enter Scores'}
                      >
                        <Award className="w-5 h-5 opacity-40 group-hover/score:opacity-100" />
                      </button>
                      <button className="glass p-3 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm border border-black/5 dark:border-white/5">
                        <ChevronRight className="w-5 h-5 opacity-40 group-hover:opacity-100" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredClasses.length === 0 && (
          <div className="p-20 text-center text-accent-muted">
            <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">{t('noClassesFound') || 'No classes found'}</p>
          </div>
        )}
      </div>

    </div>
  );
};

