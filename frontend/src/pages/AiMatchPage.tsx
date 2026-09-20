import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiApi, requestsApi, chatApi } from '../api/client';
import { HybridMatchCandidate, HybridMatchResponse, RequestType } from '../types';
import { AiCandidateCard } from '../components/AiCandidateCard';
import { WhyThisMatchModal } from '../components/WhyThisMatchModal';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Sparkles,
  Search,
  Loader2,
  AlertCircle,
  Users,
  Compass,
  ArrowRight,
  Filter,
  CheckCircle2,
  RefreshCw,
  Send,
} from 'lucide-react';

const EXAMPLE_CHIPS = [
  'Python project help',
  'UI/UX designer',
  'DSA study partner',
  'Video editor',
  'Someone nearby',
];

export const AiMatchPage: React.FC = () => {
  const { user, isVerified } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<HybridMatchResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Filters drawer toggle & options
  const [showFilters, setShowFilters] = useState(false);
  const [hardFilterSkills, setHardFilterSkills] = useState(false);
  const [hardFilterAvailability, setHardFilterAvailability] = useState(false);
  const [customArea, setCustomArea] = useState('');

  // Why This Match Modal
  const [selectedMatch, setSelectedMatch] = useState<HybridMatchCandidate | null>(null);
  const [whyModalOpen, setWhyModalOpen] = useState(false);

  // Direct Request Modal
  const [requestTarget, setRequestTarget] = useState<HybridMatchCandidate | null>(null);
  const [reqModalOpen, setReqModalOpen] = useState(false);
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqType, setReqType] = useState<RequestType>('PAID');
  const [reqBudget, setReqBudget] = useState<number>(300);
  const [submittingReq, setSubmittingReq] = useState(false);

  const handleSearch = async (overrideQuery?: string) => {
    const q = (overrideQuery !== undefined ? overrideQuery : query).trim();
    if (!q || q.length < 2) {
      error('Please enter at least 2 characters to search.');
      return;
    }

    setLoading(true);
    setApiError(null);
    setHasSearched(true);

    try {
      const response = await aiApi.match({
        query: q,
        limit: 12,
        area: customArea.trim() || undefined,
        hardFilterSkills,
        hardFilterAvailability,
      });
      setResults(response);
    } catch (err: any) {
      console.error('AI match error:', err);
      const msg = err.message || 'Failed to search for candidates. Please try again.';
      setApiError(msg);
      error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const handleChipClick = (chipText: string) => {
    setQuery(chipText);
    handleSearch(chipText);
  };

  const openWhyModal = (match: HybridMatchCandidate) => {
    setSelectedMatch(match);
    setWhyModalOpen(true);
  };

  const openRequestModal = (match: HybridMatchCandidate) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!isVerified) {
      error('Please verify your college email before sending direct collaboration requests.');
      return;
    }
    setRequestTarget(match);
    setReqTitle(`Collaboration with ${match.candidate.name}`);
    setReqModalOpen(true);
  };

  const handleSendDirectRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestTarget) return;

    setSubmittingReq(true);
    try {
      await requestsApi.create({
        title: reqTitle,
        description: reqDesc,
        type: reqType,
        budget: reqType === 'PAID' ? Number(reqBudget) : undefined,
        targetUserId: requestTarget.userId,
      });
      success(`Request successfully sent to ${requestTarget.candidate.name}!`);
      setReqModalOpen(false);
      setReqDesc('');
    } catch (err: any) {
      error(err.message || 'Failed to submit direct request');
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleStartChat = async (match: HybridMatchCandidate) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const thread = await chatApi.createOrGetThread({ participantBId: match.userId });
      navigate('/chat', { state: { selectedThreadId: thread.id } });
    } catch (err: any) {
      error(err.message || 'Unable to open conversation thread.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="text-center max-w-2xl mx-auto pt-2 pb-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold mb-3 shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Intelligent Semantic Discovery</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Find Your <span className="text-indigo-600">SkillMate</span>
        </h1>
        <p className="text-slate-500 text-sm sm:text-base mt-2 leading-relaxed">
          Tell us what you need. AI will find students who match your skills, availability and preferences.
        </p>
      </div>

      {/* Main Search Input Box */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-sm space-y-3">
        <form onSubmit={handleFormSubmit} className="relative">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Describe what you need (e.g. 'Need someone who knows Python and ML for my project tomorrow evening, preferably nearby')..."
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-xs sm:text-sm shadow-xs transition shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Matching...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Find Matches</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Example Chips */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Try:</span>
          {EXAMPLE_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleChipClick(chip)}
              className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200/80 transition"
            >
              {chip}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`ml-auto text-xs font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg border transition ${
              showFilters
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'text-slate-500 hover:text-slate-700 border-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{showFilters ? 'Hide Filters' : 'More Options'}</span>
          </button>
        </div>

        {/* Optional Filters Drawer */}
        {showFilters && (
          <div className="pt-3 mt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Reference Location Area
              </label>
              <input
                type="text"
                value={customArea}
                onChange={(e) => setCustomArea(e.target.value)}
                placeholder="e.g. Bandra West, Powai, Dadar"
                className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2 sm:pt-5">
              <input
                type="checkbox"
                id="hardSkills"
                checked={hardFilterSkills}
                onChange={(e) => setHardFilterSkills(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="hardSkills" className="text-xs text-slate-700 font-medium cursor-pointer">
                Strict skill requirement only
              </label>
            </div>
            <div className="flex items-center gap-2 sm:pt-5">
              <input
                type="checkbox"
                id="hardAvail"
                checked={hardFilterAvailability}
                onChange={(e) => setHardFilterAvailability(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="hardAvail" className="text-xs text-slate-700 font-medium cursor-pointer">
                Strict availability match only
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Auth Guidance Notice */}
      {!user && (
        <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <p className="text-xs text-indigo-900 font-medium">
              You are browsing AI matching as a guest. Log in to connect directly and message students.
            </p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition shrink-0"
          >
            Log In
          </button>
        </div>
      )}

      {/* STATE 1: Loading State */}
      {loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-200" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-slate-100 rounded" />
                  <div className="h-3 bg-slate-100 rounded w-5/6" />
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <div className="h-8 bg-slate-100 rounded-xl flex-1" />
                  <div className="h-8 bg-slate-200 rounded-xl flex-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STATE 2: API Error State */}
      {!loading && apiError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="text-base font-bold text-rose-900">Matching Error</h3>
          <p className="text-xs text-rose-700 max-w-md mx-auto">{apiError}</p>
          <button
            onClick={() => handleSearch()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* STATE 3: No Matches Found */}
      {!loading && !apiError && hasSearched && results && results.data.length === 0 && (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <Compass className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">No strong matches found.</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
              Try removing a specific requirement or searching for a broader skill.
            </p>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <button
              onClick={() => {
                setHardFilterSkills(false);
                setHardFilterAvailability(false);
                handleSearch(query);
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              Relax Strict Filters
            </button>
            <button
              onClick={() => navigate('/discover/students')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition"
            >
              Browse All Students
            </button>
          </div>
        </div>
      )}

      {/* STATE 4: Results Display */}
      {!loading && !apiError && results && results.data.length > 0 && (
        <div className="space-y-4">
          {/* Results Header with Parsed Requirements */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <span>AI Matches</span>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                  {results.data.length} found
                </span>
              </h2>
            </div>

            {/* Extracted criteria pills */}
            {results.meta?.parsedRequirements && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {results.meta.parsedRequirements.skills.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-semibold text-slate-600 border border-slate-200"
                  >
                    {s}
                  </span>
                ))}
                {results.meta.parsedRequirements.day && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                    Day: {results.meta.parsedRequirements.day}
                  </span>
                )}
                {results.meta.parsedRequirements.timeRange && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[11px] font-semibold text-blue-700 border border-blue-200">
                    Time: {results.meta.parsedRequirements.timeRange}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.data.map((match) => (
              <AiCandidateCard
                key={match.userId}
                match={match}
                isCurrentUser={user?.id === match.userId}
                onWhyMatchClick={openWhyModal}
                onRequestClick={openRequestModal}
                onMessageClick={handleStartChat}
              />
            ))}
          </div>
        </div>
      )}

      {/* STATE 5: Initial Empty State (Before Any Query Run) */}
      {!loading && !hasSearched && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="max-w-lg mx-auto">
            <h3 className="text-xl font-bold text-slate-900">
              Natural Language Matchmaking
            </h3>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              Describe your project requirement, exam topic, or hackathon collaboration in plain words. SkillMate evaluates semantic similarity, peer skills, schedule availability, and proximity to present ranked recommendations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="text-xs font-bold text-indigo-700">1. Semantic Understanding</div>
              <p className="text-[11px] text-slate-500">
                Matches vocabulary variations across skills and project types.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="text-xs font-bold text-emerald-700">2. Schedule Overlap</div>
              <p className="text-[11px] text-slate-500">
                Aligns with candidate calendar availability slots.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="text-xs font-bold text-blue-700">3. Verified & Trusted</div>
              <p className="text-[11px] text-slate-500">
                Prioritizes verified college peers and peer ratings.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Why This Match Modal */}
      <WhyThisMatchModal
        isOpen={whyModalOpen}
        onClose={() => setWhyModalOpen(false)}
        match={selectedMatch}
      />

      {/* Direct Request Modal */}
      <Modal
        isOpen={reqModalOpen}
        onClose={() => setReqModalOpen(false)}
        title={`Request Collaboration: ${requestTarget?.candidate.name || 'Student'}`}
        maxWidth="md"
      >
        <form onSubmit={handleSendDirectRequest} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Title
            </label>
            <input
              type="text"
              required
              value={reqTitle}
              onChange={(e) => setReqTitle(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Collaboration Description
            </label>
            <textarea
              required
              rows={3}
              value={reqDesc}
              onChange={(e) => setReqDesc(e.target.value)}
              placeholder="Explain the project or task details and what you need help with..."
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Type
              </label>
              <select
                value={reqType}
                onChange={(e) => setReqType(e.target.value as RequestType)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="PAID">Paid Bounty</option>
                <option value="SKILL_EXCHANGE">Skill Exchange</option>
                <option value="SOCIAL">Study Session</option>
              </select>
            </div>

            {reqType === 'PAID' && (
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Budget (INR)
                </label>
                <input
                  type="number"
                  min={50}
                  step={50}
                  value={reqBudget}
                  onChange={(e) => setReqBudget(Number(e.target.value))}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setReqModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingReq}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
            >
              {submittingReq ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Send Request</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
