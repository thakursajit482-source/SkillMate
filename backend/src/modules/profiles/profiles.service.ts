import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AddProfileSkillDto } from './dto/add-skill.dto';
import { AddAvailabilityDto } from './dto/add-availability.dto';
import { getAreaCentroid, sanitizePublicProfile } from '@common/utils/location.util';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOwnProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            verification: {
              include: {
                college: true,
              },
            },
          },
        },
        skills: {
          include: {
            skill: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        availabilities: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found for this student');
    }

    const completeness = this.calculateCompleteness(profile);
    if (completeness !== profile.completenessScore) {
      await this.prisma.profile.update({
        where: { id: profile.id },
        data: { completenessScore: completeness },
      });
      profile.completenessScore = completeness;
    }

    return {
      id: profile.id,
      userId: profile.userId,
      name: profile.user.name,
      email: profile.user.email,
      phone: profile.user.phone,
      bio: profile.bio,
      photoUrl: profile.photoUrl,
      approximateArea: profile.approximateArea,
      hourlyRate: profile.hourlyRate ? Number(profile.hourlyRate) : null,
      completenessScore: profile.completenessScore,
      college: profile.user.verification?.college
        ? {
            id: profile.user.verification.college.id,
            name: profile.user.verification.college.name,
            city: profile.user.verification.college.city,
            area: profile.user.verification.college.area,
          }
        : null,
      department: profile.user.verification?.department || null,
      yearOfStudy: profile.user.verification?.yearOfStudy || null,
      verificationStatus: profile.user.verification?.status || 'UNVERIFIED',
      isVerified: profile.user.verification?.status === 'VERIFIED',
      skills: profile.skills.map((ps) => ({
        id: ps.id,
        skillId: ps.skillId,
        name: ps.skill.name,
        category: ps.skill.category,
        level: ps.level,
        isVerifiedSkill: ps.isVerifiedSkill,
      })),
      availabilities: profile.availabilities.map((av) => ({
        id: av.id,
        dayOfWeek: av.dayOfWeek,
        specificDate: av.specificDate,
        startTime: av.startTime,
        endTime: av.endTime,
        isRecurring: av.isRecurring,
      })),
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  async updateOwnProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!existing) {
      throw new NotFoundException('Profile not found');
    }

    let latBucket = existing.latitudeBucket;
    let lngBucket = existing.longitudeBucket;

    if (dto.approximateArea !== undefined) {
      const centroid = getAreaCentroid(dto.approximateArea);
      if (centroid) {
        latBucket = centroid.latitudeBucket;
        lngBucket = centroid.longitudeBucket;
      }
    }

    const updated = await this.prisma.profile.update({
      where: { userId },
      data: {
        ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
        ...(dto.photoUrl !== undefined ? { photoUrl: dto.photoUrl } : {}),
        ...(dto.approximateArea !== undefined ? { approximateArea: dto.approximateArea.trim() } : {}),
        ...(dto.hourlyRate !== undefined ? { hourlyRate: dto.hourlyRate } : {}),
        latitudeBucket: latBucket,
        longitudeBucket: lngBucket,
      },
    });

    return this.getOwnProfile(userId);
  }

  async getPublicProfile(idOrUserId: string, currentUserId?: string) {
    try {
      const profile = await this.prisma.profile.findFirst({
        where: {
          OR: [{ id: idOrUserId }, { userId: idOrUserId }],
          user: { status: 'ACTIVE' },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              status: true,
              verification: {
                include: {
                  college: true,
                },
              },
            },
          },
          skills: {
            include: {
              skill: true,
            },
          },
          availabilities: true,
        },
      });

      if (!profile) {
        throw new NotFoundException('Student profile not found');
      }

      if (currentUserId && currentUserId !== profile.user.id) {
        const isBlocked = await this.prisma.block.findFirst({
          where: {
            OR: [
              { blockerId: currentUserId, blockedId: profile.user.id },
              { blockerId: profile.user.id, blockedId: currentUserId },
            ],
          },
        });
        if (isBlocked) {
          throw new NotFoundException('Student profile not found');
        }
      }

      return sanitizePublicProfile(profile, profile.user, profile.user.verification);
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      if (err.code === 'P2023' || (err.message && err.message.includes('UUID'))) {
        throw new NotFoundException('Student profile not found');
      }
      throw err;
    }
  }

  async getSkills(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        skills: {
          include: { skill: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile.skills.map((ps) => ({
      id: ps.id,
      profileId: ps.profileId,
      skillId: ps.skillId,
      name: ps.skill.name,
      category: ps.skill.category,
      level: ps.level,
      isVerifiedSkill: ps.isVerifiedSkill,
      endorsementsCount: 0,
      createdAt: ps.createdAt,
      skill: {
        id: ps.skill.id,
        name: ps.skill.name,
        category: ps.skill.category,
      },
    }));
  }

  async getAvailabilities(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        availabilities: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile.availabilities.map((av) => ({
      id: av.id,
      dayOfWeek: av.dayOfWeek,
      specificDate: av.specificDate ? av.specificDate.toISOString().split('T')[0] : null,
      startTime: av.startTime,
      endTime: av.endTime,
      isRecurring: av.isRecurring,
      activity: av.activity || null,
      details: av.details || null,
      createdAt: av.createdAt,
    }));
  }

  async addSkill(userId: string, dto: AddProfileSkillDto) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    let skillId = dto.skillId;

    if (skillId) {
      const existingSkill = await this.prisma.skill.findUnique({
        where: { id: skillId },
      });
      if (!existingSkill) {
        throw new NotFoundException(`Skill with ID "${skillId}" does not exist`);
      }
    } else if (dto.name) {
      const skillName = dto.name.trim();
      const category = dto.category?.trim() || 'General';

      const skill = await this.prisma.skill.upsert({
        where: { name: skillName },
        update: {},
        create: { name: skillName, category },
      });
      skillId = skill.id;
    }

    if (!skillId) {
      throw new BadRequestException('Either skillId or skill name must be provided');
    }

    // Upsert ProfileSkill (updates level if skill already attached, creates if new)
    await this.prisma.profileSkill.upsert({
      where: {
        profileId_skillId: {
          profileId: profile.id,
          skillId,
        },
      },
      update: {
        level: dto.level,
      },
      create: {
        profileId: profile.id,
        skillId,
        level: dto.level,
      },
    });

    return this.getSkills(userId);
  }

  async removeSkill(userId: string, profileSkillId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const profileSkill = await this.prisma.profileSkill.findUnique({
      where: { id: profileSkillId },
    });

    if (!profileSkill) {
      throw new NotFoundException('Skill entry not found on profile');
    }

    if (profileSkill.profileId !== profile.id) {
      throw new ForbiddenException('Cannot delete skill from another student profile');
    }

    await this.prisma.profileSkill.delete({
      where: { id: profileSkillId },
    });

    return this.getOwnProfile(userId);
  }

  async addAvailability(userId: string, dto: AddAvailabilityDto) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Validate time logic
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('Start time must be strictly before end time');
    }

    let dayOfWeek = dto.dayOfWeek !== undefined ? dto.dayOfWeek : null;
    let specificDate: Date | null = null;
    if (dto.specificDate) {
      specificDate = new Date(dto.specificDate);
      if (dayOfWeek === null) {
        dayOfWeek = specificDate.getDay();
      }
    }

    await this.prisma.availability.create({
      data: {
        profileId: profile.id,
        dayOfWeek,
        specificDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        isRecurring: dto.isRecurring !== undefined ? dto.isRecurring : !dto.specificDate,
        activity: dto.activity?.trim() || null,
        details: dto.details?.trim() || null,
      },
    });

    return this.getOwnProfile(userId);
  }

  async updateAvailability(userId: string, availabilityId: string, dto: any) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const availability = await this.prisma.availability.findUnique({
      where: { id: availabilityId },
    });

    if (!availability) {
      throw new NotFoundException('Availability window not found');
    }

    if (availability.profileId !== profile.id) {
      throw new ForbiddenException('Cannot delete availability from another student profile');
    }

    const start = dto.startTime || availability.startTime;
    const end = dto.endTime || availability.endTime;
    if (start >= end) {
      throw new BadRequestException('Start time must be strictly before end time');
    }

    let dayOfWeek = dto.dayOfWeek !== undefined ? dto.dayOfWeek : availability.dayOfWeek;
    let specificDate = availability.specificDate;
    if (dto.specificDate !== undefined) {
      specificDate = dto.specificDate ? new Date(dto.specificDate) : null;
      if (specificDate && dto.dayOfWeek === undefined) {
        dayOfWeek = specificDate.getDay();
      }
    }

    await this.prisma.availability.update({
      where: { id: availabilityId },
      data: {
        startTime: dto.startTime !== undefined ? dto.startTime : undefined,
        endTime: dto.endTime !== undefined ? dto.endTime : undefined,
        dayOfWeek: dto.dayOfWeek !== undefined ? dto.dayOfWeek : undefined,
        specificDate: dto.specificDate !== undefined ? specificDate : undefined,
        isRecurring: dto.isRecurring !== undefined ? dto.isRecurring : undefined,
        activity: dto.activity !== undefined ? dto.activity.trim() || null : undefined,
        details: dto.details !== undefined ? dto.details.trim() || null : undefined,
      },
    });

    return this.getOwnProfile(userId);
  }

  async removeAvailability(userId: string, availabilityId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const availability = await this.prisma.availability.findUnique({
      where: { id: availabilityId },
    });

    if (!availability) {
      throw new NotFoundException('Availability window not found');
    }

    if (availability.profileId !== profile.id) {
      throw new ForbiddenException('Cannot delete availability from another student profile');
    }

    await this.prisma.availability.delete({
      where: { id: availabilityId },
    });

    return this.getOwnProfile(userId);
  }

  private calculateCompleteness(profile: any): number {
    let score = 10; // baseline
    if (profile.bio && profile.bio.length >= 10) score += 20;
    if (profile.photoUrl) score += 20;
    if (profile.approximateArea) score += 20;
    if (profile.skills && profile.skills.length > 0) score += 15;
    if (profile.availabilities && profile.availabilities.length > 0) score += 15;
    return Math.min(score, 100);
  }
}
