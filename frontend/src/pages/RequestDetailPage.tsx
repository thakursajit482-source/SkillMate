import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { requestsApi, offersApi, chatApi, skillsApi } from '../api/client';
import { RequestItem, OfferItem, Skill } from '../types';
import { RequestTypeBadge, StatusBadge, DistanceBadge, VerifiedBadge } from '../components/Badges';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  FileText,
  IndianRupee,
  Repeat,
  Sparkles,
  MapPin,
  Clock,
  Send,
  CheckCircle,
  XCircle,
  MessageSquare,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  User,
  ShieldCheck,
  Handshake,
} from 'lucide-react';

export const RequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isVerified } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [request, setRequest] = useState<RequestItem | null>(null);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Offer Submission Form (for non-owners)
  const [offerMessage, setOfferMessage] = useState('');
  const [counterPrice, setCounterPrice] = useState<number | undefined>(undefined);
  const [counterSkillId, setCounterSkillId] = useState<string>('');
  const [skillsList, setSkillsList] = useState<Skill[]>([]);
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // Cancel Request Modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [acceptingRequest, setAcceptingRequest] = useState(false);

  const isOwner = user?.id === request?.requesterId;

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const req = await requestsApi.getById(id);
      setRequest(req);
      if (req.type === 'PAID' && req.budget) {
        setCounterPrice(req.budget);
      }

      // If owner, fetch offers for request
      if (user?.id === req.requesterId) {
        const offersRes = await offersApi.getForRequest(id).catch(() => ({ items: [], total: 0 }));
        setOffers(offersRes.items || []);
      }
    } catch (err: any) {
      console.error('Error loading request', err);
      error(err.message || 'Could not load request');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    skillsApi.getAll({ limit: 40 }).then((res) => {
      setSkillsList(res.items || []);
      if (res.items?.length > 0) setCounterSkillId(res.items[0].id);
    }).catch(() => {});
  }, [id, user?.id]);

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!isVerified) {
      error('Please complete student verification before submitting offers.');
      return;
    }
    if (!offerMessage.trim()) {
      error('Please include a message with your offer.');
      return;
    }

    setSubmittingOffer(true);
    try {
      await offersApi.create(id, {
        message: offerMessage,
        proposedPrice: request?.type === 'PAID' ? Number(counterPrice) : undefined,
        proposedSkillId: request?.type === 'SKILL_EXCHANGE' ? counterSkillId : undefined,
      });
      success('Offer submitted! The request owner will be notified.');
      setOfferMessage('');
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to submit offer.');
    } finally {
      setSubmittingOffer(false);
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    try {
      const res = await offersApi.accept(offerId);
      success('Offer accepted! A collaboration task has been initiated.');
      if (res.task?.id) {
        navigate(`/tasks/${res.task.id}`);
      } else {
        loadData();
      }
    } catch (err: any) {
      error(err.message || 'Failed to accept offer.');
    }
  };

  const handleDeclineOffer = async (offerId: string) => {
    try {
      await offersApi.decline(offerId);
      success('Offer declined.');
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to decline offer.');
    }
  };

  const handleCancelRequest = async () => {
    if (!id) return;
    setCancelling(true);
    try {
      await requestsApi.cancel(id, cancelReason);
      success('Request cancelled.');
      setCancelModalOpen(false);
      navigate('/requests/mine');
    } catch (err: any) {
      error(err.message || 'Failed to cancel request.');
    } finally {
      setCancelling(false);
    }
  };

  const handleAcceptRequestDirectly = async () => {
    if (!id) return;
    if (!isVerified) {
      error('Please complete student verification before accepting requests.');
      return;
    }
    setAcceptingRequest(true);
    try {
      const res = await requestsApi.accept(id);
      success('Request Accepted');
      if (res.task?.id) {
        navigate(`/tasks/${res.task.id}`);
      } else {
        navigate('/offers');
      }
    } catch (err: any) {
      error(err.message || 'Failed to accept request.');
    } finally {
      setAcceptingRequest(false);
    }
  };

  const handleStartChat = async (targetUserId: string) => {
    if (!id) return;
    try {
      const thread = await chatApi.createOrGetThread({
        participantBId: targetUserId,
        requestId: id,
      });
      navigate(`/chat?threadId=${thread.id}`);
    } catch (err: any) {
      error(err.message || 'Chat unlocks once an offer or task pairing exists.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-sm font-medium">Loading request details...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Request Not Found</h3>
        <p className="text-slate-500 text-sm mt-1">This request might have been cancelled or does not exist.</p>
        <Link to="/discover/requests" className="mt-4 inline-block text-xs font-bold text-indigo-600 hover:underline">
          ← Back to Requests
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        to="/discover/requests"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to all requests</span>
      </Link>

      {/* Main Request Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <RequestTypeBadge type={request.type} />
            <StatusBadge status={request.status} />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            <span>Posted {new Date(request.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-3">
            {request.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <DistanceBadge
              distanceBand={request.requester?.distanceBand}
              approximateArea={request.approximateArea}
            />
            {request.category && (
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md">
                {request.category}
              </span>
            )}
          </div>

          {request.status === 'MATCHED' && (
            <div className="p-4 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-800">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-bold text-sm">
                  {isOwner ? 'Your request has been accepted' : 'This request has been accepted and matched.'}
                </span>
              </div>
              <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                Matched
              </span>
            </div>
          )}

          <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-line bg-slate-50/50 p-4 rounded-xl border border-slate-100 mb-6">
            {request.description}
          </div>

          {/* Terms Highlight Box */}
          <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 flex flex-wrap items-center justify-between gap-4 text-sm">
            {request.type === 'PAID' && (
              <div className="flex items-center gap-2 text-emerald-900 font-bold">
                <IndianRupee className="w-5 h-5 text-emerald-600" />
                <span>Budget Offered: ₹{request.budget ?? 'Negotiable'}</span>
              </div>
            )}
            {request.type === 'SKILL_EXCHANGE' && (
              <div className="flex items-center gap-2 text-indigo-900 font-bold">
                <Repeat className="w-5 h-5 text-indigo-600" />
                <span>Exchanging Skill: {request.exchangeSkill?.name || 'Peer Knowledge'}</span>
              </div>
            )}
            {request.type === 'SOCIAL' && (
              <div className="flex items-center gap-2 text-purple-900 font-bold">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <span>Social Format: {request.socialVibe || 'Study / Hackathon Collaboration'}</span>
              </div>
            )}

            {isOwner && request.status === 'OPEN' && (
              <button
                onClick={() => setCancelModalOpen(true)}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 underline ml-auto"
              >
                Cancel Request
              </button>
            )}
          </div>
        </div>

        {/* Requester Info Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              {request.requester?.name?.charAt(0) || <User className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                {request.requester?.name || 'Student'}
                <VerifiedBadge status={request.requester?.verificationStatus} showText={false} />
              </div>
              <div className="text-xs text-slate-500">
                {request.requester?.college?.name || 'Mumbai Student'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/profile/${request.requesterId}`}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
            >
              Public Profile
            </Link>
            {!isOwner && (
              <button
                onClick={() => handleStartChat(request.requesterId)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 flex items-center gap-1 transition"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Message</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Conditional Section: OWNER View (Offers List) vs NON-OWNER View (Make an Offer Form) */}
      {isOwner ? (
        /* Owner View: Offers Received */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Handshake className="w-5 h-5 text-indigo-600" />
              Offers Received ({offers.length})
            </h2>
          </div>

          {offers.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No offers received yet. Your request is visible to verified students nearby.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="p-4 rounded-xl border border-slate-100 hover:border-indigo-100 bg-slate-50/50 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                        {offer.offeringUser?.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          {offer.offeringUser?.name}
                          <VerifiedBadge status={offer.offeringUser?.verificationStatus} showText={false} />
                        </div>
                        <div className="text-xs text-slate-500">
                          {offer.offeringUser?.college?.name}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={offer.status} />
                  </div>

                  <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-100 leading-relaxed">
                    "{offer.message}"
                  </p>

                  {/* Counter terms info */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="font-semibold text-slate-700">
                      {offer.proposedPrice && `Proposed Price: ₹${offer.proposedPrice}`}
                      {offer.proposedSkill && `Proposed Skill: ${offer.proposedSkill.name}`}
                    </div>

                    {offer.status === 'PENDING' && request.status === 'OPEN' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeclineOffer(offer.id)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 font-bold text-xs transition"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleAcceptOffer(offer.id)}
                          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition"
                        >
                          Accept Offer & Create Task
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Non-Owner View: Accept directly or Submit an Offer */
        request.status === 'OPEN' && (
          <div className="space-y-6">
            {/* Quick Direct Accept Card */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  Accept Collaboration Request
                </h3>
                <p className="text-xs text-emerald-800 mt-1">
                  {request.type === 'PAID' && request.budget
                    ? `Accept this request at the stated budget of ₹${request.budget} and initiate the collaboration task immediately.`
                    : 'Accept this request to confirm collaboration terms and initiate a peer task.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleAcceptRequestDirectly}
                disabled={acceptingRequest}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 flex items-center gap-2 shrink-0"
              >
                {acceptingRequest ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Accepting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Accept Request {request.type === 'PAID' && request.budget ? `(₹${request.budget})` : ''}</span>
                  </>
                )}
              </button>
            </div>

            {/* Custom Proposal Form */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-600" />
                Or Propose Custom Terms
              </h2>

            <form onSubmit={handleCreateOffer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Your Proposal Message
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Introduce yourself, your experience with this topic, and when you're available..."
                  value={offerMessage}
                  onChange={(e) => setOfferMessage(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {request.type === 'PAID' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                    Your Rate / Counter-Price (₹ INR)
                  </label>
                  <div className="relative max-w-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <IndianRupee className="w-4 h-4" />
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={counterPrice ?? ''}
                      onChange={(e) => setCounterPrice(Number(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {request.type === 'SKILL_EXCHANGE' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                    Skill You Are Willing to Teach
                  </label>
                  <select
                    value={counterSkillId}
                    onChange={(e) => setCounterSkillId(e.target.value)}
                    className="w-full max-w-xs p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {skillsList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={submittingOffer}
                className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition disabled:opacity-50 flex items-center gap-2"
              >
                {submittingOffer ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Offer...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Offer to Requester</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
          </div>
        )
      )}

      {/* Cancel Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel This Request"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Cancelling will close this request to new offers and decline any pending proposals.
          </p>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Reason for Cancellation (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Found help elsewhere, no longer needed"
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
              Keep Request Open
            </button>
            <button
              onClick={handleCancelRequest}
              disabled={cancelling}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-sm transition disabled:opacity-50"
            >
              {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
