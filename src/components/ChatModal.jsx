import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ImagePlus,
  MessageCircle,
  MoreVertical,
  Pencil,
  Reply,
  Send,
  Smile,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import api from '../lib/api';
import echo from '../lib/echo';
import { cn } from '../lib/utils';

const EMOJI_GROUPS = {
  smileys: ['😀', '😁', '😂', '🤣', '😊', '🙂', '😉', '😍', '🥰', '😎', '🤔', '😭', '😅', '🥳'],
  gestures: ['👍', '👏', '🙌', '🙏', '👋', '💪', '✌️', '👌', '🫶', '👊', '🤝', '🫡'],
  hearts: ['❤️', '💙', '💚', '💜', '🖤', '🤍', '💕', '💖', '💘', '💌', '😍', '🥰'],
  objects: ['🎉', '✨', '⭐', '💯', '📸', '📱', '💡', '🏆', '📚', '🚀', '🌈', '⚡'],
};

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

const backendBaseUrl = api.defaults.baseURL.replace(/\/api\/?$/, '');

const attachmentUrl = (attachment) => {
  const url = attachment.url || (attachment.file_path ? `/storage/${attachment.file_path}` : '');
  if (!url || url.startsWith('http') || url.startsWith('//') || url.startsWith('data:')) return url;
  return `${backendBaseUrl}${url.startsWith('/') ? url : `/${url}`}`;
};

const messageListSignature = (messages) =>
  messages
    .map((message) => [
      message.id,
      message.body,
      message.isEdited,
      message.attachments?.length || 0,
      message.replyTo?.id || '',
      (message.reactions || []).map((reaction) => `${reaction.user_id}:${reaction.reaction}`).sort().join(','),
    ].join(':'))
    .join('|');

export const ChatLauncher = () => {
  const { t, user } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const canUseChat = ['teacher', 'admin', 'super_admin'].includes(user?.role);

  const loadUnreadCount = useCallback(async () => {
    if (!canUseChat) return;

    try {
      const res = await api.get('/chat/conversations');
      const count = (res.data.conversations?.data || []).reduce(
        (total, conversation) => total + Number(conversation.unread_messages_count || 0),
        0,
      );
      setUnreadCount(count);
    } catch {
      setUnreadCount(0);
    }
  }, [canUseChat]);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    loadUnreadCount();
  }, [loadUnreadCount]);

  useEffect(() => {
    if (!canUseChat) return undefined;

    loadUnreadCount();
    const timer = window.setInterval(loadUnreadCount, isOpen ? 30000 : 60000);

    return () => window.clearInterval(timer);
  }, [canUseChat, isOpen, loadUnreadCount, user?.id]);

  if (!canUseChat) return null;

  const unreadLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/25 transition hover:bg-blue-500 active:scale-95 md:bottom-8 md:right-8"
        aria-label={t('openChat')}
        title={t('openChat')}
      >
        <MessageCircle className="h-6 w-6" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 grid min-h-6 min-w-6 place-items-center rounded-full border-2 border-noir-950 bg-red-500 px-1.5 text-[11px] font-black leading-none text-white shadow-lg shadow-red-500/30">
            {unreadLabel}
          </span>
        ) : (
          <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-noir-950 bg-emerald-400" />
        )}
      </button>
      <ChatModal
        open={isOpen}
        onClose={closeChat}
        onUnreadChange={loadUnreadCount}
      />
    </>
  );
};

export const ChatModal = ({ open, onClose, onUnreadChange }) => {
  const { t, user, branding } = useApp();
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [pendingFiles, setPendingFiles] = useState([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiGroup, setEmojiGroup] = useState('smileys');
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [activeActionId, setActiveActionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef(null);
  const listRef = useRef(null);
  const conversationIdRef = useRef(null);
  const editingMessageRef = useRef(null);
  const replyToRef = useRef(null);
  const dragDepth = useRef(0);

  const supportName = useMemo(() => {
    const others = (conversation?.participants || []).filter((participant) => Number(participant.id) !== Number(user?.id));
    if (others.length) return others.map((participant) => participant.name).join(', ');
    const admin = contacts.find((contact) => ['admin', 'super_admin'].includes(contact.role));
    if (admin) return admin.name;
    return branding?.university ? `${branding.university} Admin` : 'HRU Admin';
  }, [branding?.university, contacts, conversation?.participants, user?.id]);

  const supportPresence = useMemo(() => {
    const others = (conversation?.participants || []).filter((participant) => Number(participant.id) !== Number(user?.id));
    const adminSupportAvailable = user?.role === 'teacher' && others.some((participant) => ['admin', 'super_admin'].includes(participant.role));
    const online = adminSupportAvailable || others.some((participant) => participant.online);

    return { online };
  }, [conversation?.participants, user?.id, user?.role]);

  const userInitial = useMemo(() => {
    const name = user?.name || user?.email || 'You';
    return name.charAt(0).toUpperCase();
  }, [user]);

  const formatTime = (value) => {
    if (!value) return '';
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const toReplyPreview = (message) => {
    if (!message) return null;

    return {
      id: message.id,
      senderId: message.sender_id,
      senderName: message.sender?.name || 'Message',
      body: message.message || '',
      attachments: message.attachments || [],
    };
  };

  const toUiMessage = (message) => {
    const reply = message.reply_to || message.replyTo;

    return {
      id: message.id,
      senderId: message.sender_id,
      senderName: message.sender?.name || '',
      from: Number(message.sender_id) === Number(user?.id) ? 'me' : 'support',
      type: message.attachments?.length ? 'attachments' : 'text',
      body: message.message || '',
      time: formatTime(message.created_at),
      attachments: message.attachments || [],
      replyTo: toReplyPreview(reply),
      reactions: message.reactions || [],
      isEdited: Boolean(message.is_edited),
    };
  };

  const mergeMessage = (nextMessage) => {
    setMessages((current) => {
      const withoutPending = current.filter((message) => {
        if (message.id === nextMessage.id) return false;
        return !(String(message.id).includes('-text') && message.from === 'me' && message.body === nextMessage.body);
      });

      return [...withoutPending, nextMessage];
    });
  };

  const markIncomingMessagesRead = (conversationId, messageIds) => {
    if (!messageIds.length) return;

    api.post(`/chat/conversations/${conversationId}/delivered`, { message_ids: messageIds }).catch(() => {});
    api.post(`/chat/conversations/${conversationId}/read`, { message_ids: messageIds })
      .then(() => onUnreadChange?.())
      .catch(() => {});
  };

  const loadMessages = async (conversationId) => {
    const res = await api.get(`/chat/conversations/${conversationId}/messages`);
    const rows = (res.data.messages?.data || []).slice().reverse();
    const nextMessages = rows.map(toUiMessage);
    setMessages((current) => (
      messageListSignature(current) === messageListSignature(nextMessages) ? current : nextMessages
    ));

    const unreadIds = rows
      .filter((message) => Number(message.sender_id) !== Number(user?.id) && !message.is_read)
      .map((message) => message.id);

    if (unreadIds.length) {
      api.post(`/chat/conversations/${conversationId}/delivered`, { message_ids: unreadIds }).catch(() => {});
      api.post(`/chat/conversations/${conversationId}/read`, { message_ids: unreadIds })
        .then(() => onUnreadChange?.())
        .catch(() => {});
    }
  };

  const supportContacts = useMemo(() => {
    const admins = contacts.filter((contact) => ['admin', 'super_admin'].includes(contact.role));
    return admins.length ? admins : contacts;
  }, [contacts]);

  const chooseAdminContact = (users) => {
    const admins = users.filter((contact) => ['admin', 'super_admin'].includes(contact.role));
    return admins.find((contact) => contact.role === 'super_admin') ||
      admins.find((contact) => contact.role === 'admin') ||
      users[0];
  };

  const findConversationWith = (conversations, contactId) =>
    conversations.find((item) =>
      (item.participants || []).some((participant) => Number(participant.id) === Number(contactId)),
    );

  const startDirectChat = async (contact) => {
    if (!contact) return;

    setIsLoading(true);
    setError('');
    setContactPickerOpen(false);
    setDraft('');
    setPendingFiles([]);
    setReplyTo(null);
    setEditingMessage(null);

    try {
      let nextConversation = findConversationWith(conversations, contact.id);

      if (!nextConversation) {
        const created = await api.post('/chat/conversations', {
          participant_ids: [Number(contact.id)],
          type: 'direct',
        });
        nextConversation = created.data.conversation;
      }

      setConversation(nextConversation);
      await loadMessages(nextConversation.id);
      const refreshed = await api.get('/chat/conversations');
      setConversations(refreshed.data.conversations?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || `Unable to start chat with ${contact.name}.`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadChat = async ({ silent = false } = {}) => {
    if (!open) return;
    if (!silent) {
      setIsLoading(true);
      setError('');
    }

    try {
      const [usersRes, conversationsRes] = await Promise.all([
        api.get('/chat/users'),
        api.get('/chat/conversations'),
      ]);

      const nextContacts = usersRes.data.users || [];
      const nextConversations = conversationsRes.data.conversations?.data || [];
      const adminContact = chooseAdminContact(nextContacts);
      let nextConversation = conversationIdRef.current
        ? nextConversations.find((item) => Number(item.id) === Number(conversationIdRef.current))
        : null;

      if (!nextConversation) {
        nextConversation = adminContact ? findConversationWith(nextConversations, adminContact.id) : nextConversations[0];
      }

      if (!nextConversation && adminContact) {
        const created = await api.post('/chat/conversations', {
          participant_ids: [Number(adminContact.id)],
          type: 'direct',
        });
        nextConversation = created.data.conversation;
      }

      setContacts(nextContacts);
      setConversations(nextConversations);
      setConversation(nextConversation || null);

      if (nextConversation) {
        await loadMessages(nextConversation.id);
      } else {
        setMessages([]);
        setError('No admin chat contact is available.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to connect chat to backend.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    conversationIdRef.current = conversation?.id || null;
  }, [conversation?.id]);

  useEffect(() => {
    editingMessageRef.current = editingMessage;
  }, [editingMessage]);

  useEffect(() => {
    replyToRef.current = replyTo;
  }, [replyTo]);

  useEffect(() => {
    if (!open) return undefined;

    loadChat();
    const refreshTimer = window.setInterval(() => loadChat({ silent: true }), 60000);
    api.post('/chat/presence', { online: true }).catch(() => {});

    return () => {
      window.clearInterval(refreshTimer);
      api.post('/chat/presence', { online: false }).catch(() => {});
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;

      if (lightbox) {
        setLightbox(null);
        return;
      }
      if (emojiOpen) {
        setEmojiOpen(false);
        return;
      }
      onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [emojiOpen, lightbox, onClose, open]);

  useEffect(() => {
    if (!open || !conversation?.id) return undefined;

    const channelName = `chat.conversation.${conversation.id}`;
    const channel = echo.private(channelName);

    channel
      .listen('.message.sent', (event) => {
        if (!event.message) return;

        const nextMessage = toUiMessage(event.message);
        mergeMessage(nextMessage);

        if (Number(event.message.sender_id) !== Number(user?.id)) {
          markIncomingMessagesRead(conversation.id, [event.message.id]);
        }
      })
      .listen('.message.updated', (event) => {
        if (!event.message) return;

        const nextMessage = toUiMessage(event.message);
        setMessages((current) => current.map((message) => (
          message.id === nextMessage.id ? nextMessage : message
        )));
      })
      .listen('.message.deleted', (event) => {
        setMessages((current) => current.filter((message) => message.id !== event.message_id));

        if (replyToRef.current?.id === event.message_id) setReplyTo(null);
        if (editingMessageRef.current?.id === event.message_id) cancelEdit();
      })
      .listen('.message.reaction.updated', (event) => {
        setMessages((current) => current.map((message) => (
          message.id === event.message_id
            ? { ...message, reactions: event.reactions || [] }
            : message
        )));
      });

    const messagesTimer = window.setInterval(() => {
      loadMessages(conversation.id).catch(() => {});
    }, 60000);

    return () => {
      window.clearInterval(messagesTimer);
      echo.leave(channelName);
    };
  }, [conversation?.id, open, user?.id]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      });
    }
  }, [messages, pendingFiles, emojiOpen, open]);

  const addFiles = (files) => {
    const images = Array.from(files || []).filter((file) => file.type.startsWith('image/'));
    images.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPendingFiles((current) => [
          ...current,
          {
            id: `${file.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            name: file.name,
            src: event.target.result,
            file,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    setEmojiOpen(false);
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!conversation || isSending) return;

    if (editingMessage) {
      if (!body) return;

      setIsSending(true);
      setError('');

      try {
        const res = await api.patch(`/chat/messages/${editingMessage.id}`, { message: body });
        const updatedMessage = toUiMessage(res.data.message);
        setMessages((current) => current.map((message) => (message.id === updatedMessage.id ? updatedMessage : message)));
        setDraft('');
        setEditingMessage(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to edit message.');
      } finally {
        setIsSending(false);
      }
      return;
    }

    if (!body && pendingFiles.length === 0) return;

    const nextMessages = pendingFiles.map((file) => ({
      id: file.id,
      senderId: user?.id,
      senderName: user?.name || 'You',
      from: 'me',
      type: 'image',
      body: file.src,
      alt: file.name,
      time: 'now',
      replyTo,
    }));

    if (body) {
      nextMessages.push({
        id: `${Date.now()}-text`,
        senderId: user?.id,
        senderName: user?.name || 'You',
        from: 'me',
        type: 'text',
        body,
        time: 'now',
        replyTo,
      });
    }

    const selectedReply = replyTo;
    setMessages((current) => [...current, ...nextMessages]);
    setDraft('');
    setPendingFiles([]);
    setReplyTo(null);
    setEmojiOpen(false);
    setIsSending(true);
    setError('');

    try {
      const formData = new FormData();
      if (body) formData.append('message', body);
      if (selectedReply?.id) formData.append('reply_to_message_id', selectedReply.id);
      pendingFiles.forEach((item) => formData.append('attachments[]', item.file));

      const res = await api.post(`/chat/conversations/${conversation.id}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMessages((current) => [
        ...current.filter((message) => !nextMessages.some((pending) => pending.id === message.id)),
        toUiMessage(res.data.message),
      ]);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to send message.');
      setMessages((current) => current.filter((message) => !nextMessages.some((pending) => pending.id === message.id)));
      setReplyTo(selectedReply);
    } finally {
      setIsSending(false);
    }
  };

  const beginEdit = (message) => {
    setEditingMessage(message);
    setReplyTo(null);
    setPendingFiles([]);
    setEmojiOpen(false);
    setDraft(message.body || '');
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setDraft('');
  };

  const deleteMessage = async (message, mode = 'me') => {
    const confirmation = mode === 'everyone' ? t('confirmDeleteForEveryone') : t('confirmDeleteForMe');
    if (!window.confirm(confirmation)) return;

    setError('');

    try {
      await api.delete(`/chat/messages/${message.id}`, { data: { mode } });
      setMessages((current) => current.filter((item) => item.id !== message.id));
      if (replyTo?.id === message.id) setReplyTo(null);
      if (editingMessage?.id === message.id) cancelEdit();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete message.');
    }
  };

  const reactToMessage = async (message, reaction) => {
    setError('');

    try {
      const res = await api.post(`/chat/messages/${message.id}/reactions`, { reaction });
      const updatedMessage = toUiMessage(res.data.message);
      setMessages((current) => current.map((item) => (item.id === updatedMessage.id ? updatedMessage : item)));
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update reaction.');
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.section
            className="relative flex h-[min(720px,calc(100vh-24px))] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-noir-900 shadow-2xl"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            onDragEnter={(event) => {
              event.preventDefault();
              dragDepth.current += 1;
              setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              event.preventDefault();
              dragDepth.current -= 1;
              if (dragDepth.current <= 0) {
                dragDepth.current = 0;
                setIsDragging(false);
              }
            }}
            onDrop={handleDrop}
          >
            <AnimatePresence>
              {isDragging && (
                <motion.div
                  className="absolute inset-0 z-40 flex flex-col items-center justify-center border-2 border-dashed border-blue-400 bg-noir-900/90 text-center backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <ImagePlus className="mb-3 h-10 w-10 text-blue-400" />
                  <p className="font-semibold">{t('dropImage')}</p>
                  <p className="mt-1 text-xs text-accent-muted">PNG, JPG, GIF</p>
                </motion.div>
              )}
            </AnimatePresence>

            <header className="flex shrink-0 items-center gap-3 bg-blue-600 px-4 py-4 text-white shadow-lg shadow-blue-950/20">
              <button type="button" onClick={onClose} className="rounded-full p-2 transition hover:bg-white/10 active:scale-95" aria-label={t('closeChat')}>
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15 ring-2 ring-white/25">
                <img src={branding.logo} alt="" className="h-8 w-8 object-contain" />
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-blue-600 bg-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[15px] font-bold">{supportName}</h2>
                <p className="flex items-center gap-1.5 text-xs text-white/75">
                  <span className={cn('h-1.5 w-1.5 rounded-full', isLoading ? 'bg-amber-300' : supportPresence.online ? 'bg-emerald-300' : 'bg-white/45')} />
                  {isLoading ? t('connecting') : supportPresence.online ? t('activeNow') : t('offline')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setContactPickerOpen((current) => !current)}
                className={cn(
                  'rounded-full p-2 transition hover:bg-white/10 active:scale-95',
                  contactPickerOpen && 'bg-white/15',
                )}
                aria-label={t('chatContacts')}
                title={t('chatContacts')}
              >
                <Users className="h-5 w-5" />
              </button>
            </header>

            <AnimatePresence>
              {contactPickerOpen && (
                <motion.div
                  className="shrink-0 border-b border-white/10 bg-noir-900 px-3 py-3"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                    {supportContacts.length === 0 && (
                      <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-accent-muted">
                        {t('noChatContacts')}
                      </div>
                    )}
                    {supportContacts.map((contact) => {
                      const isSelected = (conversation?.participants || []).some((participant) => Number(participant.id) === Number(contact.id));

                      return (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => startDirectChat(contact)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-white/10',
                            isSelected ? 'bg-blue-600/15 ring-1 ring-blue-500/30' : 'bg-white/5',
                          )}
                        >
                          <Avatar label={contact.name || contact.email || 'A'} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-accent">{contact.name || contact.email}</span>
                            <span className="flex items-center gap-1.5 text-xs text-accent-muted">
                              <span className={cn('h-1.5 w-1.5 rounded-full', contact.online ? 'bg-emerald-400' : 'bg-white/35')} />
                              {contact.role === 'super_admin' ? t('superAdmin') : contact.role === 'admin' ? t('adminRole') : contact.role}
                            </span>
                          </span>
                          {isSelected && <Check className="h-4 w-4 shrink-0 text-blue-400" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={listRef} className="flex-1 overflow-y-auto bg-noir-950 px-3.5 py-4">
              <div className="mb-4 flex justify-center">
                <span className="rounded-full bg-black/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent-muted dark:bg-white/5">
                  {t('today')}
                </span>
              </div>

              <div className="space-y-2">
                {error && (
                  <div className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400">
                    {error}
                  </div>
                )}
                {isLoading && messages.length === 0 && (
                  <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-accent-muted">
                    Connecting to chat backend...
                  </div>
                )}
                {!isLoading && !error && messages.length === 0 && (
                  <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-accent-muted">
                    {t('noChatMessages')}
                  </div>
                )}
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    supportName={supportName}
                    userInitial={userInitial}
                    currentUserId={user?.id}
                    activeActionId={activeActionId}
                    t={t}
                    setActiveActionId={setActiveActionId}
                    onReply={setReplyTo}
                    onEdit={beginEdit}
                    onDelete={deleteMessage}
                    onReact={reactToMessage}
                    onImageClick={setLightbox}
                  />
                ))}
              </div>
            </div>

            {pendingFiles.length > 0 && (
              <div className="shrink-0 border-t border-black/5 bg-noir-900 px-3 pt-3 dark:border-white/5">
                <div className="flex gap-2 overflow-x-auto pb-3">
                  {pendingFiles.map((file) => (
                    <div key={file.id} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl ring-1 ring-black/10 dark:ring-white/10">
                      <img src={file.src} alt={file.name} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPendingFiles((current) => current.filter((item) => item.id !== file.id))}
                        className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/65 text-white transition hover:bg-black"
                        aria-label={t('removeImage')}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {emojiOpen && (
              <div className="shrink-0 border-t border-black/5 bg-noir-900 dark:border-white/5">
                <div className="flex items-center gap-1 border-b border-black/5 px-3 pt-2 dark:border-white/5">
                  {Object.keys(EMOJI_GROUPS).map((group) => (
                    <button
                      key={group}
                      type="button"
                      onClick={() => setEmojiGroup(group)}
                      className={cn(
                        'border-b-2 border-transparent px-2.5 pb-2 text-lg transition',
                        emojiGroup === group && 'border-blue-500',
                      )}
                    >
                      {EMOJI_GROUPS[group][0]}
                    </button>
                  ))}
                  <button type="button" onClick={() => setEmojiOpen(false)} className="ml-auto pb-2 text-accent-muted hover:text-accent" aria-label={t('closeEmojiPicker')}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid h-32 grid-cols-7 gap-1 overflow-y-auto px-3 py-3">
                  {EMOJI_GROUPS[emojiGroup].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setDraft((current) => `${current}${emoji}`)}
                      className="grid h-9 w-9 place-items-center rounded-lg text-2xl transition hover:bg-black/5 active:scale-95 dark:hover:bg-white/5"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="shrink-0 border-t border-black/5 bg-noir-900 dark:border-white/5">
              {editingMessage && (
                <div className="mx-3 mt-3 flex items-center gap-2 rounded-2xl bg-amber-500/10 px-3 py-2 ring-1 ring-amber-500/20">
                  <Pencil className="h-4 w-4 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-amber-500">{t('editingMessage')}</p>
                    <p className="truncate text-xs text-accent-muted">{editingMessage.body}</p>
                  </div>
                  <button type="button" onClick={cancelEdit} className="rounded-full p-1 text-accent-muted transition hover:bg-black/5 hover:text-accent dark:hover:bg-white/10" aria-label={t('cancelEdit')}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {replyTo && (
                <div className="mx-3 mt-3 flex items-center gap-2 rounded-2xl bg-black/5 px-3 py-2 ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/5">
                  <Reply className="h-4 w-4 shrink-0 text-blue-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-blue-500">
                      {Number(replyTo.senderId) === Number(user?.id) ? t('chatYou') : replyTo.senderName}
                    </p>
                    <p className="truncate text-xs text-accent-muted">{messageSummary(replyTo, t)}</p>
                  </div>
                  <button type="button" onClick={() => setReplyTo(null)} className="rounded-full p-1 text-accent-muted transition hover:bg-black/5 hover:text-accent dark:hover:bg-white/10" aria-label={t('cancelReply')}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <form onSubmit={sendMessage} className="flex items-center gap-2 px-3 py-3">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={Boolean(editingMessage)} className="rounded-full p-2 text-blue-600 transition hover:bg-blue-600/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40" aria-label={t('attachImage')}>
                  <ImagePlus className="h-5 w-5" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => addFiles(event.target.files)} />
                <div className="flex min-w-0 flex-1 items-center rounded-full bg-black/5 px-4 py-2.5 ring-1 ring-black/5 transition focus-within:ring-blue-500/40 dark:bg-white/5 dark:ring-white/5">
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onFocus={() => setEmojiOpen(false)}
                    placeholder={t('messagePlaceholder')}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-accent-muted"
                  />
                  <button type="button" onClick={() => setEmojiOpen((current) => !current)} className="ml-2 text-accent-muted transition hover:text-amber-400" aria-label={t('addEmoji')}>
                    <Smile className="h-5 w-5" />
                  </button>
                </div>
                <button type="submit" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 active:scale-95" aria-label={editingMessage ? t('saveEdit') : t('sendMessage')}>
                  {editingMessage ? <Check className={cn('h-4 w-4', isSending && 'animate-pulse')} /> : <Send className={cn('h-4 w-4 fill-current', isSending && 'animate-pulse')} />}
                </button>
              </form>
            </div>
          </motion.section>

          <AnimatePresence>
            {lightbox && (
              <motion.div
                className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) setLightbox(null);
                }}
              >
                <button type="button" onClick={() => setLightbox(null)} className="absolute right-5 top-5 rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white" aria-label={t('closePreview')}>
                  <X className="h-6 w-6" />
                </button>
                <img src={lightbox} alt={t('imagePreview')} className="max-h-full max-w-full rounded-xl object-contain shadow-2xl" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const messageSummary = (message, t) => {
  if (message.body) return message.body;
  if (message.attachments?.length) return message.attachments.length === 1 ? t('attachment') : `${message.attachments.length} ${t('attachments')}`;
  return t('message');
};

const ReplyPreview = ({ replyTo, isMine, currentUserId, t }) => (
  <div
    className={cn(
      'mb-2 border-l-2 py-1 pl-2',
      isMine ? 'border-white/65 text-white/75' : 'border-blue-500/70 text-accent-muted',
    )}
  >
    <p className="truncate text-xs font-semibold">
      {Number(replyTo.senderId) === Number(currentUserId) ? t('chatYou') : replyTo.senderName}
    </p>
    <p className="line-clamp-2 text-xs">{messageSummary(replyTo, t)}</p>
  </div>
);

const reactionCounts = (reactions) =>
  (reactions || []).reduce((counts, item) => {
    counts[item.reaction] = (counts[item.reaction] || 0) + 1;
    return counts;
  }, {});

const MessageActions = ({ message, isMine, activeActionId, setActiveActionId, t, onReply, onEdit, onDelete, onReact }) => {
  const menuRef = useRef(null);
  const canUseActions = Number.isFinite(Number(message.id));
  const open = activeActionId === message.id;

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setActiveActionId(null);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('touchstart', closeOnOutsideClick);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('touchstart', closeOnOutsideClick);
    };
  }, [open, setActiveActionId]);

  if (!canUseActions) return null;

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setActiveActionId(open ? null : message.id)}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-accent-muted opacity-70 transition hover:bg-black/5 hover:text-blue-500 group-hover:opacity-100 dark:hover:bg-white/10"
        aria-label={t('messageActions')}
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className={cn('absolute bottom-8 z-20 w-44 rounded-xl border border-black/10 bg-noir-900 p-1.5 shadow-xl ring-1 ring-white/10', isMine ? 'right-0' : 'left-0')}>
          <div className="mb-1 flex items-center justify-between gap-1 border-b border-white/5 pb-1">
            {QUICK_REACTIONS.map((reaction) => (
              <button
                key={reaction}
                type="button"
                onClick={() => {
                  onReact(message, reaction);
                  setActiveActionId(null);
                }}
                className="grid h-7 w-7 place-items-center rounded-lg text-base transition hover:bg-white/10"
                aria-label={`${t('reactWith')} ${reaction}`}
              >
                {reaction}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              onReply(message);
              setActiveActionId(null);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-accent transition hover:bg-white/10"
          >
            <Reply className="h-3.5 w-3.5" />
            {t('replyToMessage')}
          </button>
          {isMine && message.body && (
            <button
              type="button"
              onClick={() => {
                onEdit(message);
                setActiveActionId(null);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-accent transition hover:bg-white/10"
            >
              <Pencil className="h-3.5 w-3.5" />
              {t('editMessage')}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onDelete(message, 'me');
              setActiveActionId(null);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-red-400 transition hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('deleteForMe')}
          </button>
          {isMine && (
            <button
              type="button"
              onClick={() => {
                onDelete(message, 'everyone');
                setActiveActionId(null);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-red-400 transition hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('deleteForEveryone')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const ReactionBadges = ({ reactions, isMine }) => {
  const counts = reactionCounts(reactions);
  const entries = Object.entries(counts);

  if (!entries.length) return null;

  return (
    <div className={cn('mt-1 flex flex-wrap gap-1', isMine ? 'justify-end' : 'justify-start')}>
      {entries.map(([reaction, count]) => (
        <span key={reaction} className="rounded-full bg-noir-900 px-1.5 py-0.5 text-[11px] leading-none text-accent shadow-sm ring-1 ring-white/10">
          {reaction}{count > 1 ? ` ${count}` : ''}
        </span>
      ))}
    </div>
  );
};

const MessageBubble = ({ message, supportName, userInitial, currentUserId, activeActionId, setActiveActionId, t, onReply, onEdit, onDelete, onReact, onImageClick }) => {
  const isMine = message.from === 'me';
  const imageAttachments = (message.attachments || []).filter((attachment) => String(attachment.mime_type || '').startsWith('image/'));
  const fileAttachments = (message.attachments || []).filter((attachment) => !String(attachment.mime_type || '').startsWith('image/'));

  return (
    <motion.div
      className={cn('flex items-end gap-2', isMine ? 'justify-end' : 'justify-start')}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18 }}
    >
      {!isMine && <Avatar label={supportName} />}
      {message.type === 'image' ? (
        <div className={cn('group flex max-w-[70%] items-center gap-1.5', isMine && 'flex-row-reverse')}>
          <div>
            <button
              type="button"
              onClick={() => onImageClick(message.body)}
              className={cn('overflow-hidden rounded-2xl shadow-sm', isMine ? 'rounded-br-md' : 'rounded-bl-md')}
            >
              <img src={message.body} alt={message.alt || ''} className="max-h-64 w-full object-cover" />
            </button>
            <ReactionBadges reactions={message.reactions} isMine={isMine} />
          </div>
          <MessageActions message={message} isMine={isMine} activeActionId={activeActionId} setActiveActionId={setActiveActionId} t={t} onReply={onReply} onEdit={onEdit} onDelete={onDelete} onReact={onReact} />
        </div>
      ) : (
        <div className={cn('group flex max-w-[78%] items-center gap-1.5', isMine && 'flex-row-reverse')}>
          <div className="min-w-0">
            <div
              className={cn(
                'min-w-0 rounded-2xl px-4 py-2.5 text-[14.5px] leading-snug shadow-sm',
                isMine
                  ? 'rounded-br-md bg-blue-600 text-white shadow-blue-600/15'
                  : 'rounded-bl-md bg-black/5 text-accent dark:bg-white/10',
              )}
            >
              {message.replyTo && <ReplyPreview replyTo={message.replyTo} isMine={isMine} currentUserId={currentUserId} t={t} />}
              {message.body && <p className="break-words">{message.body}</p>}
              {message.isEdited && <span className={cn('mt-1 block text-[10px]', isMine ? 'text-white/60' : 'text-accent-muted')}>{t('edited')}</span>}
              {imageAttachments.map((attachment) => {
                const url = attachmentUrl(attachment);
                return (
                  <button
                    key={attachment.id}
                    type="button"
                    onClick={() => onImageClick(url)}
                    className="mt-2 block overflow-hidden rounded-xl"
                  >
                    <img src={url} alt={attachment.file_name || ''} className="max-h-64 w-full object-cover" />
                  </button>
                );
              })}
              {fileAttachments.map((attachment) => {
                const url = attachmentUrl(attachment);
                return (
                  <a key={attachment.id} href={url} target="_blank" rel="noreferrer" className="mt-2 block text-xs underline">
                    {attachment.file_name || t('attachment')}
                  </a>
                );
              })}
            </div>
            <ReactionBadges reactions={message.reactions} isMine={isMine} />
          </div>
          <MessageActions message={message} isMine={isMine} activeActionId={activeActionId} setActiveActionId={setActiveActionId} t={t} onReply={onReply} onEdit={onEdit} onDelete={onDelete} onReact={onReact} />
        </div>
      )}
      {isMine && (
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">
          {userInitial}
        </div>
      )}
    </motion.div>
  );
};

const Avatar = ({ label }) => (
  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-600/10 text-[10px] font-black text-blue-600 ring-1 ring-blue-600/20">
    {label.charAt(0)}
  </div>
);
