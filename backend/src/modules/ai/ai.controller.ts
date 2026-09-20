import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { SemanticMatchingService } from './semantic-matching.service';
import { HybridMatchingService } from './hybrid-matching.service';
import { ParseQueryDto } from './dto/parse-query.dto';
import { ParsedQueryResponseDto } from './dto/parsed-query-response.dto';
import { SemanticMatchQueryDto } from './dto/semantic-match-query.dto';
import { SemanticMatchCandidateDto } from './dto/semantic-match-response.dto';
import { HybridMatchQueryDto } from './dto/hybrid-match-query.dto';
import { HybridMatchResponseDto } from './dto/hybrid-match-response.dto';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';

@ApiTags('AI')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly semanticMatchingService: SemanticMatchingService,
    private readonly hybridMatchingService: HybridMatchingService,
  ) {}

  @Post('parse-query')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Parse natural language search query into structured matching criteria',
    description:
      'Translates unstructured student collaboration prompts into structured parameters: skills, intent, day, time range, location preference, interaction type, and context.',
  })
  @ApiResponse({
    status: 200,
    description: 'Query successfully parsed and normalized',
    type: ParsedQueryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error in request body' })
  async parseQuery(@Body() dto: ParseQueryDto): Promise<ParsedQueryResponseDto> {
    return this.aiService.parseQuery(dto);
  }

  @Post('semantic-match')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Semantically match natural language queries against student candidate profiles',
    description:
      'Uses vector embeddings and cosine similarity to find relevant students, bridging vocabulary variations while enforcing hard business constraints (active status, blocking, privacy).',
  })
  @ApiResponse({
    status: 200,
    description: 'Ranked list of candidate student profiles matching query with similarity scores',
    type: [SemanticMatchCandidateDto],
  })
  @ApiResponse({ status: 400, description: 'Validation error in request body' })
  async semanticMatch(
    @Body() dto: SemanticMatchQueryDto,
    @CurrentUser('id') currentUserId?: string,
  ): Promise<SemanticMatchCandidateDto[]> {
    return this.semanticMatchingService.findSemanticMatches(dto, currentUserId);
  }

  @Post('match')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Hybrid multi-factor ranking matching engine (Stage 7C)',
    description:
      'Combines natural language query parsing (7A), vector semantic embeddings (7B), and deterministic discovery factors (skills, availability, proximity, verification, profile completeness, reputation) with strict safety filtering.',
  })
  @ApiResponse({
    status: 200,
    description: 'Ranked candidate list with finalScore, scoreBreakdown, and transparent match reasons',
    type: HybridMatchResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error in request body' })
  async hybridMatch(
    @Body() dto: HybridMatchQueryDto,
    @CurrentUser('id') currentUserId?: string,
  ): Promise<HybridMatchResponseDto> {
    return this.hybridMatchingService.match(dto, currentUserId);
  }
}

