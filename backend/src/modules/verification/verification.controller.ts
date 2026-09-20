import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Verification')
@Controller('verification')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit student college verification details' })
  @ApiResponse({ status: 200, description: 'Verification submitted or verified via institutional email' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'College not found' })
  @ApiResponse({ status: 409, description: 'Duplicate enrollment ID or email' })
  async submitVerification(
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitVerificationDto,
  ) {
    return this.verificationService.submitVerification(userId, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current student college verification status' })
  @ApiResponse({ status: 200, description: 'Current verification status' })
  async getMyStatus(@CurrentUser('id') userId: string) {
    return this.verificationService.getMyVerificationStatus(userId);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current student college verification status (PRD alias)' })
  @ApiResponse({ status: 200, description: 'Current verification status' })
  async getMyStatusAlias(@CurrentUser('id') userId: string) {
    return this.verificationService.getMyVerificationStatus(userId);
  }

  @Get('admin/pending')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all pending student verifications (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of pending verifications' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN role' })
  async listPending() {
    return this.verificationService.listPendingVerifications();
  }

  @Patch(':id/review')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Review and approve/reject a student verification (Admin only)' })
  @ApiResponse({ status: 200, description: 'Verification review recorded' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN role' })
  @ApiResponse({ status: 404, description: 'Verification record not found' })
  async reviewVerification(
    @Param('id') id: string,
    @CurrentUser('id') adminUserId: string,
    @Body() dto: ReviewVerificationDto,
  ) {
    return this.verificationService.reviewVerification(id, adminUserId, dto);
  }
}
