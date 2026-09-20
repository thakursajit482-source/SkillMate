import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { chatApi } from '../api/client';
import { ChatThreadItem, ChatMessageItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { VerifiedBadge } from '../components/Badges';
import {
  MessageSquare,
  Send,
  Loader2,
  Check,
  CheckCheck,
  Clock,
  User,
  Sparkles,
} from 'lucide-react';

export const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const { error } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [threads, setThreads] = useState<ChatThreadItem[]>([]);
  const [activeThread, setActiveThread] = useState<ChatThreadItem | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const activeThreadRef = useRef<ChatThreadItem | null>(null);

  useEffect(() => {
    activeThreadRef.current = activeThread;
  }, [activeThread]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load threads on mount
  const loadThreads = async () => {
    setLoadingThreads(true);
    try {
      const res = await chatApi.getThreads();
      setThreads(res || []);

      const queryThreadId = searchParams.get('threadId');
      if (queryThreadId) {
        const found = res.find((t) => t.id === queryThreadId);
        if (found) setActiveThread(found);
      } else if (res.length > 0) {
        setActiveThread(res[0]);
      }
    } catch (err: any) {
      console.error('Failed to load chat threads', err);
      error(err.message || 'Failed to load conversations.');
    } finally {
      setLoadingThreads(false);
    }
  };

  useEffect(() => {
    loadThreads();
  }, []);

  // When active thread changes: join socket room and fetch messages
  useEffect(() => {
    if (!activeThread) return;

    setLoadingMessages(true);
    chatApi
      .getMessages(activeThread.id, { limit: 100 })
      .then((res: any) => {
        const items = res?.items || res?.data || (Array.isArray(res) ? res : []);
        setMessages(items);
        scrollToBottom();
      })
      .catch((err) => {
        console.error('Error fetching messages', err);
      })
      .finally(() => {
        setLoadingMessages(false);
      });

    // Socket room join
    if (socket) {
      socket.emit('joinThread', { threadId: activeThread.id });
    }

    return () => {
      if (socket) {
        socket.emit('leaveThread', { threadId: activeThread.id });
      }
    };
  }, [activeThread?.id, socket]);

  // Re-join active thread if socket connects or reconnects
  useEffect(() => {
    if (!socket) return;
    const handleConnect = () => {
      if (activeThreadRef.current) {
        socket.emit('joinThread', { threadId: activeThreadRef.current.id });
      }
    };
    socket.on('connect', handleConnect);
    return () => {
      socket.off('connect', handleConnect);
    };
  }, [socket]);

  // Socket listener for new incoming messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: any) => {
      if (!msg) return;
      const normalizedMsg: ChatMessageItem = {
        ...msg,
        createdAt: msg.createdAt || msg.sentAt || new Date().toISOString(),
        isRead: msg.isRead !== undefined ? msg.isRead : !!msg.readAt,
        sender: msg.sender || (user && msg.senderId === user.id ? { id: user.id, name: user.name } : undefined),
      };

      const currentThreadId = activeThreadRef.current?.id;
      if (currentThreadId && normalizedMsg.threadId === currentThreadId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === normalizedMsg.id)) return prev;
          return [...prev, normalizedMsg];
        });
        scrollToBottom();
      }

      // Update thread lastMessage in threads list
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id === normalizedMsg.threadId) {
            return { ...t, lastMessage: normalizedMsg, updatedAt: normalizedMsg.createdAt };
          }
          return t;
        })
      );
    };

    socket.on('newMessage', handleNewMessage);

    return () => {
      socket.off('newMessage', handleNewMessage);
    };
  }, [socket, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !newMessageText.trim() || sending) return;

    const textToSend = newMessageText.trim();
    setNewMessageText('');
    setSending(true);

    try {
      const sent = await chatApi.sendMessage(activeThread.id, textToSend);
      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
      scrollToBottom();
    } catch (err: any) {
      error(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const getOtherParticipant = (thread: ChatThreadItem) => {
    if (thread.participantAId === user?.id) {
      return thread.participantB || { name: 'Collaborator' };
    }
    return thread.participantA || { name: 'Collaborator' };
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[calc(100vh-8.5rem)] flex flex-col md:flex-row">
      {/* Threads Sidebar */}
      <div className="w-full md:w-80 border-r border-slate-200 flex flex-col shrink-0 bg-slate-50/50">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h2 className="text-lg font-bold text-slate-900 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              Messages
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
              title={isConnected ? 'Live Socket Connected' : 'Connecting to Socket...'}
            />
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loadingThreads ? (
            <div className="p-8 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
              <p className="text-xs">Loading conversations...</p>
            </div>
          ) : threads.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No active chat threads yet.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Chat unlocks when you submit or accept an offer on a request.
              </p>
            </div>
          ) : (
            threads.map((thread) => {
              const other = getOtherParticipant(thread);
              const isActive = activeThread?.id === thread.id;

              return (
                <button
                  key={thread.id}
                  onClick={() => {
                    setActiveThread(thread);
                    setSearchParams({ threadId: thread.id });
                  }}
                  className={`w-full p-3.5 text-left flex items-start gap-3 transition ${
                    isActive ? 'bg-indigo-50/80 border-l-4 border-indigo-600' : 'hover:bg-slate-100/70'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {other.name?.charAt(0) || <User className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {other.name}
                      </span>
                      {thread.lastMessage && (
                        <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                          {new Date(thread.lastMessage.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {thread.lastMessage?.content || 'Started a conversation'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Conversation Window */}
      <div className="flex-1 flex flex-col bg-white">
        {activeThread ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                  {getOtherParticipant(activeThread).name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {getOtherParticipant(activeThread).name}
                  </h3>
                  <div className="text-[11px] text-slate-400">
                    Cross-Campus Peer Conversation
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-slate-50/30">
              {loadingMessages ? (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-1" />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Sparkles className="w-8 h-8 text-indigo-400 mb-2" />
                  <p className="text-sm font-medium text-slate-700">Start the conversation</p>
                  <p className="text-xs text-slate-400 max-w-xs text-center mt-1">
                    Coordinate meeting times, review deliverables, or exchange questions.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === user?.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          isMine
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 px-1">
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isMine && (
                          <span>
                            {msg.isRead ? (
                              <CheckCheck className="w-3 h-3 text-indigo-500" />
                            ) : (
                              <Check className="w-3 h-3 text-slate-400" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Type your message..."
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                className="flex-1 py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
              <button
                type="submit"
                disabled={!newMessageText.trim() || sending}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
            <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-base font-bold text-slate-700">Select a conversation</p>
            <p className="text-xs text-slate-400 mt-1 text-center max-w-sm">
              Communicate in real-time with peer helpers, study partners, and task collaborators.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
