import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateThreadDto {
  @ApiProperty({
    example: 'c1d2e3f4-5678-90ab-cdef-1234567890ab',
    description: 'UUID of the Request connecting the participants',
  })
  @IsUUID()
  @IsNotEmpty()
  requestId: string;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    description: 'UUID of the counterpart student participant',
  })
  @IsUUID()
  @IsNotEmpty()
  participantId: string;
}
