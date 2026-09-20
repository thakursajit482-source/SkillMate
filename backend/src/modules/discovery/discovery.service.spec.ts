import { Test, TestingModule } from '@nestjs/testing';
import { DiscoveryService } from './discovery.service';
import { PrismaService } from '@database/prisma.service';
import { SkillLevel, VerificationStatus } from '@prisma/client';

describe('DiscoveryService', () => {
  let service: DiscoveryService;
  let prisma: any;

  const mockCandidateA = {
    id: 'profile-a',
    userId: 'user-a',
    photoUrl: 'https://example.com/a.jpg',
    bio: 'Advanced Flutter student',
    approximateArea: 'Kandivali',
    latitudeBucket: 19.206,
    longitudeBucket: 72.852,
    hourlyRate: 300,
    completenessScore: 90,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    user: {
      id: 'user-a',
      name: 'Ayesha Khan',
      status: 'ACTIVE',
      verification: {
        id: 'ver-a',
        status: VerificationStatus.VERIFIED,
        department: 'Information Technology',
        yearOfStudy: 4,
        college: {
          id: 'college-1',
          name: 'Thakur College',
          city: 'Mumbai',
          area: 'Kandivali',
        },
      },
    },
    skills: [
      {
        id: 'ps-1',
        profileId: 'profile-a',
        skillId: 's-flutter',
        level: SkillLevel.ADVANCED,
        isVerifiedSkill: true,
        skill: { id: 's-flutter', name: 'Flutter', category: 'Engineering' },
      },
    ],
    availabilities: [
      {
        id: 'av-1',
        profileId: 'profile-a',
        dayOfWeek: 1,
        specificDate: null,
        startTime: '18:00',
        endTime: '21:00',
        isRecurring: true,
      },
    ],
  };

  const mockCandidateB = {
    id: 'profile-b',
    userId: 'user-b',
    photoUrl: null,
    bio: 'Beginner designer',
    approximateArea: 'Borivali',
    latitudeBucket: 19.23,
    longitudeBucket: 72.856,
    hourlyRate: null,
    completenessScore: 50,
    createdAt: new Date('2026-01-02'),
    updatedAt: new Date('2026-01-02'),
    user: {
      id: 'user-b',
      name: 'Rohan Sharma',
      status: 'ACTIVE',
      verification: {
        id: 'ver-b',
        status: VerificationStatus.UNVERIFIED,
        department: 'Commerce',
        yearOfStudy: 2,
        college: null,
      },
    },
    skills: [
      {
        id: 'ps-2',
        profileId: 'profile-b',
        skillId: 's-design',
        level: SkillLevel.BEGINNER,
        isVerifiedSkill: false,
        skill: { id: 's-design', name: 'Photoshop', category: 'Design' },
      },
    ],
    availabilities: [],
  };

  beforeEach(async () => {
    prisma = {
      profile: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      block: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DiscoveryService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<DiscoveryService>(DiscoveryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('discoverStudents', () => {
    it('should return deterministically ranked students with explainable match reasons', async () => {
      prisma.profile.findUnique.mockResolvedValue({ approximateArea: 'Kandivali' });
      prisma.block.findMany.mockResolvedValue([]);
      prisma.profile.findMany.mockResolvedValue([mockCandidateB, mockCandidateA]);

      const result = await service.discoverStudents(
        { skill: 'Flutter', dayOfWeek: 1, time: '19:00', page: 1, limit: 10 },
        'current-user-id',
      );

      expect(result.data.length).toBe(2);
      // Candidate A must rank first due to exact skill match, advanced bonus, availability, area, verified status
      expect(result.data[0].name).toBe('Ayesha Khan');
      expect(result.data[0].matchScore).toBeGreaterThan(result.data[1].matchScore as number);
      expect(result.data[0].matchReasons).toContain('Has requested skill: Flutter (Advanced)');
      expect(result.data[0].matchReasons).toContain('Available during requested time window');
      expect(result.data[0].matchReasons).toContain('College verified student');
    });

    it('should strictly mask raw GPS coordinates, phone, email, and private documents from discovery output', async () => {
      prisma.profile.findUnique.mockResolvedValue({ approximateArea: 'Kandivali' });
      prisma.block.findMany.mockResolvedValue([]);
      prisma.profile.findMany.mockResolvedValue([mockCandidateA]);

      const result = await service.discoverStudents({ skill: 'Flutter' }, 'current-user-id');
      const student = result.data[0];

      // Safe public fields
      expect(student.name).toBe('Ayesha Khan');
      expect(student.approximateArea).toBe('Kandivali');
      expect(student.college?.name).toBe('Thakur College');
      expect(student.isVerified).toBe(true);

      // Sensitive fields must be undefined
      expect((student as any).latitudeBucket).toBeUndefined();
      expect((student as any).longitudeBucket).toBeUndefined();
      expect((student as any).email).toBeUndefined();
      expect((student as any).phone).toBeUndefined();
      expect((student as any).enrollmentId).toBeUndefined();
      expect((student as any).collegeEmail).toBeUndefined();
      expect((student as any).passwordHash).toBeUndefined();
    });

    it('should exclude blocked users and current user from discovery', async () => {
      prisma.profile.findUnique.mockResolvedValue({ approximateArea: 'Kandivali' });
      // Current user blocked 'user-blocked-1', and was blocked by 'user-blocked-2'
      prisma.block.findMany
        .mockResolvedValueOnce([{ blockedId: 'user-blocked-1' }])
        .mockResolvedValueOnce([{ blockerId: 'user-blocked-2' }]);
      prisma.profile.findMany.mockResolvedValue([]);

      await service.discoverStudents({}, 'current-user-id');

      expect(prisma.profile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: expect.objectContaining({
              id: {
                notIn: expect.arrayContaining(['current-user-id', 'user-blocked-1', 'user-blocked-2']),
              },
            }),
          }),
        }),
      );
    });

    it('should paginate results correctly', async () => {
      prisma.profile.findUnique.mockResolvedValue({ approximateArea: 'Kandivali' });
      prisma.block.findMany.mockResolvedValue([]);
      prisma.profile.findMany.mockResolvedValue([mockCandidateA, mockCandidateB]);

      const result = await service.discoverStudents({ page: 2, limit: 1 }, 'current-user-id');

      expect(result.data.length).toBe(1);
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(1);
      expect(result.meta.total).toBe(2);
      expect(result.meta.totalPages).toBe(2);
    });
  });
});
