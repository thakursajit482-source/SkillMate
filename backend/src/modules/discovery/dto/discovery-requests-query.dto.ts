import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RequestType } from '@prisma/client';

export class DiscoveryRequestsQueryDto {
  @ApiPropertyOptional({ example: 'Flutter', description: 'Filter requests by skill name' })
  @IsOptional()
  @IsString()
  skill?: string;

  @ApiPropertyOptional({
    enum: RequestType,
    example: RequestType.PAID,
    description: 'Filter requests by interaction type: PAID, SKILL_EXCHANGE, SOCIAL',
  })
  @IsOptional()
  @IsEnum(RequestType)
  type?: RequestType;

  @ApiPropertyOptional({
    example: 'Kandivali',
    description: 'Reference MMR locality to discover requests nearby',
  })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'Search radius in kilometers: 2, 5, 10, 20, or city-wide',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  radiusKm?: number;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, description: 'Items per page (max 50)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
