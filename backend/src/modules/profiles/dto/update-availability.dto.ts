import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class UpdateAvailabilityDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Day of week for recurring availability (0 = Sunday, 1 = Monday, ..., 6 = Saturday)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({
    example: '2026-09-25',
    description: 'Specific date (YYYY-MM-DD) for one-off availability window',
  })
  @IsOptional()
  @IsDateString()
  specificDate?: string;

  @ApiPropertyOptional({ example: '18:00', description: 'Start time in 24-hour format (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Start time must be formatted as HH:mm' })
  startTime?: string;

  @ApiPropertyOptional({ example: '21:00', description: 'End time in 24-hour format (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'End time must be formatted as HH:mm' })
  endTime?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether this slot recurs weekly' })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ example: 'Python Project Collab', description: 'Activity or task name for the daily slot' })
  @IsOptional()
  @IsString()
  activity?: string;

  @ApiPropertyOptional({ example: 'Working on Stage 7 hybrid matching algorithm', description: 'Specific options or details for the activity' })
  @IsOptional()
  @IsString()
  details?: string;
}
