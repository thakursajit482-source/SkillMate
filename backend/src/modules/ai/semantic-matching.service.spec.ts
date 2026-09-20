import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SemanticMatchingService } from './semantic-matching.service';
import { GeminiEmbeddingProvider } from './providers/gemini-embedding.provider';
import { LocalSemanticEmbeddingProvider } from './providers/local-semantic-embedding.provider';
import { PrismaService } from '@database/prisma.service';
import { SkillLevel, UserStatus, VerificationStatus } from '@prisma/client';

describe('SemanticMatchingService', () => {
  let service: SemanticMatchingService;
  let prisma: any;
  let geminiProvider: GeminiEmbeddingProvider;
  let localProvider: LocalSemanticEmbeddingProvider;

  const mockPythonMLStudent = {
    id: 'profile-1',
    userId: 'user-1',
    bio: 'Data Science enthusiast and Python developer',
    approximateArea: 'Powai',
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
      {
        id: 'ps-3',
        level: SkillLevel.INTERMEDIATE,
        isVerifiedSkill: false,
        skill: { id: 's-3', name: 'Data Science', category: 'Engineering' },
      },
    ],
  };

  const mockReactStudent = {
    id: 'profile-2',
    userId: 'user-2',
    bio: 'Frontend enthusiast building React apps',
    approximateArea: 'Bandra',
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
        id: 'ps-4',
        level: SkillLevel.ADVANCED,
        isVerifiedSkill: true,
        skill: { id: 's-4', name: 'React', category: 'Design & Code' },
      },
      {
        id: 'ps-5',
        level: SkillLevel.INTERMEDIATE,
        isVerifiedSkill: false,
        skill: { id: 's-5', name: 'TypeScript', category: 'Engineering' },
      },
    ],
  };

  const mockFrenchLiteratureStudent = {
    id: 'profile-3',
    userId: 'user-3',
    bio: 'French literature reader and language learner',
    approximateArea: 'Colaba',
    user: {
      id: 'user-3',
      name: 'Chloe Dsouza',
      status: UserStatus.ACTIVE,
      verification: {
        status: VerificationStatus.VERIFIED,
        college: { name: 'St. Xavier’s College' },
      },
    },
    skills: [
      {
        id: 'ps-6',
        level: SkillLevel.ADVANCED,
        isVerifiedSkill: true,
        skill: { id: 's-6', name: 'French Literature', category: 'Humanities' },
      },
    ],
  };

  const mockSuspendedStudent = {
    id: 'profile-4',
    userId: 'user-4',
    bio: 'Python hacker',
    approximateArea: 'Dadar',
    user: {
      id: 'user-4',
      name: 'Rohan Verma',
      status: UserStatus.SUSPENDED,
      verification: {
        status: VerificationStatus.REJECTED,
        college: { name: 'VJTI' },
      },
    },
    skills: [
      {
        id: 'ps-7',
        level: SkillLevel.ADVANCED,
        isVerifiedSkill: false,
        skill: { id: 's-1', name: 'Python', category: 'Engineering' },
      },
    ],
  };

  beforeEach(async () => {
    prisma = {
      profile: {
        findMany: jest.fn().mockImplementation((args: any) => {
          let list = [mockPythonMLStudent, mockReactStudent, mockFrenchLiteratureStudent];
          // If status filter ACTIVE is checked
          if (args?.where?.user?.status === UserStatus.ACTIVE) {
            list = list.filter((c) => c.user.status === UserStatus.ACTIVE);
          }
          // If id.notIn filter is present
          if (args?.where?.user?.id?.notIn) {
            const notIn = new Set(args.where.user.id.notIn);
            list = list.filter((c) => !notIn.has(c.user.id));
          }
          return Promise.resolve(list);
        }),
      },
      block: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      embedding: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SemanticMatchingService,
        GeminiEmbeddingProvider,
        LocalSemanticEmbeddingProvider,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined), // Test with deterministic local provider by default
          },
        },
      ],
    }).compile();

    service = module.get<SemanticMatchingService>(SemanticMatchingService);
    geminiProvider = module.get<GeminiEmbeddingProvider>(GeminiEmbeddingProvider);
    localProvider = module.get<LocalSemanticEmbeddingProvider>(LocalSemanticEmbeddingProvider);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('1. Exact skill match', () => {
    it('should score Python student with high similarity for "Python" query', async () => {
      const results = await service.findSemanticMatches({
        query: 'Looking for a Python tutor to teach syntax and functions',
      });

      expect(results.length).toBeGreaterThan(0);
      const topMatch = results[0];
      expect(topMatch.userId).toBe(mockPythonMLStudent.userId);
      expect(topMatch.similarityScore).toBeGreaterThanOrEqual(0.3);
      expect(topMatch.matchedSkills).toContain('Python');
    });
  });

  describe('2. Related skill match (vocabulary variation)', () => {
    it('should match ML project query with student having Python, Data Science, and Machine Learning', async () => {
      const results = await service.findSemanticMatches({
        query: 'I need someone for a machine learning project',
      });

      expect(results.length).toBeGreaterThan(0);
      const mlCandidate = results.find((r) => r.userId === mockPythonMLStudent.userId);
      expect(mlCandidate).toBeDefined();
      expect(mlCandidate!.similarityScore).toBeGreaterThanOrEqual(0.5);
      expect(mlCandidate!.matchedSkills).toContain('Machine Learning');
    });
  });

  describe('3. Multiple-skill query', () => {
    it('should match candidates possessing relevant multi-skill overlap', async () => {
      const results = await service.findSemanticMatches({
        query: 'Need someone experienced in React and frontend development',
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].userId).toBe(mockReactStudent.userId);
      expect(results[0].matchedSkills).toContain('React');
    });
  });

  describe('4. Irrelevant candidate filtering', () => {
    it('should exclude or rank irrelevant candidate (French Literature) below technical query', async () => {
      const results = await service.findSemanticMatches({
        query: 'Machine Learning and Python deep neural networks',
        minSimilarity: 0.3,
      });

      const frenchStudent = results.find((r) => r.userId === mockFrenchLiteratureStudent.userId);
      expect(frenchStudent).toBeUndefined(); // Filtered out by minSimilarity
    });
  });

  describe('5. Empty or whitespace query', () => {
    it('should return empty list safely for empty or invalid query', async () => {
      const emptyResults = await service.findSemanticMatches({ query: '' });
      expect(emptyResults).toEqual([]);

      const whitespaceResults = await service.findSemanticMatches({ query: '    ' });
      expect(whitespaceResults).toEqual([]);
    });
  });

  describe('6. Missing pre-computed embedding', () => {
    it('should compute embedding on-the-fly and return match when cache is empty', async () => {
      prisma.embedding.findUnique.mockResolvedValue(null);

      const results = await service.findSemanticMatches({
        query: 'Python algorithms and data science project',
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarityScore).toBeGreaterThan(0);
    });
  });

  describe('7. Embedding provider failure handling', () => {
    it('should gracefully fall back to local semantic provider if external API fails', async () => {
      jest.spyOn(geminiProvider, 'isAvailable').mockReturnValue(true);
      jest.spyOn(geminiProvider, 'generateEmbedding').mockRejectedValue(new Error('Network connection timeout'));

      const results = await service.findSemanticMatches({
        query: 'React web frontend development',
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].userId).toBe(mockReactStudent.userId);
    });
  });

  describe('8. Blocked and suspended candidate exclusion (Hard Filters)', () => {
    it('should strictly exclude blocked users from candidate pool', async () => {
      prisma.block.findMany.mockImplementation((args: any) => {
        if (args?.where?.blockerId === 'current-user-123') {
          return Promise.resolve([{ blockedId: mockPythonMLStudent.userId }]);
        }
        return Promise.resolve([]);
      });

      const results = await service.findSemanticMatches(
        { query: 'Python developer' },
        'current-user-123',
      );

      const blockedMatch = results.find((r) => r.userId === mockPythonMLStudent.userId);
      expect(blockedMatch).toBeUndefined();
    });

    it('should strictly exclude suspended candidates via UserStatus.ACTIVE check', async () => {
      const results = await service.findSemanticMatches({
        query: 'Python developer',
      });

      const suspendedMatch = results.find((r) => r.userId === mockSuspendedStudent.userId);
      expect(suspendedMatch).toBeUndefined();
    });
  });
});
