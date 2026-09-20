import { ApiProperty } from '@nestjs/swagger';

export class SafeMatchedStudentDto {
  @ApiProperty({ example: 'Aarav Sharma' })
  name: string;

  @ApiProperty({ example: 'Bandra West', nullable: true })
  approximateArea: string | null;

  @ApiProperty({ example: 'K. J. Somaiya College of Engineering', nullable: true })
  collegeName: string | null;

  @ApiProperty({ example: true })
  isVerified: boolean;

  @ApiProperty({ example: 'Experienced in Python, data analysis and backend APIs.', nullable: true })
  bio: string | null;

  @ApiProperty({
    example: [
      { name: 'Python', level: 'ADVANCED', isVerifiedSkill: true },
      { name: 'Machine Learning', level: 'INTERMEDIATE', isVerifiedSkill: false },
    ],
  })
  skills: Array<{
    name: string;
    level: string;
    isVerifiedSkill: boolean;
  }>;
}

export class SemanticMatchCandidateDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  userId: string;

  @ApiProperty({ example: 'b1ffcd88-8b1a-4fe7-aa5c-5aa8ac270b22' })
  profileId: string;

  @ApiProperty({
    description: 'Cosine similarity score (0.0 to 1.0)',
    example: 0.87,
  })
  similarityScore: number;

  @ApiProperty({
    description: 'Skills in candidate profile matching or semantically related to query',
    example: ['Python', 'Machine Learning'],
    type: [String],
  })
  matchedSkills: string[];

  @ApiProperty({ type: () => SafeMatchedStudentDto })
  student: SafeMatchedStudentDto;
}
