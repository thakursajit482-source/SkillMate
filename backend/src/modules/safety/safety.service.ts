import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { ReportStatus, UserStatus, VerificationStatus } from '@prisma/client';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';

@Injectable()
export class SafetyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if two users have an active block between them in either direction.
   */
  async isBlocked(userAId: string, userBId: string): Promise<boolean> {
    if (!userAId || !userBId || userAId === userBId) return false;

    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userAId, blockedId: userBId },
          { blockerId: userBId, blockedId: userAId },
        ],
      },
    });

    return !!block;
  }

  /**
   * Asserts that two users can safely interact (not blocked, neither suspended).
   * Throws ForbiddenException if blocked or suspended.
   */
  async assertCanInteract(userAId: string, userBId: string): Promise<void> {
    if (userAId === userBId) {
      throw new BadRequestException('Cannot perform this interaction with yourself');
    }

    const [userA, userB, block] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userAId }, select: { status: true } }),
      this.prisma.user.findUnique({ where: { id: userBId }, select: { status: true } }),
      this.prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: userAId, blockedId: userBId },
            { blockerId: userBId, blockedId: userAId },
          ],
        },
      }),
    ]);

    if (!userA || userA.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Your account is currently unavailable');
    }

    if (!userB || userB.status === UserStatus.SUSPENDED) {
      throw new NotFoundException('The requested student is not available');
    }

    if (block) {
      throw new ForbiddenException('Interaction between these users is not permitted');
    }
  }

  /**
   * Fetches the complete set of user IDs blocked by or blocking the given user.
   */
  async getBlockedUserIds(userId: string): Promise<Set<string>> {
    const blocks = await this.prisma.block.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
      select: { blockerId: true, blockedId: true },
    });

    const set = new Set<string>();
    for (const b of blocks) {
      if (b.blockerId === userId) set.add(b.blockedId);
      if (b.blockedId === userId) set.add(b.blockerId);
    }
    return set;
  }

  /**
   * Unilaterally and silently blocks another user.
   * PRD Section 16: "Blocking is unilateral and immediate; the blocked user is not notified."
   */
  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new BadRequestException('You cannot block yourself');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: blockedId },
    });
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    const existingBlock = await this.prisma.block.findUnique({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
    });

    if (existingBlock) {
      return { message: 'User is already blocked', blockedId };
    }

    await this.prisma.block.create({
      data: {
        blockerId,
        blockedId,
      },
    });

    return { message: 'User blocked successfully', blockedId };
  }

  /**
   * Unblocks a previously blocked user.
   */
  async unblockUser(blockerId: string, blockedId: string) {
    const existingBlock = await this.prisma.block.findUnique({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
    });

    if (!existingBlock) {
      throw new NotFoundException('Block relationship not found');
    }

    await this.prisma.block.delete({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
    });

    return { message: 'User unblocked successfully', blockedId };
  }

  /**
   * List users currently blocked by the authenticated user.
   */
  async getBlockedUsers(userId: string) {
    const blocks = await this.prisma.block.findMany({
      where: { blockerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        blocked: {
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

    return blocks.map((b) => ({
      id: b.id,
      blockedId: b.blockedId,
      blockedUser: {
        id: b.blocked.id,
        name: b.blocked.name,
        photoUrl: b.blocked.profile?.photoUrl || null,
        approximateArea: b.blocked.profile?.approximateArea || null,
        college: b.blocked.verification?.college || null,
        isVerified: b.blocked.verification?.status === VerificationStatus.VERIFIED,
      },
      createdAt: b.createdAt,
    }));
  }

  /**
   * Submit a safety report against a user or task.
   * PRD Section 11.11 / 16: Anonymized towards the reported user, routed to admin queue.
   */
  async createReport(reporterId: string, dto: CreateReportDto) {
    if (reporterId === dto.reportedUserId) {
      throw new BadRequestException('You cannot report yourself');
    }

    const reportedUser = await this.prisma.user.findUnique({
      where: { id: dto.reportedUserId },
    });
    if (!reportedUser) {
      throw new NotFoundException('Reported user not found');
    }

    if (dto.taskId) {
      const task = await this.prisma.task.findUnique({
        where: { id: dto.taskId },
      });
      if (!task) {
        throw new NotFoundException('Associated task not found');
      }
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        reportedUserId: dto.reportedUserId,
        taskId: dto.taskId || null,
        category: dto.category,
        description: dto.description.trim(),
        evidenceUrl: dto.evidenceUrl || null,
        status: ReportStatus.OPEN,
      },
    });

    return {
      message: 'Report submitted successfully. Our safety team will review it.',
      reportId: report.id,
      status: report.status,
      createdAt: report.createdAt,
    };
  }

  /**
   * List reports submitted by the authenticated user.
   */
  async findMyReports(reporterId: string, query: ReportQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = { reporterId };
    if (query.status) {
      where.status = query.status;
    }

    const [total, reports] = await Promise.all([
      this.prisma.report.count({ where }),
      this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reportedUser: {
            select: {
              id: true,
              name: true,
            },
          },
          task: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      }),
    ]);

    return {
      data: reports.map((r) => ({
        id: r.id,
        reportedUserId: r.reportedUserId,
        reportedUserName: r.reportedUser.name,
        category: r.category,
        description: r.description,
        taskId: r.taskId,
        status: r.status,
        resolutionNotes: r.resolutionNotes,
        createdAt: r.createdAt,
        resolvedAt: r.resolvedAt,
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
