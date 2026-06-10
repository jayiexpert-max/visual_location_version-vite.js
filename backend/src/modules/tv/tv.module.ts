import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TvHighlight } from '../../entities/tv-highlight.entity';
import { RealtimeModule } from '../realtime/realtime.module';
import { TvController } from './tv.controller';
import { TvHighlightRepository } from './tv-highlight.repository';
import { TvService } from './tv.service';

@Module({
  imports: [TypeOrmModule.forFeature([TvHighlight]), RealtimeModule],
  controllers: [TvController],
  providers: [TvHighlightRepository, TvService],
  exports: [TvService],
})
export class TvModule {}
