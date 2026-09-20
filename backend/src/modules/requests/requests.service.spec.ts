import { Test, TestingModule } from '@nestjs/testing';
import { RequestsService } from './requests.service';
import { PrismaService } from '@database/prisma.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RequestStatus, RequestType, VerificationStatus, UserStatus } from '@prisma/client';
import { RequestDirection } from './dto/request-query.dto';

describe('RequestsService', () => {
  let service: RequestsService;
  let prisma: any;

  const mockUser = {
    id: 'user-1',
    name: 'Sajit Thakur',
    profile: { photoUrl: null, approximateArea: 'Kandivali' },
    verification: {
      status: VerificationStatus.VERIFIED,
      college: { id: 'col-1', name: 'Thakur College', city: 'Mumbai', area: 'Kandivali' },
    },
  };

  const mockSkill = {
    id: 'skill-1',
    name: 'Flutter',
    category: 'Engineering',
  };

  const mockRequest = {
    id: 'req-1',
    requesterId: 'user-1',
    targetUserId: null,
    type: RequestType.PAID,
    title: 'Need help debugging Flutter login',
    description: 'Looking for assistance with Firebase Auth login error in Flutter app',
    skillId: 'skill-1',
    budget: 300,
    desiredSkillId: null,
    activityTag: null,
    availabilityWindow: { startTime: '18:00', endTime: '21:00' },
    approximateArea: 'Kandivali',
    latitudeBucket: 19.206,
    longitudeBucket: 72.852,
    status: RequestStatus.OPEN,
    createdAt: new Date(),
    updatedAt: new Date(),
    skill: mockSkill,
    desiredSkill: null,
    requester: mockUser,
    targetUser: null,
    offers: [],
    _count: { offers: 0 },
  };

  beforeEach(async () => {
    const mockPrisma = {
      collegeVerification: {
        findUnique: jest.fn(),
      },
      skill: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      profile: {
        findUnique: jest.fn(),
      },
      block: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      request: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      offer: {
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((promises) => Promise.all(promises)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RequestsService>(RequestsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createRequest', () => {
    it('should create a valid PAID request when user is verified', async () => {
      prisma.collegeVerification.findUnique.mockResolvedValue({
        status: VerificationStatus.VERIFIED,
      });
      prisma.skill.findUnique.mockResolvedValue(mockSkill);
      prisma.request.create.mockResolvedValue(mockRequest);

      const result = await service.createRequest('user-1', {
        type: RequestType.PAID,
        title: 'Need help debugging Flutter login',
        description: 'Looking for assistance with Firebase Auth login error in Flutter app',
        skillId: 'skill-1',
        budget: 300,
        availabilityWindow: { startTime: '18:00', endTime: '21:00' },
        approximateArea: 'Kandivali',
      });

      expect(result.id).toBe('req-1');
      expect(result.status).toBe(RequestStatus.OPEN);
      expect(result.budget).toBe(300);
      expect((result as any).latitudeBucket).toBeUndefined(); // Coarse coords stripped for privacy
    });

    it('should throw ForbiddenException with exact required message if user is not verified', async () => {
      prisma.collegeVerification.findUnique.mockResolvedValue({
        status: VerificationStatus.UNVERIFIED,
      });

      await expect(
        service.createRequest('user-1', {
          type: RequestType.PAID,
          title: 'Need help',
          description: 'Need help with math assignment problem set',
          budget: 200,
          skillId: 'skill-1',
          availabilityWindow: { startTime: '10:00', endTime: '12:00' },
          approximateArea: 'Borivali',
        }),
      ).rejects.toThrow('Student verification is required to create a request.');
    });

    it('should allow VERIFIED student to create SKILL / PAID request without special ID', async () => {
      prisma.collegeVerification.findUnique.mockResolvedValue({
        status: VerificationStatus.VERIFIED,
      });
      prisma.skill.findUnique.mockResolvedValue(mockSkill);
      prisma.request.create.mockResolvedValue({
        ...mockRequest,
        requesterId: 'user-1',
        type: RequestType.PAID,
      });

      const result = await service.createRequest('user-1', {
        type: RequestType.PAID,
        title: 'Need Python Tutor',
        description: 'Need assistance with Python data structures assignment',
        skillId: 'skill-1',
        budget: 400,
        availabilityWindow: { startTime: '14:00', endTime: '16:00' },
        approximateArea: 'Andheri',
      });

      expect(result.requesterId).toBe('user-1');
      expect(result.status).toBe(RequestStatus.OPEN);
    });

    it('should allow VERIFIED student to send PAID bounty request without skillId and preserve budget', async () => {
      prisma.collegeVerification.findUnique.mockResolvedValue({
        status: VerificationStatus.VERIFIED,
      });
      prisma.request.create.mockResolvedValue({
        ...mockRequest,
        requesterId: 'user-1',
        type: RequestType.PAID,
        budget: 200,
        skillId: null,
      });

      const result = await service.createRequest('user-1', {
        type: RequestType.PAID,
        title: 'Need help with project debug',
        description: 'Need assistance fixing critical bug in deployment script',
        budget: 200,
        availabilityWindow: { startTime: '14:00', endTime: '16:00' },
        approximateArea: 'Andheri',
      });

      expect(result.requesterId).toBe('user-1');
      expect(result.type).toBe(RequestType.PAID);
      expect(result.budget).toBe(200);
    });

    it('should automatically resolve target student profile skill when sending direct PAID request', async () => {
      prisma.collegeVerification.findUnique.mockResolvedValue({
        status: VerificationStatus.VERIFIED,
      });
      prisma.profile.findUnique.mockResolvedValue({
        skills: [{ skillId: 'skill-flutter-123' }],
      });
      prisma.skill.findUnique.mockResolvedValue(mockSkill);
      prisma.user.findUnique.mockResolvedValue({ id: 'user-target', status: 'ACTIVE' });
      prisma.block.findFirst.mockResolvedValue(null);
      prisma.request.create.mockResolvedValue({
        ...mockRequest,
        requesterId: 'user-1',
        targetUserId: 'user-target',
        type: RequestType.PAID,
        skillId: 'skill-flutter-123',
        budget: 200,
      });

      const result = await service.createRequest('user-1', {
        type: RequestType.PAID,
        title: 'Paid Bounty for Flutter',
        description: 'Need peer tutoring in Flutter',
        targetUserId: 'user-target',
        budget: 200,
        availabilityWindow: { startTime: '14:00', endTime: '16:00' },
        approximateArea: 'Andheri',
      });

      expect(result.targetUserId).toBe('user-target');
      expect(result.budget).toBe(200);
      expect(prisma.request.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            skillId: 'skill-flutter-123',
            budget: 200,
            targetUserId: 'user-target',
          }),
        }),
      );
    });

    it('should allow VERIFIED student to create SKILL_EXCHANGE request without special ID', async () => {
      prisma.collegeVerification.findUnique.mockResolvedValue({
        status: VerificationStatus.VERIFIED,
      });
      prisma.skill.findUnique.mockResolvedValue(mockSkill);
      prisma.request.create.mockResolvedValue({
        ...mockRequest,
        type: RequestType.SKILL_EXCHANGE,
        desiredSkillId: 'skill-2',
      });

      const result = await service.createRequest('user-1', {
        type: RequestType.SKILL_EXCHANGE,
        title: 'Swap Flutter for Node.js',
        description: 'I will teach Flutter mobile app dev in exchange for backend Node.js',
        skillId: 'skill-1',
        desiredSkillId: 'skill-1',
        availabilityWindow: { startTime: '18:00', endTime: '20:00' },
        approximateArea: 'Kandivali',
      });

      expect(result.id).toBe('req-1');
      expect(result.type).toBe(RequestType.SKILL_EXCHANGE);
    });

    it('should allow VERIFIED student to create SOCIAL / Study Group request without special ID', async () => {
      prisma.collegeVerification.findUnique.mockResolvedValue({
        status: VerificationStatus.VERIFIED,
      });
      prisma.request.create.mockResolvedValue({
        ...mockRequest,
        type: RequestType.SOCIAL,
        skillId: null,
        budget: null,
        activityTag: 'Hackathon Team',
      });

      const result = await service.createRequest('user-1', {
        type: RequestType.SOCIAL,
        title: 'Smart India Hackathon Group',
        description: 'Looking for 3 student teammates for SIH college hackathon round',
        activityTag: 'Hackathon Team',
        availabilityWindow: { startTime: '16:00', endTime: '19:00' },
        approximateArea: 'Powai',
      });

      expect(result.id).toBe('req-1');
      expect(result.type).toBe(RequestType.SOCIAL);
    });

    it('should explicitly set requesterId to the authenticated user ID upon creation', async () => {
      prisma.collegeVerification.findUnique.mockResolvedValue({
        status: VerificationStatus.VERIFIED,
      });
      prisma.skill.findUnique.mockResolvedValue(mockSkill);
      prisma.request.create.mockImplementation((args: any) => {
        return Promise.resolve({
          ...mockRequest,
          requesterId: args.data.requesterId,
        });
      });

      const result = await service.createRequest('authenticated-student-uuid-999', {
        type: RequestType.PAID,
        title: 'Math Tutoring Needed',
        description: 'Engineering Calculus exam preparation help needed',
        skillId: 'skill-1',
        budget: 500,
        availabilityWindow: { startTime: '10:00', endTime: '12:00' },
        approximateArea: 'Vile Parle',
      });

      expect(result.requesterId).toBe('authenticated-student-uuid-999');
    });

    it('should throw BadRequestException if PAID request has no budget', async () => {
      prisma.collegeVerification.findUnique.mockResolvedValue({
        status: VerificationStatus.VERIFIED,
      });

      await expect(
        service.createRequest('user-1', {
          type: RequestType.PAID,
          title: 'Need help',
          description: 'Need help with math assignment problem set',
          skillId: 'skill-1',
          availabilityWindow: { startTime: '10:00', endTime: '12:00' },
          approximateArea: 'Borivali',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if SKILL_EXCHANGE lacks desiredSkillId', async () => {
      prisma.collegeVerification.findUnique.mockResolvedValue({
        status: VerificationStatus.VERIFIED,
      });

      await expect(
        service.createRequest('user-1', {
          type: RequestType.SKILL_EXCHANGE,
          title: 'Teach Photoshop for Flutter',
          description: 'Looking to exchange design tutoring for coding lessons',
          skillId: 'skill-1',
          availabilityWindow: { startTime: '18:00', endTime: '20:00' },
          approximateArea: 'Malad',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent self-targeted request', async () => {
      prisma.collegeVerification.findUnique.mockResolvedValue({
        status: VerificationStatus.VERIFIED,
      });

      await expect(
        service.createRequest('user-1', {
          type: RequestType.PAID,
          title: 'Direct request to me',
          description: 'Testing self request block validation',
          skillId: 'skill-1',
          budget: 200,
          targetUserId: 'user-1',
          availabilityWindow: { startTime: '18:00', endTime: '20:00' },
          approximateArea: 'Kandivali',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject request if target user blocked requester', async () => {
      prisma.collegeVerification.findUnique.mockResolvedValue({
        status: VerificationStatus.VERIFIED,
      });
      prisma.skill.findUnique.mockResolvedValue(mockSkill);
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2', status: UserStatus.ACTIVE });
      prisma.block.findFirst.mockResolvedValue({ id: 'block-1', blockerId: 'user-2', blockedId: 'user-1' });

      await expect(
        service.createRequest('user-1', {
          type: RequestType.PAID,
          title: 'Request to blocked peer',
          description: 'Testing block check validation on direct request',
          skillId: 'skill-1',
          budget: 200,
          targetUserId: 'user-2',
          availabilityWindow: { startTime: '18:00', endTime: '20:00' },
          approximateArea: 'Kandivali',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should return paginated requests', async () => {
      prisma.request.count.mockResolvedValue(1);
      prisma.request.findMany.mockResolvedValue([mockRequest]);

      const result = await service.findAll('user-1', { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0].id).toBe('req-1');
    });

    it('My Requests: should filter by requesterId = authenticated user ID for direction OUTGOING', async () => {
      prisma.request.count.mockResolvedValue(2);
      prisma.request.findMany.mockImplementation((args: any) => {
        expect(args.where.requesterId).toBe('user-1');
        return Promise.resolve([
          mockRequest,
          { ...mockRequest, id: 'req-2', title: 'Second Request' },
        ]);
      });

      const result = await service.findAll('user-1', {
        direction: RequestDirection.OUTGOING,
      });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.data[0].requesterId).toBe('user-1');
      expect(result.data[1].requesterId).toBe('user-1');
    });

    it('My Requests: newly created OPEN request appears in outgoing list and not other users', async () => {
      const myOpenRequest = {
        ...mockRequest,
        id: 'req-new',
        requesterId: 'user-1',
        status: RequestStatus.OPEN,
      };

      prisma.request.count.mockResolvedValue(1);
      prisma.request.findMany.mockImplementation((args: any) => {
        expect(args.where.requesterId).toBe('user-1');
        return Promise.resolve([myOpenRequest]);
      });

      const result = await service.findAll('user-1', {
        direction: RequestDirection.OUTGOING,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('req-new');
      expect(result.data[0].status).toBe(RequestStatus.OPEN);
    });
  });

  describe('findById', () => {
    it('should return request details and sanitize coordinates', async () => {
      prisma.request.findUnique.mockResolvedValue(mockRequest);
      prisma.block.findFirst.mockResolvedValue(null);

      const result = await service.findById('req-1', 'user-1');
      expect(result.id).toBe('req-1');
      expect((result as any).latitudeBucket).toBeUndefined();
    });

    it('should throw NotFoundException if request does not exist', async () => {
      prisma.request.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should allow owner to update OPEN request before offers are accepted', async () => {
      prisma.request.findUnique.mockResolvedValue({
        ...mockRequest,
        offers: [],
      });
      prisma.request.update.mockResolvedValue({
        ...mockRequest,
        title: 'Updated title',
      });

      const result = await service.update('req-1', 'user-1', {
        title: 'Updated title',
      });

      expect(result.title).toBe('Updated title');
    });

    it('should throw ForbiddenException if non-owner attempts update', async () => {
      prisma.request.findUnique.mockResolvedValue({
        ...mockRequest,
        offers: [],
      });

      await expect(
        service.update('req-1', 'other-user', { title: 'Unauthorized' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancelRequest', () => {
    it('should allow owner to cancel request and decline pending offers', async () => {
      prisma.request.findUnique.mockResolvedValue(mockRequest);
      prisma.request.update.mockResolvedValue({
        ...mockRequest,
        status: RequestStatus.CANCELLED,
      });

      const result = await service.cancelRequest('req-1', 'user-1', 'No longer need assistance');
      expect(result.status).toBe(RequestStatus.CANCELLED);
    });
  });

  describe('closeRequest', () => {
    it('should allow owner to close request', async () => {
      prisma.request.findUnique.mockResolvedValue(mockRequest);
      prisma.request.update.mockResolvedValue({
        ...mockRequest,
        status: RequestStatus.CLOSED,
      });

      const result = await service.closeRequest('req-1', 'user-1');
      expect(result.status).toBe(RequestStatus.CLOSED);
    });
  });
});
