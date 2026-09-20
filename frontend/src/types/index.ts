export type UserRole = 'STUDENT' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';
export type VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type RequestType = 'PAID' | 'SKILL_EXCHANGE' | 'SOCIAL';
export type RequestStatus = 'OPEN' | 'MATCHED' | 'CLOSED' | 'CANCELLED';
export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';
export type TaskStatus = 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ReportCategory = 'NO_SHOW' | 'HARASSMENT' | 'FAKE_PROFILE' | 'SCAM' | 'OTHER';
export type ReportStatus = 'OPEN' | 'REVIEWED' | 'RESOLVED';

export interface User {
  id: string;
  phone?: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  createdAt?: string;
  updatedAt?: string;
  verification?: CollegeVerification;
  profile?: Profile;
  verificationStatus?: VerificationStatus;
  isVerified?: boolean;
}

export interface College {
  id: string;
  name: string;
  city?: string;
  area?: string;
  domain?: string;
  emailDomains?: string[];
  state?: string;
  country?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CollegeVerification {
  id: string;
  userId: string;
  collegeId: string;
  department?: string;
  yearOfStudy?: number;
  enrollmentId?: string;
  idType?: string;
  collegeEmail?: string;
  idDocumentRef?: string;
  documentUrl?: string;
  status: VerificationStatus;
  rejectionReason?: string;
  submittedAt?: string;
  reviewedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  college?: College;
}

export interface Profile {
  id: string;
  userId: string;
  collegeId?: string;
  bio?: string;
  avatarUrl?: string;
  major?: string;
  gradYear?: number;
  latitudeBucket?: number;
  longitudeBucket?: number;
  approximateArea?: string;
  socialLinks?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  college?: College;
  skills?: UserSkill[];
  availability?: Availability[];
}

export interface PublicProfile {
  id: string;
  name: string;
  college?: {
    id: string;
    name: string;
    city?: string;
  };
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  bio?: string;
  avatarUrl?: string;
  major?: string;
  gradYear?: number;
  approximateArea?: string;
  distanceBand?: string;
  skills: Array<{
    id: string;
    name: string;
    category?: string;
    level: SkillLevel;
    endorsementCount: number;
  }>;
  availability: Availability[];
  reputation: {
    averageRating: number;
    totalRatings: number;
    completionRate: number;
    completedTasksCount: number;
    reliabilityScore: number;
  };
  socialLinks?: Record<string, string>;
  createdAt: string;
}

export interface Skill {
  id: string;
  name: string;
  category?: string;
}

export interface UserSkill {
  id: string;
  profileId: string;
  skillId: string;
  level: SkillLevel;
  endorsementsCount: number;
  skill?: Skill;
  name?: string;
  category?: string;
}

export interface Availability {
  id: string;
  profileId: string;
  dayOfWeek?: number | null; // 0 = Sunday, 1 = Monday, ...
  specificDate?: string | null; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  isRecurring?: boolean;
  activity?: string | null;
  details?: string | null;
  slotLabel?: string;
  createdAt?: string;
}

export interface RequestItem {
  id: string;
  requesterId: string;
  targetUserId?: string;
  title: string;
  description: string;
  category?: string;
  type: RequestType;
  budget?: number;
  skillId?: string;
  desiredSkillId?: string;
  exchangeSkillId?: string;
  socialVibe?: string;
  status: RequestStatus;
  approximateArea?: string;
  createdAt: string;
  updatedAt: string;
  requester?: {
    id: string;
    name: string;
    verificationStatus?: VerificationStatus;
    college?: { name: string };
    approximateArea?: string;
    distanceBand?: string;
  };
  targetUser?: {
    id: string;
    name: string;
  };
  skill?: Skill;
  desiredSkill?: Skill;
  exchangeSkill?: Skill;
  offers?: OfferItem[];
  _count?: {
    offers: number;
  };
}

export interface OfferItem {
  id: string;
  requestId: string;
  offeringUserId: string;
  message: string;
  proposedPrice?: number;
  proposedSkillId?: string;
  status: OfferStatus;
  createdAt: string;
  updatedAt: string;
  offeringUser?: {
    id: string;
    name: string;
    verificationStatus?: VerificationStatus;
    college?: { name: string };
    approximateArea?: string;
  };
  proposedSkill?: Skill;
  request?: RequestItem;
  taskId?: string;
  taskStatus?: string;
}

export interface TaskItem {
  id: string;
  requestId: string;
  offerId: string;
  requesterId: string;
  helperId: string;
  status: TaskStatus;
  agreedPrice?: number;
  agreedSkillId?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelledById?: string;
  cancellationReason?: string;
  requesterCompletedAt?: string;
  helperCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
  request?: RequestItem;
  offer?: OfferItem;
  requester?: {
    id: string;
    name: string;
  };
  helper?: {
    id: string;
    name: string;
  };
}

export interface ChatThreadItem {
  id: string;
  participantAId: string;
  participantBId: string;
  requestId?: string;
  taskId?: string;
  createdAt: string;
  updatedAt: string;
  participantA?: { id: string; name: string };
  participantB?: { id: string; name: string };
  otherParticipant?: { id: string; name: string; isVerified?: boolean };
  lastMessage?: ChatMessageItem;
  unreadCount?: number;
}

export interface ChatMessageItem {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
  };
}

export interface RatingItem {
  id: string;
  taskId: string;
  raterId: string;
  rateeId: string;
  score: number; // 1-5
  comment?: string;
  createdAt: string;
}

export interface EndorsementItem {
  id: string;
  skillId: string;
  endorserId: string;
  endorseeId: string;
  createdAt: string;
  skill?: Skill;
  endorser?: {
    id: string;
    name: string;
  };
}

export interface ReputationSummary {
  userId: string;
  averageRating: number;
  totalRatings: number;
  completedTasksCount: number;
  completionRate: number;
  reliabilityScore: number;
  ratingsReceived: RatingItem[];
  endorsementsReceived: EndorsementItem[];
}

export interface BlockItem {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
  blocked?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ReportItem {
  id: string;
  reporterId: string;
  reportedUserId: string;
  category: ReportCategory;
  description: string;
  status: ReportStatus;
  createdAt: string;
  reportedUser?: {
    id: string;
    name: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  data: T;
  timestamp: string;
  path: string;
  message?: string;
}

export * from './ai';
