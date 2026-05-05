import {
  Body,
  Controller,
  Get,
  Headers,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
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

  @Get('search')
  search(@Query('username') username: string) {
    return this.usersService.searchByUsername(username);
  }

  @Patch('me')
  updateMe(
    @Headers('authorization') authHeader: string,
    @Body() body: { name: string; username: string },
  ) {
    const userId = this.getUserIdFromToken(authHeader);

    return this.usersService.updateProfile(userId, body.name, body.username);
  }
  @Patch('me/password')
  updatePassword(
    @Headers('authorization') authHeader: string,
    @Body() body: { password: string },
  ) {
    const userId = this.getUserIdFromToken(authHeader);

    return this.usersService.updatePassword(userId, body.password);
  }
  @Post('push-token')
  savePushToken(
    @Headers('authorization') authHeader: string,
    @Body() body: { expoPushToken: string },
  ) {
    const userId = this.getUserIdFromToken(authHeader);

    return this.usersService.updatePushToken(userId, body.expoPushToken);
  }
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/avatars',
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
  uploadAvatar(
    @UploadedFile() file: { filename: string },
    @Body('userId') userId: string,
  ) {
    return this.usersService.updateAvatar(Number(userId), file.filename);
  }
}