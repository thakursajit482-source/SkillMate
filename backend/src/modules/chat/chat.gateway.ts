import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@database/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const authHeader =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization;

      if (!authHeader) {
        this.logger.debug(`Client ${client.id} disconnected: No auth token`);
        client.disconnect();
        return;
      }

      const token = authHeader.replace(/^Bearer\s+/i, '');
      const secret =
        this.configService.get<string>('JWT_SECRET') ||
        this.configService.get<string>('JWT_ACCESS_SECRET') ||
        'super-secret-jwt-access-key-change-in-production';

      const payload = this.jwtService.verify(token, { secret });
      client.data.user = payload;
      this.logger.debug(`User ${payload.sub} connected on socket ${client.id}`);
    } catch (err: any) {
      this.logger.debug(`Client ${client.id} failed auth handshake: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('joinThread')
  async handleJoinThread(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { threadId: string },
  ) {
    if (!data?.threadId) {
      return { status: 'error', message: 'threadId is required' };
    }

    const userId = client.data?.user?.sub || client.data?.user?.id;
    if (!userId) {
      this.logger.warn(`Unauthenticated socket ${client.id} tried to join thread ${data.threadId}`);
      return { status: 'error', message: 'Unauthorized' };
    }

    const thread = await this.prisma.chatThread.findUnique({
      where: { id: data.threadId },
      select: { participantAId: true, participantBId: true },
    });

    if (!thread) {
      return { status: 'error', message: 'Thread not found' };
    }

    if (thread.participantAId !== userId && thread.participantBId !== userId) {
      this.logger.warn(
        `User ${userId} unauthorized attempt to join room thread:${data.threadId}`,
      );
      return { status: 'error', message: 'Forbidden' };
    }

    client.join(`thread:${data.threadId}`);
    this.logger.debug(`Socket ${client.id} (user ${userId}) joined room thread:${data.threadId}`);
    return { status: 'joined', threadId: data.threadId };
  }

  @SubscribeMessage('leaveThread')
  handleLeaveThread(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { threadId: string },
  ) {
    if (data?.threadId) {
      client.leave(`thread:${data.threadId}`);
      this.logger.debug(`Socket ${client.id} left room thread:${data.threadId}`);
      return { status: 'left', threadId: data.threadId };
    }
  }

  /**
   * Broadcast newly saved message to all participants in the thread room.
   */
  broadcastNewMessage(threadId: string, message: any) {
    if (this.server) {
      this.server.to(`thread:${threadId}`).emit('newMessage', message);
    }
  }

  /**
   * Broadcast message read receipt to the thread room.
   */
  broadcastMessageRead(threadId: string, readInfo: any) {
    if (this.server) {
      this.server.to(`thread:${threadId}`).emit('messageRead', readInfo);
    }
  }
}
