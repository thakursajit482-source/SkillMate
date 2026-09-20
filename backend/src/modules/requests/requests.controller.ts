import {
  Controller,
  Get,
  Post,
  Put,
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
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { RequestQueryDto, RequestDirection } from './dto/request-query.dto';
import { CancelRequestDto } from './dto/cancel-request.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('Requests')
@Controller('requests')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new typed request (Paid, Skill Exchange, or Social)',
    description:
      'Creates a structured collaboration request. Enforces college verification check and interaction-specific constraints.',
  })
  @ApiResponse({ status: 201, description: 'Request created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error in request payload' })
  @ApiResponse({ status: 403, description: 'User not verified or target user blocked' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateRequestDto,
  ) {
    return this.requestsService.createRequest(userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List and browse requests with filters and pagination',
    description:
      'Browse open requests or filter by direction (incoming targeted to me, or outgoing created by me), status, type, or area.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of requests' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: RequestQueryDto,
  ) {
    return this.requestsService.findAll(userId, query);
  }

  @Get('mine')
  @ApiOperation({
    summary: 'List own outgoing requests created by current user',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of current user requests' })
  async findMine(
    @CurrentUser('id') userId: string,
    @Query() query: RequestQueryDto,
  ) {
    return this.requestsService.findAll(userId, {
      ...query,
      direction: RequestDirection.OUTGOING,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get request details by UUID',
    description:
      'Retrieves request details. Includes associated offers if requested by the request owner.',
  })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiResponse({ status: 200, description: 'Request details' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.requestsService.findById(id, userId);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Edit an open request before any offers are accepted (owner only)',
  })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiResponse({ status: 200, description: 'Request updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update non-open request or after accepted offer' })
  @ApiResponse({ status: 403, description: 'Not authorized to edit this request' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateRequestDto,
  ) {
    return this.requestsService.update(id, userId, dto);
  }

  @Post(':id/accept')
  @ApiOperation({
    summary: 'Accept an open or targeted request directly (creates offer & task)',
    description:
      'Allows a verified student to accept a request directly, transitioning the request to MATCHED and creating a Task in PENDING status.',
  })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiResponse({ status: 200, description: 'Request accepted and task initiated' })
  @ApiResponse({ status: 400, description: 'Invalid request or self-acceptance attempt' })
  @ApiResponse({ status: 403, description: 'Unverified student or blocked from interacting' })
  async accept(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.requestsService.acceptRequest(id, userId);
  }

  @Post(':id/close')
  @ApiOperation({
    summary: 'Close an open request (owner only)',
  })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiResponse({ status: 200, description: 'Request closed successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to close this request' })
  async close(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.requestsService.closeRequest(id, userId);
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancel an open request with optional reason (owner only)',
  })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiResponse({ status: 200, description: 'Request cancelled successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to cancel this request' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CancelRequestDto,
  ) {
    return this.requestsService.cancelRequest(id, userId, dto?.reason);
  }
}
