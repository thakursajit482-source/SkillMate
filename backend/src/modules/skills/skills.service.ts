import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { QuerySkillsDto } from './dto/query-skills.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QuerySkillsDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SkillWhereInput = {};

    if (query.search && query.search.trim()) {
      const searchTerm = query.search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { category: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    if (query.category && query.category.trim()) {
      where.category = {
        equals: query.category.trim(),
        mode: 'insensitive',
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.skill.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          category: true,
          createdAt: true,
        },
      }),
      this.prisma.skill.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findById(id: string) {
    const skill = await this.prisma.skill.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        category: true,
        createdAt: true,
      },
    });

    if (!skill) {
      throw new NotFoundException(`Skill with ID "${id}" not found`);
    }

    return skill;
  }

  async getCategories(): Promise<string[]> {
    const skills = await this.prisma.skill.findMany({
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    });

    return skills.map((s) => s.category);
  }
}
