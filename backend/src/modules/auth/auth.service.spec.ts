import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '@database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole, UserStatus } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;

  const mockUser = {
    id: 'user-123',
    name: 'Sajit Thakur',
    email: 'sajit@example.com',
    phone: '+919876543210',
    passwordHash: '',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('SecurePassword123', 10);
  });

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      profile: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mocked-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_EXPIRES_IN') return '15m';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new student and return an access token with safe user profile', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);
      prisma.profile.create.mockResolvedValue({ id: 'profile-123', userId: mockUser.id });

      const result = await service.register({
        name: 'Sajit Thakur',
        email: 'sajit@example.com',
        password: 'SecurePassword123',
        phone: '+919876543210',
      });

      expect(result.accessToken).toBe('mocked-jwt-token');
      expect(result.user.email).toBe('sajit@example.com');
      expect((result.user as any).passwordHash).toBeUndefined();
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should reject duplicate email with ConflictException', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.register({
          name: 'Duplicate Student',
          email: 'sajit@example.com',
          password: 'AnotherPassword123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should authenticate user with valid credentials', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        verification: { status: 'VERIFIED' },
      });

      const result = await service.login({
        email: 'sajit@example.com',
        password: 'SecurePassword123',
      });

      expect(result.accessToken).toBe('mocked-jwt-token');
      expect(result.user.isVerified).toBe(true);
      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('should reject invalid password with UnauthorizedException', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);

      await expect(
        service.login({
          email: 'sajit@example.com',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject non-existent user with UnauthorizedException', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'unknown@example.com',
          password: 'AnyPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject suspended user with UnauthorizedException', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      });

      await expect(
        service.login({
          email: 'sajit@example.com',
          password: 'SecurePassword123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should authenticate user when identifier alias is provided instead of email', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        verification: { status: 'VERIFIED' },
      });

      const result = await service.login({
        identifier: 'sajit@example.com',
        password: 'SecurePassword123',
      });

      expect(result.accessToken).toBe('mocked-jwt-token');
      expect(result.user.email).toBe('sajit@example.com');
    });

    it('should reject login with empty email/identifier with BadRequestException', async () => {
      await expect(
        service.login({
          email: '',
          password: 'SecurePassword123',
        }),
      ).rejects.toThrow();
    });
  });

  describe('getMe', () => {
    it('should return user profile with full verification object when verified', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        verification: {
          id: 'ver-123',
          status: 'VERIFIED',
          collegeId: 'col-1',
          college: {
            id: 'col-1',
            name: 'Thakur College of Engineering and Technology',
            city: 'Mumbai',
            area: 'Kandivali East',
          },
          department: 'Computer Engineering',
          yearOfStudy: 3,
          enrollmentId: 'TCET-2024-001',
          collegeEmail: 'sajit@tcetmumbai.in',
        },
      });

      const me = await service.getMe('user-123');
      expect(me.id).toBe('user-123');
      expect(me.isVerified).toBe(true);
      expect(me.verificationStatus).toBe('VERIFIED');
      expect(me.verification).toBeDefined();
      expect(me.verification?.status).toBe('VERIFIED');
      expect(me.verification?.college?.name).toBe('Thakur College of Engineering and Technology');
    });

    it('should return user profile with unverified status when no verification exists', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        verification: null,
      });

      const me = await service.getMe('user-123');
      expect(me.id).toBe('user-123');
      expect(me.isVerified).toBe(false);
      expect(me.verificationStatus).toBe('UNVERIFIED');
      expect(me.verification).toBeUndefined();
    });
  });
});
