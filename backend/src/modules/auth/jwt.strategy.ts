import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@database/prisma.service';
import { UserStatus } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret =
      configService.get<string>('JWT_SECRET') ||
      configService.get<string>('JWT_ACCESS_SECRET') ||
      'super-secret-jwt-access-key-change-in-production';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        verification: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User does not exist or session is invalid');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account has been suspended. Please contact support.');
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role,
      status: user.status,
      verificationStatus: user.verification?.status || 'UNVERIFIED',
      isVerified: user.verification?.status === 'VERIFIED',
    };
  }
}
