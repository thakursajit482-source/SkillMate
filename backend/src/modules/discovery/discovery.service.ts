import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { DiscoveryStudentsQueryDto } from './dto/discovery-students-query.dto';
import { DiscoveryRequestsQueryDto } from './dto/discovery-requests-query.dto';
import { getDistanceBetweenAreas, sanitizePublicProfile } from '@common/utils/location.util';
import { Prisma, RequestStatus, SkillLevel, UserStatus, VerificationStatus } from '@prisma/client';

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async discoverStudents(query: DiscoveryStudentsQueryDto, currentUserId?: string) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;

    // 1. Fetch current user's profile area and block list for personalized distance/safety filtering
    let currentUserArea: string | null = null;
    const blockedUserIds = new Set<string>();

    if (currentUserId) {
      const [currentUserProfile, blocksInitiated, blocksReceived] = await Promise.all([
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
      blocksInitiated.forEach((b) => blockedUserIds.add(b.blockedId));
      blocksReceived.forEach((b) => blockedUserIds.add(b.blockerId));
    }

    // Reference area for distance calculation (query param overrides viewer profile area)
    const referenceArea = query.area ? query.area.trim() : currentUserArea;

    // 2. Build Prisma where clause with explicit UserWhereInput
    const userWhere: Prisma.UserWhereInput = {
      status: UserStatus.ACTIVE,
      ...(currentUserId
        ? {
            id: {
              notIn: [currentUserId, ...Array.from(blockedUserIds)],
            },
          }
        : {}),
    };

    // Filter by college
    if (query.collegeId) {
      userWhere.verification = {
        collegeId: query.collegeId,
      };
    }

    // Filter by verified status
    if (query.verifiedOnly) {
      userWhere.verification = {
        ...(userWhere.verification as Prisma.CollegeVerificationWhereInput),
        status: VerificationStatus.VERIFIED,
      };
    }

    const where: Prisma.ProfileWhereInput = {
      user: userWhere,
    };

    // Filter by area
    if (query.area && query.area.trim()) {
      where.approximateArea = {
        equals: query.area.trim(),
        mode: 'insensitive',
      };
    }

    // Filter by skill
    if (query.skill && query.skill.trim()) {
      const skillTerm = query.skill.trim();
      where.skills = {
        some: {
          skill: {
            name: { contains: skillTerm, mode: 'insensitive' },
          },
          ...(query.skillLevel ? { level: query.skillLevel } : {}),
        },
      };
    }

    // Filter by availability day of week
    if (query.dayOfWeek !== undefined) {
      where.availabilities = {
        some: {
          dayOfWeek: query.dayOfWeek,
        },
      };
    }

    // 3. Query candidate student profiles
    const profiles = await this.prisma.profile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            status: true,
            verification: {
              include: {
                college: true,
              },
            },
          },
        },
        skills: {
          include: {
            skill: true,
          },
        },
        availabilities: true,
      },
    });

    // 4. Deterministic Rule-Based Scoring Engine
    const scoredCandidates = profiles
      .map((profile) => {
        let score = 0;
        const reasons: string[] = [];

        // Factor 1: Skill match & proficiency bonus
        if (query.skill && query.skill.trim()) {
          const target = query.skill.trim().toLowerCase();
          const matchedSkill = profile.skills.find(
            (s) => s.skill.name.toLowerCase() === target || s.skill.name.toLowerCase().includes(target),
          );

          if (matchedSkill) {
            score += 40;
            if (matchedSkill.level === SkillLevel.ADVANCED) {
              score += 10;
              reasons.push(`Has requested skill: ${matchedSkill.skill.name} (Advanced)`);
            } else if (matchedSkill.level === SkillLevel.INTERMEDIATE) {
              score += 5;
              reasons.push(`Has requested skill: ${matchedSkill.skill.name} (Intermediate)`);
            } else {
              reasons.push(`Has requested skill: ${matchedSkill.skill.name} (Beginner)`);
            }
          }
        }

        // Factor 2: Availability overlap
        if (query.dayOfWeek !== undefined || query.time) {
          const hasTimeOverlap = profile.availabilities.some((av) => {
            const dayMatches = query.dayOfWeek === undefined || av.dayOfWeek === query.dayOfWeek;
            let timeMatches = true;

            if (query.time && av.startTime && av.endTime) {
              timeMatches = query.time >= av.startTime && query.time <= av.endTime;
            }

            return dayMatches && timeMatches;
          });

          if (hasTimeOverlap) {
            score += 25;
            reasons.push('Available during requested time window');
          }
        }

        // Factor 3: Location proximity
        let distanceBand: string | null = null;
        if (referenceArea && profile.approximateArea) {
          const distanceInfo = getDistanceBetweenAreas(referenceArea, profile.approximateArea);
          if (distanceInfo) {
            distanceBand = distanceInfo.distanceBand;
            if (distanceInfo.distanceKm === 0) {
              score += 20;
              reasons.push(`Located in same area: ${profile.approximateArea}`);
            } else if (distanceInfo.distanceKm <= 2) {
              score += 20;
              reasons.push(`Nearby: ${profile.approximateArea} (~2 km away)`);
            } else if (distanceInfo.distanceKm <= 5) {
              score += 15;
              reasons.push(`Nearby: ${profile.approximateArea} (2–5 km away)`);
            } else if (distanceInfo.distanceKm <= 10) {
              score += 10;
              reasons.push(`Nearby: ${profile.approximateArea} (5–10 km away)`);
            } else if (distanceInfo.distanceKm <= 20) {
              score += 5;
            }
          }
        }

        // Factor 4: College verification
        const isVerified = profile.user.verification?.status === VerificationStatus.VERIFIED;
        if (isVerified) {
          score += 10;
          reasons.push('College verified student');
        }

        // Factor 5: Profile completeness
        if (profile.completenessScore >= 80) {
          score += 5;
          reasons.push('High profile completeness');
        }

        // Baseline reasons if no specific criteria were queried
        if (reasons.length === 0 && profile.skills.length > 0) {
          reasons.push(`Offers ${profile.skills.length} skills`);
        }

        return {
          profile,
          score,
          reasons,
          distanceBand,
        };
      })
      // Sort deterministically: highest score first, then completeness, then newest
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.profile.completenessScore !== a.profile.completenessScore) {
          return b.profile.completenessScore - a.profile.completenessScore;
        }
        return b.profile.createdAt.getTime() - a.profile.createdAt.getTime();
      });

    // 5. Paginate sorted candidates
    const total = scoredCandidates.length;
    const skip = (page - 1) * limit;
    const paginatedItems = scoredCandidates.slice(skip, skip + limit);

    // 6. Privacy Sanitization (zero coordinates, no phone/email in public output)
    const sanitizedData = paginatedItems.map(({ profile, score, reasons, distanceBand }) =>
      sanitizePublicProfile(profile, profile.user, profile.user.verification, {
        distanceBand,
        matchScore: score,
        matchReasons: reasons,
      }),
    );

    return {
      data: sanitizedData,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Discover nearby open requests with optional skill, type, and radius filters.
   * PRD Section 18: GET /discovery/requests
   */
  async discoverRequests(query: DiscoveryRequestsQueryDto, currentUserId?: string) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;

    let currentUserArea: string | null = null;
    const blockedUserIds = new Set<string>();

    if (currentUserId) {
      const [currentUserProfile, blocksInitiated, blocksReceived] = await Promise.all([
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
      blocksInitiated.forEach((b) => blockedUserIds.add(b.blockedId));
      blocksReceived.forEach((b) => blockedUserIds.add(b.blockerId));
    }

    const referenceArea = query.area ? query.area.trim() : currentUserArea;

    const where: Prisma.RequestWhereInput = {
      status: RequestStatus.OPEN,
      requester: {
        status: UserStatus.ACTIVE,
        ...(currentUserId
          ? {
              id: {
                notIn: [currentUserId, ...Array.from(blockedUserIds)],
              },
            }
          : {}),
      },
      OR: [
        { targetUserId: null },
        ...(currentUserId ? [{ targetUserId: currentUserId }] : []),
      ],
    };

    if (query.type) {
      where.type = query.type;
    }

    if (query.skill) {
      where.skill = {
        name: { contains: query.skill.trim(), mode: 'insensitive' },
      };
    }

    const openRequests = await this.prisma.request.findMany({
      where,
      include: {
        skill: true,
        desiredSkill: true,
        requester: {
          select: {
            id: true,
            name: true,
            profile: { select: { photoUrl: true, approximateArea: true } },
            verification: {
              select: {
                college: { select: { id: true, name: true, city: true, area: true } },
                status: true,
              },
            },
          },
        },
        _count: { select: { offers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const candidateRequests = openRequests
      .map((req) => {
        let distanceInfo: { distanceKm: number; distanceBand: string } | null = null;
        if (referenceArea && req.approximateArea) {
          distanceInfo = getDistanceBetweenAreas(referenceArea, req.approximateArea);
        }

        return {
          req,
          distanceKm: distanceInfo ? distanceInfo.distanceKm : 9999,
          distanceBand: distanceInfo ? distanceInfo.distanceBand : null,
        };
      })
      .filter((item) => {
        if (query.radiusKm && item.distanceKm > query.radiusKm) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const total = candidateRequests.length;
    const skip = (page - 1) * limit;
    const paginated = candidateRequests.slice(skip, skip + limit);

    return {
      data: paginated.map(({ req, distanceBand }) => ({
        id: req.id,
        requesterId: req.requesterId,
        type: req.type,
        title: req.title,
        description: req.description,
        budget: req.budget ? Number(req.budget) : null,
        activityTag: req.activityTag,
        availabilityWindow: req.availabilityWindow,
        approximateArea: req.approximateArea,
        distanceBand,
        status: req.status,
        createdAt: req.createdAt,
        skill: req.skill
          ? { id: req.skill.id, name: req.skill.name, category: req.skill.category }
          : null,
        desiredSkill: req.desiredSkill
          ? { id: req.desiredSkill.id, name: req.desiredSkill.name, category: req.desiredSkill.category }
          : null,
        requester: {
          id: req.requester.id,
          name: req.requester.name,
          photoUrl: req.requester.profile?.photoUrl || null,
          approximateArea: req.requester.profile?.approximateArea || null,
          college: req.requester.verification?.college || null,
          isVerified: req.requester.verification?.status === VerificationStatus.VERIFIED,
        },
        offersCount: req._count.offers,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
