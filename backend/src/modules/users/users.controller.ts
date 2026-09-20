import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get account details for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Safe account information' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyAccount(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }
}
