import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { SafetyService } from '@modules/safety/safety.service';
import { ChatGateway } from './chat.gateway';
import { CreateThreadDto } from './dto/create-thread.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatQueryDto } from './dto/chat-query.dto';
import { UserStatus, VerificationStatus } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly safetyService: SafetyService,
    private readonly chatGateway: ChatGateway,
  ) {}

  /**
   * Create or retrieve an existing 1:1 chat thread scoped to a Request/Offer/Task relationship.
   * PRD Section 11.8: "Chat is scoped to a request/offer context — there is no general open messaging/DM outside a request relationship."
   */
  async createOrGetThread(currentUserId: string, dto: CreateThreadDto) {
    if (currentUserId === dto.participantId) {
      throw new BadRequestException('Cannot create a chat thread with yourself');
    }

    // 1. Safety & Account Status check
    await this.safetyService.assertCanInteract(currentUserId, dto.participantId);

    // 2. Fetch request
    const request = await this.prisma.request.findUnique({
      where: { id: dto.requestId },
    });
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // 3. Legitimate SkillMate relationship validation
    // Allowed if:
    // a) An offer exists between these two users on this request
    // b) A task exists for this request involving these two users
    // c) The request was directly targeted to the participant by the creator (or vice versa)
    const [offerExists, taskExists] = await Promise.all([
      this.prisma.offer.findFirst({
        where: {
          requestId: dto.requestId,
          OR: [
            { offeringUserId: currentUserId, request: { requesterId: dto.participantId } },
            { offeringUserId: dto.participantId, request: { requesterId: currentUserId } },
          ],
        },
      }),
      this.prisma.task.findFirst({
        where: {
          requestId: dto.requestId,
          OR: [
            { requesterId: currentUserId, helperId: dto.participantId },
            { requesterId: dto.participantId, helperId: currentUserId },
          ],
        },
      }),
    ]);

    const isDirectTargetedRequest =
      (request.requesterId === currentUserId && request.targetUserId === dto.participantId) ||
      (request.requesterId === dto.participantId && request.targetUserId === currentUserId);

    if (!offerExists && !taskExists && !isDirectTargetedRequest) {
      throw new ForbiddenException(
        'Chat unlocks only after an offer, task, or direct request pairing exists between participants',
      );
    }

    // Canonical ordering of participant IDs for uniqueness constraint
    const [participantAId, participantBId] = [currentUserId, dto.participantId].sort();

    let thread = await this.prisma.chatThread.findUnique({
      where: {
        requestId_participantAId_participantBId: {
          requestId: dto.requestId,
          participantAId,
          participantBId,
        },
      },
      include: {
        request: { select: { id: true, title: true, type: true, status: true } },
        participantA: {
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
        participantB: {
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

    if (!thread) {
      thread = await this.prisma.chatThread.create({
        data: {
          requestId: dto.requestId,
          participantAId,
          participantBId,
          isClosed: false,
        },
        include: {
          request: { select: { id: true, title: true, type: true, status: true } },
          participantA: {
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
          participantB: {
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
    }

    return this.sanitizeThread(thread, currentUserId);
  }

  /**
   * List all chat threads for the current user.
   */
  async findAllThreads(userId: string) {
    const blockedIds = await this.safetyService.getBlockedUserIds(userId);

    const threads = await this.prisma.chatThread.findMany({
      where: {
        OR: [{ participantAId: userId }, { participantBId: userId }],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        request: { select: { id: true, title: true, type: true, status: true } },
        participantA: {
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
        participantB: {
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
        messages: {
          take: 1,
          orderBy: { sentAt: 'desc' },
          select: { id: true, content: true, sentAt: true, senderId: true, readAt: true },
        },
        _count: {
          select: {
            messages: {
              where: {
                senderId: { not: userId },
                readAt: null,
              },
            },
          },
        },
      },
    });

    // Filter out threads with blocked users
    const filtered = threads.filter((t) => {
      const otherId = t.participantAId === userId ? t.participantBId : t.participantAId;
      return !blockedIds.has(otherId);
    });

    return filtered.map((t) => ({
      ...this.sanitizeThread(t, userId),
      lastMessage: t.messages[0] || null,
      unreadCount: t._count.messages,
    }));
  }

  /**
   * Retrieve thread detail by ID.
   */
  async findThreadById(threadId: string, userId: string) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
      include: {
        request: { select: { id: true, title: true, type: true, status: true } },
        participantA: {
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
        participantB: {
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

    if (!thread) {
      throw new NotFoundException('Chat thread not found');
    }

    if (thread.participantAId !== userId && thread.participantBId !== userId) {
      throw new ForbiddenException('You do not have permission to view this chat thread');
    }

    return this.sanitizeThread(thread, userId);
  }

  /**
   * Send a message in a thread. Persists to database and broadcasts via Socket.IO.
   */
  async sendMessage(threadId: string, senderId: string, dto: SendMessageDto) {
    const trimmed = dto.content ? dto.content.trim() : '';
    if (!trimmed) {
      throw new BadRequestException('Message content cannot be empty');
    }

    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
    });
    if (!thread) {
      throw new NotFoundException('Chat thread not found');
    }

    if (thread.participantAId !== senderId && thread.participantBId !== senderId) {
      throw new ForbiddenException('You are not a participant in this chat thread');
    }

    if (thread.isClosed) {
      throw new BadRequestException('Cannot send messages in a closed chat thread');
    }

    const recipientId = thread.participantAId === senderId ? thread.participantBId : thread.participantAId;

    // Blocking check: thread becomes read-only if blocked
    const isBlocked = await this.safetyService.isBlocked(senderId, recipientId);
    if (isBlocked) {
      throw new ForbiddenException('Cannot send messages to a blocked user');
    }

    // Persist message in database (durable write before response)
    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          threadId,
          senderId,
          content: trimmed,
          sentAt: new Date(),
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.chatThread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
      }),
    ]);

    const sanitizedMessage = {
      id: message.id,
      threadId: message.threadId,
      senderId: message.senderId,
      senderName: message.sender.name,
      content: message.content,
      sentAt: message.sentAt,
      createdAt: message.sentAt,
      deliveredAt: message.deliveredAt,
      readAt: message.readAt,
      isRead: !!message.readAt,
    };

    // Broadcast to real-time WebSocket room
    this.chatGateway.broadcastNewMessage(threadId, sanitizedMessage);

    return sanitizedMessage;
  }

  /**
   * Retrieve paginated message history for a thread.
   */
  async findMessages(threadId: string, userId: string, query: ChatQueryDto) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
    });
    if (!thread) {
      throw new NotFoundException('Chat thread not found');
    }

    if (thread.participantAId !== userId && thread.participantBId !== userId) {
      throw new ForbiddenException('You do not have permission to view messages in this thread');
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 30));
    const skip = (page - 1) * limit;

    // Mark unread messages sent by counterpart as read
    const now = new Date();
    await this.prisma.message.updateMany({
      where: {
        threadId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: now },
    });

    this.chatGateway.broadcastMessageRead(threadId, { readBy: userId, readAt: now.toISOString() });

    const [total, messages] = await Promise.all([
      this.prisma.message.count({ where: { threadId } }),
      this.prisma.message.findMany({
        where: { threadId },
        skip,
        take: limit,
        orderBy: { sentAt: 'asc' },
        include: {
          sender: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    return {
      data: messages.map((m) => ({
        id: m.id,
        threadId: m.threadId,
        senderId: m.senderId,
        senderName: m.sender.name,
        content: m.content,
        sentAt: m.sentAt,
        createdAt: m.sentAt,
        deliveredAt: m.deliveredAt,
        readAt: m.readAt,
        isRead: !!m.readAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  private sanitizeThread(thread: any, currentUserId: string) {
    const otherUser =
      thread.participantAId === currentUserId ? thread.participantB : thread.participantA;

    return {
      id: thread.id,
      requestId: thread.requestId,
      isClosed: thread.isClosed,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      request: thread.request || null,
      counterpart: otherUser
        ? {
            id: otherUser.id,
            name: otherUser.name,
            photoUrl: otherUser.profile?.photoUrl || null,
            approximateArea: otherUser.profile?.approximateArea || null,
            college: otherUser.verification?.college || null,
            isVerified: otherUser.verification?.status === VerificationStatus.VERIFIED,
          }
        : null,
    };
  }
}
