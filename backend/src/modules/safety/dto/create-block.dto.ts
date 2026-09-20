import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBlockDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    description: 'UUID of the user to block',
  })
  @IsUUID()
  @IsNotEmpty()
  blockedId: string;
}
