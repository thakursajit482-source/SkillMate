import React from 'react';
import { Link } from 'react-router-dom';
import { HybridMatchCandidate } from '../types';
import { VerifiedBadge } from './Badges';
import {
  Sparkles,
  MapPin,
  CheckCircle2,
  HelpCircle,
  MessageSquare,
  Send,
  ExternalLink,
  Award,
} from 'lucide-react';

interface AiCandidateCardProps {
  match: HybridMatchCandidate;
  onWhyMatchClick: (match: HybridMatchCandidate) => void;
  onRequestClick?: (match: HybridMatchCandidate) => void;
  onMessageClick?: (match: HybridMatchCandidate) => void;
  isCurrentUser?: boolean;
}

export const AiCandidateCard: React.FC<AiCandidateCardProps> = ({
  match,
  onWhyMatchClick,
  onRequestClick,
  onMessageClick,
  isCurrentUser = false,
}) => {
  const { userId, candidate, finalScore, matchedSkills, matchReasons } = match;

  // Visual score badge styling based on backend finalScore
  const roundedScore = Math.round(finalScore);
  const getScoreBadgeStyle = (score: number) => {
    if (score >= 85) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (score >= 70) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition p-5 flex flex-col justify-between">
      <div>
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar Initial */}
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-lg border border-indigo-100 shrink-0">
              {candidate.name ? candidate.name.charAt(0).toUpperCase() : 'U'}
            </div>

            {/* Name, College, and Area */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-slate-900 text-base leading-snug truncate">
                  {candidate.name}
                </h3>
                <VerifiedBadge status={candidate.isVerified ? 'VERIFIED' : 'UNVERIFIED'} showText={false} />
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {candidate.collegeName || 'Mumbai Student'}
              </p>
              {candidate.approximateArea && (
                <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 mt-0.5">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{candidate.approximateArea}</span>
                </div>
              )}
            </div>
          </div>

          {/* Backend Match Score Badge */}
          <div className="flex flex-col items-end shrink-0">
            <div
              className={`px-3 py-1 rounded-xl text-xs font-black border flex items-center gap-1 shadow-xs ${getScoreBadgeStyle(
                roundedScore,
              )}`}
            >
              <Sparkles className="w-3 h-3" />
              <span>{roundedScore}% Match</span>
            </div>
            <button
              onClick={() => onWhyMatchClick(match)}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 mt-1 transition"
            >
              <HelpCircle className="w-3 h-3" />
              <span>Why this match?</span>
            </button>
          </div>
        </div>

        {/* Bio snippet */}
        {candidate.bio && (
          <p className="text-xs text-slate-600 line-clamp-2 mb-3.5 leading-relaxed">
            {candidate.bio}
          </p>
        )}

        {/* Top Matched Skills */}
        <div className="mb-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
            Matched Skills
          </span>
          <div className="flex flex-wrap gap-1.5">
            {candidate.skills && candidate.skills.length > 0 ? (
              candidate.skills.slice(0, 4).map((skill, index) => {
                const isDirectMatch = matchedSkills.some(
                  (ms) => ms.toLowerCase() === skill.name.toLowerCase(),
                );
                return (
                  <span
                    key={index}
                    className={`px-2 py-0.5 rounded-lg text-xs font-semibold border flex items-center gap-1 transition ${
                      isDirectMatch
                        ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>{skill.name}</span>
                    {skill.isVerifiedSkill && (
                      <span title="Peer Verified" className="text-indigo-600">
                        <Award className="w-3 h-3 inline" />
                      </span>
                    )}
                  </span>
                );
              })
            ) : (
              <span className="text-xs text-slate-400 italic">No skills listed</span>
            )}
            {candidate.skills && candidate.skills.length > 4 && (
              <span className="text-[11px] text-slate-400 self-center">
                +{candidate.skills.length - 4} more
              </span>
            )}
          </div>
        </div>

        {/* Match Reasons (2–4 human-readable bullets) */}
        {matchReasons && matchReasons.length > 0 && (
          <div className="space-y-1.5 mb-4 p-3 bg-slate-50/80 rounded-xl border border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Match Reasons
            </span>
            {matchReasons.slice(0, 3).map((reason, idx) => (
              <div
                key={idx}
                className="flex items-start gap-1.5 text-xs text-slate-700 leading-snug"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="truncate">{reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
        <Link
          to={`/profile/${userId}`}
          className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs text-center transition flex items-center justify-center gap-1.5"
        >
          <span>View Profile</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </Link>

        {!isCurrentUser && (
          <>
            {onRequestClick && (
              <button
                onClick={() => onRequestClick(match)}
                className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs text-center shadow-xs transition flex items-center justify-center gap-1"
              >
                <Send className="w-3 h-3" />
                <span>Request</span>
              </button>
            )}
            {onMessageClick && (
              <button
                onClick={() => onMessageClick(match)}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition"
                title="Send Message"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
