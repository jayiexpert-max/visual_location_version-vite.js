import { Module } from '@nestjs/common';
import { HighlightGateway } from './highlight.gateway';

@Module({
  providers: [HighlightGateway],
  exports: [HighlightGateway],
})
export class RealtimeModule {}
