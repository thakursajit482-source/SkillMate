import React from 'react';
import { Modal } from './Modal';
import { HybridMatchCandidate } from '../types';
import {
  Sparkles,
  BookOpen,
  Calendar,
  MapPin,
  ShieldCheck,
  UserCheck,
  Star,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

interface WhyThisMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: HybridMatchCandidate | null;
}

export const WhyThisMatchModal: React.FC<WhyThisMatchModalProps> = ({
  isOpen,
  onClose,
  match,
}) => {
  if (!match) return null;

  const { candidate, finalScore, scoreBreakdown, matchReasons } = match;

  const factors = [
    {
      label: 'Semantic Match',
      score: scoreBreakdown.semanticScore,
      percentage: Math.round(scoreBreakdown.semanticScore * 100),
      icon: Sparkles,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      barColor: 'bg-indigo-600',
      description: 'How accurately your prompt aligns conceptually with their skills and background.',
    },
    {
      label: 'Skills Match',
      score: scoreBreakdown.skillScore,
      percentage: Math.round(scoreBreakdown.skillScore * 100),
      icon: BookOpen,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      barColor: 'bg-blue-600',
      description: 'Match between required skills and the candidate’s proficiency level.',
    },
    {
      label: 'Availability Overlap',
      score: scoreBreakdown.availabilityScore,
      percentage: Math.round(scoreBreakdown.availabilityScore * 100),
      icon: Calendar,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      barColor: 'bg-emerald-600',
      description: 'Schedule compatibility for the day and time you requested.',
    },
    {
      label: 'Location Proximity',
      score: scoreBreakdown.locationScore,
      percentage: Math.round(scoreBreakdown.locationScore * 100),
      icon: MapPin,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      barColor: 'bg-amber-500',
      description: `Distance proximity relative to ${candidate.approximateArea || 'your area'}.`,
    },
    {
      label: 'College Verification',
      score: scoreBreakdown.verificationScore,
      percentage: Math.round(scoreBreakdown.verificationScore * 100),
      icon: ShieldCheck,
      color: 'text-teal-600 bg-teal-50 border-teal-200',
      barColor: 'bg-teal-600',
      description: candidate.isVerified
        ? 'Verified college student ID badge.'
        : 'Student has not yet completed ID verification.',
    },
    {
      label: 'Profile Completeness',
      score: scoreBreakdown.profileScore,
      percentage: Math.round(scoreBreakdown.profileScore * 100),
      icon: UserCheck,
      color: 'text-violet-600 bg-violet-50 border-violet-200',
      barColor: 'bg-violet-600',
      description: 'Quality and depth of student bio, college info, and declared skills.',
    },
    {
      label: 'Reputation Track Record',
      score: scoreBreakdown.reputationScore,
      percentage: Math.round(scoreBreakdown.reputationScore * 100),
      icon: Star,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      barColor: 'bg-rose-500',
      description: 'Community reliability, peer ratings, and completed collaborations.',
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Why This Match?" maxWidth="lg">
      <div className="space-y-6">
        {/* Top Summary Banner */}
        <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              Overall Hybrid Score
            </div>
            <h4 className="text-lg font-black text-slate-900 mt-0.5">
              {candidate.name}
            </h4>
            <p className="text-xs text-slate-500">
              {candidate.collegeName || 'Verified Peer'} • {candidate.approximateArea || 'Mumbai'}
            </p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-black text-lg shadow-sm">
              <Sparkles className="w-4 h-4" />
              <span>{Math.round(finalScore)}%</span>
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-1">
              Match Confidence
            </div>
          </div>
        </div>

        {/* Human-readable Highlights */}
        {matchReasons && matchReasons.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Key Highlights
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {matchReasons.map((reason, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">{reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7-Factor Transparent Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Detailed Score Breakdown
            </h5>
            <span className="text-[11px] text-slate-400">Weighted Multi-Factor Model</span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {factors.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="p-3 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg border flex items-center justify-center ${f.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">{f.label}</span>
                    </div>
                    <span className="text-xs font-black text-slate-900">{f.percentage}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-1">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${f.barColor}`}
                      style={{ width: `${Math.min(100, Math.max(0, f.percentage))}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 leading-tight">
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Privacy Assurance */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
          <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span>
            SkillMate calculates match rank using transparent requirements and privacy guarantees. Private contact details, phone numbers, and exact coordinates are never shared.
          </span>
        </div>
      </div>
    </Modal>
  );
};
