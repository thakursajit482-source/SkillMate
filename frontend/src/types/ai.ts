import { SkillLevel } from './index';

export interface ScoreBreakdown {
  semanticScore: number;
  skillScore: number;
  availabilityScore: number;
  locationScore: number;
  verificationScore: number;
  profileScore: number;
  reputationScore: number;
}

export interface MatchedCandidateSkill {
  name: string;
  level: SkillLevel | string;
  isVerifiedSkill: boolean;
}

export interface SafeMatchedCandidate {
  name: string;
  approximateArea: string | null;
  collegeName: string | null;
  isVerified: boolean;
  bio: string | null;
  skills: MatchedCandidateSkill[];
}

export interface HybridMatchCandidate {
  userId: string;
  profileId: string;
  finalScore: number;
  scoreBreakdown: ScoreBreakdown;
  matchedSkills: string[];
  matchReasons: string[];
  candidate: SafeMatchedCandidate;
}

export interface ParsedRequirements {
  skills: string[];
  intent: string | null;
  day: string | null;
  timeRange: string | null;
  locationPreference: string | null;
  interactionType: string | null;
  skillLevel: string | null;
  context: string | null;
}

export interface HybridMatchMeta {
  query: string;
  parsedRequirements: ParsedRequirements;
  totalCandidatesEvaluated: number;
  returnedCount: number;
  appliedWeights: Record<string, number>;
}

export interface HybridMatchResponse {
  data: HybridMatchCandidate[];
  meta: HybridMatchMeta;
}

export interface HybridMatchQuery {
  query: string;
  limit?: number;
  area?: string;
  hardFilterSkills?: boolean;
  hardFilterAvailability?: boolean;
}
