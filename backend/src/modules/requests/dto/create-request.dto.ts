import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  Min,
  MaxLength,
  MinLength,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RequestType } from '@prisma/client';

export class AvailabilityWindowDto {
  @ApiProperty({ example: '18:00', description: 'Start time in 24h format (HH:mm)' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ example: '21:00', description: 'End time in 24h format (HH:mm)' })
  @IsString()
  @IsNotEmpty()
  endTime: string;

  @ApiPropertyOptional({ example: 1, description: 'Day of week (0=Sun, 1=Mon, ..., 6=Sat)' })
  @IsOptional()
  @IsNumber()
  dayOfWeek?: number;

  @ApiPropertyOptional({ example: '2026-09-25', description: 'Specific ISO date string (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  specificDate?: string;

  @ApiPropertyOptional({ example: 'Preferred in evening after classes', description: 'Optional timing notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateRequestDto {
  @ApiProperty({ enum: RequestType, example: RequestType.PAID, description: 'Interaction type' })
  @IsEnum(RequestType)
  @IsNotEmpty()
  type: RequestType;

  @ApiProperty({ example: 'Need help debugging Flutter auth flow', description: 'Brief request title' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    example: 'Looking for an experienced student to help debug Firebase Auth issues in Flutter app.',
    description: 'Detailed description of request scope',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description: string;

  @ApiPropertyOptional({
    example: 'd9b2d63d-a233-4123-8478-ec2b4f9bfd11',
    description: 'Skill ID requested (required for PAID and SKILL_EXCHANGE)',
  })
  @IsOptional()
  @IsUUID()
  skillId?: string;

  @ApiPropertyOptional({ example: 300, description: 'Budget in INR (applicable only for PAID type)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    description: 'Skill ID offered in return (applicable only for SKILL_EXCHANGE type)',
  })
  @IsOptional()
  @IsUUID()
  desiredSkillId?: string;

  @ApiPropertyOptional({ example: 'Badminton', description: 'Activity/interest tag (for SOCIAL type)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  activityTag?: string;

  @ApiProperty({ description: 'Availability window for the requested collaboration' })
  @IsObject()
  @ValidateNested()
  @Type(() => AvailabilityWindowDto)
  availabilityWindow: AvailabilityWindowDto;

  @ApiProperty({ example: 'Kandivali', description: 'Approximate locality in MMR' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  approximateArea: string;

  @ApiPropertyOptional({
    example: 'e8b7c6a5-4321-4def-9876-543210fedcba',
    description: 'Optional target student user ID for direct peer requests',
  })
  @IsOptional()
  @IsUUID()
  targetUserId?: string;
}
