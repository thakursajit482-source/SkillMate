import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SemanticMatchQueryDto {
  @ApiProperty({
    description: 'Natural language search query or project description to match against candidate profiles',
    example: 'I need someone for a machine learning project',
  })
  @IsString()
  @IsNotEmpty({ message: 'Query cannot be empty' })
  @MaxLength(1000, { message: 'Query cannot exceed 1000 characters' })
  query: string;

  @ApiProperty({
    description: 'Maximum number of candidate matches to return',
    required: false,
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiProperty({
    description: 'Minimum cosine similarity score threshold (0.0 to 1.0)',
    required: false,
    default: 0.3,
    example: 0.3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  minSimilarity?: number;
}
