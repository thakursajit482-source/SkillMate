import {
  Controller,
  Get,
  Post,
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
import { ChatService } from './chat.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatQueryDto } from './dto/chat-query.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('threads')
  @ApiOperation({
    summary: 'Create or access a 1:1 chat thread scoped to an offer or task relationship',
    description:
      'Unlocks communication only after an offer, task, or direct request pairing exists between participants.',
  })
  @ApiResponse({ status: 201, description: 'Chat thread created or retrieved' })
  @ApiResponse({ status: 400, description: 'Cannot chat with yourself' })
  @ApiResponse({ status: 403, description: 'No valid relationship exists or user is blocked' })
  async createOrGetThread(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateThreadDto,
  ) {
    return this.chatService.createOrGetThread(userId, dto);
  }

  @Get('threads')
  @ApiOperation({
    summary: 'List own active chat threads',
    description: 'Returns active conversation threads for the authenticated student.',
  })
  @ApiResponse({ status: 200, description: 'List of chat threads' })
  async findAllThreads(@CurrentUser('id') userId: string) {
    return this.chatService.findAllThreads(userId);
  }

  @Get('threads/:id')
  @ApiOperation({
    summary: 'Get chat thread detail by UUID',
    description: 'Accessible only by participants of the thread.',
  })
  @ApiParam({ name: 'id', description: 'Chat thread UUID' })
  @ApiResponse({ status: 200, description: 'Chat thread details' })
  @ApiResponse({ status: 403, description: 'Not authorized to view this thread' })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  async findThreadById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatService.findThreadById(id, userId);
  }

  @Post('threads/:threadId/messages')
  @ApiOperation({
    summary: 'Send a message in a chat thread (REST endpoint)',
    description:
      'Persists message to the database and dispatches via Socket.IO to connected participants.',
  })
  @ApiParam({ name: 'threadId', description: 'Chat thread UUID' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 400, description: 'Empty message or closed thread' })
  @ApiResponse({ status: 403, description: 'Not a thread participant or blocked' })
  async sendMessage(
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(threadId, userId, dto);
  }

  @Get('threads/:threadId/messages')
  @ApiOperation({
    summary: 'Retrieve paginated message history for a chat thread',
    description:
      'Returns paginated messages in ascending chronological order and marks unread messages as read.',
  })
  @ApiParam({ name: 'threadId', description: 'Chat thread UUID' })
  @ApiResponse({ status: 200, description: 'Paginated message history' })
  @ApiResponse({ status: 403, description: 'Not authorized to view messages in this thread' })
  async findMessages(
    @Param('threadId', ParseUUIDPipe) threadId: string,
    @CurrentUser('id') userId: string,
    @Query() query: ChatQueryDto,
  ) {
    return this.chatService.findMessages(threadId, userId, query);
  }
}
