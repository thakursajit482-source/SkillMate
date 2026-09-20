import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class HybridWeightsDto {
  @ApiPropertyOptional({ description: 'Weight for semantic similarity (default: 0.40)', example: 0.4 })
  @IsOptional()
  semantic?: number;

  @ApiPropertyOptional({ description: 'Weight for skill match (default: 0.20)', example: 0.2 })
  @IsOptional()
  skill?: number;

  @ApiPropertyOptional({ description: 'Weight for availability overlap (default: 0.15)', example: 0.15 })
  @IsOptional()
  availability?: number;

  @ApiPropertyOptional({ description: 'Weight for location proximity (default: 0.10)', example: 0.1 })
  @IsOptional()
  location?: number;

  @ApiPropertyOptional({ description: 'Weight for college verification (default: 0.05)', example: 0.05 })
  @IsOptional()
  verification?: number;

  @ApiPropertyOptional({ description: 'Weight for profile completeness (default: 0.05)', example: 0.05 })
  @IsOptional()
  profile?: number;

  @ApiPropertyOptional({ description: 'Weight for reputation score (default: 0.05)', example: 0.05 })
  @IsOptional()
  reputation?: number;
}

export class HybridMatchQueryDto {
  @ApiProperty({
    description: 'Natural language search query from user',
    example: 'I need someone who knows Python and ML for my project tomorrow evening, preferably nearby.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(500)
  query: string;

  @ApiPropertyOptional({
    description: 'Maximum number of candidate matches to return (default: 10, max: 50)',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Reference area for proximity scoring (defaults to viewer user area if available)',
    example: 'Bandra West',
  })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({
    description: 'When true, hard filters out candidates that do not possess at least one of the extracted skills',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hardFilterSkills?: boolean = false;

  @ApiPropertyOptional({
    description: 'When true, hard filters out candidates who are unavailable at the parsed time/day',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hardFilterAvailability?: boolean = false;

  @ApiPropertyOptional({
    description: 'Optional custom weighting parameters',
    type: () => HybridWeightsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => HybridWeightsDto)
  weights?: HybridWeightsDto;
}
