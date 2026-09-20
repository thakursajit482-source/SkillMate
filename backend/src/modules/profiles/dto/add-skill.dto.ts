import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SkillLevel } from '@prisma/client';

export class AddProfileSkillDto {
  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', description: 'Existing Skill UUID' })
  @IsOptional()
  @IsString()
  skillId?: string;

  @ApiPropertyOptional({ example: 'Flutter', description: 'Skill name (if not referencing an existing skillId)' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Engineering', description: 'Skill category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ enum: SkillLevel, example: SkillLevel.INTERMEDIATE, description: 'Self-declared proficiency level' })
  @IsEnum(SkillLevel, { message: 'Level must be BEGINNER, INTERMEDIATE, or ADVANCED' })
  @IsNotEmpty({ message: 'Skill level is required' })
  level: SkillLevel;
}
