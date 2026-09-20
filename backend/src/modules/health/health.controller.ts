import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Get application and database connectivity status' })
  @ApiResponse({ status: 200, description: 'Application is active and healthy' })
  async checkHealth() {
    return this.healthService.checkHealth();
  }
}
