import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Contact } from './contact.entity';
import { User } from '../users/user.entity';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private contactRepo: Repository<Contact>,

    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

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
    }));
  }
}