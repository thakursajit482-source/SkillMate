import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { DatabaseModule } from '@database/database.module';
import { SafetyModule } from '@modules/safety/safety.module';

@Module({
  imports: [DatabaseModule, SafetyModule, JwtModule.register({}), ConfigModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
