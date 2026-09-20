import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tasksApi, requestsApi, offersApi, reputationApi } from '../api/client';
import { TaskItem, RequestItem, OfferItem, ReputationSummary } from '../types';
import { VerifiedBadge, StatusBadge, RequestTypeBadge } from '../components/Badges';
import {
  Sparkles,
  ArrowRight,
  CheckSquare,
  FileText,
  Handshake,
  Star,
  Users,
  Compass,
  PlusCircle,
  Clock,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, isVerified } = useAuth();

  const [activeTasks, setActiveTasks] = useState<TaskItem[]>([]);
  const [myRequests, setMyRequests] = useState<RequestItem[]>([]);
  const [reputation, setReputation] = useState<ReputationSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [tasksRes, reqsRes] = await Promise.all([
          tasksApi.findMine({ limit: 5 }).catch(() => ({ items: [], total: 0 })),
          requestsApi.findMine({ limit: 5 }).catch(() => ({ items: [], total: 0 })),
        ]);

        setActiveTasks(tasksRes.items || []);
        setMyRequests(reqsRes.items || []);

        if (user?.id) {
          const rep = await reputationApi.getReputation(user.id).catch(() => null);
          setReputation(rep);
        }
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.id]);

  return (
    <div className="space-y-8">
      {/* Welcome & Status Bar */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Hello, {user?.name || 'Student'}! 👋
            </h1>
            <VerifiedBadge status={user?.verification?.status || (isVerified ? 'VERIFIED' : user?.verificationStatus || 'UNVERIFIED')} />
          </div>
          <p className="text-slate-500 text-sm">
            {user?.verification?.college?.name
              ? `${user.verification.college.name}`
              : 'Campus peer network for MMR students'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/requests/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Post Request</span>
          </Link>
          <Link
            to="/discover/students"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition"
          >
            <Users className="w-4 h-4" />
            <span>Find Peers</span>
          </Link>
        </div>
      </div>

      {/* Verification Notice Card if not verified */}
      {!isVerified && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-950">
                {user?.verification?.status === 'PENDING' || user?.verificationStatus === 'PENDING'
                  ? 'Student ID Verification Pending Review'
                  : 'Verify your College ID to Unlock Full Access'}
              </h3>
              <p className="text-sm text-amber-800 mt-1 max-w-xl">
                {user?.verification?.status === 'PENDING' || user?.verificationStatus === 'PENDING'
                  ? 'Our admin team is validating your student credentials. You will be notified once approved.'
                  : 'College verification lets you post requests, send offers, and chat with peers across Mumbai campuses.'}
              </p>
            </div>
          </div>
          <Link
            to="/verification"
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shrink-0 shadow-sm transition"
          >
            {user?.verification?.status === 'PENDING' || user?.verificationStatus === 'PENDING' ? 'View Details' : 'Verify Now'}
          </Link>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase text-slate-500">Active Tasks</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {activeTasks.filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length}
          </div>
          <Link to="/tasks" className="text-xs font-semibold text-indigo-600 hover:underline mt-2 inline-block">
            View all tasks →
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase text-slate-500">My Requests</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{myRequests.length}</div>
          <Link to="/requests/mine" className="text-xs font-semibold text-emerald-600 hover:underline mt-2 inline-block">
            Manage requests →
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase text-slate-500">Rating</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Star className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {reputation?.averageRating ? reputation.averageRating.toFixed(1) : '5.0'}
            <span className="text-xs text-slate-400 font-normal ml-1">/ 5.0</span>
          </div>
          <span className="text-xs text-slate-500 mt-2 inline-block">
            {reputation?.totalRatings || 0} peer review{(reputation?.totalRatings || 0) === 1 ? '' : 's'}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase text-slate-500">Reliability</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {reputation?.reliabilityScore ? Math.round(reputation.reliabilityScore) : 100}%
          </div>
          <span className="text-xs text-slate-500 mt-2 inline-block">
            {reputation?.completedTasksCount || 0} tasks completed
          </span>
        </div>
      </div>

      {/* Main Two-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Collaboration Tasks */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Active Collaborations</h2>
            </div>
            <Link to="/tasks" className="text-xs font-semibold text-indigo-600 hover:underline">
              All Tasks
            </Link>
          </div>

          {activeTasks.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No ongoing tasks yet.</p>
              <Link
                to="/discover/requests"
                className="mt-3 inline-block text-xs font-bold text-indigo-600 hover:underline"
              >
                Browse requests to offer help →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTasks.slice(0, 4).map((task) => (
                <Link
                  key={task.id}
                  to={`/tasks/${task.id}`}
                  className="block p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-slate-900 truncate max-w-[220px]">
                      {task.request?.title || 'Collaboration Task'}
                    </span>
                    <StatusBadge status={task.status} />
                  </div>
                  <div className="text-xs text-slate-500 flex items-center justify-between">
                    <span>
                      {task.requesterId === user?.id
                        ? `Helper: ${task.helper?.name || 'Peer'}`
                        : `Requester: ${task.requester?.name || 'Peer'}`}
                    </span>
                    <span className="font-semibold text-slate-700">
                      {task.agreedPrice ? `₹${task.agreedPrice}` : 'Skill Swap'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* My Open Requests */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">My Requests</h2>
            </div>
            <Link to="/requests/mine" className="text-xs font-semibold text-emerald-600 hover:underline">
              View All
            </Link>
          </div>

          {myRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">You haven't posted any requests yet.</p>
              <Link
                to="/requests/new"
                className="mt-3 inline-block text-xs font-bold text-emerald-600 hover:underline"
              >
                Create your first request →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.slice(0, 4).map((req) => (
                <Link
                  key={req.id}
                  to={`/requests/${req.id}`}
                  className="block p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-slate-900 truncate max-w-[220px]">
                      {req.title}
                    </span>
                    <RequestTypeBadge type={req.type} />
                  </div>
                  <div className="text-xs text-slate-500 flex items-center justify-between">
                    <span>{req.approximateArea || 'Mumbai Campus'}</span>
                    <span className="font-semibold text-indigo-600">
                      {req._count?.offers || req.offers?.length || 0} offer(s)
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
