import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Clock,
  Download,
  Eye,
  File,
  FileImage,
  FileText,
  Grid3X3,
  List,
  Loader2,
  NotebookPen,
  Presentation,
  Search,
  User,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../lib/api';
import { cn } from '../lib/utils';
import { useApp } from '../context/AppContext';

const TYPE_META = {
  pdf: { icon: FileText, className: 'text-red-500 bg-red-500/10' },
  doc: { icon: FileText, className: 'text-blue-600 bg-blue-600/10' },
  ppt: { icon: Presentation, className: 'text-orange-500 bg-orange-500/10' },
  image: { icon: FileImage, className: 'text-green-500 bg-green-500/10' },
  other: { icon: File, className: 'text-accent-muted bg-black/5 dark:bg-white/10' },
};

const formatAge = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return 'Today';
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
};

const readCollection = (payload) => {
  if (Array.isArray(payload?.documents)) return payload.documents;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const TypeBadge = ({ type, large = false }) => {
  const meta = TYPE_META[type] || TYPE_META.other;
  const Icon = meta.icon;

  return (
    <div className={cn(
      'rounded-2xl flex items-center justify-center shrink-0',
      large ? 'w-16 h-16' : 'w-11 h-11',
      meta.className,
    )}>
      <Icon className={large ? 'w-8 h-8' : 'w-5 h-5'} />
    </div>
  );
};

const DetailRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 text-sm">
    <Icon className="w-4 h-4 text-blue-600 shrink-0" />
    <span className="text-accent-muted w-16 shrink-0">{label}</span>
    <span className="font-semibold truncate">{value}</span>
  </div>
);

export const StudentDocuments = () => {
  const { t } = useApp();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('all');
  const [view, setView] = useState('grid');
  const [selected, setSelected] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [notes, setNotes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('student_document_notes') || '{}');
    } catch {
      return {};
    }
  });
  const previewUrlRef = useRef('');

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/student/documents');
      setDocuments(readCollection(response.data));
    } catch (err) {
      setError(err.response?.data?.message || t('documentsFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    localStorage.setItem('student_document_notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const subjects = useMemo(() => {
    const values = documents.map((document) => document.subject).filter(Boolean);
    return [...new Set(values)].sort();
  }, [documents]);

  const filteredDocuments = useMemo(() => documents.filter((document) => {
    if (subject !== 'all' && document.subject !== subject) return false;
    if (!query.trim()) return true;
    const needle = query.toLowerCase();
    return [document.title, document.subject, document.teacher, document.class_name, document.original_name]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle));
  }), [documents, query, subject]);

  const subjectCounts = useMemo(() => documents.reduce((acc, document) => {
    acc[document.subject] = (acc[document.subject] || 0) + 1;
    return acc;
  }, {}), [documents]);

  const openPreview = async (document) => {
    setSelected(document);
    setPreviewError('');

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
      setPreviewUrl('');
    }

    if (!document.can_preview) return;

    setPreviewLoading(true);
    try {
      const response = await api.get(`/student/documents/${document.id}/preview`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    } catch (err) {
      setPreviewError(err.response?.data?.message || t('documentPreviewFailed'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const downloadDocument = async (document) => {
    try {
      const response = await api.get(`/student/documents/${document.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = document.original_name || `${document.title}.${document.ext}`;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      window.alert(err.response?.data?.message || t('documentDownloadFailed'));
    }
  };

  const updateNote = (documentId, value) => {
    setNotes((current) => ({
      ...current,
      [documentId]: value,
    }));
  };

  const renderDocument = (document, mode = 'grid') => {
    if (mode === 'list') {
      return (
        <button
          key={document.id}
          type="button"
          onClick={() => openPreview(document)}
          className="w-full p-5 flex flex-col md:flex-row md:items-center gap-4 text-left hover:bg-blue-600/5 transition-colors"
        >
          <TypeBadge type={document.type} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <p className="font-bold truncate">{document.title}</p>
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent-muted">.{document.ext}</span>
            </div>
            <p className="text-sm text-accent-muted mt-1 truncate">
              {document.teacher} · {document.size} · {formatAge(document.date)}
            </p>
          </div>
          <span className="w-max rounded-full bg-blue-600/10 text-blue-600 px-3 py-1 text-xs font-bold">
            {document.subject}
          </span>
        </button>
      );
    }

    return (
      <motion.button
        key={document.id}
        type="button"
        onClick={() => openPreview(document)}
        whileHover={{ y: -4 }}
        className="glass p-5 rounded-[1.75rem] text-left border border-black/5 dark:border-white/10 relative overflow-hidden group min-h-[220px]"
      >
        <div className="absolute top-0 right-0 w-28 h-28 bg-blue-600/5 blur-3xl -mr-10 -mt-10 group-hover:bg-blue-600/10 transition-colors" />
        <div className="flex items-start justify-between gap-4 relative z-10">
          <TypeBadge type={document.type} />
          <span className="rounded-full bg-blue-600/10 text-blue-600 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
            .{document.ext}
          </span>
        </div>
        <div className="relative z-10 mt-5">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">{document.subject}</p>
          <h3 className="text-lg font-black leading-tight line-clamp-2">{document.title}</h3>
          <p className="text-sm text-accent-muted mt-3 line-clamp-1">{document.teacher}</p>
        </div>
        <div className="relative z-10 mt-6 flex items-center justify-between text-xs text-accent-muted">
          <span>{document.size}</span>
          <span>{formatAge(document.date)}</span>
        </div>
      </motion.button>
    );
  };

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-600 mb-3">{t('studentDocumentPortal')}</p>
          <h2 className="text-3xl font-bold tracking-tight">{t('classMaterials')}</h2>
          <p className="text-accent-muted max-w-2xl mt-2">{t('classMaterialsSub')}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-2xl px-5 py-4 text-center">
            <p className="text-3xl font-black text-blue-600">{documents.length}</p>
            <p className="text-[10px] uppercase tracking-widest text-accent-muted">{t('documents')}</p>
          </div>
          <div className="glass rounded-2xl px-5 py-4 text-center">
            <p className="text-3xl font-black text-green-500">{subjects.length}</p>
            <p className="text-[10px] uppercase tracking-widest text-accent-muted">{t('subjects')}</p>
          </div>
        </div>
      </header>

      <section className="glass rounded-[1.75rem] border border-black/5 dark:border-white/10 p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 flex items-center gap-3 rounded-2xl bg-white/80 dark:bg-noir-900/80 border border-black/10 dark:border-white/10 px-4 py-3">
            <Search className="w-5 h-5 text-accent-muted shrink-0" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('searchDocuments')}
              className="w-full bg-transparent outline-none text-sm"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-accent-muted hover:text-blue-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="glass flex p-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 w-max">
            <button
              type="button"
              onClick={() => setView('grid')}
              className={cn('p-3 rounded-xl transition-colors', view === 'grid' ? 'bg-blue-600 text-white' : 'text-accent-muted hover:text-blue-600')}
              title={t('gridView')}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={cn('p-3 rounded-xl transition-colors', view === 'list' ? 'bg-blue-600 text-white' : 'text-accent-muted hover:text-blue-600')}
              title={t('listView')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => setSubject('all')}
          className={cn(
            'shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors',
            subject === 'all' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'glass text-accent-muted hover:text-blue-600',
          )}
        >
          <BookOpen className="w-4 h-4" />
          {t('all')}
          <span className="opacity-70">{documents.length}</span>
        </button>
        {subjects.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setSubject(item)}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors',
              subject === item ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'glass text-accent-muted hover:text-blue-600',
            )}
          >
            {item} <span className="opacity-70">{subjectCounts[item] || 0}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-[45vh] flex flex-col items-center justify-center gap-4 text-accent-muted">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="animate-pulse">{t('loadingDocuments')}</p>
        </div>
      ) : error ? (
        <div className="glass rounded-[1.75rem] p-10 text-center text-red-500 border border-red-500/20">
          <AlertCircle className="w-10 h-10 mx-auto mb-3" />
          <p className="font-semibold">{error}</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="glass rounded-[1.75rem] p-14 text-center text-accent-muted border border-dashed border-black/10 dark:border-white/10">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>{t('noDocumentsFound')}</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredDocuments.map((document) => renderDocument(document))}
        </div>
      ) : (
        <div className="glass rounded-[1.75rem] border border-black/5 dark:border-white/10 divide-y divide-black/5 dark:divide-white/5 overflow-hidden">
          {filteredDocuments.map((document) => renderDocument(document, 'list'))}
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4 md:p-8 flex items-center justify-center"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              onClick={(event) => event.stopPropagation()}
              className="glass w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-[2rem] border border-white/10 bg-noir-950"
            >
              <div className="p-4 md:p-5 border-b border-black/5 dark:border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <TypeBadge type={selected.type} />
                  <div className="min-w-0">
                    <h3 className="font-black truncate">{selected.title}</h3>
                    <p className="text-xs text-accent-muted truncate">{selected.subject} · {selected.size}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[calc(90vh-82px)] overflow-y-auto">
                <div className="lg:col-span-8 min-h-[420px] bg-black/5 dark:bg-white/[0.03]">
                  {previewLoading ? (
                    <div className="h-full min-h-[420px] flex items-center justify-center text-accent-muted">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                  ) : previewError ? (
                    <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-red-500 gap-3 p-8 text-center">
                      <AlertCircle className="w-10 h-10" />
                      <p>{previewError}</p>
                    </div>
                  ) : selected.can_preview && previewUrl ? (
                    selected.type === 'image' ? (
                      <div className="min-h-[420px] flex items-center justify-center p-6">
                        <img src={previewUrl} alt={selected.title} className="max-h-[70vh] max-w-full rounded-2xl object-contain" />
                      </div>
                    ) : (
                      <iframe title={selected.title} src={previewUrl} className="w-full h-[70vh] min-h-[520px]" />
                    )
                  ) : (
                    <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-center p-8">
                      <TypeBadge type={selected.type} large />
                      <h4 className="font-black mt-5">{t('previewUnavailable')}</h4>
                      <p className="text-sm text-accent-muted mt-2 max-w-sm">{t('previewUnavailableSub')}</p>
                    </div>
                  )}
                </div>

                <aside className="lg:col-span-4 p-5 md:p-6 space-y-6 border-t lg:border-t-0 lg:border-l border-black/5 dark:border-white/10">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-blue-600 mb-2">{selected.subject}</p>
                    <h2 className="text-2xl font-black leading-tight">{selected.title}</h2>
                  </div>

                  <div className="space-y-3">
                    <DetailRow icon={User} label={t('teacher')} value={selected.teacher} />
                    <DetailRow icon={FileText} label={t('file')} value={`${selected.size} · .${selected.ext}`} />
                    <DetailRow icon={Clock} label={t('posted')} value={formatAge(selected.date)} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => openPreview(selected)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-3 text-sm font-bold shadow-lg shadow-blue-600/20"
                    >
                      <Eye className="w-4 h-4" />
                      {t('read')}
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadDocument(selected)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-black/5 dark:bg-white/10 text-accent px-4 py-3 text-sm font-bold hover:text-blue-600 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      {t('download')}
                    </button>
                  </div>

                  <label className="block space-y-3">
                    <span className="flex items-center gap-2 text-sm font-bold">
                      <NotebookPen className="w-4 h-4 text-blue-600" />
                      {t('myNotes')}
                    </span>
                    <textarea
                      value={notes[selected.id] || ''}
                      onChange={(event) => updateNote(selected.id, event.target.value)}
                      placeholder={t('notePlaceholder')}
                      className="w-full min-h-40 rounded-2xl bg-white/80 dark:bg-noir-900/80 border border-black/10 dark:border-white/10 px-4 py-3 text-sm outline-none resize-y focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                    />
                  </label>
                </aside>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
