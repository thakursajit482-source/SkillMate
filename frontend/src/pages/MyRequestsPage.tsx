import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { requestsApi } from '../api/client';
import { RequestItem } from '../types';
import { RequestTypeBadge, StatusBadge } from '../components/Badges';
import {
  FileText,
  PlusCircle,
  Clock,
  IndianRupee,
  Repeat,
  Sparkles,
  ChevronRight,
  Loader2,
  MapPin,
} from 'lucide-react';

export const MyRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMine = async () => {
    setLoading(true);
    try {
      const res = await requestsApi.findMine({ limit: 50 });
      setRequests(res.items || []);
    } catch (err: any) {
      console.error('Failed to load my requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMine();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-indigo-600" />
            My Requests
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your outgoing collaboration tasks and review incoming peer proposals.
          </p>
        </div>

        <Link
          to="/requests/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-sm transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Request</span>
        </Link>
      </div>

      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
          <p className="text-sm font-medium">Loading your requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">You haven't posted any requests yet</h3>
          <p className="text-slate-500 text-sm mt-1">
            Post an open request for homework help, project collaboration, or skill exchange.
          </p>
          <Link
            to="/requests/new"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-sm hover:bg-indigo-700 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Your First Request</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {requests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 hover:border-indigo-200 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <RequestTypeBadge type={req.type} />
                  <StatusBadge status={req.status} />
                </div>

                <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                  {req.title}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                  {req.description}
                </p>

                {req.status === 'MATCHED' && (
                  <div className="mt-2.5 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between">
                    <span>Your request has been accepted</span>
                    <span className="text-[11px] font-bold text-emerald-700">Matched</span>
                  </div>
                )}

                <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs flex items-center justify-between">
                  <span className="font-semibold text-slate-700">
                    {req.type === 'PAID' && `Budget: ₹${req.budget ?? 'Negotiable'}`}
                    {req.type === 'SKILL_EXCHANGE' && `Exchange: ${req.exchangeSkill?.name || 'Skill'}`}
                    {req.type === 'SOCIAL' && `Format: ${req.socialVibe || 'Study'}`}
                  </span>
                  <span className="text-indigo-600 font-bold">
                    {req._count?.offers || req.offers?.length || 0} Offer(s)
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                  {req.approximateArea && (
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {req.approximateArea}
                    </span>
                  )}
                </div>
                <Link
                  to={`/requests/${req.id}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs hover:bg-indigo-100 transition"
                >
                  <span>Manage & Offers</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
