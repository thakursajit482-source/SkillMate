import { Injectable, Logger } from '@nestjs/common';
import { ParseQueryDto } from './dto/parse-query.dto';
import { ParsedQueryResponseDto, InteractionType, SkillLevel } from './dto/parsed-query-response.dto';
import { GeminiProvider } from './providers/gemini.provider';
import { RuleFallbackProvider } from './providers/rule-fallback.provider';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly geminiProvider: GeminiProvider,
    private readonly ruleFallbackProvider: RuleFallbackProvider,
  ) {}

  async parseQuery(dto: ParseQueryDto): Promise<ParsedQueryResponseDto> {
    const rawQuery = dto?.query;
    if (!rawQuery || typeof rawQuery !== 'string' || !rawQuery.trim()) {
      return this.sanitizeOutput(null);
    }

    const query = rawQuery.trim();
    let result: ParsedQueryResponseDto | null = null;

    // 1. Try Gemini Provider if available
    if (this.geminiProvider.isAvailable()) {
      try {
        result = await this.geminiProvider.parseQuery(query);
      } catch (err: any) {
        this.logger.warn(`AI Provider failed: ${err.message}. Falling back to heuristic rules.`);
      }
    }

    // 2. Fall back to Deterministic Heuristics & Rules
    if (!result) {
      result = await this.ruleFallbackProvider.parseQuery(query);
    }

    // 3. Normalize and validate output
    return this.sanitizeOutput(result);
  }

  private sanitizeOutput(result: any): ParsedQueryResponseDto {
    if (!result || typeof result !== 'object') {
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
    }

    // Clean and deduplicate skills
    const rawSkills = Array.isArray(result.skills) ? result.skills : [];
    const skills: string[] = Array.from(
      new Set<string>(
        rawSkills
          .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
          .map((s: string) => s.trim()),
      ),
    );

    // Validate enum fields
    const validInteractions: InteractionType[] = ['PAID', 'SKILL_EXCHANGE', 'SOCIAL'];
    const interactionType = validInteractions.includes(result.interactionType)
      ? result.interactionType
      : null;

    const validLevels: SkillLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
    const skillLevel = validLevels.includes(result.skillLevel)
      ? result.skillLevel
      : null;

    return {
      skills,
      intent: typeof result.intent === 'string' && result.intent.trim() ? result.intent.trim() : null,
      day: typeof result.day === 'string' && result.day.trim() ? result.day.trim() : null,
      timeRange: typeof result.timeRange === 'string' && result.timeRange.trim() ? result.timeRange.trim() : null,
      locationPreference:
        typeof result.locationPreference === 'string' && result.locationPreference.trim()
          ? result.locationPreference.trim()
          : null,
      interactionType,
      skillLevel,
      context: typeof result.context === 'string' && result.context.trim() ? result.context.trim() : null,
    };
  }
}
