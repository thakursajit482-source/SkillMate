import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';

export class UpdateTaskStatusDto {
  @ApiProperty({
    enum: TaskStatus,
    example: TaskStatus.IN_PROGRESS,
    description: 'Target task status: ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED',
  })
  @IsEnum(TaskStatus)
  @IsNotEmpty()
  status: TaskStatus;

  @ApiPropertyOptional({
    example: 'Student had an unexpected scheduling conflict',
    description: 'Mandatory cancellation reason when transitioning to CANCELLED',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancelReason?: string;
}
