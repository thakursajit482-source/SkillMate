import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'https://example.com/photos/student.jpg', description: 'Public profile photo URL' })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({
    example: '3rd year CS student passionate about Flutter and backend engineering. Happy to help debug apps.',
    description: 'Short student biography (max 500 characters)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Bio cannot exceed 500 characters' })
  bio?: string;

  @ApiPropertyOptional({
    example: 'Kandivali',
    description: 'Approximate MMR locality/area (e.g. Kandivali, Borivali, Malad, Andheri)',
  })
  @IsOptional()
  @IsString()
  approximateArea?: string;

  @ApiPropertyOptional({
    example: 300,
    description: 'Optional hourly rate (in INR) for Paid favors/tutoring sessions',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Hourly rate must be a valid number' })
  @Min(0, { message: 'Hourly rate cannot be negative' })
  @Max(10000, { message: 'Hourly rate exceeds allowable student threshold' })
  hourlyRate?: number;
}
