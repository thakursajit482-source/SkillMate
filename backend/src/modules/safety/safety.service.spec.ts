import { Test, TestingModule } from '@nestjs/testing';
import { SafetyService } from './safety.service';
import { PrismaService } from '@database/prisma.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReportCategory, ReportStatus, UserStatus } from '@prisma/client';

describe('SafetyService', () => {
  let service: SafetyService;
  let prisma: any;

  const mockUser1 = { id: 'user-1', name: 'User One', status: UserStatus.ACTIVE };
  const mockUser2 = { id: 'user-2', name: 'User Two', status: UserStatus.ACTIVE };

  beforeEach(async () => {
    const mockPrisma: any = {
      user: {
        findUnique: jest.fn(),
      },
      block: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      task: {
        findUnique: jest.fn(),
      },
      report: {
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SafetyService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SafetyService>(SafetyService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('isBlocked', () => {
    it('should return true if a block exists between users', async () => {
      prisma.block.findFirst.mockResolvedValue({ id: 'block-1', blockerId: 'user-1', blockedId: 'user-2' });
      const result = await service.isBlocked('user-1', 'user-2');
      expect(result).toBe(true);
    });

    it('should return false if no block exists', async () => {
      prisma.block.findFirst.mockResolvedValue(null);
      const result = await service.isBlocked('user-1', 'user-2');
      expect(result).toBe(false);
    });

    it('should return false for identical users', async () => {
      const result = await service.isBlocked('user-1', 'user-1');
      expect(result).toBe(false);
    });
  });

  describe('assertCanInteract', () => {
    it('should succeed when both users are active and not blocked', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(mockUser2);
      prisma.block.findFirst.mockResolvedValue(null);

      await expect(service.assertCanInteract('user-1', 'user-2')).resolves.not.toThrow();
    });

    it('should throw BadRequestException for self-interaction', async () => {
      await expect(service.assertCanInteract('user-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user is suspended', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', status: UserStatus.SUSPENDED })
        .mockResolvedValueOnce(mockUser2);
      prisma.block.findFirst.mockResolvedValue(null);

      await expect(service.assertCanInteract('user-1', 'user-2')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if users have blocked each other', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(mockUser2);
      prisma.block.findFirst.mockResolvedValue({ id: 'block-1', blockerId: 'user-2', blockedId: 'user-1' });

      await expect(service.assertCanInteract('user-1', 'user-2')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('blockUser', () => {
    it('should block user successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser2);
      prisma.block.findUnique.mockResolvedValue(null);
      prisma.block.create.mockResolvedValue({ blockerId: 'user-1', blockedId: 'user-2' });

      const result = await service.blockUser('user-1', 'user-2');
      expect(result.message).toContain('blocked successfully');
      expect(result.blockedId).toBe('user-2');
    });

    it('should prevent self-block', async () => {
      await expect(service.blockUser('user-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if target user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.blockUser('user-1', 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('unblockUser', () => {
    it('should unblock user successfully', async () => {
      prisma.block.findUnique.mockResolvedValue({ blockerId: 'user-1', blockedId: 'user-2' });
      prisma.block.delete.mockResolvedValue({});

      const result = await service.unblockUser('user-1', 'user-2');
      expect(result.message).toContain('unblocked successfully');
    });

    it('should throw NotFoundException if block does not exist', async () => {
      prisma.block.findUnique.mockResolvedValue(null);
      await expect(service.unblockUser('user-1', 'user-2')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createReport', () => {
    it('should create a safety report successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser2);
      prisma.report.create.mockResolvedValue({
        id: 'rep-1',
        reporterId: 'user-1',
        reportedUserId: 'user-2',
        category: ReportCategory.NO_SHOW,
        status: ReportStatus.OPEN,
        createdAt: new Date(),
      });

      const result = await service.createReport('user-1', {
        reportedUserId: 'user-2',
        category: ReportCategory.NO_SHOW,
        description: 'Student did not show up to scheduled tutoring session',
      });

      expect(result.reportId).toBe('rep-1');
      expect(result.status).toBe(ReportStatus.OPEN);
    });

    it('should reject self-report', async () => {
      await expect(
        service.createReport('user-1', {
          reportedUserId: 'user-1',
          category: ReportCategory.HARASSMENT,
          description: 'Reporting myself testing validation',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject report if reported user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.createReport('user-1', {
          reportedUserId: 'non-existent',
          category: ReportCategory.HARASSMENT,
          description: 'Testing non-existent user report',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findMyReports', () => {
    it('should return paginated list of reports filed by caller', async () => {
      prisma.report.count.mockResolvedValue(1);
      prisma.report.findMany.mockResolvedValue([
        {
          id: 'rep-1',
          reportedUserId: 'user-2',
          reportedUser: { id: 'user-2', name: 'User Two' },
          category: ReportCategory.NO_SHOW,
          description: 'Did not show up',
          taskId: null,
          status: ReportStatus.OPEN,
          resolutionNotes: null,
          createdAt: new Date(),
          resolvedAt: null,
        },
      ]);

      const result = await service.findMyReports('user-1', { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0].id).toBe('rep-1');
    });
  });
});
