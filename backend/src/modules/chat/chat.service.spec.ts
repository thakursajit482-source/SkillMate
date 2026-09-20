import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { PrismaService } from '@database/prisma.service';
import { SafetyService } from '@modules/safety/safety.service';
import { ChatGateway } from './chat.gateway';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { VerificationStatus } from '@prisma/client';

describe('ChatService', () => {
  let service: ChatService;
  let prisma: any;
  let safetyService: any;
  let chatGateway: any;

  const mockUser1 = {
    id: 'user-1',
    name: 'Sajit Thakur',
    profile: { photoUrl: null, approximateArea: 'Kandivali' },
    verification: {
      status: VerificationStatus.VERIFIED,
      college: { name: 'Thakur College', city: 'Mumbai', area: 'Kandivali' },
    },
  };

  const mockUser2 = {
    id: 'user-2',
    name: 'Ayesha Patel',
    profile: { photoUrl: null, approximateArea: 'Borivali' },
    verification: {
      status: VerificationStatus.VERIFIED,
      college: { name: 'Thakur College', city: 'Mumbai', area: 'Kandivali' },
    },
  };

  const mockRequest = {
    id: 'req-1',
    requesterId: 'user-1',
    targetUserId: null,
    title: 'Flutter Help',
    type: 'PAID',
    status: 'OPEN',
  };

  const mockThread = {
    id: 'thread-1',
    requestId: 'req-1',
    participantAId: 'user-1',
    participantBId: 'user-2',
    isClosed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    request: mockRequest,
    participantA: mockUser1,
    participantB: mockUser2,
  };

  beforeEach(async () => {
    const mockPrisma: any = {
      request: {
        findUnique: jest.fn(),
      },
      offer: {
        findFirst: jest.fn(),
      },
      task: {
        findFirst: jest.fn(),
      },
      chatThread: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      message: {
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((promises) => Promise.all(promises)),
    };

    const mockSafetyService: any = {
      assertCanInteract: jest.fn().mockResolvedValue(undefined),
      isBlocked: jest.fn().mockResolvedValue(false),
      getBlockedUserIds: jest.fn().mockResolvedValue(new Set()),
    };

    const mockChatGateway: any = {
      broadcastNewMessage: jest.fn(),
      broadcastMessageRead: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SafetyService, useValue: mockSafetyService },
        { provide: ChatGateway, useValue: mockChatGateway },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    prisma = module.get<PrismaService>(PrismaService);
    safetyService = module.get<SafetyService>(SafetyService);
    chatGateway = module.get<ChatGateway>(ChatGateway);
  });

  describe('createOrGetThread', () => {
    it('should create thread when valid offer relationship exists', async () => {
      prisma.request.findUnique.mockResolvedValue(mockRequest);
      prisma.offer.findFirst.mockResolvedValue({ id: 'offer-1', requestId: 'req-1' });
      prisma.task.findFirst.mockResolvedValue(null);
      prisma.chatThread.findUnique.mockResolvedValue(null);
      prisma.chatThread.create.mockResolvedValue(mockThread);

      const result = await service.createOrGetThread('user-1', {
        requestId: 'req-1',
        participantId: 'user-2',
      });

      expect(result.id).toBe('thread-1');
      expect(result.counterpart?.id).toBe('user-2');
    });

    it('should prevent self-chat', async () => {
      await expect(
        service.createOrGetThread('user-1', {
          requestId: 'req-1',
          participantId: 'user-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject thread creation if no relationship exists', async () => {
      prisma.request.findUnique.mockResolvedValue(mockRequest);
      prisma.offer.findFirst.mockResolvedValue(null);
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.createOrGetThread('user-1', {
          requestId: 'req-1',
          participantId: 'user-2',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAllThreads', () => {
    it('should return caller threads', async () => {
      prisma.chatThread.findMany.mockResolvedValue([
        {
          ...mockThread,
          messages: [],
          _count: { messages: 0 },
        },
      ]);

      const result = await service.findAllThreads('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('thread-1');
    });
  });

  describe('findThreadById', () => {
    it('should return thread for authorized participant', async () => {
      prisma.chatThread.findUnique.mockResolvedValue(mockThread);

      const result = await service.findThreadById('thread-1', 'user-1');
      expect(result.id).toBe('thread-1');
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      prisma.chatThread.findUnique.mockResolvedValue(mockThread);

      await expect(service.findThreadById('thread-1', 'intruder-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('sendMessage', () => {
    it('should persist message and broadcast via socket', async () => {
      prisma.chatThread.findUnique.mockResolvedValue(mockThread);
      prisma.message.create.mockResolvedValue({
        id: 'msg-1',
        threadId: 'thread-1',
        senderId: 'user-1',
        content: 'Hello Ayesha',
        sentAt: new Date(),
        deliveredAt: null,
        readAt: null,
        sender: { id: 'user-1', name: 'Sajit Thakur' },
      });
      prisma.chatThread.update.mockResolvedValue(mockThread);

      const result = await service.sendMessage('thread-1', 'user-1', {
        content: 'Hello Ayesha',
      });

      expect(result.id).toBe('msg-1');
      expect(result.content).toBe('Hello Ayesha');
      expect(chatGateway.broadcastNewMessage).toHaveBeenCalled();
    });

    it('should reject empty message', async () => {
      await expect(
        service.sendMessage('thread-1', 'user-1', { content: '   ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject message if recipient is blocked', async () => {
      prisma.chatThread.findUnique.mockResolvedValue(mockThread);
      safetyService.isBlocked.mockResolvedValue(true);

      await expect(
        service.sendMessage('thread-1', 'user-1', { content: 'Testing blocked' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findMessages', () => {
    it('should return paginated messages and mark counterpart unread as read', async () => {
      prisma.chatThread.findUnique.mockResolvedValue(mockThread);
      prisma.message.updateMany.mockResolvedValue({ count: 1 });
      prisma.message.count.mockResolvedValue(1);
      prisma.message.findMany.mockResolvedValue([
        {
          id: 'msg-1',
          threadId: 'thread-1',
          senderId: 'user-2',
          content: 'Hi Sajit',
          sentAt: new Date(),
          deliveredAt: null,
          readAt: new Date(),
          sender: { id: 'user-2', name: 'Ayesha Patel' },
        },
      ]);

      const result = await service.findMessages('thread-1', 'user-1', { page: 1, limit: 30 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(prisma.message.updateMany).toHaveBeenCalled();
    });
  });
});
