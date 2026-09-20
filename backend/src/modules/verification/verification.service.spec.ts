import { Test, TestingModule } from '@nestjs/testing';
import { VerificationService } from './verification.service';
import { PrismaService } from '@database/prisma.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { VerificationStatus } from '@prisma/client';

describe('VerificationService', () => {
  let service: VerificationService;
  let prisma: any;

  const mockCollege = {
    id: 'college-1',
    name: 'Thakur College of Engineering and Technology',
    city: 'Mumbai',
    area: 'Kandivali',
    emailDomains: ['tcetmumbai.in'],
  };

  const mockVerification = {
    id: 'ver-1',
    userId: 'user-1',
    collegeId: 'college-1',
    department: 'Computer Engineering',
    yearOfStudy: 3,
    enrollmentId: 'TCET202301',
    collegeEmail: 'sajit@tcetmumbai.in',
    status: VerificationStatus.PENDING,
    college: mockCollege,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      college: {
        findUnique: jest.fn(),
      },
      collegeVerification: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [VerificationService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<VerificationService>(VerificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitVerification', () => {
    it('should automatically verify student when college email domain matches college domain', async () => {
      prisma.college.findUnique.mockResolvedValue(mockCollege);
      prisma.collegeVerification.findFirst.mockResolvedValue(null);
      prisma.collegeVerification.upsert.mockResolvedValue({
        ...mockVerification,
        status: VerificationStatus.VERIFIED,
      });

      const result = await service.submitVerification('user-1', {
        collegeId: 'college-1',
        department: 'Computer Engineering',
        yearOfStudy: 3,
        enrollmentId: 'TCET202301',
        collegeEmail: 'student@tcetmumbai.in',
      });

      expect(result.status).toBe(VerificationStatus.VERIFIED);
      expect(result.isVerified).toBe(true);
      expect(prisma.collegeVerification.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ status: VerificationStatus.VERIFIED }),
        }),
      );
    });

    it('should queue verification as PENDING when no institutional email is provided', async () => {
      prisma.college.findUnique.mockResolvedValue(mockCollege);
      prisma.collegeVerification.findFirst.mockResolvedValue(null);
      prisma.collegeVerification.upsert.mockResolvedValue({
        ...mockVerification,
        collegeEmail: null,
        status: VerificationStatus.PENDING,
      });

      const result = await service.submitVerification('user-1', {
        collegeId: 'college-1',
        department: 'Computer Engineering',
        yearOfStudy: 3,
        enrollmentId: 'TCET202301',
        idDocumentRef: 'uploads/id_card.jpg',
      });

      expect(result.status).toBe(VerificationStatus.PENDING);
      expect(result.isVerified).toBe(false);
    });

    it('should throw NotFoundException if college does not exist', async () => {
      prisma.college.findUnique.mockResolvedValue(null);

      await expect(
        service.submitVerification('user-1', {
          collegeId: 'invalid-college',
          department: 'IT',
          yearOfStudy: 2,
          enrollmentId: 'ENR999',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if enrollmentId is duplicate for the same college', async () => {
      prisma.college.findUnique.mockResolvedValue(mockCollege);
      prisma.collegeVerification.findFirst.mockResolvedValue({
        id: 'existing-ver',
        userId: 'other-student-id',
      });

      await expect(
        service.submitVerification('user-1', {
          collegeId: 'college-1',
          department: 'IT',
          yearOfStudy: 2,
          enrollmentId: 'TCET202301',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('reviewVerification', () => {
    it('should approve verification and update status to VERIFIED', async () => {
      prisma.collegeVerification.findUnique.mockResolvedValue(mockVerification);
      prisma.collegeVerification.update.mockResolvedValue({
        ...mockVerification,
        status: VerificationStatus.VERIFIED,
        user: { id: 'user-1', name: 'Sajit', email: 'sajit@example.com' },
      });

      const result = await service.reviewVerification('ver-1', 'admin-id', {
        status: VerificationStatus.VERIFIED,
      });

      expect(result.status).toBe(VerificationStatus.VERIFIED);
      expect(result.isVerified).toBe(true);
    });

    it('should reject without reason throwing BadRequestException', async () => {
      prisma.collegeVerification.findUnique.mockResolvedValue(mockVerification);

      await expect(
        service.reviewVerification('ver-1', 'admin-id', {
          status: VerificationStatus.REJECTED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
