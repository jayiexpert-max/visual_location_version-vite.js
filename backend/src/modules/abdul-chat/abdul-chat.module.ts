import { Module } from '@nestjs/common';
import { AbdulChatController } from './abdul-chat.controller';
import { AbdulChatService } from './abdul-chat.service';

@Module({
  controllers: [AbdulChatController],
  providers: [AbdulChatService],
})
export class AbdulChatModule {}
