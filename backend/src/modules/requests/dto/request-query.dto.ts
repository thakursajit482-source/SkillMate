import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RequestStatus, RequestType } from '@prisma/client';

export enum RequestDirection {
  INCOMING = 'incoming',
  OUTGOING = 'outgoing',
}

export class RequestQueryDto {
  @ApiPropertyOptional({
    enum: RequestDirection,
    description: 'Filter by direction: incoming (targeted to me) or outgoing (created by me)',
  })
  @IsOptional()
  @IsEnum(RequestDirection)
  direction?: RequestDirection;

  @ApiPropertyOptional({
    enum: RequestStatus,
    description: 'Filter by request status: OPEN, MATCHED, CLOSED, CANCELLED',
  })
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @ApiPropertyOptional({
    enum: RequestType,
    description: 'Filter by interaction type: PAID, SKILL_EXCHANGE, SOCIAL',
  })
  @IsOptional()
  @IsEnum(RequestType)
  type?: RequestType;

  @ApiPropertyOptional({
    example: 'Kandivali',
    description: 'Filter by MMR locality name',
  })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({
    example: 'd9b2d63d-a233-4123-8478-ec2b4f9bfd11',
    description: 'Filter by skill UUID',
  })
  @IsOptional()
  @IsUUID()
  skillId?: string;

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
