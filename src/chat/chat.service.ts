import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Chat } from './chat.entity';
import { ChatMember } from './chat-member.entity';
import { User } from '../users/user.entity';
import { Message } from '../messages/message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private chatRepo: Repository<Chat>,

    @InjectRepository(ChatMember)
    private chatMemberRepo: Repository<ChatMember>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
  ) {}

  async getOrCreatePrivateChat(userId: number, friendId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const friend = await this.userRepo.findOne({ where: { id: friendId } });

    if (!user || !friend) {
      throw new NotFoundException('User not found');
    }

    const userChats = await this.chatMemberRepo.find({
      where: { user: { id: userId } },
      relations: ['chat'],
    });

    for (const member of userChats) {
      const members = await this.chatMemberRepo.find({
        where: { chat: { id: member.chat.id } },
        relations: ['user'],
      });

      const memberIds = members.map((m) => m.user.id);

      if (
        memberIds.length === 2 &&
        memberIds.includes(userId) &&
        memberIds.includes(friendId)
      ) {
        return member.chat;
      }
    }

    const chat = this.chatRepo.create();
    await this.chatRepo.save(chat);

    const member1 = this.chatMemberRepo.create({
      chat,
      user,
    });

    const member2 = this.chatMemberRepo.create({
      chat,
      user: friend,
    });

    await this.chatMemberRepo.save([member1, member2]);

    return chat;
  }

  async getChatMessages(chatId: number) {
    return this.messageRepo.find({
      where: {
        chat: { id: chatId },
      },
      relations: ['user'],
      order: {
        createdAt: 'ASC',
      },
    });
  }
}