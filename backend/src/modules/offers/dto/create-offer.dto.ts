import {
  IsOptional,
  IsString,
  MaxLength,
  IsObject,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CounterTermsDto {
  @ApiPropertyOptional({ example: 350, description: 'Counter rate/budget in INR' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  counterRate?: number;

  @ApiPropertyOptional({ example: 'Available tomorrow after 7 PM', description: 'Proposed schedule variation' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  proposedTime?: string;

  @ApiPropertyOptional({ example: 'Can do in-person at Thakur College Library', description: 'Counter term notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CreateOfferDto {
  @ApiPropertyOptional({
    example: 'Hi! I have 2 years of Flutter experience and can help debug this auth error.',
    description: 'Introductory message explaining qualifications',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;

  @ApiPropertyOptional({
    description: 'Optional counter-terms (e.g., different schedule or counter-budget)',
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CounterTermsDto)
  counterTerms?: CounterTermsDto;
}
