import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { discoveryApi } from '../api/client';
import { RequestItem, RequestType } from '../types';
import { RequestTypeBadge, DistanceBadge, VerifiedBadge } from '../components/Badges';
import { useToast } from '../context/ToastContext';
import {
  Compass,
  Search,
  IndianRupee,
  Repeat,
  Sparkles,
  MapPin,
  Clock,
  ChevronRight,
  Loader2,
  PlusCircle,
} from 'lucide-react';

export const DiscoverRequestsPage: React.FC = () => {
  const { error } = useToast();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [areaFilter, setAreaFilter] = useState<string>('');

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await discoveryApi.discoverRequests({
        type: (typeFilter as RequestType) || undefined,
        area: areaFilter || undefined,
      });
      setRequests(res.items || []);
    } catch (err: any) {
      console.error('Failed to discover requests', err);
      error(err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadRequests();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Compass className="w-7 h-7 text-indigo-600" />
            Explore Requests
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Browse open collaboration tasks and tutoring requests from students nearby.
          </p>
        </div>

        <Link
          to="/requests/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-sm transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Post New Request</span>
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Type Segmented Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { label: 'All Requests', value: '' },
            { label: 'Paid Tasks', value: 'PAID' },
            { label: 'Skill Exchange', value: 'SKILL_EXCHANGE' },
            { label: 'Study & Social', value: 'SOCIAL' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setTypeFilter(item.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                typeFilter === item.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Search Area */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-72">
          <input
            type="text"
            placeholder="Search area (e.g. Andheri, Vile Parle)..."
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
          <p className="text-sm font-medium">Loading nearby requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <Compass className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No open requests found</h3>
          <p className="text-slate-500 text-sm mt-1">Be the first to post a collaboration request in this area.</p>
          <Link
            to="/requests/new"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Request</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {requests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <RequestTypeBadge type={req.type} />
                  <DistanceBadge
                    distanceBand={req.requester?.distanceBand}
                    approximateArea={req.approximateArea}
                  />
                </div>

                <h3 className="text-lg font-bold text-slate-900 leading-snug mb-2 hover:text-indigo-600 transition">
                  <Link to={`/requests/${req.id}`}>{req.title}</Link>
                </h3>

                <p className="text-xs text-slate-600 line-clamp-3 mb-4 leading-relaxed">
                  {req.description}
                </p>

                {/* Specifics Box */}
                <div className="p-3 bg-slate-50 rounded-xl mb-4 text-xs space-y-1">
                  {req.type === 'PAID' && (
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                      <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Budget: ₹{req.budget ?? 'Negotiable'}</span>
                    </div>
                  )}
                  {req.type === 'SKILL_EXCHANGE' && (
                    <div className="flex items-center gap-1.5 text-indigo-800 font-bold">
                      <Repeat className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Offering in return: {req.exchangeSkill?.name || 'Skill Swap'}</span>
                    </div>
                  )}
                  {req.type === 'SOCIAL' && (
                    <div className="flex items-center gap-1.5 text-purple-800 font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Social Vibe: {req.socialVibe || 'Study / Peer Discussion'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Requester Bar & Action */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
                    {req.requester?.name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      {req.requester?.name || 'Student'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {req.requester?.college?.name || 'Mumbai College'}
                    </div>
                  </div>
                </div>

                <Link
                  to={`/requests/${req.id}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition"
                >
                  <span>View Details</span>
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
