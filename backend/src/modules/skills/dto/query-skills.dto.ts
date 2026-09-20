import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QuerySkillsDto {
  @ApiPropertyOptional({ example: 'flutter', description: 'Search term for skill name or category' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'Engineering', description: 'Filter by skill category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 1, description: 'Page number (default 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Items per page (default 20, max 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
