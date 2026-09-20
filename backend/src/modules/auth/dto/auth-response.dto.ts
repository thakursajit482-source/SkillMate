import { ApiProperty } from '@nestjs/swagger';

export class SafeUserDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  id: string;

  @ApiProperty({ example: 'Sajit Thakur' })
  name: string;

  @ApiProperty({ example: 'sajit@example.com' })
  email: string;

  @ApiProperty({ example: '+919876543210', required: false })
  phone?: string;

  @ApiProperty({ example: 'STUDENT' })
  role: string;

  @ApiProperty({ example: 'ACTIVE' })
  status: string;

  @ApiProperty({ example: 'UNVERIFIED' })
  verificationStatus: string;

  @ApiProperty({ example: false })
  isVerified: boolean;

  @ApiProperty({ required: false })
  verification?: {
    id: string;
    status: string;
    collegeId: string;
    college?: {
      id: string;
      name: string;
      city?: string;
      area?: string;
    };
    department?: string;
    yearOfStudy?: number;
    enrollmentId?: string;
    collegeEmail?: string;
  };
}

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 'bearer' })
  tokenType: string;

  @ApiProperty({ example: 900 })
  expiresIn: number;

  @ApiProperty({ type: SafeUserDto })
  user: SafeUserDto;
}
