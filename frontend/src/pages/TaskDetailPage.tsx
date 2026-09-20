import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { tasksApi, chatApi, reputationApi, safetyApi, skillsApi } from '../api/client';
import { TaskItem, Skill, ReportCategory } from '../types';
import { StatusBadge, VerifiedBadge } from '../components/Badges';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  CheckSquare,
  Clock,
  IndianRupee,
  Repeat,
  Play,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Star,
  Award,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ShieldAlert,
  User,
} from 'lucide-react';

export const TaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [task, setTask] = useState<TaskItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Cancellation Modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Rating Modal
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState('');

  // Endorsement Modal
  const [endorseModalOpen, setEndorseModalOpen] = useState(false);
  const [skillsList, setSkillsList] = useState<Skill[]>([]);
  const [endorseSkillId, setEndorseSkillId] = useState('');

  // Safety Report Modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState<ReportCategory>('NO_SHOW');
  const [reportDesc, setReportDesc] = useState('');

  const loadTask = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await tasksApi.getById(id);
      setTask(res);
    } catch (err: any) {
      console.error('Failed to load task', err);
      error(err.message || 'Task not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTask();
    skillsApi.getAll({ limit: 40 }).then((res) => {
      setSkillsList(res.items || []);
      if (res.items?.length > 0) setEndorseSkillId(res.items[0].id);
    }).catch(() => {});
  }, [id]);

  const isRequester = user?.id === task?.requesterId;
  const counterpartId = isRequester ? task?.helperId : task?.requesterId;
  const counterpartName = isRequester
    ? task?.helper?.name || 'Helper'
    : task?.requester?.name || 'Requester';

  const myConfirmed = isRequester
    ? !!task?.requesterCompletedAt
    : !!task?.helperCompletedAt;

  const partnerConfirmed = isRequester
    ? !!task?.helperCompletedAt
    : !!task?.requesterCompletedAt;

  const handleStartTask = async () => {
    if (!id) return;
    setUpdating(true);
    try {
      await tasksApi.updateStatus(id, { status: 'IN_PROGRESS' });
      success('Task is now in progress!');
      loadTask();
    } catch (err: any) {
      error(err.message || 'Failed to start task.');
    } finally {
      setUpdating(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!id) return;
    setUpdating(true);
    try {
      const updated = await tasksApi.updateStatus(id, { status: 'COMPLETED' });
      if (updated.status === 'COMPLETED') {
        success('Task fully confirmed and completed by both participants!');
        setRateModalOpen(true);
      } else {
        success('Your completion is confirmed. Waiting for peer confirmation (or 48h timeout).');
      }
      loadTask();
    } catch (err: any) {
      error(err.message || 'Failed to confirm completion.');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelTask = async () => {
    if (!id) return;
    if (!cancelReason.trim()) {
      error('Please provide a reason for cancelling.');
      return;
    }
    setUpdating(true);
    try {
      await tasksApi.updateStatus(id, { status: 'CANCELLED', cancelReason });
      success('Task cancelled.');
      setCancelModalOpen(false);
      loadTask();
    } catch (err: any) {
      error(err.message || 'Failed to cancel task.');
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenChat = async () => {
    if (!task || !counterpartId) return;
    try {
      const thread = await chatApi.createOrGetThread({
        participantBId: counterpartId,
        participantId: counterpartId,
        requestId: task.requestId || task.request?.id || '',
        taskId: task.id,
      });
      navigate(`/chat?threadId=${thread.id}`);
    } catch (err: any) {
      error(err.message || 'Failed to initiate chat.');
    }
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    try {
      await reputationApi.rateTask(task.id, {
        score: Number(ratingScore),
        comment: ratingComment || undefined,
      });
      success('Rating submitted! Thank you for fostering a trusted campus network.');
      setRateModalOpen(false);
    } catch (err: any) {
      error(err.message || 'Failed to submit rating.');
    }
  };

  const handleSubmitEndorsement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!counterpartId || !endorseSkillId) return;
    try {
      await reputationApi.endorseSkill({
        endorseeId: counterpartId,
        skillId: endorseSkillId,
      });
      success(`Skill endorsed for ${counterpartName}!`);
      setEndorseModalOpen(false);
    } catch (err: any) {
      error(err.message || 'Failed to endorse skill.');
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!counterpartId || !task) return;
    try {
      await safetyApi.createReport({
        reportedUserId: counterpartId,
        taskId: task.id,
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
        <p className="text-sm font-medium">Loading task details...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Task Not Found</h3>
        <Link to="/tasks" className="mt-4 inline-block text-xs font-bold text-indigo-600 hover:underline">
          ← Back to Tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        to="/tasks"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to my tasks</span>
      </Link>

      {/* Main Task Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-slate-400">Task Status:</span>
            <StatusBadge status={task.status} />
          </div>

          <div className="text-xs text-slate-500">
            Started: {task.startedAt ? new Date(task.startedAt).toLocaleDateString() : 'Pending'}
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
            {task.request?.title || 'Collaboration Task'}
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed">
            {task.request?.description}
          </p>
        </div>

        {/* Agreed Terms & Counterpart */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm">
          <div>
            <span className="text-xs font-bold uppercase text-slate-400 block mb-1">Your Role & Partner</span>
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              <span>You are the {isRequester ? 'Requester' : 'Helper'}</span>
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              Partner: <span className="font-semibold text-slate-800">{counterpartName}</span>
            </div>
          </div>

          <div>
            <span className="text-xs font-bold uppercase text-slate-400 block mb-1">Agreed Terms</span>
            <div className="font-bold text-slate-900 flex items-center gap-2">
              {task.agreedPrice ? (
                <>
                  <IndianRupee className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">₹{task.agreedPrice} agreed compensation</span>
                </>
              ) : (
                <>
                  <Repeat className="w-4 h-4 text-indigo-600" />
                  <span className="text-indigo-700">Skill Exchange Collaboration</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Dual Confirmation Progress indicator if in progress */}
        {task.status === 'IN_PROGRESS' && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
            <div className="font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Dual-Confirmation Lifecycle</span>
            </div>
            <p className="leading-relaxed">
              For fair task settlement, both students must confirm completion. If one party confirms, the other has 48 hours to confirm or dispute before auto-completion.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-200">
              <div className="flex items-center gap-1.5">
                {myConfirmed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-500" />
                )}
                <span>Your confirmation: <strong>{myConfirmed ? 'Done' : 'Pending'}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                {partnerConfirmed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-500" />
                )}
                <span>Peer confirmation: <strong>{partnerConfirmed ? 'Done' : 'Pending'}</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Cancelled Details Box */}
        {task.status === 'CANCELLED' && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Task Cancelled</span>
            </div>
            {task.cancellationReason && (
              <p>Reason provided: "{task.cancellationReason}"</p>
            )}
            <div className="text-rose-700">
              Cancelled on {task.cancelledAt ? new Date(task.cancelledAt).toLocaleString() : ''}
            </div>
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenChat}
              className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Open Chat</span>
            </button>

            <Link
              to={`/profile/${counterpartId}`}
              className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
            >
              View Profile
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {(task.status === 'PENDING' || task.status === 'ACCEPTED') && (
              <button
                onClick={handleStartTask}
                disabled={updating}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start Request</span>
              </button>
            )}

            {task.status === 'IN_PROGRESS' && (
              <>
                <button
                  onClick={() => setCancelModalOpen(true)}
                  className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs transition"
                >
                  Cancel Task
                </button>

                <button
                  onClick={handleCompleteTask}
                  disabled={updating || myConfirmed}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{myConfirmed ? 'Marked as Complete' : 'Confirm Completion'}</span>
                </button>
              </>
            )}

            {task.status === 'COMPLETED' && (
              <>
                <button
                  onClick={() => setRateModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                >
                  <Star className="w-3.5 h-3.5" />
                  <span>Rate Collaborator</span>
                </button>

                <button
                  onClick={() => setEndorseModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Endorse Skill</span>
                </button>
              </>
            )}

            <button
              onClick={() => setReportModalOpen(true)}
              className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-slate-100 transition"
              title="Report Safety Issue"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Active Task"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Cancelling an in-progress task halts collaboration. Please state the reason clearly for transparency.
          </p>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Cancellation Reason
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Mutual schedule conflict, requirements changed..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setCancelModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-sm"
            >
              Go Back
            </button>
            <button
              onClick={handleCancelTask}
              disabled={updating}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-sm transition disabled:opacity-50"
            >
              {updating ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Rate Collaborator Modal */}
      <Modal
        isOpen={rateModalOpen}
        onClose={() => setRateModalOpen(false)}
        title={`Rate your experience with ${counterpartName}`}
      >
        <form onSubmit={handleSubmitRating} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
              Star Rating (1 to 5)
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingScore(star)}
                  className="p-1.5 focus:outline-none transition"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= ratingScore
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 font-bold text-slate-800 text-sm">{ratingScore} / 5 Stars</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Qualitative Feedback (optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Prompt communicator, high technical quality, great explanations..."
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setRateModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-sm"
            >
              Later
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-sm transition"
            >
              Submit Rating
            </button>
          </div>
        </form>
      </Modal>

      {/* Endorse Skill Modal */}
      <Modal
        isOpen={endorseModalOpen}
        onClose={() => setEndorseModalOpen(false)}
        title={`Endorse a skill for ${counterpartName}`}
      >
        <form onSubmit={handleSubmitEndorsement} className="space-y-4">
          <p className="text-xs text-slate-600">
            Peer endorsements on SkillMate are earned through real completed tasks, adding tangible proof to student profiles.
          </p>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Select Skill Demonstrated
            </label>
            <select
              value={endorseSkillId}
              onChange={(e) => setEndorseSkillId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {skillsList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category || 'Skill'})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEndorseModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition"
            >
              Endorse Peer Skill
            </button>
          </div>
        </form>
      </Modal>

      {/* Report Modal */}
      <Modal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title="File Confidential Safety Report"
      >
        <form onSubmit={handleSubmitReport} className="space-y-4">
          <p className="text-xs text-slate-600">
            Reports are reviewed by campus moderators. The reported user will not know who filed this report.
          </p>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Violation Category
            </label>
            <select
              value={reportCategory}
              onChange={(e) => setReportCategory(e.target.value as ReportCategory)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="NO_SHOW">No Show / Ghosting</option>
              <option value="HARASSMENT">Harassment or Inappropriate Behavior</option>
              <option value="SCAM">Non-Payment / Scam</option>
              <option value="FAKE_PROFILE">Fake Student Identity</option>
              <option value="OTHER">Other Violation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Details of Incident
            </label>
            <textarea
              required
              rows={3}
              placeholder="Describe what occurred with timestamps or context..."
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
              Submit Report
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
