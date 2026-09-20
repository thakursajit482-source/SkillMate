import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRatingDto {
  @ApiProperty({
    example: 5,
    minimum: 1,
    maximum: 5,
    description: 'Rating score between 1 and 5 stars',
  })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  score: number;

  @ApiPropertyOptional({
    example: ['punctual', 'great communicator', 'skilled'],
    description: 'Qualitative behavioral tags',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
