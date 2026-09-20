import { Test, TestingModule } from '@nestjs/testing';
import { OffersService } from './offers.service';
import { PrismaService } from '@database/prisma.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OfferStatus, RequestStatus, RequestType, TaskStatus, VerificationStatus } from '@prisma/client';

describe('OffersService', () => {
  let service: OffersService;
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

  const mockOfferer = {
    id: 'user-offerer',
    name: 'Ayesha Patel',
    profile: { photoUrl: null, approximateArea: 'Borivali' },
    verification: {
      status: VerificationStatus.VERIFIED,
      college: { id: 'col-1', name: 'Thakur College', city: 'Mumbai', area: 'Kandivali' },
    },
  };

  const mockRequest = {
    id: 'req-1',
    requesterId: 'user-requester',
    targetUserId: null,
    type: RequestType.PAID,
    title: 'Need Flutter help',
    description: 'Help with login bug',
    budget: 300,
    status: RequestStatus.OPEN,
    approximateArea: 'Kandivali',
    availabilityWindow: { startTime: '18:00', endTime: '21:00' },
  };

  const mockOffer = {
    id: 'offer-1',
    requestId: 'req-1',
    offeringUserId: 'user-offerer',
    message: 'Can help tomorrow at 6 PM',
    counterTerms: { counterRate: 350, proposedTime: 'Tomorrow 6 PM' },
    status: OfferStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
    request: mockRequest,
    offeringUser: mockOfferer,
  };

  beforeEach(async () => {
    const mockPrisma: any = {
      collegeVerification: {
        findUnique: jest.fn(),
      },
      request: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      offer: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      task: {
        create: jest.fn(),
      },
      block: {
        findFirst: jest.fn().mockResolvedValue(null),
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
        OffersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OffersService>(OffersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createOffer', () => {
    it('should allow verified user to create offer on open request', async () => {
      prisma.collegeVerification.findUnique.mockResolvedValue({ status: VerificationStatus.VERIFIED });
      prisma.request.findUnique.mockResolvedValue(mockRequest);
      prisma.offer.findFirst.mockResolvedValue(null);
      prisma.offer.create.mockResolvedValue(mockOffer);

      const result = await service.createOffer('req-1', 'user-offerer', {
        message: 'Can help tomorrow at 6 PM',
        counterTerms: { counterRate: 350 },
      });

      expect(result.id).toBe('offer-1');
      expect(result.status).toBe(OfferStatus.PENDING);
    });

    it('should throw ForbiddenException if offering user is unverified', async () => {
      prisma.collegeVerification.findUnique.mockResolvedValue({ status: VerificationStatus.UNVERIFIED });

      await expect(
        service.createOffer('req-1', 'user-offerer', { message: 'Hello' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if offering on own request', async () => {
      prisma.collegeVerification.findUnique.mockResolvedValue({ status: VerificationStatus.VERIFIED });
      prisma.request.findUnique.mockResolvedValue(mockRequest);

      await expect(
        service.createOffer('req-1', 'user-requester', { message: 'Self offer' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if duplicate pending offer exists', async () => {
      prisma.collegeVerification.findUnique.mockResolvedValue({ status: VerificationStatus.VERIFIED });
      prisma.request.findUnique.mockResolvedValue(mockRequest);
      prisma.offer.findFirst.mockResolvedValue(mockOffer);

      await expect(
        service.createOffer('req-1', 'user-offerer', { message: 'Another offer' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllForRequest', () => {
    it('should allow request owner to list all offers', async () => {
      prisma.request.findUnique.mockResolvedValue(mockRequest);
      prisma.offer.count.mockResolvedValue(1);
      prisma.offer.findMany.mockResolvedValue([mockOffer]);

      const result = await service.findAllForRequest('req-1', 'user-requester', { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should throw ForbiddenException if non-owner tries to list offers', async () => {
      prisma.request.findUnique.mockResolvedValue(mockRequest);

      await expect(
        service.findAllForRequest('req-1', 'other-user', {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('acceptOffer', () => {
    it('should accept offer, update request to MATCHED, decline other offers, and create Task', async () => {
      prisma.offer.findUnique.mockResolvedValue(mockOffer);
      prisma.offer.update.mockResolvedValue({ ...mockOffer, status: OfferStatus.ACCEPTED });
      prisma.request.update.mockResolvedValue({ ...mockRequest, status: RequestStatus.MATCHED });
      prisma.offer.updateMany.mockResolvedValue({ count: 1 });
      prisma.task.create.mockResolvedValue({
        id: 'task-1',
        requestId: 'req-1',
        offerId: 'offer-1',
        requesterId: 'user-requester',
        helperId: 'user-offerer',
        status: TaskStatus.PENDING,
        agreedTerms: { agreedRate: 350 },
      });

      const result = await service.acceptOffer('offer-1', 'user-requester');
      expect(result.offer.status).toBe(OfferStatus.ACCEPTED);
      expect(result.task.id).toBe('task-1');
      expect(prisma.request.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: RequestStatus.MATCHED } }),
      );
    });

    it('should throw ForbiddenException if non-owner attempts to accept offer', async () => {
      prisma.offer.findUnique.mockResolvedValue(mockOffer);

      await expect(
        service.acceptOffer('offer-1', 'user-offerer'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('declineOffer', () => {
    it('should allow owner to decline offer', async () => {
      prisma.offer.findUnique.mockResolvedValue(mockOffer);
      prisma.offer.update.mockResolvedValue({ ...mockOffer, status: OfferStatus.DECLINED });

      const result = await service.declineOffer('offer-1', 'user-requester');
      expect(result.status).toBe(OfferStatus.DECLINED);
    });
  });

  describe('withdrawOffer', () => {
    it('should allow offerer to withdraw their own offer', async () => {
      prisma.offer.findUnique.mockResolvedValue(mockOffer);
      prisma.offer.update.mockResolvedValue({ ...mockOffer, status: OfferStatus.WITHDRAWN });

      const result = await service.withdrawOffer('offer-1', 'user-offerer');
      expect(result.status).toBe(OfferStatus.WITHDRAWN);
    });

    it('should throw ForbiddenException if non-offerer attempts withdrawal', async () => {
      prisma.offer.findUnique.mockResolvedValue(mockOffer);

      await expect(
        service.withdrawOffer('offer-1', 'user-requester'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
