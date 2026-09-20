import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiQueryProvider } from './ai-provider.interface';
import { ParsedQueryResponseDto } from '../dto/parsed-query-response.dto';

@Injectable()
export class GeminiProvider implements AiQueryProvider {
  readonly name = 'GeminiProvider';
  private readonly logger = new Logger(GeminiProvider.name);

  constructor(private readonly configService: ConfigService) {}

  private get apiKey(): string | undefined {
    return (
      this.configService.get<string>('GEMINI_API_KEY') ||
      this.configService.get<string>('AI_API_KEY')
    );
  }

  isAvailable(): boolean {
    const key = this.apiKey;
    return !!key && key.trim().length > 0 && !key.includes('placeholder');
  }

  async parseQuery(query: string): Promise<ParsedQueryResponseDto | null> {
    const apiKey = this.apiKey;
    if (!apiKey || !this.isAvailable()) {
      return null;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `
You are an AI Smart Query Understanding engine for SkillMate, a cross-college student peer skill network.
Analyze the student requirement query and extract structured JSON matching the following schema.

Schema:
{
  "skills": ["Skill1", "Skill2"], // array of normalized skill names (e.g. Python, Machine Learning, React, DSA). Empty array if none mentioned.
  "intent": string or null, // primary intent: "PROJECT_HELP", "TUTORING", "SKILL_EXCHANGE", "EXAM_PREP", "ASSIGNMENT_HELP", or "GENERAL_HELP"
  "day": string or null, // e.g. "today", "tomorrow", "tonight", "friday", "weekend"
  "timeRange": string or null, // e.g. "18:00-21:00", "09:00-12:00", "evening", "morning", "afternoon", "night"
  "locationPreference": string or null, // "NEARBY", "ON_CAMPUS", "REMOTE", or specific neighborhood/campus
  "interactionType": "PAID" | "SKILL_EXCHANGE" | "SOCIAL" | null, // type of interaction if specified
  "skillLevel": "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | null, // proficiency level if requested
  "context": string or null // academic or project context, e.g. "project", "homework", "exam", "hackathon"
}

Student Query: "${query.replace(/"/g, '\\"')}"

Return ONLY a valid, raw JSON object. No Markdown code fences, no introductory or concluding text.
`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500,
          },
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) {
        this.logger.warn(`Gemini API returned status ${response.status}: ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      const rawText: string | undefined =
        data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        this.logger.warn('Gemini API returned empty candidate text');
        return null;
      }

      // Strip potential markdown code fences ```json ... ```
      const cleanedJson = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      const parsed = JSON.parse(cleanedJson);

      return {
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        intent: typeof parsed.intent === 'string' ? parsed.intent : null,
        day: typeof parsed.day === 'string' ? parsed.day : null,
        timeRange: typeof parsed.timeRange === 'string' ? parsed.timeRange : null,
        locationPreference: typeof parsed.locationPreference === 'string' ? parsed.locationPreference : null,
        interactionType: ['PAID', 'SKILL_EXCHANGE', 'SOCIAL'].includes(parsed.interactionType)
          ? parsed.interactionType
          : null,
        skillLevel: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(parsed.skillLevel)
          ? parsed.skillLevel
          : null,
        context: typeof parsed.context === 'string' ? parsed.context : null,
      };
    } catch (err: any) {
      this.logger.warn(`Gemini API call failed: ${err.message}. Falling back to RuleFallbackProvider.`);
      return null;
    }
  }
}
