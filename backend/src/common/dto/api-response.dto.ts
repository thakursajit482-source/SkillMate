import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty()
  data?: T;

  @ApiProperty({ example: 'Operation completed successfully' })
  message?: string;

  @ApiProperty({ example: '2026-09-18T16:45:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/api/v1/health' })
  path: string;
}

export class ApiErrorResponseDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Bad Request' })
  error: string;

  @ApiProperty({ example: 'Validation failed' })
  message: string | string[];

  @ApiProperty({ required: false, example: [{ field: 'email', issue: 'email must be an email' }] })
  details?: Array<{ field: string; issue: string }>;

  @ApiProperty({ example: '2026-09-18T16:45:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/api/v1/auth/signup' })
  path: string;
}
