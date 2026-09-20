import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '@database/prisma.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RequestStatus, TaskStatus, VerificationStatus } from '@prisma/client';
import { TaskUserRole } from './dto/task-query.dto';

describe('TasksService', () => {
  let service: TasksService;
  let prisma: any;

  const mockRequester = {
    id: 'user-requester',
    name: 'Sajit Thakur',
    profile: { photoUrl: null, approximateArea: 'Kandivali' },
    verification: {
      status: VerificationStatus.VERIFIED,
      college: { id: 'col-1', name: 'Thakur College', city: 'Mumbai', area: 'Kandivali' },
    },
  };

  const mockHelper = {
    id: 'user-helper',
    name: 'Ayesha Patel',
    profile: { photoUrl: null, approximateArea: 'Borivali' },
    verification: {
      status: VerificationStatus.VERIFIED,
      college: { id: 'col-1', name: 'Thakur College', city: 'Mumbai', area: 'Kandivali' },
    },
  };

  const mockTask = {
    id: 'task-1',
    requestId: 'req-1',
    offerId: 'offer-1',
    requesterId: 'user-requester',
    helperId: 'user-helper',
    agreedTerms: { agreedRate: 350, approximateArea: 'Kandivali' },
    status: TaskStatus.PENDING,
    requesterCompleted: false,
    helperCompleted: false,
    completionTimeoutAt: null,
    statusHistory: [{ status: TaskStatus.PENDING, timestamp: new Date().toISOString() }],
    cancelReason: null,
    cancelledById: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    request: {
      id: 'req-1',
      title: 'Need Flutter help',
      type: 'PAID',
      approximateArea: 'Kandivali',
      budget: 350,
      status: RequestStatus.MATCHED,
    },
    requester: mockRequester,
    helper: mockHelper,
    cancelledBy: null,
  };

  beforeEach(async () => {
    const mockPrisma: any = {
      task: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      request: {
        update: jest.fn(),
      },
      $transaction: jest.fn((callback: any): any => {
        if (typeof callback === 'function') {
          return callback(mockPrisma);
        }
        return Promise.all(callback);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('findAll', () => {
    it('should list tasks where current user is participant', async () => {
      prisma.task.count.mockResolvedValue(1);
      prisma.task.findMany.mockResolvedValue([mockTask]);

      const result = await service.findAll('user-requester', { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('task-1');
    });

    it('should filter by role helper', async () => {
      prisma.task.count.mockResolvedValue(1);
      prisma.task.findMany.mockResolvedValue([mockTask]);

      await service.findAll('user-helper', { role: TaskUserRole.HELPER });
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ helperId: 'user-helper' }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should allow participant to view task detail', async () => {
      prisma.task.findUnique.mockResolvedValue(mockTask);

      const result = await service.findById('task-1', 'user-requester');
      expect(result.id).toBe('task-1');
    });

    it('should throw ForbiddenException if non-participant attempts to view task', async () => {
      prisma.task.findUnique.mockResolvedValue(mockTask);

      await expect(
        service.findById('task-1', 'intruder-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateStatus', () => {
    it('should transition PENDING -> ACCEPTED', async () => {
      prisma.task.findUnique.mockResolvedValue(mockTask);
      prisma.task.update.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.ACCEPTED,
      });

      const result = await service.updateStatus('task-1', 'user-requester', {
        status: TaskStatus.ACCEPTED,
      });

      expect(result.task.status).toBe(TaskStatus.ACCEPTED);
    });

    it('should transition ACCEPTED -> IN_PROGRESS', async () => {
      prisma.task.findUnique.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.ACCEPTED,
      });
      prisma.task.update.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
      });

      const result = await service.updateStatus('task-1', 'user-helper', {
        status: TaskStatus.IN_PROGRESS,
      });

      expect(result.task.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should initiate 48h timeout when first party marks COMPLETED', async () => {
      prisma.task.findUnique.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
      });
      prisma.task.update.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        requesterCompleted: true,
        completionTimeoutAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });

      const result = await service.updateStatus('task-1', 'user-requester', {
        status: TaskStatus.COMPLETED,
      });

      expect(result.message).toContain('auto-complete in 48 hours');
      expect(result.task.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should complete task and close request when both parties confirm COMPLETED', async () => {
      prisma.task.findUnique.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        requesterCompleted: true, // requester already marked done
      });
      prisma.task.update.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.COMPLETED,
        requesterCompleted: true,
        helperCompleted: true,
        completedAt: new Date(),
      });
      prisma.request.update.mockResolvedValue({ id: 'req-1', status: RequestStatus.CLOSED });

      const result = await service.updateStatus('task-1', 'user-helper', {
        status: TaskStatus.COMPLETED,
      });

      expect(result.message).toContain('successfully completed by mutual confirmation');
      expect(result.task.status).toBe(TaskStatus.COMPLETED);
    });

    it('should cancel task with required reason', async () => {
      prisma.task.findUnique.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.ACCEPTED,
      });
      prisma.task.update.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.CANCELLED,
        cancelReason: 'Emergency conflict',
        cancelledById: 'user-requester',
      });

      const result = await service.updateStatus('task-1', 'user-requester', {
        status: TaskStatus.CANCELLED,
        cancelReason: 'Emergency conflict',
      });

      expect(result.task.status).toBe(TaskStatus.CANCELLED);
    });

    it('should throw BadRequestException if cancelling without reason', async () => {
      prisma.task.findUnique.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.ACCEPTED,
      });

      await expect(
        service.updateStatus('task-1', 'user-requester', {
          status: TaskStatus.CANCELLED,
          cancelReason: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on invalid backward transition', async () => {
      prisma.task.findUnique.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.COMPLETED,
      });

      await expect(
        service.updateStatus('task-1', 'user-requester', {
          status: TaskStatus.IN_PROGRESS,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
