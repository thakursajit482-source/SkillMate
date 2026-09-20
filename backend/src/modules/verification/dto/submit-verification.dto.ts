import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class SubmitVerificationDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', description: 'Valid College UUID from MMR directory' })
  @IsString()
  @IsNotEmpty({ message: 'College ID is required' })
  collegeId: string;

  @ApiProperty({ example: 'Computer Engineering', description: 'Student department / stream' })
  @IsString()
  @IsNotEmpty({ message: 'Department is required' })
  department: string;

  @ApiProperty({ example: 3, description: 'Current year of study (1 to 5)' })
  @IsInt({ message: 'Year of study must be an integer' })
  @Min(1, { message: 'Year of study must be between 1 and 5' })
  @Max(5, { message: 'Year of study must be between 1 and 5' })
  yearOfStudy: number;

  @ApiProperty({ example: 'TCET/2023/CS/1042', description: 'College student enrollment / roll number' })
  @IsString()
  @IsNotEmpty({ message: 'Enrollment / Student ID is required' })
  enrollmentId: string;

  @ApiPropertyOptional({ example: 'sajit@tcetmumbai.in', description: 'Official institutional college email (if available)' })
  @IsOptional()
  @IsEmail({}, { message: 'College email must be a valid email format' })
  collegeEmail?: string;

  @ApiPropertyOptional({
    example: 'documents/id-cards/tcet-sajit-id.jpg',
    description: 'Restricted storage path or reference for student ID card upload',
  })
  @IsOptional()
  @IsString()
  idDocumentRef?: string;

  @ApiPropertyOptional({
    example: 'College ID',
    description: 'Type of ID document selected (e.g. College ID, Student ID, Other)',
  })
  @IsOptional()
  @IsString()
  idType?: string;
}
