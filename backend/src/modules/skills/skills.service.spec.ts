import { Test, TestingModule } from '@nestjs/testing';
import { SkillsService } from './skills.service';
import { PrismaService } from '@database/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('SkillsService', () => {
  let service: SkillsService;
  let prisma: any;

  const mockSkills = [
    { id: 's-1', name: 'Flutter', category: 'Engineering', createdAt: new Date() },
    { id: 's-2', name: 'Python', category: 'Engineering', createdAt: new Date() },
    { id: 's-3', name: 'Photoshop', category: 'Design', createdAt: new Date() },
  ];

  beforeEach(async () => {
    prisma = {
      skill: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SkillsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<SkillsService>(SkillsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a paginated list of public skills', async () => {
      prisma.skill.findMany.mockResolvedValue(mockSkills);
      prisma.skill.count.mockResolvedValue(3);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data.length).toBe(3);
      expect(result.meta.total).toBe(3);
      expect(result.meta.totalPages).toBe(1);
      expect(result.data[0].name).toBe('Flutter');
    });

    it('should search skills by query string', async () => {
      prisma.skill.findMany.mockResolvedValue([mockSkills[0]]);
      prisma.skill.count.mockResolvedValue(1);

      const result = await service.findAll({ search: 'flutter' });

      expect(prisma.skill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'flutter', mode: 'insensitive' } },
              { category: { contains: 'flutter', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
      expect(result.data.length).toBe(1);
    });

    it('should filter skills by category', async () => {
      prisma.skill.findMany.mockResolvedValue([mockSkills[2]]);
      prisma.skill.count.mockResolvedValue(1);

      const result = await service.findAll({ category: 'Design' });

      expect(prisma.skill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: { equals: 'Design', mode: 'insensitive' },
          }),
        }),
      );
      expect(result.data.length).toBe(1);
    });
  });

  describe('findById', () => {
    it('should return skill by ID', async () => {
      prisma.skill.findUnique.mockResolvedValue(mockSkills[0]);

      const skill = await service.findById('s-1');
      expect(skill.name).toBe('Flutter');
    });

    it('should throw NotFoundException if skill does not exist', async () => {
      prisma.skill.findUnique.mockResolvedValue(null);

      await expect(service.findById('unknown-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCategories', () => {
    it('should return unique categories array', async () => {
      prisma.skill.findMany.mockResolvedValue([
        { category: 'Design' },
        { category: 'Engineering' },
      ]);

      const categories = await service.getCategories();
      expect(categories).toEqual(['Design', 'Engineering']);
    });
  });
});
