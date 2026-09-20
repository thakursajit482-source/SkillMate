import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        verification: {
          include: { college: true },
        },
        profile: {
          include: {
            skills: { include: { skill: true } },
            availabilities: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Sanitize user object, removing passwordHash and internal security fields
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      verification: user.verification
        ? {
            status: user.verification.status,
            college: user.verification.college
              ? {
                  id: user.verification.college.id,
                  name: user.verification.college.name,
                  city: user.verification.college.city,
                  area: user.verification.college.area,
                }
              : null,
            department: user.verification.department,
            yearOfStudy: user.verification.yearOfStudy,
          }
        : null,
      profile: user.profile
        ? {
            id: user.profile.id,
            bio: user.profile.bio,
            photoUrl: user.profile.photoUrl,
            approximateArea: user.profile.approximateArea,
            hourlyRate: user.profile.hourlyRate ? Number(user.profile.hourlyRate) : null,
            completenessScore: user.profile.completenessScore,
          }
        : null,
    };
  }
}
