import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

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

  @Post(':chatId/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/messages',
        filename: (
          req: unknown,
          file: { originalname: string },
          cb: (error: Error | null, filename: string) => void,
        ) => {
          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, uniqueName + extname(file.originalname));
        },
      }),
    }),
  )
  uploadChatImage(
    @Headers('authorization') authHeader: string,
    @Param('chatId') chatId: string,
    @UploadedFile() file: { filename: string },
  ) {
    const userId = this.getUserIdFromToken(authHeader);

    return this.chatService.createImageMessage(
      userId,
      Number(chatId),
      file.filename,
    );
  }
}