import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient, offersApi } from '../api/client';
import { OfferItem } from '../types';
import { StatusBadge, RequestTypeBadge } from '../components/Badges';
import { useToast } from '../context/ToastContext';
import { Handshake, Clock, IndianRupee, Repeat, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export const OffersPage: React.FC = () => {
  const { success, error } = useToast();
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOffers = async () => {
    setLoading(true);
    try {
      const res = await offersApi.findMine();
      setOffers(res.items || []);
    } catch (err: any) {
      console.error('Error fetching offers', err);
      error(err.message || 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const handleWithdraw = async (offerId: string) => {
    try {
      await offersApi.withdraw(offerId);
      success('Offer withdrawn.');
      loadOffers();
    } catch (err: any) {
      error(err.message || 'Failed to withdraw offer.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Handshake className="w-7 h-7 text-indigo-600" />
          My Proposals & Offers
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Track offers you have sent to peers across campuses.
        </p>
      </div>

      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
          <p className="text-sm font-medium">Loading your offers...</p>
        </div>
      ) : offers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <Handshake className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No active offers sent</h3>
          <p className="text-slate-500 text-sm mt-1">
            Browse open requests nearby to offer tutoring, technical skills, or study collaboration.
          </p>
          <Link
            to="/discover/requests"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-sm hover:bg-indigo-700 transition"
          >
            <span>Explore Requests</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {offers.map((offer) => {
            const isAccepted = offer.status === 'ACCEPTED';
            const requester = (offer.request as any)?.requester;

            return (
              <div
                key={offer.id}
                className={`bg-white rounded-2xl border p-5 shadow-sm space-y-4 transition ${
                  isAccepted ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-slate-200 hover:border-indigo-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                      {offer.request?.title || 'Collaboration Request'}
                    </h3>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {isAccepted ? 'Accepted collaboration' : `Sent ${new Date(offer.createdAt).toLocaleDateString()}`}
                    </div>
                  </div>
                  <StatusBadge status={offer.status} />
                </div>

                {isAccepted && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between">
                    <span>Active Collaboration Engagement</span>
                    {offer.taskId && (
                      <Link
                        to={`/tasks/${offer.taskId}`}
                        className="text-xs font-bold text-emerald-700 underline hover:text-emerald-900"
                      >
                        Open Task →
                      </Link>
                    )}
                  </div>
                )}

                {requester && (
                  <div className="flex items-center gap-2.5 text-xs text-slate-600 bg-slate-50/60 p-2.5 rounded-xl border border-slate-100">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center">
                      {requester.name?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">{requester.name}</span>
                      {requester.college?.name && (
                        <span className="text-slate-400"> • {requester.college.name}</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                  "{offer.message}"
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                  <div className="font-semibold text-slate-700">
                    {offer.proposedPrice && `Offered Rate: ₹${offer.proposedPrice}`}
                    {offer.proposedSkill && `Skill: ${offer.proposedSkill.name}`}
                    {!offer.proposedPrice && !offer.proposedSkill && offer.request?.budget && `Budget: ₹${offer.request.budget}`}
                  </div>

                  <div className="flex items-center gap-2">
                    {offer.status === 'PENDING' && (
                      <button
                        onClick={() => handleWithdraw(offer.id)}
                        className="text-xs font-bold text-slate-500 hover:text-rose-600 underline"
                      >
                        Withdraw
                      </button>
                    )}
                    {offer.taskId && (
                      <Link
                        to={`/tasks/${offer.taskId}`}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition shadow-sm"
                      >
                        Open Task
                      </Link>
                    )}
                    {offer.requestId && (
                      <Link
                        to={`/requests/${offer.requestId}`}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs hover:bg-indigo-100 transition"
                      >
                        View Request
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
