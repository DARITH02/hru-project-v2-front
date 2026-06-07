import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Save,
  Loader2,
  Award,
  BookOpen,
  FileDown,
  ArrowLeft,
  Download
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export const TeacherScores = () => {
  const { t, triggerAlert } = useApp();
  const navigate = useNavigate();
  const { classId } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [classInfo, setClassInfo] = useState(null);
  
  // scores state: { [studentId]: { attendance_score: '', midterm_score: '', assignment_score: '', final_score: '' } }
  const [scores, setScores] = useState({});
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch class info (we can get it from students endpoint or class list)
        const classRes = await api.get('/teacher/classes');
        const foundClass = classRes.data?.find(c => c.id == classId);
        if (foundClass) setClassInfo(foundClass);

        // Fetch assignments
        const assigRes = await api.get('/teacher/semesters');
        const classAssignments = (assigRes.data?.data || []).filter(a => a.class_id == classId);
        setAssignments(classAssignments);
        
        if (classAssignments.length > 0) {
          setSelectedAssignmentId(classAssignments[0].id);
        }

        // Fetch students
        const stuRes = await api.get(`/teacher/classes/${classId}/students`);
        setStudents(stuRes.data || []);
      } catch (err) {
        console.error("Failed to load scoring data", err);
      } finally {
        setLoading(false);
      }
    };
    if (classId) fetchData();
  }, [classId]);

  // Fetch scores when assignment changes
  useEffect(() => {
    const fetchScores = async () => {
      if (!selectedAssignmentId) return;
      try {
        const res = await api.get(`/teacher/semesters/${selectedAssignmentId}/student-scores`);
        if (res.data.success) {
          const fetchedScores = res.data.data || [];
          const newScores = {};
          fetchedScores.forEach(s => {
            newScores[s.student_id] = {
              attendance_score: s.attendance_score || 0,
              midterm_score: s.midterm_score || '',
              assignment_score: s.assignment_score || '',
              final_score: s.final_score || ''
            };
          });
          setScores(newScores);
        }
      } catch(err) {
        console.error("Failed to fetch existing scores", err);
      }
    };
    fetchScores();
  }, [selectedAssignmentId]);

  const handleScoreChange = (studentId, field, value) => {
    setScores(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { attendance_score: 0, midterm_score: '', assignment_score: '', final_score: '' }),
        [field]: value
      }
    }));
  };

  const handleSaveAll = async () => {
    if (!selectedAssignmentId) {
      triggerAlert('selectAssignment');
      return;
    }

    setSaving(true);
    try {
      const payload = Object.keys(scores).map(studentId => ({
        student_id: studentId,
        attendance_score: parseFloat(scores[studentId].attendance_score) || 0,
        midterm_score: parseFloat(scores[studentId].midterm_score) || 0,
        assignment_score: parseFloat(scores[studentId].assignment_score) || 0,
        final_score: parseFloat(scores[studentId].final_score) || 0,
      }));

      await api.post(`/teacher/semesters/${selectedAssignmentId}/student-scores`, {
        scores: payload
      });
      triggerAlert('scoreSuccess');
    } catch (err) {
      console.error("Failed to save scores", err);
      triggerAlert('actionFailed');
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = async () => {
    if (!selectedAssignmentId) return;
    setExportingPdf(true);
    try {
      const response = await api.get(`/teacher/semesters/${selectedAssignmentId}/export-pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Scores_Report_${classInfo?.name?.replace(/ /g, '_') || 'Class'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error("Failed to export PDF", error);
      triggerAlert('actionFailed');
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-accent-muted">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="animate-pulse">{t('mappingEcosystem') || 'Loading Scoring Data...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <button
            onClick={() => navigate('/students')}
            className="flex items-center gap-2 text-accent-muted hover:text-blue-600 transition-colors mb-4 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToClasses') || 'Back to Directory'}
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center border border-blue-600/20">
               <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{classInfo?.name || 'Class Scores'}</h2>
              <p className="text-accent-muted font-mono text-xs">{classInfo?.code} • {classInfo?.group_name}</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          {assignments.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[9px] uppercase font-bold text-accent-muted/60 tracking-widest pl-1">{t('selectAssignment') || 'Assignment Period'}</span>
              <select
                value={selectedAssignmentId}
                onChange={(e) => setSelectedAssignmentId(e.target.value)}
                className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-600 transition-all shadow-sm min-w-[200px]"
              >
                {assignments.map(a => (
                  <option key={a.id} value={a.id} className="dark:bg-noir-950">
                    {a.class_name} ({a.academic_year} S{a.semester})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              disabled={!selectedAssignmentId || saving || exportingPdf}
              className="bg-blue-600 cursor-pointer text-white py-3 px-6 rounded-2xl shadow-xl shadow-blue-600/20 flex items-center justify-center"
              title={t('exportPdf') || 'Export PDF'}
            >
             {exportingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving || !selectedAssignmentId}
              className="bg-blue-600 cursor-pointer text-white py-3 px-6 rounded-2xl shadow-xl shadow-blue-600/20 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('saveAll') || 'Save All Scores'}
            </button>
          </div>
        </div>
      </header>

      <div className="glass rounded-[2.5rem] overflow-hidden border border-black/5 dark:border-white/10 shadow-2xl relative">
        {students.length === 0 ? (
          <div className="p-20 text-center text-accent-muted">
            <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">{t('noStudentsFound') || 'No students found in this class.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5">
                  <th className="px-6 py-5 text-[10px] uppercase tracking-[0.2em] text-accent-muted font-bold text-center w-16">NO.</th>
                  <th className="px-6 py-5 text-[10px] uppercase tracking-[0.2em] text-accent-muted font-bold text-left">{t('studentIdentity') || 'Student'}</th>
                  <th className="px-6 py-5 text-[10px] uppercase tracking-[0.2em] text-accent-muted font-bold text-center w-32">{t('attendanceScore') || 'Attendance (20)'}</th>
                  <th className="px-6 py-5 text-[10px] uppercase tracking-[0.2em] text-accent-muted font-bold text-center w-32">{t('midtermScore') || 'Midterm (15)'}</th>
                  <th className="px-6 py-5 text-[10px] uppercase tracking-[0.2em] text-accent-muted font-bold text-center w-32">{t('assignmentScore') || 'Assignment (15)'}</th>
                  <th className="px-6 py-5 text-[10px] uppercase tracking-[0.2em] text-accent-muted font-bold text-center w-32">{t('finalScore') || 'Final (50)'}</th>
                  <th className="px-6 py-5 text-[10px] uppercase tracking-[0.2em] text-accent-muted font-bold text-center w-32">{t('total') || 'Total'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {students.map((student, i) => {
                  const s = scores[student.id] || { attendance_score: 0, midterm_score: '', assignment_score: '', final_score: '' };
                  const total = (parseFloat(s.attendance_score) || 0) + (parseFloat(s.midterm_score) || 0) + (parseFloat(s.assignment_score) || 0) + (parseFloat(s.final_score) || 0);
                  
                  return (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-300"
                    >
                      <td className="px-6 py-4 text-center font-mono text-xs text-accent-muted">{i + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="text-left space-y-0.5">
                            <p className="font-bold text-sm leading-tight text-accent">{student.name}</p>
                            <p className="text-[10px] text-accent-muted font-mono tracking-wider">{student.student_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-mono text-sm text-accent-muted bg-black/5 dark:bg-white/5 py-2 px-3 rounded-xl border border-black/5 dark:border-white/5">
                          {s.attendance_score || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          min="0" max="15" step="0.01"
                          value={s.midterm_score}
                          onChange={(e) => handleScoreChange(student.id, 'midterm_score', e.target.value)}
                          className="w-full bg-white/50  border border-black/10  rounded-xl py-2 px-3 text-center text-sm font-mono focus:outline-none focus:border-blue-600 transition-all"
                          placeholder="-"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          min="0" max="15" step="0.01"
                          value={s.assignment_score}
                          onChange={(e) => handleScoreChange(student.id, 'assignment_score', e.target.value)}
                          className="w-full bg-white/50  border border-black/10  rounded-xl py-2 px-3 text-center text-sm font-mono focus:outline-none focus:border-blue-600 transition-all"
                          placeholder="-"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          min="0" max="50" step="0.01"
                          value={s.final_score}
                          onChange={(e) => handleScoreChange(student.id, 'final_score', e.target.value)}
                          className="w-full bg-white/50  border border-black/10 rounded-xl py-2 px-3 text-center text-sm font-mono focus:outline-none focus:border-blue-600 transition-all"
                          placeholder="-"
                        />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-600/10 px-3 py-1.5 rounded-lg border border-blue-600/20">
                          {total.toFixed(2)}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
