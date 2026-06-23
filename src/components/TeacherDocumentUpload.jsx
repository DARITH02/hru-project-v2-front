import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  File,
  FileImage,
  FileText,
  FolderOpen,
  Plus,
  Presentation,
  Send,
  Trash2,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useApp } from '../context/AppContext';
import api from '../lib/api';

const TYPE_META = {
  pdf: { icon: FileText, label: 'PDF', className: 'text-red-500 bg-red-500/10' },
  doc: { icon: FileText, label: 'DOC', className: 'text-blue-600 bg-blue-600/10' },
  ppt: { icon: Presentation, label: 'PPT', className: 'text-orange-500 bg-orange-500/10' },
  image: { icon: FileImage, label: 'IMG', className: 'text-green-500 bg-green-500/10' },
  other: { icon: File, label: 'FILE', className: 'text-accent-muted bg-black/5 dark:bg-white/10' },
};

const STATUS_META = {
  pending: {
    icon: Clock,
    className: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  },
  approved: {
    icon: CheckCircle2,
    className: 'text-green-500 bg-green-500/10 border-green-500/20',
  },
  rejected: {
    icon: XCircle,
    className: 'text-red-500 bg-red-500/10 border-red-500/20',
  },
};

const extToType = (name) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'doc';
  if (['ppt', 'pptx'].includes(ext)) return 'ppt';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
  return 'other';
};

const formatSize = (bytes) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatAge = (date) => {
  if (!date) return 'Today';
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
};

const TypeBadge = ({ type }) => {
  const meta = TYPE_META[type] || TYPE_META.other;
  const Icon = meta.icon;

  return (
    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', meta.className)}>
      <Icon className="w-5 h-5" />
    </div>
  );
};

const StatCard = ({ label, value, className }) => (
  <div className="glass px-4 py-3 rounded-2xl min-w-[96px] text-center border border-black/5 dark:border-white/10">
    <p className={cn('text-2xl font-black leading-none', className)}>{value}</p>
    <p className="text-[10px] uppercase tracking-widest text-accent-muted mt-1">{label}</p>
  </div>
);

export const TeacherDocumentUpload = () => {
  const { t } = useApp();
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const fileInputRef = useRef(null);

  const normalizeDocument = useCallback((item) => {
    const rawStatus = item.status || item.review_status || 'pending';
    const status = String(rawStatus).toLowerCase();
    const dateValue = item.date || item.created_at || item.updated_at;
    const title = item.title || item.name || item.original_name || t('documentTitle');
    const ext = item.ext || item.extension || item.file_extension || title.split('.').pop() || 'file';

    return {
      ...item,
      id: item.id || `history-${title}-${dateValue || Date.now()}`,
      title: title.replace(/\.[^/.]+$/, ''),
      subject: item.subject || item.class_name || item.class?.name || item.course_name || '-',
      status: STATUS_META[status] ? status : 'pending',
      comment: item.comment || item.reviewer_note || item.review_note || '',
      ext,
      type: item.type || extToType(`file.${ext}`),
      size: item.size || item.file_size || '-',
      date: dateValue ? new Date(dateValue) : new Date(),
    };
  }, [t]);

  const fetchDocuments = useCallback(async () => {
    const response = await api.get('/teacher/documents');
    setHistory((response.data?.documents || []).map(normalizeDocument));
  }, [normalizeDocument]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setError('');

      try {
        const [classResponse, documentResponse] = await Promise.all([
          api.get('/teacher/classes'),
          api.get('/teacher/documents'),
        ]);

        if (!isMounted) return;
        setClasses(classResponse.data || []);
        setHistory((documentResponse.data?.documents || []).map(normalizeDocument));
      } catch (err) {
        if (!isMounted) return;
        setError(err.response?.data?.message || 'Failed to load document data.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [normalizeDocument]);

  const addFiles = useCallback((fileList) => {
    const newItems = Array.from(fileList).map((file, index) => ({
      id: `queued-${Date.now()}-${index}`,
      file,
      title: file.name.replace(/\.[^/.]+$/, ''),
      class_id: classes.length === 1 ? String(classes[0].id) : '',
      type: extToType(file.name),
      ext: file.name.split('.').pop()?.toLowerCase() || 'file',
      size: formatSize(file.size),
    }));
    setQueue((current) => [...current, ...newItems]);
  }, [classes]);

  const counts = useMemo(() => history.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, { pending: 0, approved: 0, rejected: 0 }), [history]);

  const canSubmit = !isSubmitting && queue.length > 0 && queue.every((item) => item.title.trim() && item.class_id);

  const updateQueueItem = (id, field, value) => {
    setQueue((current) => current.map((item) => (
      item.id === id ? { ...item, [field]: value } : item
    )));
  };

  const removeQueueItem = (id) => {
    setQueue((current) => current.filter((item) => item.id !== id));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setUploadProgress(0);
    setError('');

    const formData = new FormData();
    queue.forEach((item, index) => {
      formData.append(`documents[${index}][file]`, item.file);
      formData.append(`documents[${index}][title]`, item.title.trim());
      formData.append(`documents[${index}][class_id]`, item.class_id);
    });

    try {
      await api.post('/teacher/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (event.total) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        },
      });

      setQueue([]);
      setJustSubmitted(true);
      await fetchDocuments();
      window.alert(t('documentSubmitted'));
      window.setTimeout(() => setJustSubmitted(false), 3200);
    } catch (err) {
      const validation = err.response?.data?.errors;
      const firstValidation = validation ? Object.values(validation).flat()[0] : null;
      setError(firstValidation || err.response?.data?.message || 'Document upload failed.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-600 mb-3">
            {t('facultyDocumentPortal')}
          </p>
          <h2 className="text-3xl font-bold tracking-tight">{t('uploadTeachingDocs')}</h2>
          <p className="text-accent-muted max-w-2xl mt-2">{t('uploadTeachingDocsSub')}</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label={t('pending')} value={counts.pending} className="text-amber-500" />
          <StatCard label={t('approved')} value={counts.approved} className="text-green-500" />
          <StatCard label={t('needsChanges')} value={counts.rejected} className="text-red-500" />
        </div>
      </header>

      <section
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (event.dataTransfer.files?.length) addFiles(event.dataTransfer.files);
        }}
        className={cn(
          'glass cursor-pointer rounded-[2rem] border-2 border-dashed p-8 md:p-12 text-center transition-all',
          isDragging
            ? 'border-blue-600 bg-blue-600/10 shadow-lg shadow-blue-600/10'
            : 'border-black/10 dark:border-white/10 hover:border-blue-600/50 hover:bg-blue-600/5',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files?.length) addFiles(event.target.files);
            event.target.value = '';
          }}
        />
        <div className="w-16 h-16 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center mx-auto mb-5">
          <UploadCloud className="w-8 h-8" />
        </div>
        <p className="font-bold text-lg">{t('dragFilesHere')}</p>
        <p className="text-sm text-accent-muted mt-2">{t('docUploadHint')}</p>
      </section>

      {error && (
        <div className="glass rounded-2xl px-5 py-4 text-red-500 flex items-center gap-3 border border-red-500/20 bg-red-500/10">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {queue.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-[1.75rem] border border-black/5 dark:border-white/10 overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 bg-black/5 dark:bg-white/5">
            <p className="text-xs font-bold uppercase tracking-widest text-accent-muted">{t('readyToSubmit')}</p>
            <p className="text-xs font-bold text-blue-600">{queue.length} {t('files')}</p>
          </div>

          <div className="divide-y divide-black/5 dark:divide-white/5">
            {queue.map((item) => (
              <div key={item.id} className="p-5 flex flex-col md:flex-row gap-4">
                <TypeBadge type={item.type} />
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 min-w-0">
                  <input
                    value={item.title}
                    onChange={(event) => updateQueueItem(item.id, 'title', event.target.value)}
                    placeholder={t('documentTitle')}
                    className="md:col-span-5 rounded-xl bg-white/80 dark:bg-noir-900/80 border border-black/10 dark:border-white/10 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                  />
                  <select
                    value={item.class_id}
                    onChange={(event) => updateQueueItem(item.id, 'class_id', event.target.value)}
                    className="md:col-span-4 rounded-xl bg-white/80 dark:bg-noir-900/80 border border-black/10 dark:border-white/10 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                  >
                    <option value="">{t('chooseSubject')}</option>
                    {classes.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.name}{classItem.group_name && classItem.group_name !== 'N/A' ? ` · ${classItem.group_name}` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="md:col-span-2 rounded-xl bg-black/5 dark:bg-white/5 px-4 py-3 text-xs text-accent-muted flex items-center">
                    {item.size} · .{item.ext}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeQueueItem(item.id)}
                    title={t('removeFile')}
                    className="md:col-span-1 rounded-xl text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-colors min-h-11"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!canSubmit && (
            <div className="px-5 py-3 bg-amber-500/10 text-amber-500 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {t('completeEachFile')}
            </div>
          )}

          <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-black/5 dark:border-white/5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-accent-muted bg-black/5 dark:bg-white/5 hover:text-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('addMoreFiles')}
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold bg-blue-600 text-white shadow-lg shadow-blue-600/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? `${uploadProgress || 1}%` : t('submitForReview')}
            </button>
          </div>
        </motion.section>
      )}

      {justSubmitted && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl px-5 py-4 text-green-500 flex items-center gap-3 border border-green-500/20 bg-green-500/10"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-semibold">{t('documentSubmitted')}</span>
        </motion.div>
      )}

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <FolderOpen className="w-5 h-5 text-blue-600" />
          <h3 className="text-xl font-bold">{t('yourSubmissions')}</h3>
        </div>

        {isLoading ? (
          <div className="glass rounded-[1.75rem] border border-dashed border-black/10 dark:border-white/10 py-16 text-center text-accent-muted">
            {t('loading') || 'Loading...'}
          </div>
        ) : history.length === 0 ? (
          <div className="glass rounded-[1.75rem] border border-dashed border-black/10 dark:border-white/10 py-16 text-center text-accent-muted">
            <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-40" />
            {t('noSubmissionsYet')}
          </div>
        ) : (
          <div className="glass rounded-[1.75rem] border border-black/5 dark:border-white/10 overflow-hidden divide-y divide-black/5 dark:divide-white/5">
            {history.map((item) => {
              const status = STATUS_META[item.status] || STATUS_META.pending;
              const StatusIcon = status.icon;

              return (
                <div key={item.id} className="p-5 flex flex-col md:flex-row md:items-start gap-4">
                  <TypeBadge type={item.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold truncate">{item.title}</p>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-accent-muted">
                        .{item.ext}
                      </span>
                    </div>
                    <p className="text-sm text-accent-muted mt-1">
                      {item.subject} · {item.size} · {formatAge(item.date)}
                    </p>
                    {item.comment && (
                      <p className="mt-3 rounded-xl bg-red-500/10 text-red-500 px-4 py-3 text-sm">
                        <span className="font-bold">{t('reviewerNote')}:</span> {item.comment}
                      </p>
                    )}
                  </div>
                  <div className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold w-max', status.className)}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {t(item.status)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
