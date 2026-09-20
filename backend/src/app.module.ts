import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@database/database.module';
import { HealthModule } from '@modules/health/health.module';
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';
import { CollegesModule } from '@modules/colleges/colleges.module';
import { ProfilesModule } from '@modules/profiles/profiles.module';
import { VerificationModule } from '@modules/verification/verification.module';
import { SkillsModule } from '@modules/skills/skills.module';
import { DiscoveryModule } from '@modules/discovery/discovery.module';
import { RequestsModule } from '@modules/requests/requests.module';
import { OffersModule } from '@modules/offers/offers.module';
import { TasksModule } from '@modules/tasks/tasks.module';
import { SafetyModule } from '@modules/safety/safety.module';
import { ChatModule } from '@modules/chat/chat.module';
import { ReputationModule } from '@modules/reputation/reputation.module';
import { AiModule } from '@modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CollegesModule,
    ProfilesModule,
    VerificationModule,
    SkillsModule,
    DiscoveryModule,
    RequestsModule,
    OffersModule,
    TasksModule,
    SafetyModule,
    ChatModule,
    ReputationModule,
    AiModule,
  ],
})
export class AppModule {}
