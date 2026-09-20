import { Module } from '@nestjs/common';
import { ReputationController } from './reputation.controller';
import { ReputationService } from './reputation.service';
import { DatabaseModule } from '@database/database.module';
import { SafetyModule } from '@modules/safety/safety.module';

@Module({
  imports: [DatabaseModule, SafetyModule],
  controllers: [ReputationController],
  providers: [ReputationService],
  exports: [ReputationService],
})
export class ReputationModule {}
