import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
  ) {}

  private getUserIdFromToken(authHeader?: string) {
    if (!authHeader) {
      throw new UnauthorizedException('No token');
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);

    return payload.sub;
  }

  @Post('private')
  createPrivateChat(
    @Headers('authorization') authHeader: string,
    @Body() body: { friendId: number },
  ) {
    const userId = this.getUserIdFromToken(authHeader);

    return this.chatService.getOrCreatePrivateChat(userId, body.friendId);
  }

  @Get(':chatId/messages')
  getMessages(@Param('chatId') chatId: string) {
    return this.chatService.getChatMessages(Number(chatId));
  }
}