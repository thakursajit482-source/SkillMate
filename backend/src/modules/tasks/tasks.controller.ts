import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({
    summary: 'List active and historical tasks for the current user',
    description:
      'Returns tasks where current user is either requester or helper. Supports role and status filtering.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of tasks' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: TaskQueryDto,
  ) {
    return this.tasksService.findAll(userId, query);
  }

  @Get('mine')
  @ApiOperation({
    summary: 'List all tasks for the current user (alias)',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of tasks' })
  async findMine(
    @CurrentUser('id') userId: string,
    @Query() query: TaskQueryDto,
  ) {
    return this.tasksService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get task detail by UUID',
    description: 'Accessible only by task participants (requester or helper).',
  })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task details' })
  @ApiResponse({ status: 403, description: 'Not authorized to view this task' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasksService.findById(id, userId);
  }

  @Post(':id/status')
  @ApiOperation({
    summary: 'Update task status (accept, start, complete, cancel)',
    description:
      'Advances task state through lifecycle. Requires mutual confirmation for completion, or cancelReason for cancellation.',
  })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task status updated' })
  @ApiResponse({ status: 400, description: 'Invalid transition or missing cancellation reason' })
  @ApiResponse({ status: 403, description: 'Not authorized to update this task' })
  async updateStatusPost(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.tasksService.updateStatus(id, userId, dto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update task status via PATCH (REST alternative)',
  })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task status updated' })
  async updateStatusPatch(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.tasksService.updateStatus(id, userId, dto);
  }
}
