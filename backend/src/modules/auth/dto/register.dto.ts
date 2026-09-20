import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Sajit Thakur', description: 'Full name of the student' })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @Matches(/^[A-Za-z\s]+$/, { message: 'Name must contain alphabetic characters and spaces only' })
  name: string;

  @ApiProperty({ example: 'sajit@example.com', description: 'Personal or student email address' })
  @IsEmail({}, { message: 'A valid email address is required' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ example: 'SecureP@ss123', description: 'Account password (minimum 6 characters)' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiPropertyOptional({ example: '9876543210', description: 'Mobile phone number (10 digits)' })
  @IsOptional()
  @IsString()
  @Matches(/^(\+91)?[0-9]{10}$/, { message: 'Phone number must contain 10 digits' })
  phone?: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', description: 'Selected College ID' })
  @IsOptional()
  @IsString()
  collegeId?: string;

  @ApiPropertyOptional({ example: 'College ID', description: 'Student ID type' })
  @IsOptional()
  @IsString()
  idType?: string;

  @ApiPropertyOptional({ example: 'TCET202301', description: 'Student ID or enrollment number' })
  @IsOptional()
  @IsString()
  enrollmentId?: string;
}
