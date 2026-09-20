import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import {
  RequestStatus,
  RequestType,
  OfferStatus,
  TaskStatus,
  UserStatus,
  VerificationStatus,
} from '@prisma/client';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { RequestQueryDto, RequestDirection } from './dto/request-query.dto';
import { getAreaCentroid } from '@common/utils/location.util';

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new typed request (PAID, SKILL_EXCHANGE, or SOCIAL).
   * Enforces college verification, interaction-specific fields, and safety/blocking rules.
   */
  async createRequest(userId: string, dto: CreateRequestDto) {
    // 1. Verify user's college verification status
    const verification = await this.prisma.collegeVerification.findUnique({
      where: { userId },
    });

    if (!verification || verification.status !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException('Student verification is required to create a request.');
    }

    // If skillId is not explicitly provided but a target student exists, resolve from the target student's existing profile skills
    if (!dto.skillId && dto.targetUserId) {
      const targetProfile = await this.prisma.profile.findUnique({
        where: { userId: dto.targetUserId },
        include: { skills: true },
      });
      if (targetProfile?.skills && targetProfile.skills.length > 0) {
        dto.skillId = targetProfile.skills[0].skillId;
      }
    }

    // 2. Validate interaction type constraints (PRD Section 11.5 / 16)
    if (dto.type === RequestType.PAID) {
      if (dto.budget === undefined || dto.budget === null || dto.budget < 0) {
        throw new BadRequestException('A non-negative budget is required for PAID requests');
      }
      if (dto.desiredSkillId) {
        throw new BadRequestException('Desired skill should not be provided for PAID requests');
      }
    } else if (dto.type === RequestType.SKILL_EXCHANGE) {
      if (!dto.desiredSkillId) {
        throw new BadRequestException('Desired skill in return is required for SKILL_EXCHANGE requests');
      }
      if (!dto.skillId) {
        throw new BadRequestException('Offered skill ID is required for SKILL_EXCHANGE requests');
      }
      if (dto.budget !== undefined && dto.budget !== null) {
        throw new BadRequestException('Budget cannot be set for SKILL_EXCHANGE requests');
      }
    } else if (dto.type === RequestType.SOCIAL) {
      if (dto.budget !== undefined && dto.budget !== null) {
        throw new BadRequestException('Budget cannot be set for SOCIAL requests');
      }
      if (dto.desiredSkillId) {
        throw new BadRequestException('Desired skill cannot be set for SOCIAL requests');
      }
    }

    // 3. Self-target check
    if (dto.targetUserId && dto.targetUserId === userId) {
      throw new BadRequestException('Cannot create a targeted request to yourself');
    }

    // 4. Validate referenced skills
    if (dto.skillId) {
      const skill = await this.prisma.skill.findUnique({ where: { id: dto.skillId } });
      if (!skill) throw new NotFoundException('Requested skill not found');
    }
    if (dto.desiredSkillId) {
      const desiredSkill = await this.prisma.skill.findUnique({ where: { id: dto.desiredSkillId } });
      if (!desiredSkill) throw new NotFoundException('Desired return skill not found');
    }

    // 5. Validate target user if targeted request
    if (dto.targetUserId) {
      const target = await this.prisma.user.findUnique({
        where: { id: dto.targetUserId },
      });
      if (!target || target.status === UserStatus.SUSPENDED) {
        throw new NotFoundException('Target student not found or unavailable');
      }

      // Check blocking between requester and target
      const isBlocked = await this.prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: userId, blockedId: dto.targetUserId },
            { blockerId: dto.targetUserId, blockedId: userId },
          ],
        },
      });
      if (isBlocked) {
        throw new ForbiddenException('Cannot send request to this student');
      }
    }

    // 5. Compute approximate centroid
    const centroid = getAreaCentroid(dto.approximateArea);

    const request = await this.prisma.request.create({
      data: {
        requesterId: userId,
        targetUserId: dto.targetUserId || null,
        type: dto.type,
        title: dto.title.trim(),
        description: dto.description.trim(),
        skillId: dto.skillId || null,
        budget: dto.type === RequestType.PAID ? dto.budget : null,
        desiredSkillId: dto.type === RequestType.SKILL_EXCHANGE ? dto.desiredSkillId : null,
        activityTag: dto.type === RequestType.SOCIAL ? dto.activityTag || null : null,
        availabilityWindow: dto.availabilityWindow as any,
        approximateArea: dto.approximateArea.trim(),
        latitudeBucket: centroid?.latitudeBucket || null,
        longitudeBucket: centroid?.longitudeBucket || null,
        status: RequestStatus.OPEN,
      },
      include: {
        skill: true,
        desiredSkill: true,
        targetUser: {
          select: {
            id: true,
            name: true,
            verification: {
              select: {
                college: { select: { id: true, name: true, city: true, area: true } },
                status: true,
              },
            },
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
      },
    });

    return this.sanitizeRequest(request);
  }

  /**
   * Find requests with direction, type, status, area, and skill filters.
   */
  async findAll(currentUserId: string, query: RequestQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    // Fetch list of blocked users to exclude
    const blocks = await this.prisma.block.findMany({
      where: {
        OR: [{ blockerId: currentUserId }, { blockedId: currentUserId }],
      },
    });
    const blockedUserIds = new Set<string>();
    for (const b of blocks) {
      if (b.blockerId === currentUserId) blockedUserIds.add(b.blockedId);
      if (b.blockedId === currentUserId) blockedUserIds.add(b.blockerId);
    }

    const where: any = {
      requester: {
        status: UserStatus.ACTIVE,
        id: { notIn: Array.from(blockedUserIds) },
      },
    };

    if (query.direction === RequestDirection.INCOMING) {
      where.targetUserId = currentUserId;
    } else if (query.direction === RequestDirection.OUTGOING) {
      where.requesterId = currentUserId;
    } else {
      // General browse mode: open requests targeted to me or to everyone, not created by me
      where.status = RequestStatus.OPEN;
      where.requesterId = { not: currentUserId };
      where.OR = [{ targetUserId: null }, { targetUserId: currentUserId }];
    }

    if (query.status) {
      where.status = query.status;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.skillId) {
      where.skillId = query.skillId;
    }
    if (query.area) {
      where.approximateArea = { contains: query.area.trim(), mode: 'insensitive' };
    }

    const [total, requests] = await Promise.all([
      this.prisma.request.count({ where }),
      this.prisma.request.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
          targetUser: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: { offers: true },
          },
        },
      }),
    ]);

    return {
      data: requests.map((r) => this.sanitizeRequest(r)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieve request by ID.
   * If caller is the requester, includes associated offers.
   */
  async findById(id: string, currentUserId: string) {
    const request = await this.prisma.request.findUnique({
      where: { id },
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
        targetUser: {
          select: {
            id: true,
            name: true,
          },
        },
        offers: {
          where: currentUserId
            ? {
                OR: [
                  { offeringUserId: currentUserId }, // Offerer sees their own offer
                  { request: { requesterId: currentUserId } }, // Requester sees all offers
                ],
              }
            : undefined,
          include: {
            offeringUser: {
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
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { offers: true },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Safety blocking check
    const isBlocked = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: currentUserId, blockedId: request.requesterId },
          { blockerId: request.requesterId, blockedId: currentUserId },
        ],
      },
    });
    if (isBlocked) {
      throw new NotFoundException('Request not found');
    }

    return this.sanitizeRequest(request, currentUserId);
  }

  /**
   * Update an open request before any offers are accepted.
   */
  async update(id: string, currentUserId: string, dto: UpdateRequestDto) {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: {
        offers: { where: { status: OfferStatus.ACCEPTED } },
      },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.requesterId !== currentUserId) {
      throw new ForbiddenException('You can only update your own requests');
    }

    if (request.status !== RequestStatus.OPEN) {
      throw new BadRequestException('Only OPEN requests can be updated');
    }

    if (request.offers.length > 0) {
      throw new BadRequestException('Cannot edit a request after an offer has been accepted');
    }

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title.trim();
    if (dto.description !== undefined) updateData.description = dto.description.trim();
    if (dto.budget !== undefined && request.type === RequestType.PAID) {
      updateData.budget = dto.budget;
    }
    if (dto.availabilityWindow !== undefined) {
      updateData.availabilityWindow = dto.availabilityWindow;
    }
    if (dto.approximateArea !== undefined) {
      updateData.approximateArea = dto.approximateArea.trim();
      const centroid = getAreaCentroid(dto.approximateArea);
      updateData.latitudeBucket = centroid?.latitudeBucket || null;
      updateData.longitudeBucket = centroid?.longitudeBucket || null;
    }

    const updated = await this.prisma.request.update({
      where: { id },
      data: updateData,
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
        targetUser: { select: { id: true, name: true } },
      },
    });

    return this.sanitizeRequest(updated);
  }

  /**
   * Close a request (owner only).
   */
  async closeRequest(id: string, currentUserId: string) {
    const request = await this.prisma.request.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');
    if (request.requesterId !== currentUserId) {
      throw new ForbiddenException('You can only close your own requests');
    }

    const updated = await this.prisma.request.update({
      where: { id },
      data: { status: RequestStatus.CLOSED },
    });

    return { message: 'Request closed successfully', status: updated.status };
  }

  /**
   * Cancel a request (owner only).
   */
  async cancelRequest(id: string, currentUserId: string, reason?: string) {
    const request = await this.prisma.request.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');
    if (request.requesterId !== currentUserId) {
      throw new ForbiddenException('You can only cancel your own requests');
    }

    // Transactionally update request to CANCELLED and decline pending offers
    await this.prisma.$transaction([
      this.prisma.request.update({
        where: { id },
        data: { status: RequestStatus.CANCELLED },
      }),
      this.prisma.offer.updateMany({
        where: { requestId: id, status: OfferStatus.PENDING },
        data: { status: OfferStatus.DECLINED },
      }),
    ]);

    return {
      message: 'Request cancelled successfully',
      status: RequestStatus.CANCELLED,
      cancelReason: reason || null,
    };
  }

  /**
   * Directly accept a request by an eligible helper/student.
   * Atomically transitions request to MATCHED, creates/updates accepted offer, declines other offers, and creates Task.
   */
  async acceptRequest(requestId: string, helperUserId: string) {
    // 1. Verify helper is college-verified
    const verification = await this.prisma.collegeVerification.findUnique({
      where: { userId: helperUserId },
    });
    if (!verification || verification.status !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException('Only college-verified students can accept requests');
    }

    // 2. Fetch request
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: {
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
      },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // 3. Self-acceptance prevention
    if (request.requesterId === helperUserId) {
      throw new BadRequestException('Cannot accept your own request');
    }

    // 4. Targeted request check
    if (request.targetUserId && request.targetUserId !== helperUserId) {
      throw new ForbiddenException('This request was sent to another student');
    }

    // 5. Bidirectional blocking check
    const isBlocked = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: helperUserId, blockedId: request.requesterId },
          { blockerId: request.requesterId, blockedId: helperUserId },
        ],
      },
    });
    if (isBlocked) {
      throw new ForbiddenException('Cannot interact with this student due to blocking');
    }

    // 6. Idempotency: if request is already MATCHED and a task already exists for this helper, return existing task
    if (request.status === RequestStatus.MATCHED) {
      const existingTask = await this.prisma.task.findFirst({
        where: {
          requestId: request.id,
          helperId: helperUserId,
        },
        include: {
          request: { select: { id: true, title: true, type: true } },
          requester: { select: { id: true, name: true } },
          helper: { select: { id: true, name: true } },
        },
      });
      if (existingTask) {
        return {
          message: 'Request Accepted',
          request: this.sanitizeRequest(request, helperUserId),
          task: existingTask,
        };
      }
    }

    if (request.status !== RequestStatus.OPEN && request.status !== RequestStatus.MATCHED) {
      throw new BadRequestException('Cannot accept a closed or cancelled request');
    }

    // 7. Atomic transaction
    return this.prisma.$transaction(async (tx) => {
      // Find or create an offer for this helper
      let offer = await tx.offer.findFirst({
        where: {
          requestId: request.id,
          offeringUserId: helperUserId,
        },
      });

      if (!offer) {
        offer = await tx.offer.create({
          data: {
            requestId: request.id,
            offeringUserId: helperUserId,
            message: 'Directly accepted collaboration request',
            status: OfferStatus.ACCEPTED,
          },
        });
      } else {
        offer = await tx.offer.update({
          where: { id: offer.id },
          data: { status: OfferStatus.ACCEPTED },
        });
      }

      // Transition request to MATCHED
      const updatedRequest = await tx.request.update({
        where: { id: request.id },
        data: { status: RequestStatus.MATCHED },
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
          targetUser: { select: { id: true, name: true } },
        },
      });

      // Decline any other pending offers
      if (request.type !== RequestType.SOCIAL) {
        await tx.offer.updateMany({
          where: {
            requestId: request.id,
            id: { not: offer.id },
            status: OfferStatus.PENDING,
          },
          data: { status: OfferStatus.DECLINED },
        });
      }

      // Check if task exists for this offer
      let task = await tx.task.findUnique({
        where: { offerId: offer.id },
        include: {
          request: { select: { id: true, title: true, type: true } },
          requester: { select: { id: true, name: true } },
          helper: { select: { id: true, name: true } },
        },
      });

      if (!task) {
        const agreedTerms = {
          agreedRate: request.budget ? Number(request.budget) : null,
          availabilityWindow: request.availabilityWindow,
          approximateArea: request.approximateArea,
          notes: 'Direct collaboration agreement',
          acceptedAt: new Date().toISOString(),
        };

        task = await tx.task.create({
          data: {
            requestId: request.id,
            offerId: offer.id,
            requesterId: request.requesterId,
            helperId: helperUserId,
            agreedTerms: agreedTerms as any,
            status: TaskStatus.PENDING,
            statusHistory: [
              {
                status: TaskStatus.PENDING,
                changedBy: helperUserId,
                timestamp: new Date().toISOString(),
                note: 'Request accepted, collaboration task initiated',
              },
            ],
          },
          include: {
            request: { select: { id: true, title: true, type: true } },
            requester: { select: { id: true, name: true } },
            helper: { select: { id: true, name: true } },
          },
        });
      }

      return {
        message: 'Request Accepted',
        request: this.sanitizeRequest(updatedRequest, helperUserId),
        offer,
        task,
      };
    });
  }

  /**
   * Sanitizes request record to ensure privacy: strips latitude/longitude buckets.
   */
  private sanitizeRequest(request: any, currentUserId?: string) {
    const isOwner = currentUserId && request.requesterId === currentUserId;

    return {
      id: request.id,
      requesterId: request.requesterId,
      targetUserId: request.targetUserId,
      type: request.type,
      title: request.title,
      description: request.description,
      budget: request.budget ? Number(request.budget) : null,
      activityTag: request.activityTag,
      availabilityWindow: request.availabilityWindow,
      approximateArea: request.approximateArea,
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      skill: request.skill
        ? { id: request.skill.id, name: request.skill.name, category: request.skill.category }
        : null,
      desiredSkill: request.desiredSkill
        ? {
            id: request.desiredSkill.id,
            name: request.desiredSkill.name,
            category: request.desiredSkill.category,
          }
        : null,
      exchangeSkill: request.desiredSkill
        ? {
            id: request.desiredSkill.id,
            name: request.desiredSkill.name,
            category: request.desiredSkill.category,
          }
        : (request.skill
            ? { id: request.skill.id, name: request.skill.name, category: request.skill.category }
            : null),
      requester: request.requester
        ? {
            id: request.requester.id,
            name: request.requester.name,
            photoUrl: request.requester.profile?.photoUrl || null,
            approximateArea: request.requester.profile?.approximateArea || null,
            college: request.requester.verification?.college || null,
            isVerified: request.requester.verification?.status === VerificationStatus.VERIFIED,
          }
        : undefined,
      targetUser: request.targetUser
        ? {
            id: request.targetUser.id,
            name: request.targetUser.name,
          }
        : null,
      offersCount: request._count?.offers !== undefined ? request._count.offers : undefined,
      offers: request.offers
        ? request.offers.map((o: any) => ({
            id: o.id,
            offeringUserId: o.offeringUserId,
            message: o.message,
            counterTerms: o.counterTerms,
            status: o.status,
            createdAt: o.createdAt,
            offeringUser: o.offeringUser
              ? {
                  id: o.offeringUser.id,
                  name: o.offeringUser.name,
                  photoUrl: o.offeringUser.profile?.photoUrl || null,
                  approximateArea: o.offeringUser.profile?.approximateArea || null,
                  college: o.offeringUser.verification?.college || null,
                  isVerified: o.offeringUser.verification?.status === VerificationStatus.VERIFIED,
                }
              : undefined,
          }))
        : undefined,
    };
  }
}
