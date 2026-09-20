import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { AiService } from './ai.service';
import { SemanticMatchingService } from './semantic-matching.service';
import { HybridMatchQueryDto, HybridWeightsDto } from './dto/hybrid-match-query.dto';
import {
  HybridMatchCandidateDto,
  HybridMatchResponseDto,
  ScoreBreakdownDto,
} from './dto/hybrid-match-response.dto';
import { getDistanceBetweenAreas } from '@common/utils/location.util';
import { SkillLevel, TaskStatus, UserStatus, VerificationStatus } from '@prisma/client';

export const DEFAULT_HYBRID_WEIGHTS = {
  semantic: 0.4,
  skill: 0.2,
  availability: 0.15,
  location: 0.1,
  verification: 0.05,
  profile: 0.05,
  reputation: 0.05,
};

@Injectable()
export class HybridMatchingService {
  private readonly logger = new Logger(HybridMatchingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly semanticMatchingService: SemanticMatchingService,
  ) {}

  /**
   * Performs hybrid multi-factor ranking combining:
   * 1. Hard business & safety constraints (blocking, suspension, self-exclusion)
   * 2. Stage 7A AI query understanding (skills, availability, location, intent)
   * 3. Stage 7B vector embeddings & semantic cosine similarity
   * 4. SkillMate deterministic discovery scoring (skills, availability overlap, proximity band, college verification, completeness, reputation)
   */
  async match(
    dto: HybridMatchQueryDto,
    currentUserId?: string,
  ): Promise<HybridMatchResponseDto> {
    const limit = dto.limit && dto.limit > 0 ? Math.min(dto.limit, 50) : 10;
    const query = dto.query.trim();

    // -----------------------------------------------------------------
    // Step 1: Parse natural language query (Stage 7A)
    // -----------------------------------------------------------------
    const parsedRequirements = await this.aiService.parseQuery({ query });

    // -----------------------------------------------------------------
    // Step 2: Hard Safety & Constraint Filters
    // -----------------------------------------------------------------
    let currentUserArea: string | null = null;
    const excludedUserIds = new Set<string>();

    if (currentUserId) {
      excludedUserIds.add(currentUserId);

      const [currentUserProfile, blocksSent, blocksReceived] = await Promise.all([
        this.prisma.profile.findUnique({
          where: { userId: currentUserId },
          select: { approximateArea: true },
        }),
        this.prisma.block.findMany({
          where: { blockerId: currentUserId },
          select: { blockedId: true },
        }),
        this.prisma.block.findMany({
          where: { blockedId: currentUserId },
          select: { blockerId: true },
        }),
      ]);

      currentUserArea = currentUserProfile?.approximateArea || null;
      blocksSent.forEach((b) => excludedUserIds.add(b.blockedId));
      blocksReceived.forEach((b) => excludedUserIds.add(b.blockerId));
    }

    const referenceArea = dto.area ? dto.area.trim() : currentUserArea;

    // Fetch active candidates only (excludes suspended/inactive users)
    const rawCandidates = await this.prisma.profile.findMany({
      where: {
        user: {
          status: UserStatus.ACTIVE,
          ...(excludedUserIds.size > 0
            ? { id: { notIn: Array.from(excludedUserIds) } }
            : {}),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            status: true,
            verification: {
              include: { college: true },
            },
          },
        },
        skills: {
          include: { skill: true },
        },
        availabilities: true,
      },
    });

    if (rawCandidates.length === 0) {
      return {
        data: [],
        meta: {
          query,
          parsedRequirements,
          totalCandidatesEvaluated: 0,
          returnedCount: 0,
          appliedWeights: this.resolveWeights(dto.weights),
        },
      };
    }

    // -----------------------------------------------------------------
    // Step 3: Filter candidates based on hard requirements if flagged
    // -----------------------------------------------------------------
    const targetDayOfWeek = this.resolveDayOfWeek(parsedRequirements.day);

    let eligibleCandidates = rawCandidates.filter((candidate) => {
      // Hard skill constraint
      if (dto.hardFilterSkills && parsedRequirements.skills.length > 0) {
        const matched = this.extractCandidateMatchedSkills(
          parsedRequirements.skills,
          candidate.skills,
          query,
        );
        if (matched.length === 0) return false;
      }

      // Hard availability constraint
      if (dto.hardFilterAvailability && targetDayOfWeek !== null) {
        const hasDayAvailability = candidate.availabilities.some(
          (av) => av.dayOfWeek === targetDayOfWeek,
        );
        if (!hasDayAvailability) return false;
      }

      return true;
    });

    if (eligibleCandidates.length === 0) {
      return {
        data: [],
        meta: {
          query,
          parsedRequirements,
          totalCandidatesEvaluated: rawCandidates.length,
          returnedCount: 0,
          appliedWeights: this.resolveWeights(dto.weights),
        },
      };
    }

    // -----------------------------------------------------------------
    // Step 4: Batch fetch reputation data to prevent N+1 query overhead
    // -----------------------------------------------------------------
    const candidateUserIds = eligibleCandidates.map((c) => c.userId);
    const [allRatings, allCompletedTasks] = await Promise.all([
      this.prisma.rating.findMany({
        where: { rateeId: { in: candidateUserIds } },
        select: { rateeId: true, score: true },
      }),
      this.prisma.task.findMany({
        where: {
          status: TaskStatus.COMPLETED,
          OR: [
            { requesterId: { in: candidateUserIds } },
            { helperId: { in: candidateUserIds } },
          ],
        },
        select: { requesterId: true, helperId: true },
      }),
    ]);

    const reputationMap = new Map<
      string,
      { averageRating: number | null; ratingCount: number; completedTasks: number }
    >();

    for (const userId of candidateUserIds) {
      const userRatings = allRatings.filter((r) => r.rateeId === userId);
      const ratingCount = userRatings.length;
      const averageRating =
        ratingCount > 0
          ? userRatings.reduce((sum, r) => sum + r.score, 0) / ratingCount
          : null;

      const completedTasks = allCompletedTasks.filter(
        (t) => t.requesterId === userId || t.helperId === userId,
      ).length;

      reputationMap.set(userId, { averageRating, ratingCount, completedTasks });
    }

    // -----------------------------------------------------------------
    // Step 5: Query Vector Embedding (Stage 7B) & Concurrent Candidate Embeddings
    // -----------------------------------------------------------------
    let queryVector: number[] | null = null;
    try {
      queryVector = await this.semanticMatchingService.getQueryEmbedding(query);
    } catch (err: any) {
      this.logger.warn(`Semantic query embedding failed: ${err.message}`);
    }

    const candidateVectors = new Map<string, number[] | null>();
    if (queryVector) {
      await Promise.all(
        eligibleCandidates.map(async (candidate) => {
          try {
            const candidateText = this.semanticMatchingService.buildStudentRepresentation(candidate);
            const vec = await this.semanticMatchingService.getCandidateEmbedding(
              candidate.id,
              candidateText,
            );
            candidateVectors.set(candidate.id, vec);
          } catch (err: any) {
            this.logger.warn(`Candidate embedding calculation failed for ${candidate.id}: ${err.message}`);
            candidateVectors.set(candidate.id, null);
          }
        }),
      );
    }

    // -----------------------------------------------------------------
    // Step 6: Multi-Factor Hybrid Scoring & Explainable Reasons
    // -----------------------------------------------------------------
    const weights = this.resolveWeights(dto.weights);
    const scoredCandidates: HybridMatchCandidateDto[] = [];

    for (const candidate of eligibleCandidates) {
      const matchReasons: string[] = [];

      // 1. Semantic Score (0.0 to 1.0)
      let semanticScore = 0;
      if (queryVector) {
        const candidateVector = candidateVectors.get(candidate.id);
        if (candidateVector) {
          semanticScore = this.semanticMatchingService.computeCosineSimilarity(
            queryVector,
            candidateVector,
          );
        }
      }

      if (semanticScore >= 0.75) {
        matchReasons.push('Strong semantic match with your project requirements');
      } else if (semanticScore >= 0.55) {
        matchReasons.push('Good topical relevance to your query');
      }

      // 2. Skill Score (0.0 to 1.0)
      const matchedSkills = this.extractCandidateMatchedSkills(
        parsedRequirements.skills,
        candidate.skills,
        query,
      );
      const skillScore = this.calculateSkillScore(
        parsedRequirements.skills,
        matchedSkills,
        candidate.skills,
        matchReasons,
      );

      // 3. Availability Overlap Score (0.0 to 1.0)
      const availabilityScore = this.calculateAvailabilityScore(
        targetDayOfWeek,
        parsedRequirements.timeRange,
        candidate.availabilities,
        matchReasons,
      );

      // 4. Location Proximity Score (0.0 to 1.0)
      const locationScore = this.calculateLocationScore(
        referenceArea,
        candidate.approximateArea,
        matchReasons,
      );

      // 5. College Verification Score (0.0 to 1.0)
      const isVerified = candidate.user.verification?.status === VerificationStatus.VERIFIED;
      const verificationScore = isVerified ? 1.0 : 0.0;
      if (isVerified) {
        matchReasons.push(
          candidate.user.verification?.college?.name
            ? `College verified student (${candidate.user.verification.college.name})`
            : 'College verified student',
        );
      }

      // 6. Profile Completeness Score (0.0 to 1.0)
      const completeness = candidate.completenessScore || 0;
      const profileScore = Math.min(1.0, Math.max(0.0, completeness / 100));
      if (completeness >= 80) {
        matchReasons.push(`Complete profile (${completeness}%)`);
      }

      // 7. Reputation Score (0.0 to 1.0)
      const repData = reputationMap.get(candidate.userId);
      const reputationScore = this.calculateReputationScore(repData, matchReasons);

      // Calculate final weighted score (0 to 100)
      const totalWeight =
        weights.semantic +
        weights.skill +
        weights.availability +
        weights.location +
        weights.verification +
        weights.profile +
        weights.reputation || 1.0;

      const rawWeightedScore =
        (semanticScore * weights.semantic +
          skillScore * weights.skill +
          availabilityScore * weights.availability +
          locationScore * weights.location +
          verificationScore * weights.verification +
          profileScore * weights.profile +
          reputationScore * weights.reputation) /
        totalWeight;

      const finalScore = Number((rawWeightedScore * 100).toFixed(2));

      // Fallback baseline reason if none added
      if (matchReasons.length === 0 && candidate.skills.length > 0) {
        matchReasons.push(`Offers ${candidate.skills.length} skills on SkillMate`);
      }

      const scoreBreakdown: ScoreBreakdownDto = {
        semanticScore: Number(semanticScore.toFixed(2)),
        skillScore: Number(skillScore.toFixed(2)),
        availabilityScore: Number(availabilityScore.toFixed(2)),
        locationScore: Number(locationScore.toFixed(2)),
        verificationScore: Number(verificationScore.toFixed(2)),
        profileScore: Number(profileScore.toFixed(2)),
        reputationScore: Number(reputationScore.toFixed(2)),
      };

      scoredCandidates.push({
        userId: candidate.userId,
        profileId: candidate.id,
        finalScore,
        scoreBreakdown,
        matchedSkills,
        matchReasons,
        candidate: {
          name: candidate.user.name,
          approximateArea: candidate.approximateArea || null,
          collegeName: candidate.user.verification?.college?.name || null,
          isVerified,
          bio: candidate.bio || null,
          skills: candidate.skills.map((s) => ({
            name: s.skill.name,
            level: s.level,
            isVerifiedSkill: s.isVerifiedSkill,
          })),
        },
      });
    }

    // -----------------------------------------------------------------
    // Step 7: Deterministic Ranking (Highest final score first, then completeness)
    // -----------------------------------------------------------------
    scoredCandidates.sort((a, b) => {
      if (b.finalScore !== a.finalScore) {
        return b.finalScore - a.finalScore;
      }
      return b.scoreBreakdown.profileScore - a.scoreBreakdown.profileScore;
    });

    const rankedResults = scoredCandidates.slice(0, limit);

    return {
      data: rankedResults,
      meta: {
        query,
        parsedRequirements,
        totalCandidatesEvaluated: eligibleCandidates.length,
        returnedCount: rankedResults.length,
        appliedWeights: weights,
      },
    };
  }

  /**
   * Resolves configured weights or falls back to standard default weights.
   */
  resolveWeights(custom?: HybridWeightsDto): Record<string, number> {
    return {
      semantic: custom?.semantic ?? DEFAULT_HYBRID_WEIGHTS.semantic,
      skill: custom?.skill ?? DEFAULT_HYBRID_WEIGHTS.skill,
      availability: custom?.availability ?? DEFAULT_HYBRID_WEIGHTS.availability,
      location: custom?.location ?? DEFAULT_HYBRID_WEIGHTS.location,
      verification: custom?.verification ?? DEFAULT_HYBRID_WEIGHTS.verification,
      profile: custom?.profile ?? DEFAULT_HYBRID_WEIGHTS.profile,
      reputation: custom?.reputation ?? DEFAULT_HYBRID_WEIGHTS.reputation,
    };
  }

  /**
   * Maps natural language day names or relative words to day of week (0=Sunday ... 6=Saturday).
   */
  resolveDayOfWeek(dayStr: string | null): number | null {
    if (!dayStr) return null;
    const lower = dayStr.trim().toLowerCase();
    const today = new Date().getDay();

    if (lower === 'today') return today;
    if (lower === 'tomorrow') return (today + 1) % 7;

    const dayMap: Record<string, number> = {
      sunday: 0,
      sun: 0,
      monday: 1,
      mon: 1,
      tuesday: 2,
      tue: 2,
      wednesday: 3,
      wed: 3,
      thursday: 4,
      thu: 4,
      friday: 5,
      fri: 5,
      saturday: 6,
      sat: 6,
    };

    return dayMap[lower] ?? null;
  }

  /**
   * Extracts candidate skills matching parsed requirements or query terms.
   */
  private extractCandidateMatchedSkills(
    parsedSkills: string[],
    candidateSkills: any[],
    rawQuery: string,
  ): string[] {
    const matched = new Set<string>();

    // 1. Match against parsed skills
    for (const pSkill of parsedSkills) {
      const pLower = pSkill.toLowerCase();
      for (const item of candidateSkills) {
        const cName = item.skill?.name;
        if (!cName) continue;
        const cLower = cName.toLowerCase();
        if (cLower === pLower || cLower.includes(pLower) || pLower.includes(cLower)) {
          matched.add(cName);
        }
      }
    }

    // 2. Match against raw query via SemanticMatchingService's synonym cluster matching
    const semanticMatched = this.semanticMatchingService.extractMatchedSkills(
      rawQuery,
      candidateSkills,
    );
    semanticMatched.forEach((s) => matched.add(s));

    return Array.from(matched);
  }

  /**
   * Evaluates candidate skill match quality (0.0 to 1.0).
   */
  private calculateSkillScore(
    parsedSkills: string[],
    matchedSkills: string[],
    candidateSkills: any[],
    matchReasons: string[],
  ): number {
    if (parsedSkills.length === 0) {
      if (matchedSkills.length > 0) {
        matchReasons.push(`Relevant skills: ${matchedSkills.join(', ')}`);
        return 0.7;
      }
      return candidateSkills.length > 0 ? 0.5 : 0.2;
    }

    if (matchedSkills.length === 0) {
      return 0.0;
    }

    const coverage = Math.min(1.0, matchedSkills.length / parsedSkills.length);

    // Calculate level proficiency bonuses
    let proficiencyTotal = 0;
    for (const name of matchedSkills) {
      const found = candidateSkills.find(
        (cs) => cs.skill?.name.toLowerCase() === name.toLowerCase(),
      );
      let levelWeight = 0.5; // Beginner default
      if (found?.level === SkillLevel.ADVANCED) {
        levelWeight = 1.0;
        matchReasons.push(`Has requested skill: ${name} (Advanced)`);
      } else if (found?.level === SkillLevel.INTERMEDIATE) {
        levelWeight = 0.75;
        matchReasons.push(`Has requested skill: ${name} (Intermediate)`);
      } else {
        matchReasons.push(`Has requested skill: ${name} (Beginner)`);
      }

      if (found?.isVerifiedSkill) {
        levelWeight = Math.min(1.0, levelWeight + 0.1);
      }
      proficiencyTotal += levelWeight;
    }

    const avgProficiency = proficiencyTotal / matchedSkills.length;
    return Math.min(1.0, coverage * 0.6 + avgProficiency * 0.4);
  }

  /**
   * Evaluates availability overlap (0.0 to 1.0).
   */
  private calculateAvailabilityScore(
    targetDayOfWeek: number | null,
    timeRange: string | null,
    availabilities: any[],
    matchReasons: string[],
  ): number {
    if (availabilities.length === 0) {
      return 0.0;
    }

    if (targetDayOfWeek === null && !timeRange) {
      const hasRecurring = availabilities.some((a) => a.isRecurring);
      if (hasRecurring) {
        matchReasons.push('Has active recurring availability schedule');
        return 1.0;
      }
      return 0.8;
    }

    // Check specific day overlap
    const matchingDays =
      targetDayOfWeek !== null
        ? availabilities.filter((a) => a.dayOfWeek === targetDayOfWeek)
        : availabilities;

    if (matchingDays.length === 0) {
      return 0.2; // Has availability on other days
    }

    // Check time overlap if specified
    if (timeRange) {
      const timeClean = timeRange.toLowerCase();
      const hasTimeOverlap = matchingDays.some((av) => {
        if (!av.startTime || !av.endTime) return true;
        // Check simple hour range overlap if structured "HH:mm-HH:mm"
        if (timeClean.includes('-')) {
          const [qStart, qEnd] = timeClean.split('-');
          return av.startTime <= qEnd && av.endTime >= qStart;
        }
        return true;
      });

      if (hasTimeOverlap) {
        matchReasons.push('Available during requested time window');
        return 1.0;
      }
      matchReasons.push('Available on requested day');
      return 0.7;
    }

    matchReasons.push('Available on requested day');
    return 1.0;
  }

  /**
   * Evaluates location proximity band (0.0 to 1.0).
   */
  private calculateLocationScore(
    referenceArea: string | null,
    candidateArea: string | null,
    matchReasons: string[],
  ): number {
    if (!referenceArea || !candidateArea) {
      return 0.5; // Neutral baseline when location isn't provided
    }

    const distanceInfo = getDistanceBetweenAreas(referenceArea, candidateArea);
    if (!distanceInfo) {
      return 0.3;
    }

    if (distanceInfo.distanceKm === 0) {
      matchReasons.push(`Located in same area: ${candidateArea}`);
      return 1.0;
    } else if (distanceInfo.distanceKm <= 2) {
      matchReasons.push(`Nearby: ${candidateArea} (~2 km away)`);
      return 0.9;
    } else if (distanceInfo.distanceKm <= 5) {
      matchReasons.push(`Nearby: ${candidateArea} (2–5 km away)`);
      return 0.75;
    } else if (distanceInfo.distanceKm <= 10) {
      matchReasons.push(`Nearby: ${candidateArea} (5–10 km away)`);
      return 0.5;
    } else if (distanceInfo.distanceKm <= 20) {
      return 0.25;
    }

    return 0.1;
  }

  /**
   * Evaluates student reputation score (0.0 to 1.0).
   */
  private calculateReputationScore(
    repData:
      | { averageRating: number | null; ratingCount: number; completedTasks: number }
      | undefined,
    matchReasons: string[],
  ): number {
    if (!repData) {
      return 0.7; // Fair baseline for unrated member
    }

    const { averageRating, ratingCount, completedTasks } = repData;

    if (averageRating !== null && ratingCount > 0) {
      const normalizedRating = averageRating / 5.0; // 0.2 to 1.0
      const taskBoost = Math.min(0.2, (completedTasks / 10) * 0.2);
      const repScore = Math.min(1.0, normalizedRating * 0.8 + taskBoost);

      if (averageRating >= 4.5 && completedTasks >= 3) {
        matchReasons.push(
          `Top rated collaborator (${averageRating.toFixed(1)}★, ${completedTasks} completed tasks)`,
        );
      } else if (averageRating >= 4.0) {
        matchReasons.push(`Highly rated student (${averageRating.toFixed(1)}★)`);
      }

      return repScore;
    }

    if (completedTasks > 0) {
      matchReasons.push(`Active collaborator (${completedTasks} completed tasks)`);
      return 0.8;
    }

    // New member without ratings
    return 0.7;
  }
}
