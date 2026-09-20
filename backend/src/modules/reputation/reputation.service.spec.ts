import { Test, TestingModule } from '@nestjs/testing';
import { ReputationService } from './reputation.service';
import { PrismaService } from '@database/prisma.service';
import { SafetyService } from '@modules/safety/safety.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TaskStatus, VerificationStatus } from '@prisma/client';

describe('ReputationService', () => {
  let service: ReputationService;
  let prisma: any;
  let safetyService: any;

  const mockUser1 = { id: 'user-1', name: 'Sajit' };
  const mockUser2 = { id: 'user-2', name: 'Ayesha' };

  const mockCompletedTask = {
    id: 'task-1',
    requestId: 'req-1',
    offerId: 'offer-1',
    requesterId: 'user-1',
    helperId: 'user-2',
    status: TaskStatus.COMPLETED,
    completedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma: any = {
      task: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      rating: {
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      skill: {
        findUnique: jest.fn(),
      },
      endorsement: {
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      profile: {
        findUnique: jest.fn(),
      },
      profileSkill: {
        updateMany: jest.fn(),
      },
    };

    const mockSafetyService: any = {
      assertCanInteract: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReputationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SafetyService, useValue: mockSafetyService },
      ],
    }).compile();

    service = module.get<ReputationService>(ReputationService);
    prisma = module.get<PrismaService>(PrismaService);
    safetyService = module.get<SafetyService>(SafetyService);
  });

  describe('createRating', () => {
    it('should submit rating for a COMPLETED task', async () => {
      prisma.task.findUnique.mockResolvedValue(mockCompletedTask);
      prisma.rating.findUnique.mockResolvedValue(null);
      prisma.rating.create.mockResolvedValue({
        id: 'rating-1',
        taskId: 'task-1',
        raterId: 'user-1',
        rateeId: 'user-2',
        score: 5,
        tags: ['punctual', 'skilled'],
        createdAt: new Date(),
        task: mockCompletedTask,
      });

      const result = await service.createRating('task-1', 'user-1', {
        score: 5,
        tags: ['punctual', 'skilled'],
      });

      expect(result.rating.id).toBe('rating-1');
      expect(result.rating.score).toBe(5);
      expect(result.rating.rateeId).toBe('user-2');
    });

    it('should reject rating for a non-completed task', async () => {
      prisma.task.findUnique.mockResolvedValue({
        ...mockCompletedTask,
        status: TaskStatus.IN_PROGRESS,
      });

      await expect(
        service.createRating('task-1', 'user-1', { score: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject rating from a non-participant', async () => {
      prisma.task.findUnique.mockResolvedValue(mockCompletedTask);

      await expect(
        service.createRating('task-1', 'intruder-user', { score: 5 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject duplicate rating on same task', async () => {
      prisma.task.findUnique.mockResolvedValue(mockCompletedTask);
      prisma.rating.findUnique.mockResolvedValue({ id: 'existing-rating' });

      await expect(
        service.createRating('task-1', 'user-1', { score: 5 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findRatingsForUser', () => {
    it('should return paginated ratings', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser2);
      prisma.rating.count.mockResolvedValue(1);
      prisma.rating.findMany.mockResolvedValue([
        {
          id: 'rating-1',
          taskId: 'task-1',
          score: 5,
          tags: ['punctual'],
          createdAt: new Date(),
          rater: {
            id: 'user-1',
            name: 'Sajit',
            profile: { photoUrl: null, approximateArea: 'Kandivali' },
            verification: { college: null, status: VerificationStatus.VERIFIED },
          },
        },
      ]);

      const result = await service.findRatingsForUser('user-2', { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0].score).toBe(5);
    });
  });

  describe('createEndorsement', () => {
    it('should create endorsement when completed collaboration exists', async () => {
      prisma.task.findFirst.mockResolvedValue(mockCompletedTask);
      prisma.skill.findUnique.mockResolvedValue({ id: 'skill-1', name: 'Flutter' });
      prisma.endorsement.findUnique.mockResolvedValue(null);
      prisma.endorsement.create.mockResolvedValue({
        id: 'end-1',
        endorserId: 'user-1',
        endorseeId: 'user-2',
        skillId: 'skill-1',
        taskId: 'task-1',
        createdAt: new Date(),
        skill: { id: 'skill-1', name: 'Flutter', category: 'Engineering' },
      });
      prisma.endorsement.count.mockResolvedValue(1);

      const result = await service.createEndorsement('user-1', {
        endorseeId: 'user-2',
        skillId: 'skill-1',
      });

      expect(result.endorsement.id).toBe('end-1');
      expect(result.endorsement.skill.name).toBe('Flutter');
    });

    it('should reject self-endorsement', async () => {
      await expect(
        service.createEndorsement('user-1', { endorseeId: 'user-1', skillId: 'skill-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject endorsement if no completed collaboration exists', async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.createEndorsement('user-1', { endorseeId: 'user-2', skillId: 'skill-1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject duplicate endorsement', async () => {
      prisma.task.findFirst.mockResolvedValue(mockCompletedTask);
      prisma.skill.findUnique.mockResolvedValue({ id: 'skill-1', name: 'Flutter' });
      prisma.endorsement.findUnique.mockResolvedValue({ id: 'existing-end' });

      await expect(
        service.createEndorsement('user-1', { endorseeId: 'user-2', skillId: 'skill-1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getUserReputation', () => {
    it('should aggregate behavioral reputation metrics', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser2);
      prisma.task.findMany.mockResolvedValue([
        { requesterId: 'user-1', helperId: 'user-2' },
        { requesterId: 'user-1', helperId: 'user-2' }, // user-1 is repeat user!
      ]);
      prisma.task.count.mockResolvedValue(0); // 0 cancelled
      prisma.rating.findMany.mockResolvedValue([
        { score: 5, tags: ['punctual', 'skilled'] },
        { score: 4, tags: ['punctual'] },
      ]);
      prisma.endorsement.count.mockResolvedValue(2);

      const result = await service.getUserReputation('user-2');

      expect(result.completedTasks).toBe(2);
      expect(result.completionRate).toBe(100);
      expect(result.averageRating).toBe(4.5);
      expect(result.ratingCount).toBe(2);
      expect(result.repeatUsersCount).toBe(1);
      expect(result.tagBreakdown['punctual']).toBe(2);
      expect(result.tagBreakdown['skilled']).toBe(1);
    });
  });
});
