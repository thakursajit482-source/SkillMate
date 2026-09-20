import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'student@gmail.com', description: 'Registered email address or phone number', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ example: 'student@gmail.com', description: 'Alternative identifier (email or phone)', required: false })
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiProperty({ example: 'SecurePassword123', description: 'Account password' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
