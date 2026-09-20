import { Controller, Post, Body, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, SafeUserDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new student account' })
  @ApiResponse({ status: 201, description: 'Student registered successfully', type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error in request body' })
  @ApiResponse({ status: 409, description: 'Email or phone already registered' })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Alias for register (PRD compatibility)' })
  @ApiResponse({ status: 201, description: 'Student registered successfully', type: AuthResponseDto })
  async signup(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate student with email/phone and password' })
  @ApiResponse({ status: 200, description: 'Authentication successful, JWT issued', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current authenticated student profile and verification state' })
  @ApiResponse({ status: 200, description: 'Authenticated user account information', type: SafeUserDto })
  @ApiResponse({ status: 401, description: 'Unauthorized or missing token' })
  async getMe(@CurrentUser('id') userId: string): Promise<SafeUserDto> {
    return this.authService.getMe(userId);
  }
}
