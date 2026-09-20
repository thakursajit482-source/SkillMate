import { ApiProperty } from '@nestjs/swagger';
import { SafeMatchedStudentDto } from './semantic-match-response.dto';
import { ParsedQueryResponseDto } from './parsed-query-response.dto';

export class ScoreBreakdownDto {
  @ApiProperty({ description: 'Normalized semantic similarity score (0.0 to 1.0)', example: 0.92 })
  semanticScore: number;

  @ApiProperty({ description: 'Normalized skill match score (0.0 to 1.0)', example: 0.85 })
  skillScore: number;

  @ApiProperty({ description: 'Normalized availability overlap score (0.0 to 1.0)', example: 1.0 })
  availabilityScore: number;

  @ApiProperty({ description: 'Normalized location proximity score (0.0 to 1.0)', example: 0.9 })
  locationScore: number;

  @ApiProperty({ description: 'Normalized college verification score (0.0 to 1.0)', example: 1.0 })
  verificationScore: number;

  @ApiProperty({ description: 'Normalized profile completeness score (0.0 to 1.0)', example: 0.85 })
  profileScore: number;

  @ApiProperty({ description: 'Normalized reputation score (0.0 to 1.0)', example: 0.96 })
  reputationScore: number;
}

export class HybridMatchCandidateDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  userId: string;

  @ApiProperty({ example: 'b1ffcd88-8b1a-4fe7-aa5c-5aa8ac270b22' })
  profileId: string;

  @ApiProperty({
    description: 'Final hybrid score (0 to 100)',
    example: 88.65,
  })
  finalScore: number;

  @ApiProperty({ type: () => ScoreBreakdownDto })
  scoreBreakdown: ScoreBreakdownDto;

  @ApiProperty({
    description: 'Skills matching the query',
    example: ['Python', 'Machine Learning'],
    type: [String],
  })
  matchedSkills: string[];

  @ApiProperty({
    description: 'Human-readable explainable match reasons',
    example: [
      'Strong semantic match for project requirements',
      'Has requested skill: Python (Advanced)',
      'Available during requested time',
      'Nearby: Bandra West (~2 km away)',
      'College verified student',
    ],
    type: [String],
  })
  matchReasons: string[];

  @ApiProperty({ type: () => SafeMatchedStudentDto })
  candidate: SafeMatchedStudentDto;
}

export class HybridMatchMetaDto {
  @ApiProperty({ example: 'I need someone who knows Python and ML for my project tomorrow evening, preferably nearby.' })
  query: string;

  @ApiProperty({ type: () => ParsedQueryResponseDto })
  parsedRequirements: ParsedQueryResponseDto;

  @ApiProperty({ example: 45 })
  totalCandidatesEvaluated: number;

  @ApiProperty({ example: 5 })
  returnedCount: number;

  @ApiProperty({
    example: {
      semantic: 0.4,
      skill: 0.2,
      availability: 0.15,
      location: 0.1,
      verification: 0.05,
      profile: 0.05,
      reputation: 0.05,
    },
  })
  appliedWeights: Record<string, number>;
}

export class HybridMatchResponseDto {
  @ApiProperty({ type: [HybridMatchCandidateDto] })
  data: HybridMatchCandidateDto[];

  @ApiProperty({ type: () => HybridMatchMetaDto })
  meta: HybridMatchMetaDto;
}
