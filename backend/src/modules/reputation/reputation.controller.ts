import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ReputationService } from './reputation.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { CreateEndorsementDto } from './dto/create-endorsement.dto';
import { ReputationQueryDto } from './dto/reputation-query.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('Reputation')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ReputationController {
  constructor(private readonly reputationService: ReputationService) {}

  @Post('tasks/:taskId/rating')
  @ApiOperation({
    summary: 'Submit a 1-5 star rating and qualitative tags for a completed task',
    description:
      'Only participants of a COMPLETED task can submit a rating. Prevents duplicate ratings.',
  })
  @ApiParam({ name: 'taskId', description: 'Completed task UUID' })
  @ApiResponse({ status: 201, description: 'Rating submitted successfully' })
  @ApiResponse({ status: 400, description: 'Task not COMPLETED' })
  @ApiResponse({ status: 403, description: 'Not a task participant' })
  @ApiResponse({ status: 409, description: 'Duplicate rating on this task' })
  async createRating(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser('id') raterId: string,
    @Body() dto: CreateRatingDto,
  ) {
    return this.reputationService.createRating(taskId, raterId, dto);
  }

  @Get('users/:userId/ratings')
  @ApiOperation({
    summary: 'Get paginated ratings received by a student',
  })
  @ApiParam({ name: 'userId', description: 'Student UUID' })
  @ApiResponse({ status: 200, description: 'Paginated ratings list' })
  async findRatingsForUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: ReputationQueryDto,
  ) {
    return this.reputationService.findRatingsForUser(userId, query);
  }

  @Get('users/:userId/reputation')
  @ApiOperation({
    summary: 'Get transparent behavioral reputation summary for a student',
    description:
      'Aggregates completion rate, average rating, repeat collaborators, tags, and endorsement counts.',
  })
  @ApiParam({ name: 'userId', description: 'Student UUID' })
  @ApiResponse({ status: 200, description: 'Reputation summary object' })
  async getUserReputation(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.reputationService.getUserReputation(userId);
  }

  @Post('endorsements')
  @ApiOperation({
    summary: 'Endorse a collaborator on a specific skill based on completed collaboration',
  })
  @ApiResponse({ status: 201, description: 'Skill endorsed successfully' })
  @ApiResponse({ status: 400, description: 'Cannot endorse yourself' })
  @ApiResponse({ status: 403, description: 'No completed collaboration history exists' })
  @ApiResponse({ status: 409, description: 'Skill already endorsed' })
  async createEndorsement(
    @CurrentUser('id') endorserId: string,
    @Body() dto: CreateEndorsementDto,
  ) {
    return this.reputationService.createEndorsement(endorserId, dto);
  }

  @Get('users/:userId/endorsements')
  @ApiOperation({
    summary: 'List peer skill endorsements received by a student',
  })
  @ApiParam({ name: 'userId', description: 'Student UUID' })
  @ApiResponse({ status: 200, description: 'List of peer skill endorsements' })
  async findEndorsementsForUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.reputationService.findEndorsementsForUser(userId);
  }
}
