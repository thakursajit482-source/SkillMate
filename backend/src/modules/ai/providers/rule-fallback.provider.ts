import { Injectable, Logger } from '@nestjs/common';
import { AiQueryProvider } from './ai-provider.interface';
import { ParsedQueryResponseDto, InteractionType, SkillLevel } from '../dto/parsed-query-response.dto';

interface SkillRule {
  name: string;
  patterns: RegExp[];
}

@Injectable()
export class RuleFallbackProvider implements AiQueryProvider {
  readonly name = 'RuleFallbackProvider';
  private readonly logger = new Logger(RuleFallbackProvider.name);

  private readonly skillRules: SkillRule[] = [
    { name: 'Python', patterns: [/\bpython\b/i, /\bpy\b/i] },
    { name: 'Machine Learning', patterns: [/\bmachine\s+learning\b/i, /\bml\b/i, /\bdeep\s+learning\b/i, /\bai\b/i] },
    { name: 'React', patterns: [/\breact(\.?js)?\b/i] },
    { name: 'React Native', patterns: [/\breact\s+native\b/i] },
    { name: 'Node.js', patterns: [/\bnode(\.?js)?\b/i] },
    { name: 'TypeScript', patterns: [/\btypescript\b/i, /\bts\b/i] },
    { name: 'JavaScript', patterns: [/\bjavascript\b/i, /\bjs\b/i] },
    { name: 'Java', patterns: [/\bjava\b/i] },
    { name: 'C++', patterns: [/\bc\+\+(?!\w)/i, /\bcpp\b/i] },
    { name: 'C Programming', patterns: [/\bc\s+programming\b/i, /\bc\s+language\b/i] },
    { name: 'DSA', patterns: [/\bdsa\b/i, /\bdata\s+structures(\s+and\s+algorithms)?\b/i, /\balgorithms\b/i] },
    { name: 'SQL', patterns: [/\bsql\b/i, /\bmysql\b/i, /\bpostgresql\b/i, /\bpostgres\b/i] },
    { name: 'MongoDB', patterns: [/\bmongodb\b/i, /\bmongo\b/i] },
    { name: 'Docker', patterns: [/\bdocker\b/i] },
    { name: 'Kubernetes', patterns: [/\bkubernetes\b/i, /\bk8s\b/i] },
    { name: 'Figma', patterns: [/\bfigma\b/i] },
    { name: 'UI/UX Design', patterns: [/\bui\/ux\b/i, /\bui\s+design\b/i, /\bux\s+design\b/i, /\bwireframing\b/i] },
    { name: 'Video Editing', patterns: [/\bvideo\s+editing\b/i, /\bpremiere\s+pro\b/i, /\bafter\s+effects\b/i] },
    { name: 'Graphic Design', patterns: [/\bgraphic\s+design\b/i, /\bphotoshop\b/i, /\billustrator\b/i] },
    { name: 'HTML/CSS', patterns: [/\bhtml\b/i, /\bcss\b/i, /\btailwind(\s+css)?\b/i] },
    { name: 'Django', patterns: [/\bdjango\b/i] },
    { name: 'Flask', patterns: [/\bflask\b/i] },
    { name: 'Next.js', patterns: [/\bnext(\.?js)?\b/i] },
    { name: 'Mathematics', patterns: [/\bmath(s|ematics)?\b/i, /\bcalculus\b/i, /\blinear\s+algebra\b/i] },
    { name: 'Physics', patterns: [/\bphysics\b/i] },
    { name: 'Chemistry', patterns: [/\bchemistry\b/i] },
    { name: 'Economics', patterns: [/\beconomics?\b/i] },
    { name: 'Accounting', patterns: [/\baccounting\b/i, /\baccounts\b/i] },
  ];

  isAvailable(): boolean {
    return true;
  }

  async parseQuery(query: string): Promise<ParsedQueryResponseDto | null> {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return {
        skills: [],
        intent: null,
        day: null,
        timeRange: null,
        locationPreference: null,
        interactionType: null,
        skillLevel: null,
        context: null,
      };
    }

    const cleanQuery = query.trim();

    // 1. Extract Skills
    const skills: string[] = [];
    for (const rule of this.skillRules) {
      if (rule.patterns.some((pattern) => pattern.test(cleanQuery))) {
        if (!skills.includes(rule.name)) {
          skills.push(rule.name);
        }
      }
    }

    // 2. Extract Intent
    let intent: string | null = null;
    if (/\b(project|capstone|hackathon|app|website|build|develop)\b/i.test(cleanQuery)) {
      intent = 'PROJECT_HELP';
    } else if (/\b(tutor|tutoring|teach|learn|concept|explain|study)\b/i.test(cleanQuery)) {
      intent = 'TUTORING';
    } else if (/\b(exchange|swap|teach in return|trade)\b/i.test(cleanQuery)) {
      intent = 'SKILL_EXCHANGE';
    } else if (/\b(exam|test|midterm|final|quiz|revision|gate|cat|gre)\b/i.test(cleanQuery)) {
      intent = 'EXAM_PREP';
    } else if (/\b(homework|assignment|lab|sheet)\b/i.test(cleanQuery)) {
      intent = 'ASSIGNMENT_HELP';
    } else if (skills.length > 0 || /\b(help|need|looking for|someone)\b/i.test(cleanQuery)) {
      intent = 'GENERAL_HELP';
    }

    // 3. Extract Day
    let day: string | null = null;
    if (/\btomorrow\b/i.test(cleanQuery)) {
      day = 'tomorrow';
    } else if (/\btoday\b/i.test(cleanQuery)) {
      day = 'today';
    } else if (/\btonight\b/i.test(cleanQuery)) {
      day = 'tonight';
    } else if (/\bthis\s+weekend\b/i.test(cleanQuery) || /\bweekend\b/i.test(cleanQuery)) {
      day = 'weekend';
    } else {
      const dayMatch = cleanQuery.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
      if (dayMatch) {
        day = dayMatch[1].toLowerCase();
      }
    }

    // 4. Extract Time Range
    let timeRange: string | null = null;
    // Check explicit ranges like 18:00-21:00 or 18:00 - 21:00
    const explicitTimeRangeMatch = cleanQuery.match(/\b(\d{1,2}:\d{2})\s*[-–—to]+\s*(\d{1,2}:\d{2})\b/i);
    if (explicitTimeRangeMatch) {
      timeRange = `${explicitTimeRangeMatch[1]}-${explicitTimeRangeMatch[2]}`;
    } else {
      // Check 12-hour ranges like 6pm to 9pm, 6-9pm, 6pm-9pm
      const ampmRangeMatch = cleanQuery.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–—to]+\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
      if (ampmRangeMatch) {
        const startH = parseInt(ampmRangeMatch[1], 10);
        const endH = parseInt(ampmRangeMatch[4], 10);
        const endAmpm = ampmRangeMatch[6].toLowerCase();
        const startAmpm = ampmRangeMatch[3] ? ampmRangeMatch[3].toLowerCase() : endAmpm;

        const convertH = (h: number, meridian: string) => {
          if (meridian === 'pm' && h < 12) return h + 12;
          if (meridian === 'am' && h === 12) return 0;
          return h;
        };

        const start24 = String(convertH(startH, startAmpm)).padStart(2, '0');
        const end24 = String(convertH(endH, endAmpm)).padStart(2, '0');
        const startMin = ampmRangeMatch[2] || '00';
        const endMin = ampmRangeMatch[5] || '00';
        timeRange = `${start24}:${startMin}-${end24}:${endMin}`;
      } else if (/\bevening\b/i.test(cleanQuery)) {
        timeRange = '18:00-21:00';
      } else if (/\bmorning\b/i.test(cleanQuery)) {
        timeRange = '09:00-12:00';
      } else if (/\bafternoon\b/i.test(cleanQuery)) {
        timeRange = '13:00-17:00';
      } else if (/\bnight\b/i.test(cleanQuery)) {
        timeRange = '20:00-23:00';
      }
    }

    // 5. Extract Location Preference
    let locationPreference: string | null = null;
    if (/\b(nearby|near me|close by|around me|in my area)\b/i.test(cleanQuery)) {
      locationPreference = 'NEARBY';
    } else if (/\b(on campus|campus|in person|offline|library)\b/i.test(cleanQuery)) {
      locationPreference = 'ON_CAMPUS';
    } else if (/\b(remote|online|virtual|zoom|google meet)\b/i.test(cleanQuery)) {
      locationPreference = 'REMOTE';
    } else {
      const areaMatch = cleanQuery.match(/\b(bandra|powai|andheri|dadar|thane|vile parle|kurla|vidyavihar|ghatkopar|chembur)\b/i);
      if (areaMatch) {
        locationPreference = areaMatch[1].toUpperCase();
      }
    }

    // 6. Extract Interaction Type
    let interactionType: InteractionType | null = null;
    if (/\b(paid|pay|paying|compensation|stipend|rupees|inr|₹|\b\d+\s*rs\b|\b\d+\s*inr\b)\b/i.test(cleanQuery)) {
      interactionType = 'PAID';
    } else if (/\b(exchange|swap|teach in return|barter)\b/i.test(cleanQuery)) {
      interactionType = 'SKILL_EXCHANGE';
    } else if (/\b(study group|hackathon partner|social|peer discussion)\b/i.test(cleanQuery)) {
      interactionType = 'SOCIAL';
    }

    // 7. Extract Skill Level
    let skillLevel: SkillLevel | null = null;
    if (/\b(beginner|basic|starter|fundamentals|introductory)\b/i.test(cleanQuery)) {
      skillLevel = 'BEGINNER';
    } else if (/\b(intermediate|medium|moderate)\b/i.test(cleanQuery)) {
      skillLevel = 'INTERMEDIATE';
    } else if (/\b(advanced|expert|pro|senior|master)\b/i.test(cleanQuery)) {
      skillLevel = 'ADVANCED';
    }

    // 8. Extract Context
    let context: string | null = null;
    if (/\bproject\b/i.test(cleanQuery)) {
      context = 'project';
    } else if (/\bhackathon\b/i.test(cleanQuery)) {
      context = 'hackathon';
    } else if (/\b(assignment|homework)\b/i.test(cleanQuery)) {
      context = 'assignment';
    } else if (/\b(exam|test|quiz|revision)\b/i.test(cleanQuery)) {
      context = 'exam';
    } else if (/\binterview\b/i.test(cleanQuery)) {
      context = 'interview';
    }

    return {
      skills,
      intent,
      day,
      timeRange,
      locationPreference,
      interactionType,
      skillLevel,
      context,
    };
  }
}
