import React, { useState, useEffect } from 'react';
import { safetyApi } from '../api/client';
import { BlockItem, ReportItem } from '../types';
import { StatusBadge } from '../components/Badges';
import { useToast } from '../context/ToastContext';
import {
  Settings,
  Shield,
  Ban,
  FileText,
  Trash2,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { success, error } = useToast();
  const [blockedUsers, setBlockedUsers] = useState<BlockItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [blocksRes, reportsRes] = await Promise.all([
        safetyApi.getBlockedUsers().catch(() => []),
        safetyApi.getMyReports().catch(() => ({ items: [], total: 0 })),
      ]);
      setBlockedUsers(blocksRes || []);
      setReports(reportsRes.items || []);
    } catch (err: any) {
      console.error('Failed to load safety settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUnblock = async (blockedId: string) => {
    try {
      await safetyApi.unblockUser(blockedId);
      success('User unblocked.');
      setBlockedUsers((prev) => prev.filter((b) => b.blockedId !== blockedId));
    } catch (err: any) {
      error(err.message || 'Failed to unblock user.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-sm font-medium">Loading safety settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-indigo-600" />
          Safety & Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage your blocked peers, trust preferences, and tracked safety tickets.
        </p>
      </div>

      {/* Blocked Users Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
          <Ban className="w-5 h-5 text-rose-600" />
          <h2 className="text-lg font-bold text-slate-900">
            Blocked Students ({blockedUsers.length})
          </h2>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Blocked students cannot discover your profile, view your posted requests, or initiate chats with you.
        </p>

        {blockedUsers.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            You haven't blocked any users.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {blockedUsers.map((b) => (
              <div
                key={b.id}
                className="py-3 flex items-center justify-between gap-4"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {b.blocked?.name || 'Blocked Student'}
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Blocked on {new Date(b.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <button
                  onClick={() => handleUnblock(b.blockedId)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submitted Reports Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
          <Shield className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">
            Your Safety Reports ({reports.length})
          </h2>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Reports filed by you are confidential and reviewed by campus moderators to ensure safety.
        </p>

        {reports.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            You have not filed any safety reports.
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                    {report.category.replace('_', ' ')}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      report.status === 'RESOLVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : report.status === 'REVIEWED'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {report.status.toLowerCase()}
                  </span>
                </div>

                <p className="text-xs text-slate-700">{report.description}</p>
                <div className="text-[10px] text-slate-400">
                  Filed on {new Date(report.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
