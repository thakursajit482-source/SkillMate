import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { RequestStatus, TaskStatus, VerificationStatus } from '@prisma/client';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { TaskQueryDto, TaskUserRole } from './dto/task-query.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List tasks for the authenticated user (as requester or helper).
   */
  async findAll(userId: string, query: TaskQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.role === TaskUserRole.REQUESTER) {
      where.requesterId = userId;
    } else if (query.role === TaskUserRole.HELPER) {
      where.helperId = userId;
    } else {
      where.OR = [{ requesterId: userId }, { helperId: userId }];
    }

    if (query.status) {
      where.status = query.status;
    }

    const [total, tasks] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          request: {
            select: {
              id: true,
              title: true,
              type: true,
              approximateArea: true,
              budget: true,
              status: true,
            },
          },
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
          helper: {
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
        },
      }),
    ]);

    return {
      data: tasks.map((t) => this.sanitizeTask(t)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieve task details by ID.
   * Auto-completes if 48h timeout elapsed on an unconfirmed completion.
   */
  async findById(id: string, userId: string) {
    let task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        request: {
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            approximateArea: true,
            budget: true,
            status: true,
            availabilityWindow: true,
          },
        },
        offer: {
          select: {
            id: true,
            message: true,
            counterTerms: true,
            status: true,
          },
        },
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
        helper: {
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
        cancelledBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.requesterId !== userId && task.helperId !== userId) {
      throw new ForbiddenException('You do not have permission to view this task');
    }

    // Check 48h auto-completion timeout
    if (
      task.status === TaskStatus.IN_PROGRESS &&
      task.completionTimeoutAt &&
      new Date() >= new Date(task.completionTimeoutAt)
    ) {
      task = await this.autoCompleteTask(task);
    }

    return this.sanitizeTask(task);
  }

  /**
   * Progress task status through its state lifecycle:
   * PENDING -> ACCEPTED -> IN_PROGRESS -> COMPLETED
   * or any active state -> CANCELLED.
   */
  async updateStatus(id: string, userId: string, dto: UpdateTaskStatusDto) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { request: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.requesterId !== userId && task.helperId !== userId) {
      throw new ForbiddenException('You are not a participant in this task');
    }

    // Terminal state checks
    if (task.status === TaskStatus.COMPLETED) {
      throw new BadRequestException('Task is already COMPLETED and cannot be modified');
    }
    if (task.status === TaskStatus.CANCELLED) {
      throw new BadRequestException('Task is already CANCELLED and cannot be modified');
    }

    const currentHistory = Array.isArray(task.statusHistory) ? (task.statusHistory as any[]) : [];

    // --- CANCELLATION PATH ---
    if (dto.status === TaskStatus.CANCELLED) {
      if (!dto.cancelReason || dto.cancelReason.trim().length === 0) {
        throw new BadRequestException('A cancellation reason is required to cancel a task');
      }

      const updatedHistory = [
        ...currentHistory,
        {
          status: TaskStatus.CANCELLED,
          changedBy: userId,
          timestamp: new Date().toISOString(),
          note: dto.cancelReason.trim(),
        },
      ];

      const updated = await this.prisma.task.update({
        where: { id },
        data: {
          status: TaskStatus.CANCELLED,
          cancelReason: dto.cancelReason.trim(),
          cancelledById: userId,
          statusHistory: updatedHistory as any,
        },
        include: {
          request: true,
          requester: { select: { id: true, name: true } },
          helper: { select: { id: true, name: true } },
          cancelledBy: { select: { id: true, name: true } },
        },
      });

      return {
        message: 'Task cancelled successfully',
        task: this.sanitizeTask(updated),
      };
    }

    // --- STATUS TRANSITIONS VALIDATION ---
    if (dto.status === TaskStatus.ACCEPTED) {
      if (task.status !== TaskStatus.PENDING) {
        throw new BadRequestException(
          `Cannot transition to ACCEPTED from status ${task.status}. Must be in PENDING status.`,
        );
      }

      const updatedHistory = [
        ...currentHistory,
        {
          status: TaskStatus.ACCEPTED,
          changedBy: userId,
          timestamp: new Date().toISOString(),
          note: 'Task terms confirmed by participant',
        },
      ];

      const updated = await this.prisma.task.update({
        where: { id },
        data: {
          status: TaskStatus.ACCEPTED,
          statusHistory: updatedHistory as any,
        },
        include: {
          request: true,
          requester: { select: { id: true, name: true } },
          helper: { select: { id: true, name: true } },
        },
      });

      return {
        message: 'Task accepted successfully',
        task: this.sanitizeTask(updated),
      };
    }

    if (dto.status === TaskStatus.IN_PROGRESS) {
      if (task.status !== TaskStatus.ACCEPTED && task.status !== TaskStatus.PENDING) {
        throw new BadRequestException(
          `Cannot transition to IN_PROGRESS from status ${task.status}. Must be in ACCEPTED status.`,
        );
      }

      const updatedHistory = [
        ...currentHistory,
        {
          status: TaskStatus.IN_PROGRESS,
          changedBy: userId,
          timestamp: new Date().toISOString(),
          note: 'Task session started or scheduled',
        },
      ];

      const updated = await this.prisma.task.update({
        where: { id },
        data: {
          status: TaskStatus.IN_PROGRESS,
          statusHistory: updatedHistory as any,
        },
        include: {
          request: true,
          requester: { select: { id: true, name: true } },
          helper: { select: { id: true, name: true } },
        },
      });

      return {
        message: 'Task marked as in progress',
        task: this.sanitizeTask(updated),
      };
    }

    // --- COMPLETION PATH (PRD Section 11.9: Dual Confirmation & 48h Timeout) ---
    if (dto.status === TaskStatus.COMPLETED) {
      if (task.status !== TaskStatus.IN_PROGRESS && task.status !== TaskStatus.ACCEPTED) {
        throw new BadRequestException(
          `Cannot complete task from status ${task.status}. Must be IN_PROGRESS or ACCEPTED.`,
        );
      }

      const isRequester = userId === task.requesterId;
      const isHelper = userId === task.helperId;

      const requesterDone = isRequester ? true : task.requesterCompleted;
      const helperDone = isHelper ? true : task.helperCompleted;

      // Both parties confirmed completion
      if (requesterDone && helperDone) {
        const updatedHistory = [
          ...currentHistory,
          {
            status: TaskStatus.COMPLETED,
            changedBy: userId,
            timestamp: new Date().toISOString(),
            note: 'Both participants confirmed task completion',
          },
        ];

        return this.prisma.$transaction(async (tx) => {
          const completedTask = await tx.task.update({
            where: { id },
            data: {
              status: TaskStatus.COMPLETED,
              requesterCompleted: true,
              helperCompleted: true,
              completedAt: new Date(),
              statusHistory: updatedHistory as any,
            },
            include: {
              request: true,
              requester: { select: { id: true, name: true } },
              helper: { select: { id: true, name: true } },
            },
          });

          // Close request if not already closed
          await tx.request.update({
            where: { id: task.requestId },
            data: { status: RequestStatus.CLOSED },
          });

          return {
            message: 'Task successfully completed by mutual confirmation',
            task: this.sanitizeTask(completedTask),
          };
        });
      }

      // First party confirmed completion -> initiate 48h timeout
      const timeoutAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
      const updatedHistory = [
        ...currentHistory,
        {
          status: 'AWAITING_COUNTERPART_COMPLETION',
          changedBy: userId,
          timestamp: new Date().toISOString(),
          note: `${isRequester ? 'Requester' : 'Helper'} confirmed completion. Awaiting counterpart confirmation or 48-hour timeout.`,
        },
      ];

      const awaitingTask = await this.prisma.task.update({
        where: { id },
        data: {
          requesterCompleted: requesterDone,
          helperCompleted: helperDone,
          completionTimeoutAt: timeoutAt,
          statusHistory: updatedHistory as any,
        },
        include: {
          request: true,
          requester: { select: { id: true, name: true } },
          helper: { select: { id: true, name: true } },
        },
      });

      return {
        message:
          'Completion recorded. Waiting for counterpart confirmation. Task will auto-complete in 48 hours if uncontested.',
        task: this.sanitizeTask(awaitingTask),
      };
    }

    throw new BadRequestException(`Unsupported status transition to ${dto.status}`);
  }

  /**
   * Auto-completes a task if 48h timeout has passed since first confirmation.
   */
  private async autoCompleteTask(task: any) {
    const currentHistory = Array.isArray(task.statusHistory) ? task.statusHistory : [];
    const updatedHistory = [
      ...currentHistory,
      {
        status: TaskStatus.COMPLETED,
        changedBy: 'SYSTEM_TIMEOUT',
        timestamp: new Date().toISOString(),
        note: 'Task automatically completed after 48-hour confirmation timeout',
      },
    ];

    return this.prisma.$transaction(async (tx) => {
      const completed = await tx.task.update({
        where: { id: task.id },
        data: {
          status: TaskStatus.COMPLETED,
          requesterCompleted: true,
          helperCompleted: true,
          completedAt: new Date(),
          statusHistory: updatedHistory as any,
        },
        include: {
          request: true,
          offer: true,
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
          helper: {
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
          cancelledBy: { select: { id: true, name: true } },
        },
      });

      await tx.request.update({
        where: { id: task.requestId },
        data: { status: RequestStatus.CLOSED },
      });

      return completed;
    });
  }

  private sanitizeTask(task: any) {
    return {
      id: task.id,
      requestId: task.requestId,
      offerId: task.offerId,
      requesterId: task.requesterId,
      helperId: task.helperId,
      agreedTerms: task.agreedTerms,
      status: task.status,
      requesterCompleted: task.requesterCompleted,
      helperCompleted: task.helperCompleted,
      completionTimeoutAt: task.completionTimeoutAt,
      statusHistory: task.statusHistory,
      cancelReason: task.cancelReason,
      cancelledById: task.cancelledById,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      request: task.request
        ? {
            id: task.request.id,
            title: task.request.title,
            description: task.request.description,
            type: task.request.type,
            approximateArea: task.request.approximateArea,
            budget: task.request.budget ? Number(task.request.budget) : null,
            status: task.request.status,
          }
        : undefined,
      offer: task.offer
        ? {
            id: task.offer.id,
            message: task.offer.message,
            counterTerms: task.offer.counterTerms,
            status: task.offer.status,
          }
        : undefined,
      requester: task.requester
        ? {
            id: task.requester.id,
            name: task.requester.name,
            photoUrl: task.requester.profile?.photoUrl || null,
            approximateArea: task.requester.profile?.approximateArea || null,
            college: task.requester.verification?.college || null,
            isVerified: task.requester.verification?.status === VerificationStatus.VERIFIED,
          }
        : undefined,
      helper: task.helper
        ? {
            id: task.helper.id,
            name: task.helper.name,
            photoUrl: task.helper.profile?.photoUrl || null,
            approximateArea: task.helper.profile?.approximateArea || null,
            college: task.helper.verification?.college || null,
            isVerified: task.helper.verification?.status === VerificationStatus.VERIFIED,
          }
        : undefined,
      cancelledBy: task.cancelledBy
        ? {
            id: task.cancelledBy.id,
            name: task.cancelledBy.name,
          }
        : null,
    };
  }
}
