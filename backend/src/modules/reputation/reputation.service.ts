import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { SafetyService } from '@modules/safety/safety.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { CreateEndorsementDto } from './dto/create-endorsement.dto';
import { ReputationQueryDto } from './dto/reputation-query.dto';
import { TaskStatus, VerificationStatus } from '@prisma/client';

@Injectable()
export class ReputationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly safetyService: SafetyService,
  ) {}

  /**
   * Submit a two-way rating (1-5 stars + behavioral tags) for a COMPLETED task.
   * PRD Section 11.10: Ratings are strictly behavioral and require a completed task.
   */
  async createRating(taskId: string, raterId: string, dto: CreateRatingDto) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // 1. Task must be in COMPLETED status
    if (task.status !== TaskStatus.COMPLETED) {
      throw new BadRequestException('Ratings can only be submitted for COMPLETED tasks');
    }

    // 2. Rater must be an authorized participant of the task
    if (task.requesterId !== raterId && task.helperId !== raterId) {
      throw new ForbiddenException('Only task participants can rate each other');
    }

    // 3. Determine the counterpart (ratee)
    const rateeId = task.requesterId === raterId ? task.helperId : task.requesterId;

    // 4. Check for duplicate rating by this participant on this task
    const existingRating = await this.prisma.rating.findUnique({
      where: {
        taskId_raterId: { taskId, raterId },
      },
    });

    if (existingRating) {
      throw new ConflictException('You have already submitted a rating for this task');
    }

    // 5. Create rating
    const rating = await this.prisma.rating.create({
      data: {
        taskId,
        raterId,
        rateeId,
        score: dto.score,
        tags: dto.tags || [],
      },
      include: {
        task: { select: { id: true, status: true, completedAt: true } },
      },
    });

    return {
      message: 'Rating submitted successfully',
      rating: {
        id: rating.id,
        taskId: rating.taskId,
        raterId: rating.raterId,
        rateeId: rating.rateeId,
        score: rating.score,
        tags: rating.tags,
        createdAt: rating.createdAt,
      },
    };
  }

  /**
   * Retrieve paginated ratings received by a student.
   */
  async findRatingsForUser(userId: string, query: ReputationQueryDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where = { rateeId: userId };

    const [total, ratings] = await Promise.all([
      this.prisma.rating.count({ where }),
      this.prisma.rating.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          rater: {
            select: {
              id: true,
              name: true,
              profile: { select: { photoUrl: true, approximateArea: true } },
              verification: {
                select: {
                  college: { select: { name: true, city: true, area: true } },
                  status: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: ratings.map((r) => ({
        id: r.id,
        taskId: r.taskId,
        score: r.score,
        tags: r.tags,
        createdAt: r.createdAt,
        rater: {
          id: r.rater.id,
          name: r.rater.name,
          photoUrl: r.rater.profile?.photoUrl || null,
          approximateArea: r.rater.profile?.approximateArea || null,
          college: r.rater.verification?.college || null,
          isVerified: r.rater.verification?.status === VerificationStatus.VERIFIED,
        },
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Endorse a peer on a specific skill based on completed collaboration history.
   * PRD Section 11.10 & 22.
   */
  async createEndorsement(endorserId: string, dto: CreateEndorsementDto) {
    if (endorserId === dto.endorseeId) {
      throw new BadRequestException('Cannot endorse your own skill');
    }

    // Safety and blocking check
    await this.safetyService.assertCanInteract(endorserId, dto.endorseeId);

    // Verify valid completed collaboration between the two students
    const completedCollab = await this.prisma.task.findFirst({
      where: {
        status: TaskStatus.COMPLETED,
        OR: [
          { requesterId: endorserId, helperId: dto.endorseeId },
          { requesterId: dto.endorseeId, helperId: endorserId },
        ],
      },
    });

    if (!completedCollab) {
      throw new ForbiddenException(
        'Endorsements require a completed collaboration history between students',
      );
    }

    // Verify skill exists
    const skill = await this.prisma.skill.findUnique({
      where: { id: dto.skillId },
    });
    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    // Check duplicate endorsement
    const existingEndorsement = await this.prisma.endorsement.findUnique({
      where: {
        endorserId_endorseeId_skillId: {
          endorserId,
          endorseeId: dto.endorseeId,
          skillId: dto.skillId,
        },
      },
    });

    if (existingEndorsement) {
      throw new ConflictException('You have already endorsed this skill for this student');
    }

    const endorsement = await this.prisma.endorsement.create({
      data: {
        endorserId,
        endorseeId: dto.endorseeId,
        skillId: dto.skillId,
        taskId: dto.taskId || completedCollab.id,
      },
      include: {
        skill: { select: { id: true, name: true, category: true } },
      },
    });

    // Check if skill should now earn a verified skill badge (PRD Section 22: >= 2 endorsements)
    const totalEndorsementsForSkill = await this.prisma.endorsement.count({
      where: { endorseeId: dto.endorseeId, skillId: dto.skillId },
    });

    if (totalEndorsementsForSkill >= 2) {
      // Find endorsee profile
      const endorseeProfile = await this.prisma.profile.findUnique({
        where: { userId: dto.endorseeId },
      });
      if (endorseeProfile) {
        await this.prisma.profileSkill.updateMany({
          where: { profileId: endorseeProfile.id, skillId: dto.skillId },
          data: { isVerifiedSkill: true },
        });
      }
    }

    return {
      message: 'Skill endorsed successfully',
      endorsement: {
        id: endorsement.id,
        endorserId: endorsement.endorserId,
        endorseeId: endorsement.endorseeId,
        skill: endorsement.skill,
        taskId: endorsement.taskId,
        createdAt: endorsement.createdAt,
      },
    };
  }

  /**
   * Retrieve all skill endorsements received by a student.
   */
  async findEndorsementsForUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const endorsements = await this.prisma.endorsement.findMany({
      where: { endorseeId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        skill: { select: { id: true, name: true, category: true } },
        endorser: {
          select: {
            id: true,
            name: true,
            profile: { select: { photoUrl: true, approximateArea: true } },
            verification: {
              select: {
                college: { select: { name: true, city: true, area: true } },
                status: true,
              },
            },
          },
        },
      },
    });

    return endorsements.map((e) => ({
      id: e.id,
      skill: e.skill,
      createdAt: e.createdAt,
      endorser: {
        id: e.endorser.id,
        name: e.endorser.name,
        photoUrl: e.endorser.profile?.photoUrl || null,
        college: e.endorser.verification?.college || null,
        isVerified: e.endorser.verification?.status === VerificationStatus.VERIFIED,
      },
    }));
  }

  /**
   * Calculate transparent behavioral reputation summary.
   * PRD Section 22:
   * - Completed tasks count
   * - Completion rate: completed / (completed + cancelled)
   * - Rating average (1-5) and count
   * - Qualitative tag breakdown
   * - Skill endorsements count
   * - Repeat users count
   */
  async getUserReputation(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const [
      completedTasks,
      cancelledByMeTasks,
      ratings,
      endorsementsCount,
    ] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          status: TaskStatus.COMPLETED,
          OR: [{ requesterId: userId }, { helperId: userId }],
        },
        select: { requesterId: true, helperId: true },
      }),
      this.prisma.task.count({
        where: {
          cancelledById: userId,
          status: TaskStatus.CANCELLED,
        },
      }),
      this.prisma.rating.findMany({
        where: { rateeId: userId },
        select: { score: true, tags: true },
      }),
      this.prisma.endorsement.count({
        where: { endorseeId: userId },
      }),
    ]);

    const completedCount = completedTasks.length;
    const totalAttempted = completedCount + cancelledByMeTasks;
    const completionRate = totalAttempted > 0 ? Math.round((completedCount / totalAttempted) * 100) : 100;

    // Average rating
    const ratingCount = ratings.length;
    const averageRating =
      ratingCount > 0
        ? Math.round((ratings.reduce((sum, r) => sum + r.score, 0) / ratingCount) * 10) / 10
        : null;

    // Tag frequencies
    const tagFrequencies: Record<string, number> = {};
    for (const r of ratings) {
      if (Array.isArray(r.tags)) {
        for (const tag of r.tags as string[]) {
          tagFrequencies[tag] = (tagFrequencies[tag] || 0) + 1;
        }
      }
    }

    // Repeat users calculation: distinct counterpart IDs who completed >= 2 tasks with this user
    const counterpartCounts: Record<string, number> = {};
    for (const t of completedTasks) {
      const counterpartId = t.requesterId === userId ? t.helperId : t.requesterId;
      counterpartCounts[counterpartId] = (counterpartCounts[counterpartId] || 0) + 1;
    }
    const repeatUsersCount = Object.values(counterpartCounts).filter((c) => c >= 2).length;

    return {
      userId,
      completedTasks: completedCount,
      completionRate, // Percentage 0-100
      averageRating,
      ratingCount,
      repeatUsersCount,
      endorsementsCount,
      tagBreakdown: tagFrequencies,
      reputationBadge:
        ratingCount === 0 && completedCount === 0
          ? 'New Member'
          : averageRating && averageRating >= 4.5 && completedCount >= 5
            ? 'Top Collaborator'
            : 'Active Collaborator',
    };
  }
}
