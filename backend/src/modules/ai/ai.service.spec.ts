import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { GeminiProvider } from './providers/gemini.provider';
import { RuleFallbackProvider } from './providers/rule-fallback.provider';

describe('AiService', () => {
  let service: AiService;
  let geminiProvider: GeminiProvider;
  let ruleFallbackProvider: RuleFallbackProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        GeminiProvider,
        RuleFallbackProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'GEMINI_API_KEY') return undefined; // By default test fallback
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    geminiProvider = module.get<GeminiProvider>(GeminiProvider);
    ruleFallbackProvider = module.get<RuleFallbackProvider>(RuleFallbackProvider);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('1. Python help request', () => {
    it('should extract Python skill, tutoring intent, and temporal details', async () => {
      const result = await service.parseQuery({
        query: 'I need someone for Python tutoring tomorrow evening',
      });

      expect(result.skills).toContain('Python');
      expect(result.intent).toBe('TUTORING');
      expect(result.day).toBe('tomorrow');
      expect(result.timeRange).toBe('18:00-21:00');
    });
  });

  describe('2. Multiple skills request', () => {
    it('should extract Python and ML, project intent, and nearby location preference', async () => {
      const result = await service.parseQuery({
        query: 'I need someone who knows Python and ML for my project tomorrow evening, preferably nearby.',
      });

      expect(result.skills).toContain('Python');
      expect(result.skills).toContain('Machine Learning');
      expect(result.intent).toBe('PROJECT_HELP');
      expect(result.day).toBe('tomorrow');
      expect(result.timeRange).toBe('18:00-21:00');
      expect(result.locationPreference).toBe('NEARBY');
      expect(result.context).toBe('project');
    });
  });

  describe('3. Time and availability request', () => {
    it('should accurately extract specific day and time range', async () => {
      const result = await service.parseQuery({
        query: 'Looking for a React tutor on Friday between 18:00-21:00 on campus',
      });

      expect(result.skills).toContain('React');
      expect(result.day).toBe('friday');
      expect(result.timeRange).toBe('18:00-21:00');
      expect(result.locationPreference).toBe('ON_CAMPUS');
    });

    it('should parse 12-hour AM/PM format into 24-hour range', async () => {
      const result = await service.parseQuery({
        query: 'Need DSA practice on Sunday from 4pm to 7pm',
      });

      expect(result.skills).toContain('DSA');
      expect(result.day).toBe('sunday');
      expect(result.timeRange).toBe('16:00-19:00');
    });
  });

  describe('4. Paid request', () => {
    it('should identify PAID interaction type from monetary keywords', async () => {
      const result = await service.parseQuery({
        query: 'Offering 500 INR paid help for Java and SQL assignment',
      });

      expect(result.skills).toContain('Java');
      expect(result.skills).toContain('SQL');
      expect(result.interactionType).toBe('PAID');
      expect(result.intent).toBe('ASSIGNMENT_HELP');
      expect(result.context).toBe('assignment');
    });
  });

  describe('5. Skill-exchange request', () => {
    it('should detect SKILL_EXCHANGE interaction type and multiple skills', async () => {
      const result = await service.parseQuery({
        query: 'Want to learn Figma, can teach Python in exchange',
      });

      expect(result.skills).toContain('Figma');
      expect(result.skills).toContain('Python');
      expect(result.interactionType).toBe('SKILL_EXCHANGE');
    });
  });

  describe('6. Missing / ambiguous information', () => {
    it('should return empty skills and null fields for greeting or empty query without crashing', async () => {
      const result = await service.parseQuery({
        query: 'Hello everyone!',
      });

      expect(result.skills).toEqual([]);
      expect(result.intent).toBeNull();
      expect(result.day).toBeNull();
      expect(result.timeRange).toBeNull();
      expect(result.locationPreference).toBeNull();
      expect(result.interactionType).toBeNull();
      expect(result.skillLevel).toBeNull();
      expect(result.context).toBeNull();
    });

    it('should safely handle whitespace-only query', async () => {
      const result = await service.parseQuery({
        query: '   ',
      });

      expect(result.skills).toEqual([]);
      expect(result.intent).toBeNull();
    });
  });

  describe('7. Invalid AI response handling', () => {
    it('should seamlessly fall back to rule provider if Gemini throws an error', async () => {
      jest.spyOn(geminiProvider, 'isAvailable').mockReturnValue(true);
      jest.spyOn(geminiProvider, 'parseQuery').mockRejectedValue(new Error('Rate limit exceeded 429'));

      const result = await service.parseQuery({
        query: 'Need advanced C++ mentoring tomorrow morning',
      });

      expect(result.skills).toContain('C++');
      expect(result.skillLevel).toBe('ADVANCED');
      expect(result.day).toBe('tomorrow');
      expect(result.timeRange).toBe('09:00-12:00');
    });

    it('should normalize and sanitize corrupted or partial responses from AI provider', async () => {
      jest.spyOn(geminiProvider, 'isAvailable').mockReturnValue(true);
      jest.spyOn(geminiProvider, 'parseQuery').mockResolvedValue({
        skills: ['TypeScript', 'TypeScript', ''], // Duplicate and empty
        intent: 'PROJECT_HELP',
        day: 'tomorrow',
        timeRange: '18:00-21:00',
        locationPreference: 'NEARBY',
        interactionType: 'INVALID_TYPE' as any, // Invalid enum
        skillLevel: 'INVALID_LEVEL' as any, // Invalid enum
        context: 'project',
      });

      const result = await service.parseQuery({
        query: 'I need TypeScript developer',
      });

      expect(result.skills).toEqual(['TypeScript']); // Deduplicated & cleaned
      expect(result.interactionType).toBeNull(); // Sanitized to null
      expect(result.skillLevel).toBeNull(); // Sanitized to null
      expect(result.intent).toBe('PROJECT_HELP');
    });
  });
});
