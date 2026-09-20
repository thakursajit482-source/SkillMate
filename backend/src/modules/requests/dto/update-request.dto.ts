import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  MaxLength,
  MinLength,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AvailabilityWindowDto } from './create-request.dto';

export class UpdateRequestDto {
  @ApiPropertyOptional({ example: 'Need help debugging Flutter auth flow (updated)', description: 'Updated title' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    example: 'Updated description: session will focus specifically on Google Sign-in on Android.',
    description: 'Updated scope description',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;

  @ApiPropertyOptional({ example: 400, description: 'Updated budget in INR (PAID requests only)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({ description: 'Updated availability window' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AvailabilityWindowDto)
  availabilityWindow?: AvailabilityWindowDto;

  @ApiPropertyOptional({ example: 'Borivali', description: 'Updated locality in MMR' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  approximateArea?: string;
}
