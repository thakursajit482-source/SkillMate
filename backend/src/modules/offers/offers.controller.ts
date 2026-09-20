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
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { OfferQueryDto } from './dto/offer-query.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('Offers')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post('requests/:requestId/offers')
  @ApiOperation({
    summary: 'Submit an offer on an open request',
    description:
      'Allows a verified student to offer help on an open request, with optional message and counter-terms.',
  })
  @ApiParam({ name: 'requestId', description: 'Request UUID' })
  @ApiResponse({ status: 201, description: 'Offer submitted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request status or self-offer attempt' })
  @ApiResponse({ status: 403, description: 'Unverified user or blocked from interacting' })
  async createOffer(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOfferDto,
  ) {
    return this.offersService.createOffer(requestId, userId, dto);
  }

  @Get('requests/:requestId/offers')
  @ApiOperation({
    summary: 'List all offers on a request (owner only)',
  })
  @ApiParam({ name: 'requestId', description: 'Request UUID' })
  @ApiResponse({ status: 200, description: 'Paginated list of offers' })
  @ApiResponse({ status: 403, description: 'Only request owner can view offers' })
  async findAllForRequest(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @CurrentUser('id') userId: string,
    @Query() query: OfferQueryDto,
  ) {
    return this.offersService.findAllForRequest(requestId, userId, query);
  }

  @Get('offers/mine')
  @ApiOperation({
    summary: 'Get all offers submitted by the current user',
    description: 'Retrieves offers submitted by the current user along with request and task details.',
  })
  @ApiResponse({ status: 200, description: 'List of offers submitted by current user' })
  async findMine(@CurrentUser('id') userId: string) {
    return this.offersService.findMine(userId);
  }

  @Get('offers/:id')
  @ApiOperation({
    summary: 'Get offer detail by ID',
    description: 'Accessible by the offering student or the request owner.',
  })
  @ApiParam({ name: 'id', description: 'Offer UUID' })
  @ApiResponse({ status: 200, description: 'Offer details' })
  @ApiResponse({ status: 403, description: 'Not authorized to view this offer' })
  @ApiResponse({ status: 404, description: 'Offer not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.offersService.findById(id, userId);
  }

  @Post('offers/:id/accept')
  @ApiOperation({
    summary: 'Accept an offer (request owner only)',
    description:
      'Atomically accepts offer, transitions non-social request to MATCHED, declines competing offers, and generates a Task.',
  })
  @ApiParam({ name: 'id', description: 'Offer UUID' })
  @ApiResponse({ status: 200, description: 'Offer accepted and collaboration task created' })
  @ApiResponse({ status: 400, description: 'Offer is not in PENDING status' })
  @ApiResponse({ status: 403, description: 'Only request owner can accept' })
  async acceptOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.offersService.acceptOffer(id, userId);
  }

  @Post('offers/:id/decline')
  @ApiOperation({
    summary: 'Decline an offer (request owner only)',
  })
  @ApiParam({ name: 'id', description: 'Offer UUID' })
  @ApiResponse({ status: 200, description: 'Offer declined' })
  @ApiResponse({ status: 403, description: 'Only request owner can decline' })
  async declineOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.offersService.declineOffer(id, userId);
  }

  @Post('offers/:id/withdraw')
  @ApiOperation({
    summary: 'Withdraw own offer (offering student only)',
  })
  @ApiParam({ name: 'id', description: 'Offer UUID' })
  @ApiResponse({ status: 200, description: 'Offer withdrawn successfully' })
  @ApiResponse({ status: 403, description: 'Can only withdraw your own offer' })
  async withdrawOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.offersService.withdrawOffer(id, userId);
  }
}
