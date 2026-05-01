import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
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

  @Post('search')
  searchUser(
    @Headers('authorization') authHeader: string,
    @Body() body: { username: string },
  ) {
    const userId = this.getUserIdFromToken(authHeader);

    return this.contactsService.searchUser(userId, body.username);
  }

  @Post('request')
  sendRequest(
    @Headers('authorization') authHeader: string,
    @Body() body: { receiverId: number },
  ) {
    const userId = this.getUserIdFromToken(authHeader);

    return this.contactsService.sendRequest(userId, body.receiverId);
  }

  @Get('requests/incoming')
  getIncomingRequests(@Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);

    return this.contactsService.getIncomingRequests(userId);
  }

  @Get('requests/outgoing')
  getOutgoingRequests(@Headers('authorization') authHeader: string) {
    const userId = this.getUserIdFromToken(authHeader);

    return this.contactsService.getOutgoingRequests(userId);
  }

  @Post('requests/:id/accept')
  acceptRequest(
    @Headers('authorization') authHeader: string,
    @Param('id', ParseIntPipe) requestId: number,
  ) {
    const userId = this.getUserIdFromToken(authHeader);

    return this.contactsService.acceptRequest(userId, requestId);
  }

  @Post('requests/:id/reject')
  rejectRequest(
    @Headers('authorization') authHeader: string,
    @Param('id', ParseIntPipe) requestId: number,
  ) {
    const userId = this.getUserIdFromToken(authHeader);

    return this.contactsService.rejectRequest(userId, requestId);
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