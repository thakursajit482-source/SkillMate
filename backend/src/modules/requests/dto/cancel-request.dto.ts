import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CancelRequestDto {
  @ApiPropertyOptional({
    example: 'Found help from a classmate',
    description: 'Reason for cancelling the request',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
