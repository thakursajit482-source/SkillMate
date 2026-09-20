import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { VerificationStatus } from '@prisma/client';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async submitVerification(userId: string, dto: SubmitVerificationDto) {
    // 1. Validate College existence
    const college = await this.prisma.college.findUnique({
      where: { id: dto.collegeId },
    });

    if (!college) {
      throw new NotFoundException(`College with ID "${dto.collegeId}" not found`);
    }

    const enrollmentId = dto.enrollmentId.trim();
    const collegeEmail = dto.collegeEmail?.trim().toLowerCase();

    // 2. Check duplicate enrollmentId for this college
    const duplicateEnrollment = await this.prisma.collegeVerification.findFirst({
      where: {
        collegeId: dto.collegeId,
        enrollmentId,
        NOT: { userId },
      },
    });

    if (duplicateEnrollment) {
      throw new ConflictException('This enrollment ID is already registered under this college by another student');
    }

    // 3. Check duplicate collegeEmail
    if (collegeEmail) {
      const duplicateEmail = await this.prisma.collegeVerification.findFirst({
        where: {
          collegeEmail,
          NOT: { userId },
        },
      });

      if (duplicateEmail) {
        throw new ConflictException('This college email address is already verified or in use');
      }
    }

    // 4. Automated domain match check (PRD Section 11.2)
    let initialStatus: VerificationStatus = VerificationStatus.PENDING;

    if (collegeEmail && college.emailDomains && college.emailDomains.length > 0) {
      const emailDomain = collegeEmail.split('@')[1];
      const isDomainMatched = college.emailDomains.some((d) => d.toLowerCase() === emailDomain?.toLowerCase());

      if (isDomainMatched) {
        // Fast-path automatic domain verification for official campus email
        initialStatus = VerificationStatus.VERIFIED;
        this.logger.log(`Automatic email domain verification approved for user ${userId} (${college.name})`);
      }
    }

    // 5. Upsert verification record
    const verification = await this.prisma.collegeVerification.upsert({
      where: { userId },
      update: {
        collegeId: dto.collegeId,
        department: dto.department.trim(),
        yearOfStudy: dto.yearOfStudy,
        enrollmentId,
        collegeEmail: collegeEmail || null,
        idDocumentRef: dto.idDocumentRef?.trim() || null,
        status: initialStatus,
        rejectionReason: null,
        reviewedById: null,
        reviewedAt: initialStatus === VerificationStatus.VERIFIED ? new Date() : null,
      },
      create: {
        userId,
        collegeId: dto.collegeId,
        department: dto.department.trim(),
        yearOfStudy: dto.yearOfStudy,
        enrollmentId,
        collegeEmail: collegeEmail || null,
        idDocumentRef: dto.idDocumentRef?.trim() || null,
        status: initialStatus,
        reviewedAt: initialStatus === VerificationStatus.VERIFIED ? new Date() : null,
      },
      include: {
        college: true,
      },
    });

    return {
      id: verification.id,
      userId: verification.userId,
      status: verification.status,
      isVerified: verification.status === VerificationStatus.VERIFIED,
      college: {
        id: verification.college.id,
        name: verification.college.name,
        city: verification.college.city,
        area: verification.college.area,
      },
      department: verification.department,
      yearOfStudy: verification.yearOfStudy,
      enrollmentId: verification.enrollmentId,
      collegeEmail: verification.collegeEmail,
      message:
        verification.status === VerificationStatus.VERIFIED
          ? 'College verified successfully via institutional email domain match!'
          : 'Verification submitted successfully and queued for admin review.',
      submittedAt: verification.updatedAt,
    };
  }

  async getMyVerificationStatus(userId: string) {
    const verification = await this.prisma.collegeVerification.findUnique({
      where: { userId },
      include: {
        college: true,
      },
    });

    if (!verification) {
      return {
        status: VerificationStatus.UNVERIFIED,
        isVerified: false,
        message: 'No college verification submitted yet',
      };
    }

    return {
      id: verification.id,
      status: verification.status,
      isVerified: verification.status === VerificationStatus.VERIFIED,
      college: {
        id: verification.college.id,
        name: verification.college.name,
        city: verification.college.city,
        area: verification.college.area,
      },
      department: verification.department,
      yearOfStudy: verification.yearOfStudy,
      enrollmentId: verification.enrollmentId,
      collegeEmail: verification.collegeEmail,
      rejectionReason: verification.rejectionReason,
      reviewedAt: verification.reviewedAt,
      createdAt: verification.createdAt,
    };
  }

  async reviewVerification(verificationId: string, adminUserId: string, dto: ReviewVerificationDto) {
    const verification = await this.prisma.collegeVerification.findUnique({
      where: { id: verificationId },
      include: { college: true },
    });

    if (!verification) {
      throw new NotFoundException(`Verification record "${verificationId}" not found`);
    }

    if (dto.status === VerificationStatus.REJECTED && !dto.rejectionReason) {
      throw new BadRequestException('A rejection reason must be provided when rejecting verification');
    }

    const updated = await this.prisma.collegeVerification.update({
      where: { id: verificationId },
      data: {
        status: dto.status,
        rejectionReason: dto.status === VerificationStatus.REJECTED ? dto.rejectionReason : null,
        reviewedById: adminUserId,
        reviewedAt: new Date(),
      },
      include: {
        college: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    this.logger.log(`Verification ${verificationId} reviewed by admin ${adminUserId}: ${dto.status}`);

    return {
      id: updated.id,
      student: updated.user,
      college: updated.college.name,
      status: updated.status,
      isVerified: updated.status === VerificationStatus.VERIFIED,
      rejectionReason: updated.rejectionReason,
      reviewedAt: updated.reviewedAt,
    };
  }

  async listPendingVerifications() {
    return this.prisma.collegeVerification.findMany({
      where: { status: VerificationStatus.PENDING },
      include: {
        college: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
