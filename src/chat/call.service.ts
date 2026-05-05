import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../users/user.entity';

@Injectable()
export class CallService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async getReceiver(userId: number, chatId: number) {
    const chatMembers = await this.userRepo
      .createQueryBuilder('user')
      .innerJoin('chat_members', 'cm', 'cm.userId = user.id')
      .where('cm.chatId = :chatId', { chatId })
      .getMany();

    return chatMembers.find((u) => u.id !== userId);
  }
    async handleCall(
    user: { id: number; name: string; username: string },
    chatId: number,
    ) {
    const receiver = await this.getReceiver(user.id, chatId);

    if (!receiver) return null;

    return {
        receiver,
        caller: user,
    };
    }
}