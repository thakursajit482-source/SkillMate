import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import {
  OfferStatus,
  RequestStatus,
  RequestType,
  TaskStatus,
  VerificationStatus,
} from '@prisma/client';
import { CreateOfferDto } from './dto/create-offer.dto';
import { OfferQueryDto } from './dto/offer-query.dto';

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Submit an offer on an open request.
   * Enforces college verification check, blocking checks, and prevents self-offers.
   */
  async createOffer(requestId: string, userId: string, dto: CreateOfferDto) {
    // 1. Verify user's college verification status
    const verification = await this.prisma.collegeVerification.findUnique({
      where: { userId },
    });
    if (!verification || verification.status !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException('Only college-verified students can submit offers');
    }

    // 2. Fetch request
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status !== RequestStatus.OPEN) {
      throw new BadRequestException('Cannot make an offer on a request that is not OPEN');
    }

    // 3. Self-offer check
    if (request.requesterId === userId) {
      throw new BadRequestException('Cannot make an offer on your own request');
    }

    // 4. Targeted request check
    if (request.targetUserId && request.targetUserId !== userId) {
      throw new ForbiddenException('This request is targeted to a specific student');
    }

    // 5. Bidirectional blocking check
    const isBlocked = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: request.requesterId },
          { blockerId: request.requesterId, blockedId: userId },
        ],
      },
    });
    if (isBlocked) {
      throw new ForbiddenException('Unable to interact with this student');
    }

    // 6. Check existing pending offer
    const existingOffer = await this.prisma.offer.findFirst({
      where: {
        requestId,
        offeringUserId: userId,
        status: OfferStatus.PENDING,
      },
    });
    if (existingOffer) {
      throw new BadRequestException('You already have an active pending offer on this request');
    }

    const offer = await this.prisma.offer.create({
      data: {
        requestId,
        offeringUserId: userId,
        message: dto.message?.trim() || null,
        counterTerms: dto.counterTerms as any,
        status: OfferStatus.PENDING,
      },
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
    });

    return this.sanitizeOffer(offer);
  }

  /**
   * List all offers on a specific request (owner only).
   */
  async findAllForRequest(requestId: string, userId: string, query: OfferQueryDto) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.requesterId !== userId) {
      throw new ForbiddenException('Only the requester can view all offers on this request');
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = { requestId };
    if (query.status) {
      where.status = query.status;
    }

    const [total, offers] = await Promise.all([
      this.prisma.offer.count({ where }),
      this.prisma.offer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
          task: {
            select: { id: true, status: true },
          },
        },
      }),
    ]);

    return {
      data: offers.map((o) => this.sanitizeOffer(o)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find all offers submitted by the current user.
   */
  async findMine(userId: string) {
    const offers = await this.prisma.offer.findMany({
      where: { offeringUserId: userId },
      include: {
        request: {
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            budget: true,
            status: true,
            approximateArea: true,
            requesterId: true,
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
        },
        task: {
          select: { id: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      items: offers.map((o) => this.sanitizeOffer(o)),
      total: offers.length,
    };
  }

  /**
   * Find single offer by ID (accessible by offerer or request owner).
   */
  async findById(id: string, userId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id },
      include: {
        request: {
          select: {
            id: true,
            title: true,
            type: true,
            requesterId: true,
            status: true,
            budget: true,
            approximateArea: true,
          },
        },
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
        task: {
          select: { id: true, status: true },
        },
      },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.offeringUserId !== userId && offer.request.requesterId !== userId) {
      throw new ForbiddenException('You do not have permission to view this offer');
    }

    return this.sanitizeOffer(offer);
  }

  /**
   * Accept an offer.
   * Atomically marks offer ACCEPTED, transitions request to MATCHED (for non-social),
   * declines other pending offers if non-social, and creates a Task in PENDING status.
   */
  async acceptOffer(offerId: string, userId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { request: true, offeringUser: true },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.request.requesterId !== userId) {
      throw new ForbiddenException('Only the requester can accept an offer');
    }

    if (offer.status !== OfferStatus.PENDING) {
      throw new BadRequestException('Only PENDING offers can be accepted');
    }

    if (
      offer.request.status === RequestStatus.CLOSED ||
      offer.request.status === RequestStatus.CANCELLED
    ) {
      throw new BadRequestException('Cannot accept an offer on a closed or cancelled request');
    }

    // Compile agreed terms
    const counter = offer.counterTerms as any;
    const agreedTerms = {
      agreedRate: counter?.counterRate ?? (offer.request.budget ? Number(offer.request.budget) : null),
      proposedTime: counter?.proposedTime ?? null,
      availabilityWindow: offer.request.availabilityWindow,
      approximateArea: offer.request.approximateArea,
      notes: counter?.notes ?? offer.message ?? null,
      acceptedAt: new Date().toISOString(),
    };

    // Perform atomic transaction
    return this.prisma.$transaction(async (tx) => {
      // 1. Update accepted offer
      const updatedOffer = await tx.offer.update({
        where: { id: offer.id },
        data: { status: OfferStatus.ACCEPTED },
      });

      // 2. If non-social, transition request to MATCHED and decline other pending offers
      if (offer.request.type !== RequestType.SOCIAL) {
        await tx.request.update({
          where: { id: offer.requestId },
          data: { status: RequestStatus.MATCHED },
        });

        await tx.offer.updateMany({
          where: {
            requestId: offer.requestId,
            id: { not: offer.id },
            status: OfferStatus.PENDING,
          },
          data: { status: OfferStatus.DECLINED },
        });
      }

      // 3. Create Task
      const task = await tx.task.create({
        data: {
          requestId: offer.requestId,
          offerId: offer.id,
          requesterId: offer.request.requesterId,
          helperId: offer.offeringUserId,
          agreedTerms: agreedTerms as any,
          status: TaskStatus.PENDING,
          statusHistory: [
            {
              status: TaskStatus.PENDING,
              changedBy: userId,
              timestamp: new Date().toISOString(),
              note: 'Offer accepted, collaboration task initiated',
            },
          ],
        },
        include: {
          request: {
            select: { id: true, title: true, type: true },
          },
          requester: {
            select: { id: true, name: true },
          },
          helper: {
            select: { id: true, name: true },
          },
        },
      });

      return {
        message: 'Offer accepted and collaboration task created successfully',
        offer: this.sanitizeOffer(updatedOffer),
        task,
      };
    });
  }

  /**
   * Decline an offer (request owner only).
   */
  async declineOffer(offerId: string, userId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { request: true },
    });

    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.request.requesterId !== userId) {
      throw new ForbiddenException('Only the requester can decline this offer');
    }

    if (offer.status !== OfferStatus.PENDING) {
      throw new BadRequestException('Only PENDING offers can be declined');
    }

    const updated = await this.prisma.offer.update({
      where: { id: offerId },
      data: { status: OfferStatus.DECLINED },
    });

    return { message: 'Offer declined', status: updated.status };
  }

  /**
   * Withdraw an offer (offering user only).
   */
  async withdrawOffer(offerId: string, userId: string) {
    const offer = await this.prisma.offer.findUnique({ where: { id: offerId } });
    if (!offer) throw new NotFoundException('Offer not found');

    if (offer.offeringUserId !== userId) {
      throw new ForbiddenException('You can only withdraw your own offer');
    }

    if (offer.status !== OfferStatus.PENDING) {
      throw new BadRequestException('Only PENDING offers can be withdrawn');
    }

    const updated = await this.prisma.offer.update({
      where: { id: offerId },
      data: { status: OfferStatus.WITHDRAWN },
    });

    return { message: 'Offer withdrawn successfully', status: updated.status };
  }

  private sanitizeOffer(offer: any) {
    return {
      id: offer.id,
      requestId: offer.requestId,
      offeringUserId: offer.offeringUserId,
      message: offer.message,
      counterTerms: offer.counterTerms,
      status: offer.status,
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt,
      request: offer.request
        ? {
            id: offer.request.id,
            title: offer.request.title,
            description: offer.request.description,
            type: offer.request.type,
            status: offer.request.status,
            budget: offer.request.budget ? Number(offer.request.budget) : null,
            approximateArea: offer.request.approximateArea,
            requesterId: offer.request.requesterId,
            requester: offer.request.requester
              ? {
                  id: offer.request.requester.id,
                  name: offer.request.requester.name,
                  photoUrl: offer.request.requester.profile?.photoUrl || null,
                  approximateArea: offer.request.requester.profile?.approximateArea || null,
                  college: offer.request.requester.verification?.college || null,
                  isVerified: offer.request.requester.verification?.status === VerificationStatus.VERIFIED,
                }
              : undefined,
          }
        : undefined,
      offeringUser: offer.offeringUser
        ? {
            id: offer.offeringUser.id,
            name: offer.offeringUser.name,
            photoUrl: offer.offeringUser.profile?.photoUrl || null,
            approximateArea: offer.offeringUser.profile?.approximateArea || null,
            college: offer.offeringUser.verification?.college || null,
            isVerified: offer.offeringUser.verification?.status === VerificationStatus.VERIFIED,
          }
        : undefined,
      taskId: offer.task?.id || null,
      taskStatus: offer.task?.status || null,
    };
  }
}
