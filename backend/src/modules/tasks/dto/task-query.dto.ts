import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';

export enum TaskUserRole {
  REQUESTER = 'requester',
  HELPER = 'helper',
}

export class TaskQueryDto {
  @ApiPropertyOptional({
    enum: TaskUserRole,
    description: 'Filter by current user role in the task (requester or helper)',
  })
  @IsOptional()
  @IsEnum(TaskUserRole)
  role?: TaskUserRole;

  @ApiPropertyOptional({
    enum: TaskStatus,
    description: 'Filter by task status: PENDING, ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED',
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

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
