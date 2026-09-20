import { Module } from '@nestjs/common';
import { CollegesController } from './colleges.controller';
import { CollegesService } from './colleges.service';

@Module({
  controllers: [CollegesController],
  providers: [CollegesService],
  exports: [CollegesService],
})
export class CollegesModule {}
