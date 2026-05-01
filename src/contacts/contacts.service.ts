import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Contact } from './contact.entity';
import { ContactRequest } from './contact-request.entity';
import { User } from '../users/user.entity';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private contactRepo: Repository<Contact>,

    @InjectRepository(ContactRequest)
    private contactRequestRepo: Repository<ContactRequest>,

    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async searchUser(ownerId: number, username: string) {
    if (!username.trim()) {
      throw new BadRequestException('Username is required');
    }

    const user = await this.userRepo.findOne({
      where: { username },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.id === ownerId) {
      throw new BadRequestException('You cannot add yourself');
    }

    const existingContact = await this.contactRepo.findOne({
      where: {
        owner: { id: ownerId },
        friend: { id: user.id },
      },
    });

    const existingRequest = await this.contactRequestRepo.findOne({
      where: [
        {
          sender: { id: ownerId },
          receiver: { id: user.id },
        },
        {
          sender: { id: user.id },
          receiver: { id: ownerId },
        },
      ],
      order: {
        createdAt: 'DESC',
      },
    });

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      isContact: !!existingContact,
      requestStatus: existingRequest?.status || null,
      requestId: existingRequest?.id || null,
    };
  }

  async sendRequest(senderId: number, receiverId: number) {
    if (senderId === receiverId) {
      throw new BadRequestException('You cannot add yourself');
    }

    const sender = await this.userRepo.findOne({
      where: { id: senderId },
    });

    const receiver = await this.userRepo.findOne({
      where: { id: receiverId },
    });

    if (!sender || !receiver) {
      throw new NotFoundException('User not found');
    }

    const existingContact = await this.contactRepo.findOne({
      where: {
        owner: { id: senderId },
        friend: { id: receiverId },
      },
    });

    if (existingContact) {
      throw new BadRequestException('User is already in contacts');
    }

    const existingPendingRequest = await this.contactRequestRepo.findOne({
      where: [
        {
          sender: { id: senderId },
          receiver: { id: receiverId },
          status: 'pending',
        },
        {
          sender: { id: receiverId },
          receiver: { id: senderId },
          status: 'pending',
        },
      ],
    });

    if (existingPendingRequest) {
      return existingPendingRequest;
    }

    const request = this.contactRequestRepo.create({
      sender,
      receiver,
      status: 'pending',
    });

    return this.contactRequestRepo.save(request);
  }

  async getIncomingRequests(userId: number) {
    return this.contactRequestRepo.find({
      where: {
        receiver: { id: userId },
        status: 'pending',
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getOutgoingRequests(userId: number) {
    return this.contactRequestRepo.find({
      where: {
        sender: { id: userId },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async acceptRequest(userId: number, requestId: number) {
    const request = await this.contactRequestRepo.findOne({
      where: {
        id: requestId,
      },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.receiver.id !== userId) {
      throw new BadRequestException('You cannot accept this request');
    }

    request.status = 'accepted';

    await this.contactRequestRepo.save(request);

    await this.createContactIfNotExists(request.sender, request.receiver);
    await this.createContactIfNotExists(request.receiver, request.sender);

    return request;
  }

  async rejectRequest(userId: number, requestId: number) {
    const request = await this.contactRequestRepo.findOne({
      where: {
        id: requestId,
      },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.receiver.id !== userId) {
      throw new BadRequestException('You cannot reject this request');
    }

    request.status = 'rejected';

    return this.contactRequestRepo.save(request);
  }

  async addContact(ownerId: number, friendUsername: string) {
    const owner = await this.userRepo.findOne({
      where: { id: ownerId },
    });

    if (!owner) {
      throw new NotFoundException('Owner not found');
    }

    const friend = await this.userRepo.findOne({
      where: { username: friendUsername },
    });

    if (!friend) {
      throw new NotFoundException('User not found');
    }

    if (owner.id === friend.id) {
      throw new BadRequestException('You cannot add yourself');
    }

    const existingContact = await this.contactRepo.findOne({
      where: {
        owner: { id: owner.id },
        friend: { id: friend.id },
      },
    });

    if (existingContact) {
      return existingContact;
    }

    const contact = this.contactRepo.create({
      owner,
      friend,
    });

    return this.contactRepo.save(contact);
  }

  async getContacts(ownerId: number) {
    const contacts = await this.contactRepo.find({
      where: {
        owner: { id: ownerId },
      },
      relations: ['friend'],
      order: {
        createdAt: 'DESC',
      },
    });

    return contacts.map((contact) => ({
      id: contact.friend.id,
      name: contact.friend.name,
      username: contact.friend.username,
      avatar: contact.friend.avatar,
    }));
  }

  private async createContactIfNotExists(owner: User, friend: User) {
    const existingContact = await this.contactRepo.findOne({
      where: {
        owner: { id: owner.id },
        friend: { id: friend.id },
      },
    });

    if (existingContact) {
      return existingContact;
    }

    const contact = this.contactRepo.create({
      owner,
      friend,
    });

    return this.contactRepo.save(contact);
  }
}