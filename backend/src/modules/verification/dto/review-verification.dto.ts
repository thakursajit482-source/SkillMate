import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { VerificationStatus } from '@prisma/client';

export class ReviewVerificationDto {
  @ApiProperty({
    enum: [VerificationStatus.VERIFIED, VerificationStatus.REJECTED],
    example: VerificationStatus.VERIFIED,
    description: 'Admin verification decision',
  })
  @IsEnum([VerificationStatus.VERIFIED, VerificationStatus.REJECTED], {
    message: 'Status must be either VERIFIED or REJECTED',
  })
  @IsNotEmpty()
  status: VerificationStatus;

  @ApiPropertyOptional({
    example: 'ID document was unreadable or expired.',
    description: 'Rejection reason if status is REJECTED',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
