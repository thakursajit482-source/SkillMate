import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';

const MMR_ACRONYMS: Record<string, string> = {
  tcet: 'Thakur College of Engineering and Technology',
  viva: 'VIVA Institute of Technology',
  slrtce: 'Shree L. R. Tiwari',
  spit: 'Sardar Patel Institute of Technology',
  spce: 'Sardar Patel College of Engineering',
  vjti: 'Veermata Jijabai Technological Institute',
  kjsce: 'K. J. Somaiya College of Engineering',
  kjsit: 'K. J. Somaiya Institute of Technology',
  mithibai: 'Mithibai College',
  nm: 'N. M. College',
  iitb: 'Indian Institute of Technology Bombay',
  iit: 'Indian Institute of Technology Bombay',
  sfit: 'St. Francis Institute of Technology',
  tcsc: 'Thakur College of Science and Commerce',
  tsec: 'Thadomal Shahani',
  crce: 'Fr. Conceicao Rodrigues',
  fcrit: 'Fr. C. Rodrigues Institute of Technology',
  vesit: 'Vivekanand Education Society',
  dbit: 'Don Bosco Institute of Technology',
  sakec: 'Shah & Anchor',
  apsit: 'A. P. Shah Institute of Technology',
  rait: 'Ramrao Adik Institute of Technology',
  pce: 'Pillai College of Engineering',
  ict: 'Institute of Chemical Technology',
  xie: 'Xavier Institute of Engineering',
};

@Injectable()
export class CollegesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: string) {
    if (query && query.trim()) {
      const rawTerm = query.trim();
      const lower = rawTerm.toLowerCase();
      const acronymTarget = MMR_ACRONYMS[lower];

      const searchConditions: any[] = [
        { name: { contains: rawTerm, mode: 'insensitive' } },
        { area: { contains: rawTerm, mode: 'insensitive' } },
        { city: { contains: rawTerm, mode: 'insensitive' } },
      ];

      if (acronymTarget) {
        searchConditions.push({ name: { contains: acronymTarget, mode: 'insensitive' } });
      }

      return this.prisma.college.findMany({
        where: {
          OR: searchConditions,
        },
        orderBy: { name: 'asc' },
      });
    }

    return this.prisma.college.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const college = await this.prisma.college.findUnique({
      where: { id },
    });

    if (!college) {
      throw new NotFoundException(`College with ID "${id}" not found`);
    }

    return college;
  }
}
