import { Test, TestingModule } from '@nestjs/testing';
import { HybridMatchingService, DEFAULT_HYBRID_WEIGHTS } from './hybrid-matching.service';
import { AiService } from './ai.service';
import { SemanticMatchingService } from './semantic-matching.service';
import { PrismaService } from '@database/prisma.service';
import { SkillLevel, UserStatus, VerificationStatus } from '@prisma/client';

describe('HybridMatchingService', () => {
  let service: HybridMatchingService;
  let prisma: any;
  let aiService: any;
  let semanticMatchingService: any;

  const mockCandidateAarav = {
    id: 'profile-1',
    userId: 'user-1',
    bio: 'Data Science and Python specialist with ML background',
    approximateArea: 'Bandra West',
    completenessScore: 90,
    user: {
      id: 'user-1',
      name: 'Aarav Sharma',
      status: UserStatus.ACTIVE,
      verification: {
        status: VerificationStatus.VERIFIED,
        college: { name: 'IIT Bombay' },
      },
    },
    skills: [
      {
        id: 'ps-1',
        level: SkillLevel.ADVANCED,
        isVerifiedSkill: true,
        skill: { id: 's-1', name: 'Python', category: 'Engineering' },
      },
      {
        id: 'ps-2',
        level: SkillLevel.INTERMEDIATE,
        isVerifiedSkill: false,
        skill: { id: 's-2', name: 'Machine Learning', category: 'Engineering' },
      },
    ],
    availabilities: [
      {
        id: 'av-1',
        dayOfWeek: 1, // Monday
        startTime: '18:00',
        endTime: '21:00',
        isRecurring: true,
      },
    ],
  };

  const mockCandidatePriya = {
    id: 'profile-2',
    userId: 'user-2',
    bio: 'Frontend developer working with React and TypeScript',
    approximateArea: 'Bandra East',
    completenessScore: 85,
    user: {
      id: 'user-2',
      name: 'Priya Patel',
      status: UserStatus.ACTIVE,
      verification: {
        status: VerificationStatus.VERIFIED,
        college: { name: 'Thadomal Shahani' },
      },
    },
    skills: [
      {
        id: 'ps-3',
        level: SkillLevel.ADVANCED,
        isVerifiedSkill: true,
        skill: { id: 's-3', name: 'React', category: 'Design & Code' },
      },
    ],
    availabilities: [
      {
        id: 'av-2',
        dayOfWeek: 2, // Tuesday
        startTime: '10:00',
        endTime: '14:00',
        isRecurring: true,
      },
    ],
  };

  const mockCandidateRohan = {
    id: 'profile-3',
    userId: 'user-3',
    bio: 'Novice coder in distant suburb without schedule',
    approximateArea: 'Thane West',
    completenessScore: 40,
    user: {
      id: 'user-3',
      name: 'Rohan Verma',
      status: UserStatus.ACTIVE,
      verification: {
        status: VerificationStatus.UNVERIFIED,
        college: null,
      },
    },
    skills: [
      {
        id: 'ps-4',
        level: SkillLevel.BEGINNER,
        isVerifiedSkill: false,
        skill: { id: 's-1', name: 'Python', category: 'Engineering' },
      },
    ],
    availabilities: [],
  };

  const mockSuspendedCandidate = {
    id: 'profile-4',
    userId: 'user-4',
    bio: 'Suspended account',
    approximateArea: 'Bandra West',
    completenessScore: 50,
    user: {
      id: 'user-4',
      name: 'Suspended User',
      status: UserStatus.SUSPENDED,
      verification: null,
    },
    skills: [],
    availabilities: [],
  };

  const mockBlockedCandidate = {
    id: 'profile-5',
    userId: 'user-5',
    bio: 'Blocked account',
    approximateArea: 'Bandra West',
    completenessScore: 60,
    user: {
      id: 'user-5',
      name: 'Blocked User',
      status: UserStatus.ACTIVE,
      verification: null,
    },
    skills: [],
    availabilities: [],
  };

  beforeEach(async () => {
    prisma = {
      profile: {
        findUnique: jest.fn().mockImplementation((args: any) => {
          if (args.where?.userId === 'viewer-1') {
            return Promise.resolve({ approximateArea: 'Bandra West' });
          }
          return Promise.resolve(null);
        }),
        findMany: jest.fn().mockImplementation((args: any) => {
          let list = [
            mockCandidateAarav,
            mockCandidatePriya,
            mockCandidateRohan,
            mockSuspendedCandidate,
            mockBlockedCandidate,
          ];

          if (args?.where?.user?.status === UserStatus.ACTIVE) {
            list = list.filter((c) => c.user.status === UserStatus.ACTIVE);
          }

          if (args?.where?.user?.id?.notIn) {
            const notIn = new Set(args.where.user.id.notIn);
            list = list.filter((c) => !notIn.has(c.userId));
          }

          return Promise.resolve(list);
        }),
      },
      block: {
        findMany: jest.fn().mockImplementation((args: any) => {
          if (args.where?.blockerId === 'viewer-1') {
            return Promise.resolve([{ blockedId: 'user-5' }]);
          }
          if (args.where?.blockedId === 'viewer-1') {
            return Promise.resolve([]);
          }
          return Promise.resolve([]);
        }),
      },
      rating: {
        findMany: jest.fn().mockResolvedValue([
          { rateeId: 'user-1', score: 5 },
          { rateeId: 'user-1', score: 5 },
        ]),
      },
      task: {
        findMany: jest.fn().mockResolvedValue([
          { requesterId: 'user-1', helperId: 'someone-else' },
          { requesterId: 'user-1', helperId: 'someone-else-2' },
          { requesterId: 'someone-else-3', helperId: 'user-1' },
          { requesterId: 'someone-else-4', helperId: 'user-1' },
        ]),
      },
    };

    aiService = {
      parseQuery: jest.fn().mockImplementation(async ({ query }: { query: string }) => {
        if (query.toLowerCase().includes('python')) {
          return {
            skills: ['Python', 'Machine Learning'],
            intent: 'PROJECT_HELP',
            day: 'monday',
            timeRange: '18:00-21:00',
            locationPreference: 'NEARBY',
            interactionType: null,
            skillLevel: 'ADVANCED',
            context: 'project',
          };
        }
        return {
          skills: [],
          intent: null,
          day: null,
          timeRange: null,
          locationPreference: null,
          interactionType: null,
          skillLevel: null,
          context: null,
        };
      }),
    };

    semanticMatchingService = {
      getQueryEmbedding: jest.fn().mockResolvedValue([0.5, 0.5, 0.5, 0.5]),
      getCandidateEmbedding: jest.fn().mockImplementation((id: string) => {
        if (id === 'profile-1') return Promise.resolve([0.49, 0.51, 0.49, 0.51]); // high match
        if (id === 'profile-2') return Promise.resolve([0.1, 0.1, 0.9, 0.2]); // low match
        return Promise.resolve([0.2, 0.2, 0.2, 0.2]);
      }),
      buildStudentRepresentation: jest.fn().mockReturnValue('Mock student text representation'),
      computeCosineSimilarity: jest.fn().mockImplementation((vecA: number[], vecB: number[]) => {
        if (vecB[0] > 0.4) return 0.95;
        return 0.35;
      }),
      extractMatchedSkills: jest.fn().mockImplementation((rawQuery: string, candidateSkills: any[]) => {
        const q = rawQuery.toLowerCase();
        const matched: string[] = [];
        for (const s of candidateSkills) {
          if (q.includes(s.skill.name.toLowerCase())) {
            matched.push(s.skill.name);
          }
        }
        return matched;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HybridMatchingService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiService, useValue: aiService },
        { provide: SemanticMatchingService, useValue: semanticMatchingService },
      ],
    }).compile();

    service = module.get<HybridMatchingService>(HybridMatchingService);
  });

  describe('1. Strong semantic + strong skill candidate ranking', () => {
    it('should rank Aarav (Python+ML, Mon 18-21, Bandra West, Verified) #1 with high final score', async () => {
      const result = await service.match(
        {
          query: 'I need someone who knows Python and ML for my project monday evening, preferably nearby.',
          area: 'Bandra West',
        },
        'viewer-1',
      );

      expect(result.data.length).toBeGreaterThan(0);
      const topMatch = result.data[0];
      expect(topMatch.userId).toBe('user-1');
      expect(topMatch.candidate.name).toBe('Aarav Sharma');
      expect(topMatch.finalScore).toBeGreaterThan(80);
      expect(topMatch.scoreBreakdown.semanticScore).toBeGreaterThanOrEqual(0.9);
      expect(topMatch.scoreBreakdown.skillScore).toBeGreaterThanOrEqual(0.8);
      expect(topMatch.scoreBreakdown.availabilityScore).toBe(1.0);
      expect(topMatch.scoreBreakdown.locationScore).toBe(1.0);
      expect(topMatch.scoreBreakdown.verificationScore).toBe(1.0);
      expect(topMatch.matchReasons.some((r) => r.includes('College verified student'))).toBe(true);
      expect(topMatch.matchReasons.some((r) => r.includes('Bandra West'))).toBe(true);
    });
  });

  describe('2. Semantic match but unavailable candidate exclusion', () => {
    it('should exclude candidates when hardFilterAvailability is true and day does not match', async () => {
      const result = await service.match(
        {
          query: 'Need Python and ML on monday evening',
          hardFilterAvailability: true,
          area: 'Bandra West',
        },
        'viewer-1',
      );

      // Candidate 2 (Priya) is available Tuesday, Candidate 3 (Rohan) has no availability
      const candidateIds = result.data.map((c) => c.userId);
      expect(candidateIds).toContain('user-1'); // Monday
      expect(candidateIds).not.toContain('user-2'); // Tuesday
      expect(candidateIds).not.toContain('user-3'); // None
    });
  });

  describe('3. Blocked candidate exclusion', () => {
    it('should exclude blocked candidates initiated or received before scoring', async () => {
      const result = await service.match(
        {
          query: 'Looking for study partners in Bandra',
        },
        'viewer-1',
      );

      const candidateIds = result.data.map((c) => c.userId);
      // user-5 is blocked by viewer-1
      expect(candidateIds).not.toContain('user-5');
      // viewer-1 themselves must not be present (self-exclusion)
      expect(candidateIds).not.toContain('viewer-1');
    });
  });

  describe('4. Suspended candidate exclusion', () => {
    it('should exclude suspended users from candidate pool', async () => {
      const result = await service.match({
        query: 'Looking for Python students',
      });

      const candidateIds = result.data.map((c) => c.userId);
      expect(candidateIds).not.toContain('user-4');
    });
  });

  describe('5. Nearby vs distant candidates proximity scoring', () => {
    it('should score same area candidate higher on location than distant candidate', async () => {
      const result = await service.match({
        query: 'I need someone with Python skills',
        area: 'Bandra West',
      });

      const aarav = result.data.find((c) => c.userId === 'user-1');
      const rohan = result.data.find((c) => c.userId === 'user-3');

      expect(aarav).toBeDefined();
      expect(rohan).toBeDefined();
      // Aarav is Bandra West (0 km -> 1.0)
      expect(aarav!.scoreBreakdown.locationScore).toBe(1.0);
      // Rohan is Thane West (distant -> <= 0.3)
      expect(rohan!.scoreBreakdown.locationScore).toBeLessThan(0.4);
      expect(aarav!.scoreBreakdown.locationScore).toBeGreaterThan(rohan!.scoreBreakdown.locationScore);
    });
  });

  describe('6. Verified vs unverified candidate verification scoring', () => {
    it('should assign 1.0 to verified candidate and 0.0 to unverified candidate', async () => {
      const result = await service.match({
        query: 'I need someone with Python skills',
      });

      const aarav = result.data.find((c) => c.userId === 'user-1');
      const rohan = result.data.find((c) => c.userId === 'user-3');

      expect(aarav!.scoreBreakdown.verificationScore).toBe(1.0);
      expect(rohan!.scoreBreakdown.verificationScore).toBe(0.0);
    });
  });

  describe('7. Multiple-skill request coverage & proficiency', () => {
    it('should give higher skillScore to candidate possessing all requested skills vs subset', async () => {
      const result = await service.match({
        query: 'I need someone who knows Python and ML for my project',
      });

      const aarav = result.data.find((c) => c.userId === 'user-1'); // Python (Adv) + ML (Inter)
      const rohan = result.data.find((c) => c.userId === 'user-3'); // Python (Beg) only

      expect(aarav!.matchedSkills).toContain('Python');
      expect(aarav!.matchedSkills).toContain('Machine Learning');
      expect(rohan!.matchedSkills).toContain('Python');
      expect(rohan!.matchedSkills).not.toContain('Machine Learning');

      expect(aarav!.scoreBreakdown.skillScore).toBeGreaterThan(rohan!.scoreBreakdown.skillScore);
    });
  });

  describe('8. Empty / ambiguous query handling', () => {
    it('should handle ambiguous or general query safely without errors', async () => {
      const result = await service.match({
        query: 'Hello, anyone free to study?',
      });

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      expect(result.meta.query).toBe('Hello, anyone free to study?');
    });
  });

  describe('9. Semantic provider failure handling', () => {
    it('should degrade gracefully when embedding provider fails or returns null', async () => {
      semanticMatchingService.getQueryEmbedding.mockRejectedValueOnce(
        new Error('Embedding API quota exceeded'),
      );

      const result = await service.match({
        query: 'I need someone who knows Python and ML',
      });

      expect(result).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
      // Still completes and scores using skills, location, verification, etc.
      for (const item of result.data) {
        expect(item.scoreBreakdown.semanticScore).toBe(0);
        expect(item.finalScore).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('10. Final score calculation accuracy against formula', () => {
    it('should accurately compute finalScore matching default weights formula', async () => {
      const result = await service.match({
        query: 'I need someone who knows Python and ML monday evening',
        area: 'Bandra West',
      });

      const aarav = result.data.find((c) => c.userId === 'user-1')!;
      const bd = aarav.scoreBreakdown;
      const w = DEFAULT_HYBRID_WEIGHTS;

      const expectedRaw =
        bd.semanticScore * w.semantic +
        bd.skillScore * w.skill +
        bd.availabilityScore * w.availability +
        bd.locationScore * w.location +
        bd.verificationScore * w.verification +
        bd.profileScore * w.profile +
        bd.reputationScore * w.reputation;

      const expectedFinalScore = Number((expectedRaw * 100).toFixed(2));

      // Check within 0.1 tolerance due to internal rounding
      expect(Math.abs(aarav.finalScore - expectedFinalScore)).toBeLessThan(0.1);
    });
  });
});
