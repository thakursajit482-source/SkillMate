import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ParseQueryDto {
  @ApiProperty({
    description: 'Natural language search or collaboration requirement',
    example: 'I need someone who knows Python and ML for my project tomorrow evening, preferably nearby.',
  })
  @IsString()
  @IsNotEmpty({ message: 'Query cannot be empty' })
  @MaxLength(1000, { message: 'Query cannot exceed 1000 characters' })
  query: string;
}
