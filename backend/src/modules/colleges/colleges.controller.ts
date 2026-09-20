import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CollegesService } from './colleges.service';

@ApiTags('Colleges')
@Controller('colleges')
export class CollegesController {
  constructor(private readonly collegesService: CollegesService) {}

  @Get()
  @ApiOperation({ summary: 'List or search colleges in Mumbai Metropolitan Region (MMR)' })
  @ApiQuery({ name: 'q', required: false, description: 'Search term for college name or area' })
  @ApiResponse({ status: 200, description: 'List of matching colleges' })
  async listColleges(@Query('q') q?: string) {
    return this.collegesService.findAll(q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get college details by ID' })
  @ApiResponse({ status: 200, description: 'College details' })
  @ApiResponse({ status: 404, description: 'College not found' })
  async getCollegeById(@Param('id') id: string) {
    return this.collegesService.findById(id);
  }
}
