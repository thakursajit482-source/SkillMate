import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DiscoveryService } from './discovery.service';
import { DiscoveryStudentsQueryDto } from './dto/discovery-students-query.dto';
import { DiscoveryRequestsQueryDto } from './dto/discovery-requests-query.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('Discovery')
@Controller('discovery')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get('students')
  @ApiOperation({
    summary: 'Discover nearby student peers using skills, area, college, and availability filters',
    description:
      'Returns paginated, deterministically ranked students with explainable match reasons. ' +
      'Strict location and privacy rules are enforced: exact GPS coordinates, email, and phone are never exposed.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated discovery result with match score and explainable reasons',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async discoverStudents(
    @Query() query: DiscoveryStudentsQueryDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.discoveryService.discoverStudents(query, currentUserId);
  }

  @Get('requests')
  @ApiOperation({
    summary: 'Discover nearby open requests filtered by skill, type, and radius',
    description:
      'Returns open collaboration requests from other verified students nearby, with banded distance indicator.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of nearby open requests',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async discoverRequests(
    @Query() query: DiscoveryRequestsQueryDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.discoveryService.discoverRequests(query, currentUserId);
  }
}

