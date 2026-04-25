import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { ContactsService } from './contacts.service';

@Controller('contacts')
export class ContactsController {
  constructor(
    private contactsService: ContactsService,
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

  @Post('add')
  addContact(
    @Headers('authorization') authHeader: string,
    @Body() body: { username: string },
  ) {
    const userId = this.getUserIdFromToken(authHeader);

    return this.contactsService.addContact(userId, body.username);
  }

  @Get()
  getContacts(@Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);

    return this.contactsService.getContacts(userId);
  }
}