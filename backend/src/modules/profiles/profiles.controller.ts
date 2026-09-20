import {
  Controller,
  Get,
  Patch,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AddProfileSkillDto } from './dto/add-skill.dto';
import { AddAvailabilityDto } from './dto/add-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('Profiles')
@Controller('profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get own student profile with skills, availability, and completeness score' })
  @ApiResponse({ status: 200, description: 'Own student profile details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.profilesService.getOwnProfile(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update own profile (bio, photoUrl, approximateArea, hourlyRate)' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async updateMyProfilePatch(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.profilesService.updateOwnProfile(userId, dto);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update own profile (PUT alias for PRD compatibility)' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateMyProfilePut(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.profilesService.updateOwnProfile(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: "Get another student's public profile (strict privacy filtered: no GPS, no phone/email)" })
  @ApiResponse({ status: 200, description: 'Sanitized public profile' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getPublicProfile(@Param('id') id: string, @CurrentUser('id') currentUserId?: string) {
    return this.profilesService.getPublicProfile(id, currentUserId);
  }

  @Get('me/skills')
  @ApiOperation({ summary: 'List all skills attached to own profile' })
  @ApiResponse({ status: 200, description: 'List of student profile skills' })
  async getMySkills(@CurrentUser('id') userId: string) {
    return this.profilesService.getSkills(userId);
  }

  @Post('me/skills')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add or update a skill on own profile' })
  @ApiResponse({ status: 200, description: 'Skill added/updated on profile' })
  async addSkill(@CurrentUser('id') userId: string, @Body() dto: AddProfileSkillDto) {
    return this.profilesService.addSkill(userId, dto);
  }

  @Delete('me/skills/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a skill from own profile' })
  @ApiResponse({ status: 200, description: 'Skill removed from profile' })
  @ApiResponse({ status: 404, description: 'Skill entry not found' })
  async removeSkill(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.profilesService.removeSkill(userId, id);
  }

  @Get('me/availability')
  @ApiOperation({ summary: 'List all availability windows on own profile' })
  @ApiResponse({ status: 200, description: 'List of student availability windows' })
  async getMyAvailability(@CurrentUser('id') userId: string) {
    return this.profilesService.getAvailabilities(userId);
  }

  @Post('me/availability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add an availability window to own profile' })
  @ApiResponse({ status: 200, description: 'Availability slot added' })
  @ApiResponse({ status: 400, description: 'Invalid time bounds (start must precede end)' })
  async addAvailability(@CurrentUser('id') userId: string, @Body() dto: AddAvailabilityDto) {
    return this.profilesService.addAvailability(userId, dto);
  }

  @Patch('me/availability/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a daily availability slot on own profile' })
  @ApiResponse({ status: 200, description: 'Availability slot updated' })
  @ApiResponse({ status: 400, description: 'Invalid time bounds (start must precede end)' })
  @ApiResponse({ status: 404, description: 'Availability window not found' })
  async updateAvailability(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.profilesService.updateAvailability(userId, id, dto);
  }

  @Delete('me/availability/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove an availability window from own profile' })
  @ApiResponse({ status: 200, description: 'Availability slot removed' })
  @ApiResponse({ status: 404, description: 'Availability window not found' })
  async removeAvailability(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.profilesService.removeAvailability(userId, id);
  }
}
