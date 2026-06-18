import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AbdulChatService } from './abdul-chat.service';
import { AskAbdulDto } from './dto/ask-abdul.dto';

@ApiTags('abdul-chat')
@ApiBearerAuth('access-token')
@Controller('abdul-chat')
export class AbdulChatController {
  constructor(private readonly abdulChatService: AbdulChatService) {}

  @Post('ask')
  @ApiOperation({ summary: 'Abdul Chat intent engine (PHP abdul-chat.php parity)' })
  ask(@Body() dto: AskAbdulDto) {
    return this.abdulChatService.ask(dto.question);
  }
}
