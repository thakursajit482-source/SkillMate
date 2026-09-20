import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, SafeUserDto } from './dto/auth-response.dto';
import { UserRole, UserStatus, VerificationStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // 1. Check for duplicate email
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUserByEmail) {
      throw new ConflictException('Email address is already registered');
    }

    // 2. Handle phone number uniqueness
    const rawPhone = dto.phone?.trim();
    const phone = rawPhone
      ? rawPhone.startsWith('+91')
        ? rawPhone
        : rawPhone.length === 10
          ? `+91${rawPhone}`
          : rawPhone
      : `+91${Date.now().toString().slice(-10)}`;

    const existingUserByPhone = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (existingUserByPhone) {
      throw new ConflictException('Phone number is already registered');
    }

    // 3. Hash password securely
    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

    // 4. Create user and initialize bare profile in a transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: dto.name.trim(),
          email: normalizedEmail,
          phone,
          passwordHash,
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
        },
      });

      // Create linked Profile
      await tx.profile.create({
        data: {
          userId: newUser.id,
          completenessScore: 10, // Initial registration baseline
        },
      });

      // If college was selected during registration, attach initial verification record
      let verificationRecord: any = null;
      if (dto.collegeId && tx.collegeVerification) {
        try {
          const college = await tx.college.findUnique({ where: { id: dto.collegeId } });
          if (college) {
            verificationRecord = await tx.collegeVerification.create({
              data: {
                userId: newUser.id,
                collegeId: dto.collegeId,
                department: 'General',
                yearOfStudy: 1,
                enrollmentId: dto.enrollmentId?.trim() || `ENR-${newUser.id.slice(0, 8).toUpperCase()}`,
                status: VerificationStatus.UNVERIFIED,
              },
              include: { college: true },
            });
          }
        } catch (err: any) {
          this.logger.warn(`Initial college attachment skipped: ${err.message}`);
        }
      }

      return {
        ...newUser,
        verification: verificationRecord,
      };
    });

    this.logger.log(`New student registered successfully: ${user.id} (${user.email})`);

    // 5. Generate tokens and return safe response
    return this.generateAuthResponse(user, 'UNVERIFIED', false);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const rawInput = (dto.email || dto.identifier || '').trim();
    if (!rawInput) {
      throw new BadRequestException('Email address is required');
    }
    const identifier = rawInput.toLowerCase();
    const cleanDigits = identifier.replace(/\D/g, '');
    const phoneVariant = cleanDigits.length === 10 ? `+91${cleanDigits}` : identifier;

    // 1. Find user by email or phone
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { phone: identifier }, { phone: phoneVariant }],
      },
      include: {
        verification: {
          include: { college: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 2. Validate password hash
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. Check account status
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account has been suspended. Please contact support.');
    }

    const verificationStatus = user.verification?.status || 'UNVERIFIED';
    const isVerified = verificationStatus === 'VERIFIED';

    this.logger.log(`Student logged in successfully: ${user.id}`);
    return this.generateAuthResponse(user, verificationStatus, isVerified);
  }

  async getMe(userId: string): Promise<SafeUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        verification: {
          include: { college: true },
        },
        profile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toSafeUser(user, user.verification?.status || 'UNVERIFIED', user.verification?.status === 'VERIFIED');
  }

  private generateAuthResponse(user: any, verificationStatus: string, isVerified: boolean): AuthResponseDto {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const expiresInStr =
      this.configService.get<string>('JWT_EXPIRES_IN') ||
      this.configService.get<string>('JWT_ACCESS_EXPIRATION') ||
      '15m';

    // Approximate seconds for client metadata
    const expiresIn = expiresInStr.includes('m')
      ? parseInt(expiresInStr, 10) * 60
      : expiresInStr.includes('d')
        ? parseInt(expiresInStr, 10) * 86400
        : 900;

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: this.toSafeUser(user, verificationStatus, isVerified),
    };
  }

  private toSafeUser(user: any, verificationStatus: string, isVerified: boolean): SafeUserDto {
    const v = user.verification;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      verificationStatus,
      isVerified,
      verification: v
        ? {
            id: v.id,
            status: v.status,
            collegeId: v.collegeId,
            college: v.college
              ? {
                  id: v.college.id,
                  name: v.college.name,
                  city: v.college.city,
                  area: v.college.area,
                }
              : undefined,
            department: v.department,
            yearOfStudy: v.yearOfStudy,
            enrollmentId: v.enrollmentId,
            collegeEmail: v.collegeEmail,
          }
        : undefined,
    };
  }
}
