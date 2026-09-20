import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@database/database.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { SemanticMatchingService } from './semantic-matching.service';
import { GeminiProvider } from './providers/gemini.provider';
import { RuleFallbackProvider } from './providers/rule-fallback.provider';
import { GeminiEmbeddingProvider } from './providers/gemini-embedding.provider';
import { LocalSemanticEmbeddingProvider } from './providers/local-semantic-embedding.provider';

import { HybridMatchingService } from './hybrid-matching.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [AiController],
  providers: [
    AiService,
    SemanticMatchingService,
    HybridMatchingService,
    GeminiProvider,
    RuleFallbackProvider,
    GeminiEmbeddingProvider,
    LocalSemanticEmbeddingProvider,
  ],
  exports: [AiService, SemanticMatchingService, HybridMatchingService],
})
export class AiModule {}
