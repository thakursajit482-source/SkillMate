import { ApiProperty } from '@nestjs/swagger';

export type InteractionType = 'PAID' | 'SKILL_EXCHANGE' | 'SOCIAL';
export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export class ParsedQueryResponseDto {
  @ApiProperty({
    description: 'Extracted skills relevant to the request',
    example: ['Python', 'Machine Learning'],
    type: [String],
  })
  skills: string[];

  @ApiProperty({
    description: 'Classified primary intent (e.g. PROJECT_HELP, TUTORING, SKILL_EXCHANGE, EXAM_PREP, GENERAL_HELP)',
    example: 'PROJECT_HELP',
    nullable: true,
  })
  intent: string | null;

  @ApiProperty({
    description: 'Extracted target day or date (e.g. today, tomorrow, monday, friday)',
    example: 'tomorrow',
    nullable: true,
  })
  day: string | null;

  @ApiProperty({
    description: 'Extracted time range (e.g. 18:00-21:00, morning, evening)',
    example: '18:00-21:00',
    nullable: true,
  })
  timeRange: string | null;

  @ApiProperty({
    description: 'Location preference (e.g. NEARBY, ON_CAMPUS, REMOTE, or specific suburb)',
    example: 'NEARBY',
    nullable: true,
  })
  locationPreference: string | null;

  @ApiProperty({
    description: 'Interaction or commercial structure type if specified',
    enum: ['PAID', 'SKILL_EXCHANGE', 'SOCIAL'],
    example: null,
    nullable: true,
  })
  interactionType: InteractionType | null;

  @ApiProperty({
    description: 'Desired skill proficiency level if specified',
    enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
    example: null,
    nullable: true,
  })
  skillLevel: SkillLevel | null;

  @ApiProperty({
    description: 'Optional academic or personal context (e.g. project, homework, hackathon, exam)',
    example: 'project',
    nullable: true,
  })
  context: string | null;
}
