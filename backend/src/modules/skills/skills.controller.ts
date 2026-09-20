import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SkillsService } from './skills.service';
import { QuerySkillsDto } from './dto/query-skills.dto';

@ApiTags('Skills')
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  @ApiOperation({ summary: 'List and search public skill taxonomy directory' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for skill name or category' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category (e.g. Engineering, Design, Sports)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Paginated list of skills' })
  async getSkills(@Query() query: QuerySkillsDto) {
    return this.skillsService.findAll(query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List all unique skill categories' })
  @ApiResponse({ status: 200, description: 'List of category names' })
  async getCategories() {
    return this.skillsService.getCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get skill details by ID' })
  @ApiResponse({ status: 200, description: 'Skill details' })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  async getSkillById(@Param('id') id: string) {
    return this.skillsService.findById(id);
  }
}
