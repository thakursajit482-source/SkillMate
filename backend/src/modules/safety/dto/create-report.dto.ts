import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportCategory } from '@prisma/client';

export class CreateReportDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    description: 'UUID of the user being reported',
  })
  @IsUUID()
  @IsNotEmpty()
  reportedUserId: string;

  @ApiProperty({
    enum: ReportCategory,
    example: ReportCategory.NO_SHOW,
    description: 'Category of safety concern: NO_SHOW, HARASSMENT, FAKE_PROFILE, SCAM, OTHER',
  })
  @IsEnum(ReportCategory)
  @IsNotEmpty()
  category: ReportCategory;

  @ApiProperty({
    example: 'User did not show up to agreed library debugging session and did not respond.',
    description: 'Detailed description of the incident (min 10 characters)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({
    example: 'e8b7c6a5-4321-4def-9876-543210fedcba',
    description: 'Optional associated Task UUID',
  })
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiPropertyOptional({
    example: 'https://storage.skillmate.internal/evidence/screenshot1.png',
    description: 'Optional evidence URL (screenshot pointer)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  evidenceUrl?: string;
}
