import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OfferStatus } from '@prisma/client';

export class OfferQueryDto {
  @ApiPropertyOptional({
    enum: OfferStatus,
    description: 'Filter by offer status: PENDING, ACCEPTED, DECLINED, WITHDRAWN',
  })
  @IsOptional()
  @IsEnum(OfferStatus)
  status?: OfferStatus;

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
