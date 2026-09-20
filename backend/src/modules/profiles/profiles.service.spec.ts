import { Test, TestingModule } from '@nestjs/testing';
import { ProfilesService } from './profiles.service';
import { PrismaService } from '@database/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SkillLevel, VerificationStatus } from '@prisma/client';

describe('ProfilesService', () => {
  let service: ProfilesService;
  let prisma: any;

  const mockProfile = {
    id: 'profile-uuid',
    userId: 'user-uuid',
    photoUrl: 'https://example.com/photo.jpg',
    bio: 'CS Student at Thakur College',
    approximateArea: 'Kandivali',
    latitudeBucket: 19.206,
    longitudeBucket: 72.852,
    hourlyRate: 350,
    completenessScore: 85,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: 'user-uuid',
      name: 'Sajit Thakur',
      email: 'sajit@example.com',
      phone: '+919876543210',
      role: 'STUDENT',
      status: 'ACTIVE',
      verification: {
        id: 'ver-uuid',
        department: 'Computer Engineering',
        yearOfStudy: 3,
        status: VerificationStatus.VERIFIED,
        enrollmentId: 'TCET12345',
        collegeEmail: 'sajit@tcetmumbai.in',
        college: {
          id: 'college-uuid',
          name: 'Thakur College of Engineering',
          city: 'Mumbai',
          area: 'Kandivali',
        },
      },
    },
    skills: [
      {
        id: 'ps-1',
        profileId: 'profile-uuid',
        skillId: 'skill-1',
        level: SkillLevel.ADVANCED,
        isVerifiedSkill: true,
        skill: { id: 'skill-1', name: 'Flutter', category: 'Engineering' },
      },
    ],
    availabilities: [
      {
        id: 'av-1',
        profileId: 'profile-uuid',
        dayOfWeek: 1,
        specificDate: null,
        startTime: '18:00',
        endTime: '21:00',
        isRecurring: true,
      },
    ],
  };

  beforeEach(async () => {
    prisma = {
      profile: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      skill: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
      profileSkill: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      availability: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      block: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProfilesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPublicProfile', () => {
    it('should strictly mask raw GPS coordinates, phone, email, and private documents from public profile', async () => {
      prisma.profile.findFirst.mockResolvedValue(mockProfile);

      const publicProfile = await service.getPublicProfile('user-uuid');

      // Allowed public fields
      expect(publicProfile.name).toBe('Sajit Thakur');
      expect(publicProfile.approximateArea).toBe('Kandivali');
      expect(publicProfile.college?.name).toBe('Thakur College of Engineering');
      expect(publicProfile.isVerified).toBe(true);
      expect(publicProfile.skills.length).toBe(1);

      // Forbidden sensitive fields
      expect((publicProfile as any).latitudeBucket).toBeUndefined();
      expect((publicProfile as any).longitudeBucket).toBeUndefined();
      expect((publicProfile as any).email).toBeUndefined();
      expect((publicProfile as any).phone).toBeUndefined();
      expect((publicProfile as any).enrollmentId).toBeUndefined();
      expect((publicProfile as any).collegeEmail).toBeUndefined();
      expect((publicProfile as any).passwordHash).toBeUndefined();
    });

    it('should throw NotFoundException if profile does not exist', async () => {
      prisma.profile.findFirst.mockResolvedValue(null);

      await expect(service.getPublicProfile('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if caller is blocked by or has blocked the student', async () => {
      prisma.profile.findFirst.mockResolvedValue(mockProfile);
      prisma.block.findFirst.mockResolvedValue({ id: 'block-1' });

      await expect(service.getPublicProfile('user-uuid', 'caller-uuid')).rejects.toThrow(NotFoundException);
    });

    it('should catch P2023 invalid UUID syntax error and throw NotFoundException', async () => {
      prisma.profile.findFirst.mockRejectedValue({ code: 'P2023', message: 'Inconsistent column data' });

      await expect(service.getPublicProfile('malformed-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateOwnProfile', () => {
    it('should update approximateArea and calculate coarse centroid internally', async () => {
      prisma.profile.findUnique.mockResolvedValue(mockProfile);
      prisma.profile.update.mockResolvedValue({
        ...mockProfile,
        approximateArea: 'Borivali',
        latitudeBucket: 19.23,
        longitudeBucket: 72.856,
      });

      const updated = await service.updateOwnProfile('user-uuid', {
        approximateArea: 'Borivali',
        bio: 'Updated bio text',
      });

      expect(prisma.profile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            approximateArea: 'Borivali',
            latitudeBucket: 19.23,
            longitudeBucket: 72.856,
          }),
        }),
      );
    });
  });

  describe('addAvailability', () => {
    it('should reject invalid time bounds where start time is not before end time', async () => {
      prisma.profile.findUnique.mockResolvedValue(mockProfile);

      await expect(
        service.addAvailability('user-uuid', {
          startTime: '20:00',
          endTime: '18:00',
          isRecurring: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid time slot', async () => {
      prisma.profile.findUnique.mockResolvedValue(mockProfile);
      prisma.availability.create.mockResolvedValue({ id: 'av-2' });

      await service.addAvailability('user-uuid', {
        startTime: '17:00',
        endTime: '20:00',
        isRecurring: true,
      });

      expect(prisma.availability.create).toHaveBeenCalled();
    });
  });

  describe('skills & availability retrieval', () => {
    it('should retrieve student skills list', async () => {
      prisma.profile.findUnique.mockResolvedValue(mockProfile);

      const skills = await service.getSkills('user-uuid');
      expect(skills.length).toBe(1);
      expect(skills[0].name).toBe('Flutter');
      expect(skills[0].level).toBe(SkillLevel.ADVANCED);
    });

    it('should retrieve student availability windows', async () => {
      prisma.profile.findUnique.mockResolvedValue(mockProfile);

      const availabilities = await service.getAvailabilities('user-uuid');
      expect(availabilities.length).toBe(1);
      expect(availabilities[0].startTime).toBe('18:00');
      expect(availabilities[0].endTime).toBe('21:00');
    });

    it('should reject adding a skill with non-existent skillId', async () => {
      prisma.profile.findUnique.mockResolvedValue(mockProfile);
      prisma.skill.findUnique.mockResolvedValue(null);

      await expect(
        service.addSkill('user-uuid', {
          skillId: 'invalid-skill-id',
          level: SkillLevel.INTERMEDIATE,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
