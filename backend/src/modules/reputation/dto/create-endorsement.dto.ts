import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEndorsementDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    description: 'UUID of the student receiving the skill endorsement',
  })
  @IsUUID()
  @IsNotEmpty()
  endorseeId: string;

  @ApiProperty({
    example: 'd9b2d63d-a233-4123-8478-ec2b4f9bfd11',
    description: 'UUID of the skill being endorsed',
  })
  @IsUUID()
  @IsNotEmpty()
  skillId: string;

  @ApiPropertyOptional({
    example: 'e8b7c6a5-4321-4def-9876-543210fedcba',
    description: 'Optional UUID of the completed collaboration Task',
  })
  @IsOptional()
  @IsUUID()
  taskId?: string;
}
