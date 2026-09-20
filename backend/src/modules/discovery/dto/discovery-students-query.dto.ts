import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { SkillLevel } from '@prisma/client';

export class DiscoveryStudentsQueryDto {
  @ApiPropertyOptional({ example: 'Flutter', description: 'Filter by skill name (e.g. Flutter, Python, Photoshop)' })
  @IsOptional()
  @IsString()
  skill?: string;

  @ApiPropertyOptional({ enum: SkillLevel, example: SkillLevel.INTERMEDIATE, description: 'Filter by minimum skill proficiency' })
  @IsOptional()
  @IsEnum(SkillLevel)
  skillLevel?: SkillLevel;

  @ApiPropertyOptional({ example: 'Kandivali', description: 'Filter by approximate locality in MMR (e.g. Kandivali, Borivali, Malad)' })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', description: 'Filter by College UUID' })
  @IsOptional()
  @IsString()
  collegeId?: string;

  @ApiPropertyOptional({ example: true, description: 'Only return college-verified students' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  verifiedOnly?: boolean;

  @ApiPropertyOptional({ example: 1, description: 'Filter availability by day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({ example: '18:30', description: 'Filter availability overlapping specific time (HH:mm format)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Time must be in 24-hour HH:mm format' })
  time?: string;

  @ApiPropertyOptional({ example: 1, description: 'Page number (default 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Items per page (default 20, max 50)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
