import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingProvider } from './embedding-provider.interface';

@Injectable()
export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'GeminiEmbeddingProvider';
  readonly dimension = 768;
  private readonly logger = new Logger(GeminiEmbeddingProvider.name);

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

  async generateEmbedding(text: string): Promise<number[] | null> {
    if (!text || !text.trim() || !this.isAvailable()) {
      return null;
    }

    const apiKey = this.apiKey;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: {
            parts: [{ text: text.trim().slice(0, 2000) }],
          },
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) {
        this.logger.warn(
          `Gemini Embedding API returned status ${response.status}: ${response.statusText}`,
        );
        return null;
      }

      const data = await response.json();
      const values: number[] | undefined = data?.embedding?.values;

      if (Array.isArray(values) && values.length > 0) {
        return values;
      }

      return null;
    } catch (err: any) {
      this.logger.warn(
        `Gemini Embedding API call failed: ${err.message}. Falling back to LocalSemanticEmbeddingProvider.`,
      );
      return null;
    }
  }

  async generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
    return Promise.all(texts.map((t) => this.generateEmbedding(t)));
  }
}
