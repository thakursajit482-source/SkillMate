import {
  Controller,
  Get,
  Post,
  Delete,
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
import { SafetyService } from './safety.service';
import { CreateBlockDto } from './dto/create-block.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('Safety')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SafetyController {
  constructor(private readonly safetyService: SafetyService) {}

  @Post('users/:id/block')
  @ApiOperation({
    summary: 'Block a user (unilateral and silent)',
    description: 'Immediately and silently prevents any future discovery, requests, offers, and chat.',
  })
  @ApiParam({ name: 'id', description: 'UUID of user to block' })
  @ApiResponse({ status: 201, description: 'User blocked successfully' })
  @ApiResponse({ status: 400, description: 'Cannot block yourself' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async blockUserByParam(
    @Param('id', ParseUUIDPipe) blockedId: string,
    @CurrentUser('id') blockerId: string,
  ) {
    return this.safetyService.blockUser(blockerId, blockedId);
  }

  @Delete('users/:id/block')
  @ApiOperation({
    summary: 'Unblock a user',
  })
  @ApiParam({ name: 'id', description: 'UUID of user to unblock' })
  @ApiResponse({ status: 200, description: 'User unblocked successfully' })
  @ApiResponse({ status: 404, description: 'Block record not found' })
  async unblockUserByParam(
    @Param('id', ParseUUIDPipe) blockedId: string,
    @CurrentUser('id') blockerId: string,
  ) {
    return this.safetyService.unblockUser(blockerId, blockedId);
  }

  @Post('blocks')
  @ApiOperation({
    summary: 'Block a user via request body',
  })
  @ApiResponse({ status: 201, description: 'User blocked successfully' })
  async blockUserByBody(
    @Body() dto: CreateBlockDto,
    @CurrentUser('id') blockerId: string,
  ) {
    return this.safetyService.blockUser(blockerId, dto.blockedId);
  }

  @Delete('blocks/:userId')
  @ApiOperation({
    summary: 'Unblock a user (alternate route)',
  })
  @ApiParam({ name: 'userId', description: 'UUID of user to unblock' })
  @ApiResponse({ status: 200, description: 'User unblocked successfully' })
  async unblockUserAlt(
    @Param('userId', ParseUUIDPipe) blockedId: string,
    @CurrentUser('id') blockerId: string,
  ) {
    return this.safetyService.unblockUser(blockerId, blockedId);
  }

  @Get('users/blocked')
  @ApiOperation({
    summary: 'List users currently blocked by the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'List of blocked users with sanitized details' })
  async getBlockedUsers(@CurrentUser('id') userId: string) {
    return this.safetyService.getBlockedUsers(userId);
  }

  @Post('reports')
  @ApiOperation({
    summary: 'Submit a safety report against a user or task',
    description:
      'Creates a confidential report ticket in the safety queue. The reported user is not notified.',
  })
  @ApiResponse({ status: 201, description: 'Report submitted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot report yourself' })
  @ApiResponse({ status: 404, description: 'Reported user or task not found' })
  async createReport(
    @CurrentUser('id') reporterId: string,
    @Body() dto: CreateReportDto,
  ) {
    return this.safetyService.createReport(reporterId, dto);
  }

  @Get('reports/mine')
  @ApiOperation({
    summary: 'List safety reports submitted by the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of submitted reports' })
  async findMyReports(
    @CurrentUser('id') reporterId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.safetyService.findMyReports(reporterId, query);
  }
}
