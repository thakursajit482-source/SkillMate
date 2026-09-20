import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { profilesApi, reputationApi, chatApi, safetyApi, requestsApi } from '../api/client';
import { PublicProfile, ReputationSummary, RequestType, ReportCategory } from '../types';
import { VerifiedBadge, DistanceBadge } from '../components/Badges';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  User as UserIcon,
  Star,
  Award,
  Calendar,
  Clock,
  Send,
  MessageSquare,
  ShieldAlert,
  Ban,
  Loader2,
  ChevronLeft,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const PublicProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isVerified } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [reputation, setReputation] = useState<ReputationSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Direct Request Modal
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqType, setReqType] = useState<RequestType>('PAID');
  const [budget, setBudget] = useState<number>(350);
  const [submittingReq, setSubmittingReq] = useState(false);

  // Report Modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState<ReportCategory>('OTHER');
  const [reportDesc, setReportDesc] = useState('');

  // Block Modal
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const isOwnProfile = user?.id === id;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      profilesApi.getPublicProfile(id).catch(() => null),
      reputationApi.getReputation(id).catch(() => null),
    ])
      .then(([pRes, rRes]) => {
        setProfile(pRes);
        setReputation(rRes);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handleStartChat = async () => {
    if (!id) return;
    try {
      const thread = await chatApi.createOrGetThread({ participantBId: id });
      navigate(`/chat?threadId=${thread.id}`);
    } catch (err: any) {
      error(err.message || 'Chat unlocks once a request or offer relationship exists.');
    }
  };

  const handleDirectRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !profile) return;
    if (!isVerified) {
      error('Please complete student verification before creating requests.');
      return;
    }

    setSubmittingReq(true);
    try {
      await requestsApi.create({
        title: reqTitle || `Collaboration with ${profile.name}`,
        description: reqDesc,
        type: reqType,
        skillId: profile.skills?.[0]?.id || undefined,
        budget: reqType === 'PAID' ? Number(budget) : undefined,
        targetUserId: id,
      });
      success(`Direct request sent to ${profile.name}!`);
      setRequestModalOpen(false);
      setReqDesc('');
    } catch (err: any) {
      error(err.message || 'Failed to send request.');
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleBlockUser = async () => {
    if (!id) return;
    setBlocking(true);
    try {
      await safetyApi.blockUser(id);
      success('User has been blocked. They can no longer interact with you.');
      setBlockModalOpen(false);
      navigate('/dashboard');
    } catch (err: any) {
      error(err.message || 'Failed to block user.');
    } finally {
      setBlocking(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await safetyApi.createReport({
        reportedUserId: id,
        category: reportCategory,
        description: reportDesc,
      });
      success('Confidential report submitted to admin queue.');
      setReportModalOpen(false);
      setReportDesc('');
    } catch (err: any) {
      error(err.message || 'Failed to submit report.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-sm font-medium">Loading student profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
        <UserIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Student Profile Not Found</h3>
        <Link to="/discover/students" className="mt-4 inline-block text-xs font-bold text-indigo-600 hover:underline">
          ← Back to Students
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        to="/discover/students"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to student directory</span>
      </Link>

      {/* Main Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className="w-20 h-20 rounded-2xl bg-indigo-50 border-2 border-indigo-200 text-indigo-700 flex items-center justify-center font-black text-2xl shadow-inner">
              {profile.name.charAt(0)}
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{profile.name}</h1>
                <VerifiedBadge status={profile.verificationStatus} />
              </div>

              <p className="text-sm text-slate-600 font-medium mt-1">
                {profile.college?.name || 'Mumbai College Student'}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mt-2">
                <DistanceBadge
                  distanceBand={profile.distanceBand}
                  approximateArea={profile.approximateArea}
                />
                {profile.major && (
                  <span className="text-xs text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                    <GraduationCap className="w-3.5 h-3.5" />
                    {profile.major} {profile.gradYear ? `'${String(profile.gradYear).slice(2)}` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {!isOwnProfile && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  if (!isVerified) {
                    error('Please complete student verification before creating requests.');
                    return;
                  }
                  setRequestModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Direct Request</span>
              </button>

              <button
                onClick={handleStartChat}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Message</span>
              </button>

              <button
                onClick={() => setBlockModalOpen(true)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
                title="Block User"
              >
                <Ban className="w-4 h-4" />
              </button>

              <button
                onClick={() => setReportModalOpen(true)}
                className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-slate-100 transition"
                title="Report Safety Issue"
              >
                <ShieldAlert className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">About</h3>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Reputation Metrics Grid */}
        <div>
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-3">Reputation & Track Record</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <div className="flex items-center justify-center gap-1 text-lg font-black text-slate-900">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{reputation?.averageRating ? reputation.averageRating.toFixed(1) : '5.0'}</span>
              </div>
              <span className="text-[11px] text-slate-500">
                {reputation?.totalRatings || 0} peer rating{(reputation?.totalRatings || 0) === 1 ? '' : 's'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <div className="text-lg font-black text-slate-900">
                {reputation?.completedTasksCount || 0}
              </div>
              <span className="text-[11px] text-slate-500">Tasks Completed</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <div className="text-lg font-black text-emerald-600">
                {reputation?.completionRate ? Math.round(reputation.completionRate) : 100}%
              </div>
              <span className="text-[11px] text-slate-500">Completion Rate</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <div className="text-lg font-black text-indigo-600">
                {reputation?.reliabilityScore ? Math.round(reputation.reliabilityScore) : 100}%
              </div>
              <span className="text-[11px] text-slate-500">Reliability Score</span>
            </div>
          </div>
        </div>

        {/* Skills Section */}
        <div>
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-3">Skills Offered</h3>
          {profile.skills?.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No skills listed yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {profile.skills?.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900">{s.name}</div>
                    <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md capitalize">
                      {s.level.toLowerCase()}
                    </span>
                  </div>
                  {s.endorsementCount > 0 && (
                    <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-1 rounded-lg flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-600" />
                      +{s.endorsementCount}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Availability Schedule */}
        <div>
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-3">Weekly Free Hours</h3>
          {profile.availability?.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No recurring availability posted.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {profile.availability?.map((a) => (
                <div
                  key={a.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center gap-2.5 text-xs"
                >
                  <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900">
                      {a.specificDate || (a.dayOfWeek !== null && a.dayOfWeek !== undefined ? DAYS[a.dayOfWeek] : 'Scheduled Slot')}
                    </div>
                    <div className="text-slate-500 font-semibold">{a.startTime} – {a.endTime}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Direct Request Modal */}
      <Modal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        title={`Request Help from ${profile.name}`}
      >
        <form onSubmit={handleDirectRequest} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Request Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 1-on-1 tutoring on DSA Dynamic Programming"
              value={reqTitle}
              onChange={(e) => setReqTitle(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Type of Request
            </label>
            <select
              value={reqType}
              onChange={(e) => setReqType(e.target.value as RequestType)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="PAID">Paid Tutoring / Task</option>
              <option value="SKILL_EXCHANGE">Skill Exchange</option>
              <option value="SOCIAL">Study Session / Project</option>
            </select>
          </div>

          {reqType === 'PAID' && (
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Proposed Compensation (₹ INR)
              </label>
              <input
                type="number"
                min="50"
                step="50"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Details & Goals
            </label>
            <textarea
              required
              rows={3}
              placeholder="Explain the topic, assignment, or project deliverables..."
              value={reqDesc}
              onChange={(e) => setReqDesc(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setRequestModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingReq}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition disabled:opacity-50"
            >
              {submittingReq ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Block Modal */}
      <Modal
        isOpen={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        title={`Block ${profile.name}?`}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Blocking is unilateral and silent. You will no longer discover each other, see each other's requests, or be able to exchange messages.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setBlockModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleBlockUser}
              disabled={blocking}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-sm transition disabled:opacity-50"
            >
              {blocking ? 'Blocking...' : 'Block Student'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Report Modal */}
      <Modal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title={`Report ${profile.name}`}
      >
        <form onSubmit={handleSubmitReport} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Report Reason
            </label>
            <select
              value={reportCategory}
              onChange={(e) => setReportCategory(e.target.value as ReportCategory)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="HARASSMENT">Harassment or Abusive Behavior</option>
              <option value="FAKE_PROFILE">Fake Student Profile</option>
              <option value="SCAM">Scam or Fraud</option>
              <option value="NO_SHOW">Repeated No-Show</option>
              <option value="OTHER">Other Issue</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Incident Details
            </label>
            <textarea
              required
              rows={3}
              placeholder="Describe the issue with specific context..."
              value={reportDesc}
              onChange={(e) => setReportDesc(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setReportModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-sm transition"
            >
              Submit Confidential Report
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
